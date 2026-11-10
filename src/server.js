// Точка входа: HTTP API для Mini App + Telegram-бот + планировщик напоминаний.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import express from 'express';
import { webhookCallback } from 'grammy';
import { createStore } from './store.js';
import { createLogic, httpError } from './logic.js';
import { createJournal } from './journal.js';
import { createNudges } from './nudge.js';
import { createShop } from './shop.js';
import { verifyInitData } from './auth.js';
import { validateTranslation } from './grading.js';
import { createBot } from './bot.js';

const PORT = Number(process.env.PORT || 3000);
const BOT_TOKEN = process.env.BOT_TOKEN || '';
const ADMIN_IDS = (process.env.ADMIN_IDS || '7183098167').split(',').map((s) => s.trim()).filter(Boolean);
const PUBLIC_URL = (process.env.PUBLIC_URL || process.env.RENDER_EXTERNAL_URL || `http://localhost:${PORT}`).replace(/\/$/, '');
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || '';
const ALLOW_DEV_AUTH = process.env.ALLOW_DEV_AUTH === '1';
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');

const store = await createStore();
const logic = createLogic(store, { adminIds: ADMIN_IDS });
const journal = createJournal({ logic, store });
const shop = createShop({ logic, store });
const nudges = createNudges({ logic, journal, shop, store });
{ const n = shop.migrate(); if (n) console.log(`[shop] оставили бесплатно уже выбранных маскотов: ${n}`); }
console.log(`[store] ${store.backend}`);

// Тесты, которые Claude готовит из конспектов, лежат в content/lessons/*.json — подхватываем при старте.
const lessonsDir = path.join(root, 'content', 'lessons');
const newPersonal = []; // личные задания, о которых бот напишет ученикам после запуска
// Переводы урока лежат рядом: <id>.uz.json и <id>.en.json (те же поля title, description, questions, learn)
const lessonFiles = fs.existsSync(lessonsDir) ? fs.readdirSync(lessonsDir).filter((x) => x.endsWith('.json')) : [];
const TR_RE = /^(.+)\.(uz|en)\.json$/;
for (const f of lessonFiles.filter((x) => !TR_RE.test(x))) {
  try {
    const lesson = JSON.parse(fs.readFileSync(path.join(lessonsDir, f), 'utf8'));
    for (const t of lessonFiles) {
      const m = TR_RE.exec(t);
      if (!m || m[1] !== lesson.id) continue;
      const tr = JSON.parse(fs.readFileSync(path.join(lessonsDir, t), 'utf8'));
      const errs = validateTranslation(lesson, tr);
      if (errs.length) { console.error(`[lessons] ${t}: ${errs.join('; ')}`); continue; }
      (lesson.tr ||= {})[m[2]] = tr;
    }
    const l = logic.upsertLesson(lesson, { source: 'content' });
    newPersonal.push(...logic.assignPersonal(l.id));
  } catch (e) {
    console.error(`[lessons] ${f}: ${e.message}`);
  }
}

// Лишние очки за повторное прохождение одного урока (они больше не засчитываются)
for (const d of logic.duplicateXp()) console.log('[xp-dup] ' + JSON.stringify(d));
console.log('[xp-dup-end]');

// Учётные записи для входа на сайте: SEED_ACCOUNTS="почта:пароль:Имя;почта2:пароль2:Имя2"
for (const row of (process.env.SEED_ACCOUNTS || '').split(';').map((x) => x.trim()).filter(Boolean)) {
  const [email, password, name] = row.split(':');
  if (logic.ensureAccount({ email, password, name })) console.log(`[accounts] ${email}`);
}

// Бонусные баллы из content/bonuses.json: [{ id, login | userId, xp, reason }]. Каждый id начисляется один раз
const bonusFile = path.join(root, 'content', 'bonuses.json');
if (fs.existsSync(bonusFile)) {
  for (const b of JSON.parse(fs.readFileSync(bonusFile, 'utf8'))) {
    const userId = b.userId || logic.S.accounts?.[String(b.login || '').trim().toLowerCase()]?.userId;
    if (!userId) { console.error(`[bonus] не найден ученик: ${b.login || b.userId}`); continue; }
    try {
      const r = logic.addBonus({ id: 'content:' + b.id, userId, xp: b.xp, reason: b.reason });
      if (r.already) console.log(`[bonus] уже начислено: ${b.id}`);
    } catch (e) { console.error(`[bonus] ${b.id}: ${e.message}`); }
  }
}

// Время уроков из content/schedule.json: { id, groups: [{ match, slots }], students: [{ userId | username, slots, tzMin? }] }.
// Каждый id применяется один раз; дальше учитель меняет время в приложении.
const schedFile = path.join(root, 'content', 'schedule.json');
if (fs.existsSync(schedFile)) {
  const sc = JSON.parse(fs.readFileSync(schedFile, 'utf8'));
  logic.S.migrations ||= {};
  if (!logic.S.migrations['schedule:' + sc.id]) {
    for (const g of sc.groups || []) {
      const found = Object.values(logic.S.groups).filter((x) => x.name.toLowerCase().includes(g.match.toLowerCase()));
      if (found.length !== 1) { console.error(`[schedule] группа «${g.match}»: найдено ${found.length} (${found.map((x) => x.name).join(', ')})`); continue; }
      try { journal.setSchedule(found[0].id, g.slots); console.log(`[schedule] группа ${found[0].name}: ${JSON.stringify(g.slots)}`); } catch (e) { console.error(`[schedule] ${g.match}: ${e.message}`); }
    }
    for (const st of sc.students || []) {
      const u = st.userId ? logic.S.users[st.userId] : logic.findUserByUsername(st.username || '');
      if (!u) { console.error(`[schedule] ученик не найден: ${st.userId || '@' + st.username}`); continue; }
      try { journal.setUserSchedule(u.id, st.slots, st.tzMin); console.log(`[schedule] ученик ${logic.name(u)} (${u.id}): ${JSON.stringify(st.slots)}${st.tzMin != null ? ' tz ' + st.tzMin : ''}`); } catch (e) { console.error(`[schedule] ${u.id}: ${e.message}`); }
    }
    logic.S.migrations['schedule:' + sc.id] = Date.now();
    store.save();
  }
}

// Один раз открываем всё до самого дальнего урока, к которому у ученика уже есть доступ
for (const key of ['access-v1', 'access-v2']) {
  const accessReport = logic.migrateAccess(key);
  if (!accessReport) continue;
  for (const r of accessReport) console.log(`[access-migrate] ${key} ` + JSON.stringify(r));
  console.log(`[access-migrate-end] ${key} учеников: ${accessReport.length}`);
}

// Скрыть из списка учителя старые тесты (content/archive.json: ["id", …]); срабатывает один раз для каждого
const archiveFile = path.join(root, 'content', 'archive.json');
if (fs.existsSync(archiveFile)) {
  const n = logic.applyArchive(JSON.parse(fs.readFileSync(archiveFile, 'utf8')));
  if (n) console.log(`[archive] скрыто тестов: ${n}`);
}

const tg = BOT_TOKEN && process.env.NO_BOT !== '1' ? createBot({ token: BOT_TOKEN, logic, journal, nudges, store, appUrl: PUBLIC_URL + '/', adminIds: ADMIN_IDS }) : null;

const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '2mb' }));

// ───────── авторизация ─────────
function auth(req, _res, next) {
  let tgUser = null;
  const initData = req.get('x-init-data');
  if (initData) tgUser = verifyInitData(initData, BOT_TOKEN);
  const bearer = (req.get('authorization') || '').replace(/^Bearer\s+/i, '');
  if (!tgUser && ADMIN_TOKEN && bearer && safeEq(bearer, ADMIN_TOKEN)) tgUser = { id: ADMIN_IDS[0] };
  if (!tgUser && ALLOW_DEV_AUTH && req.get('x-dev-user')) tgUser = { id: req.get('x-dev-user'), first_name: req.get('x-dev-name') || 'Dev' };
  const session = req.get('x-session');
  if (!tgUser && session) {
    const u = logic.sessionUser(session);
    if (!u) return next(httpError(401, 'Сессия истекла — войди ещё раз'));
    req.user = u;
    req.session = session;
    req.admin = logic.isAdmin(u.id);
    return next();
  }
  if (!tgUser) return next(httpError(401, 'Открой приложение через Telegram-бота'));
  req.user = logic.upsertUser(tgUser).user;
  req.admin = logic.isAdmin(req.user.id);
  next();
}
const adminOnly = (req, _res, next) => (req.admin ? next() : next(httpError(403, 'Только для учителя')));
const safeEq = (a, b) => a.length === b.length && crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
const h = (fn) => async (req, res, next) => {
  try {
    const out = await fn(req, res);
    if (out !== undefined) res.json(out);
  } catch (e) {
    next(e);
  }
};

const api = express.Router();

// Вход на сайте по почте и паролю. Простая защита от перебора: 10 попыток за 10 минут с одного адреса.
const tries = new Map();
api.post('/auth/login', h((req) => {
  const ip = req.get('x-forwarded-for')?.split(',')[0].trim() || req.ip;
  const t = tries.get(ip) || { n: 0, at: Date.now() };
  if (Date.now() - t.at > 10 * 60e3) { t.n = 0; t.at = Date.now(); }
  if (++t.n > 10) throw httpError(429, 'Слишком много попыток — подожди 10 минут');
  tries.set(ip, t);
  const { email, password } = req.body || {};
  return logic.login(email, password);
}));
api.use(auth);
api.post('/auth/logout', h((req) => (logic.logout(req.session), { ok: true })));

// ───────── ученик ─────────
// Главная + магазин: баланс XP, свои маскоты, зелья, состояние маскота
const withShop = (uid, m) => (m && !m.isAdmin && !m.isParent && !m.needRole ? { ...m, shop: { balance: shop.balance(uid), owned: shop.owned(uid), potions: logic.S.users[uid]?.potions || 0, pet: shop.pet(uid) } } : m);
api.get('/me', h((req) => withShop(req.user.id, logic.home(req.user.id))));
api.post('/me/prefs', h((req) => {
  const p = { ...(req.body || {}) };
  // чужого (не купленного) маскота выбрать нельзя
  if (p.mascot && !req.admin && !logic.isParent(req.user.id) && !shop.owned(req.user.id).includes(p.mascot)) delete p.mascot;
  return logic.setPrefs(req.user.id, p);
}));
// ───────── магазин ─────────
const langOfReq = (req) => logic.S.users[req.user.id]?.prefs?.lang || 'ru';
api.get('/shop', h((req) => shop.catalog(req.user.id, langOfReq(req))));
api.post('/shop/buy', h((req) => shop.buy(req.user.id, req.body?.item, langOfReq(req))));
api.post('/attempts/:id/magnifier', h((req) => {
  const { a, q, lesson } = logic.attemptQuestion(req.user.id, req.params.id, req.body?.index);
  return shop.useMagnifier(req.user.id, a, q, lesson);
}));
api.post('/attempts/:id/potion', h((req) => {
  const { a, q, lesson } = logic.attemptQuestion(req.user.id, req.params.id, req.body?.index);
  return shop.usePotion(req.user.id, a, q, lesson, req.body?.options);
}));
api.get('/stats/me', h((req) => logic.userStats(req.user.id)));
// Роль нового пользователя: ученик или родитель
api.post('/me/role', h(async (req) => {
  const u = logic.setRole(req.user.id, String(req.body?.role || ''));
  await tg?.onRoleChosen(u);
  return logic.home(req.user.id);
}));
// Родитель: свои дети, все ученики курса и прогресс любого из них
const parentOnly = (req) => { if (!logic.isParent(req.user.id)) throw httpError(403, 'Только для родителей'); };
api.get('/parent/students', h((req) => (parentOnly(req), logic.parentStudents())));
api.get('/parent/students/:uid', h((req) => {
  parentOnly(req);
  if (!logic.parentStudents().some((u) => u.id === req.params.uid)) throw httpError(404, 'Ученик не найден');
  return logic.userStats(req.params.uid);
}));
// Дневник: посещаемость и оценки
api.get('/me/diary', h((req) => journal.diary(req.user.id)));
api.get('/parent/students/:uid/diary', h((req) => {
  parentOnly(req);
  if (!logic.parentStudents().some((u) => u.id === req.params.uid)) throw httpError(404, 'Ученик не найден');
  return journal.diary(req.params.uid);
}));
api.post('/parent/children', h((req) => (parentOnly(req), logic.setChildren(req.user.id, req.body?.ids))));
api.get('/league/global', h(() => logic.globalLeague()));
api.get('/leaderboard/:gid', h((req) => {
  if (!req.admin && !logic.isParent(req.user.id) && !logic.userGroups(req.user.id).some((g) => g.id === req.params.gid)) throw httpError(403, 'Не твоя группа');
  return logic.leaderboard(req.params.gid);
}));
api.post('/attempts', h((req) => logic.startAttempt(req.user.id, req.body || {})));
api.post('/learn/start', h((req) => logic.startLearn(req.user.id, req.body || {})));
api.post('/learn/check', h((req) => logic.checkLearn(req.user.id, req.body || {}, Number(req.body.section), Number(req.body.index), req.body.answer)));
api.post('/learn/finish', h((req) => logic.finishLearn(req.user.id, req.body || {})));
api.post('/attempts/:id/answer', h((req) => logic.answer(req.user.id, req.params.id, Number(req.body.index), req.body.answer)));
api.post('/attempts/:id/retry', h((req) => logic.retry(req.user.id, req.params.id, Number(req.body.index), req.body.answer)));
api.post('/attempts/:id/finish', h((req) => logic.finish(req.user.id, req.params.id)));

// ───────── учитель ─────────
const adm = express.Router();
adm.use(adminOnly);
adm.get('/overview', h(() => logic.adminOverview()));
adm.post('/groups', h((req) => logic.createGroup(req.body || {})));
adm.patch('/groups/:gid', h((req) => logic.updateGroup(req.params.gid, req.body || {})));
adm.delete('/groups/:gid', h((req) => (logic.deleteGroup(req.params.gid), { ok: true })));
adm.get('/groups/:gid/stats', h((req) => logic.groupStats(req.params.gid)));
adm.post('/groups/:gid/members', h((req) => {
  const { userId, username } = req.body || {};
  let uid = userId;
  if (!uid && username) {
    const u = logic.findUserByUsername(username);
    if (!u) throw httpError(404, `@${String(username).replace(/^@/, '')} ещё не запускал бота. Попроси его нажать /start, или добавь по Telegram ID.`);
    uid = u.id;
  }
  if (!/^\d+$/.test(String(uid || '')) && !logic.S.users[String(uid || '')]) throw httpError(400, 'Нужен Telegram ID (число) или @username');
  return logic.addMember(req.params.gid, uid);
}));
adm.delete('/groups/:gid/members/:uid', h((req) => (logic.removeMember(req.params.gid, req.params.uid), { ok: true })));
adm.get('/students/:uid', h((req) => ({ ...logic.userStats(req.params.uid), siteLogin: logic.accountOf(req.params.uid)?.[0] || null })));
// Входы на сайт: всем ученикам из Telegram, у кого их нет (бот пришлёт каждому в личку), или новый пароль одному
adm.post('/logins', h(async () => {
  const list = logic.issueLoginsAll();
  for (const l of list) l.sent = Boolean(await tg?.sendLogin(l));
  return list;
}));
// ───────── журнал: расписание, посещаемость, оценки ─────────
adm.get('/journal', h(() => journal.adminJournal()));
adm.get('/students/:uid/diary', h((req) => journal.diary(req.params.uid)));
adm.post('/groups/:gid/schedule', h((req) => ({ schedule: journal.setSchedule(req.params.gid, req.body?.slots) })));
adm.post('/groups/:gid/sessions', h((req) => journal.sessionOut(journal.startSession(req.params.gid, req.body || {}))));
adm.post('/sessions/:sid', h(async (req) => {
  const r = journal.markAttendance(req.params.sid, req.body?.absent);
  await tg?.onAttendance(r.session, r.fresh, { fromApp: true });
  return journal.sessionOut(r.session);
}));
adm.delete('/sessions/:sid', h((req) => (journal.deleteSession(req.params.sid), { ok: true })));
adm.post('/grades', h(async (req) => {
  const g = journal.addGrade(req.body || {});
  await tg?.notifyGrade(g);
  return g;
}));
adm.delete('/grades/:id', h((req) => (journal.deleteGrade(req.params.id), { ok: true })));
adm.post('/students/:uid/bonus', h(async (req) => {
  const r = logic.addBonus({ userId: req.params.uid, xp: req.body?.xp, reason: req.body?.reason });
  await tg?.notifyBonus(r.bonus);
  return r;
}));
adm.post('/students/:uid/login', h(async (req) => {
  const l = logic.issueLogin(req.params.uid, { reset: true });
  l.sent = Boolean(await tg?.sendLogin(l));
  return l;
}));
adm.post('/lessons', h(async (req) => {
  const l = logic.upsertLesson(req.body);
  for (const pub of logic.assignPersonal(l.id)) await tg?.notifyPersonal(pub);
  return l;
}));
adm.delete('/lessons/:lid', h((req) => (logic.deleteLesson(req.params.lid), { ok: true })));
adm.post('/publish', h(async (req) => {
  const { lessonId, groupId, reminder } = req.body || {};
  const { pub, already } = logic.publish(lessonId, groupId);
  if (!already) await tg?.notifyPublish(pub);
  if (reminder?.intervalMin) logic.createReminder({ ...reminder, groupId, pubId: pub.id, nextAt: Date.now() + reminder.intervalMin * 60_000 });
  return { pub, already };
}));
adm.post('/send-student', h(async (req) => {
  const { lessonId, userId, noLearn } = req.body || {};
  const { pub, already } = logic.sendToStudent(lessonId, userId, noLearn);
  if (!already) await tg?.notifyPersonal(pub);
  return { pub, already };
}));
// Дать доступ к тесту выбранным ученикам (один или много)
adm.post('/grant', h(async (req) => {
  const { lessonId, userIds, noLearn } = req.body || {};
  const { created, already } = logic.sendToStudents(lessonId, userIds, noLearn);
  for (const pub of created) await tg?.notifyPersonal(pub);
  return { given: created.length, already };
}));
// Открыть выбранным ученикам сразу несколько тестов
adm.post('/grant-many', h(async (req) => {
  const { userIds, lessonIds, noLearn } = req.body || {};
  const r = logic.grantLessons(userIds, lessonIds, noLearn);
  for (const [uid, pubs] of Object.entries(r.byUser)) await tg?.notifyAccess(uid, pubs);
  return { given: r.given, already: r.already, students: Object.keys(r.byUser).length };
}));
adm.post('/lessons/:lid/archive', h((req) => (logic.setArchived(req.params.lid, req.body?.archived !== false), { ok: true })));
adm.delete('/pubs/:pid', h((req) => (logic.unpublish(req.params.pid), { ok: true })));
adm.get('/pubs/:pid', h((req) => logic.pubStats(req.params.pid)));
adm.get('/pubs/:pid/attempts', h((req) => logic.pubAttempts(req.params.pid)));
adm.get('/groups/:gid/lessons/:lid/attempts', h((req) => logic.groupLessonAttempts(req.params.gid, req.params.lid)));
adm.get('/reminders', h(() => logic.listReminders()));
adm.post('/report', h(() => logic.report()));
adm.post('/reminders', h((req) => logic.createReminder(req.body || {})));
adm.patch('/reminders/:rid', h((req) => logic.setReminder(req.params.rid, req.body || {})));
adm.delete('/reminders/:rid', h((req) => (logic.deleteReminder(req.params.rid), { ok: true })));
adm.post('/announce', h(async (req) => {
  const { groupId, text } = req.body || {};
  if (!logic.S.groups[groupId]) throw httpError(404, 'Группа не найдена');
  if (!String(text || '').trim()) throw httpError(400, 'Пустое сообщение');
  if (!tg) throw httpError(503, 'Бот не запущен');
  return { ok: await tg.announce(groupId, String(text).trim()) };
}));
api.use('/admin', adm);
app.use('/api', api);

app.get('/healthz', (_req, res) => res.json({ ok: true }));

// ───────── бот ─────────
const useWebhook = Boolean(tg && PUBLIC_URL.startsWith('https://'));
const hookPath = '/tg/' + crypto.createHash('sha256').update(BOT_TOKEN).digest('hex').slice(0, 24);
if (useWebhook) app.post(hookPath, webhookCallback(tg.bot, 'express'));

// 3D-эмодзи не меняются — пусть кэшируются надолго
for (const dir of ['e', 'ea']) app.use('/' + dir, express.static(path.join(root, 'public', dir), { maxAge: '30d', immutable: true }));
// Код приложения не кэшируем: после деплоя Telegram сразу берёт новую версию (браузер сверяет ETag, это быстро)
app.use(express.static(path.join(root, 'public'), {
  extensions: ['html'],
  setHeaders: (res, file) => res.setHeader('Cache-Control', /\.(html|js|css|webmanifest)$/.test(file) ? 'no-cache' : 'public, max-age=300'),
}));
app.get('*', (_req, res) => res.sendFile(path.join(root, 'public', 'index.html')));

// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  const status = err.status || 500;
  if (status >= 500) console.error(err);
  res.status(status).json({ error: err.message || 'Ошибка сервера', ...(err.code ? { code: err.code } : {}), ...(err.mascot ? { mascot: err.mascot, food: err.food || null } : {}) });
});

app.listen(PORT, async () => {
  console.log(`[http] :${PORT}  app: ${PUBLIC_URL}/`);
  if (!tg) return console.log('[bot] BOT_TOKEN не задан — бот выключен');
  try {
    await tg.setup();
    if (useWebhook) {
      await tg.bot.api.setWebhook(PUBLIC_URL + hookPath, { allowed_updates: ['message', 'callback_query', 'my_chat_member'], drop_pending_updates: false });
      console.log('[bot] webhook установлен');
    } else {
      await tg.bot.api.deleteWebhook();
      tg.bot.start({ allowed_updates: ['message', 'callback_query', 'my_chat_member'] });
      console.log('[bot] long polling');
    }
    for (const pub of newPersonal) await tg.notifyPersonal(pub);
  } catch (e) {
    console.error('[bot] не удалось запустить:', e.message);
  }
  setInterval(() => tg.tickReminders().catch((e) => console.error('[reminders]', e)), 30_000);
  // журнал: в начале урока по расписанию бот спрашивает учителя «кого нет?»
  setInterval(() => tg.tickAttendance().catch((e) => console.error('[attendance]', e)), 30_000);
  // напоминалки ученикам и родителям три раза в день
  setInterval(() => tg.tickNudges().catch((e) => console.error('[nudge]', e)), 60_000);
});

// Бесплатный Render усыпляет сервис через 15 мин без запросов — тогда не уходят напоминания.
// Пингуем себя, чтобы сервис не засыпал.
if (process.env.RENDER_EXTERNAL_URL && process.env.KEEP_ALIVE !== '0') {
  setInterval(() => fetch(PUBLIC_URL + '/healthz').catch(() => {}), 10 * 60_000);
}

for (const sig of ['SIGTERM', 'SIGINT']) {
  process.on(sig, async () => {
    await store.flushNow().catch(() => {});
    process.exit(0);
  });
}
