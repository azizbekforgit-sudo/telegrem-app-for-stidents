// Точка входа: HTTP API для Mini App + Telegram-бот + планировщик напоминаний.
import { loadCode, localize } from './code.js';
import { reviewCode, wasAccepted, aiEnabled } from './review.js';
import { createSocial, ITEMS } from './social.js';
import { createWorld } from './world.js';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { webhookCallback } from 'grammy';
import { createStore } from './store.js';
import { createLogic, httpError, MASCOT_IDS } from './logic.js';
import { createJournal } from './journal.js';
import { createNudges } from './nudge.js';
import { createShop } from './shop.js';
import { verifyInitData } from './auth.js';
import { validateTranslation } from './grading.js';
import { createBot } from './bot.js';

const PORT = Number(process.env.PORT || 3000);
const BOT_TOKEN = process.env.BOT_TOKEN || '';
// Токен бота никогда не печатаем: ошибки Telegram содержат полный URL запроса с токеном
{
  const tok = process.env.BOT_TOKEN;
  if (tok) {
    const util = await import('node:util');
    const scrub = (a) => (typeof a === 'string' ? a : util.inspect(a, { depth: 4 })).split(tok).join('<BOT_TOKEN>');
    for (const k of ['log', 'error', 'warn', 'info']) { const orig = console[k].bind(console); console[k] = (...args) => orig(...args.map(scrub)); }
  }
}
const ADMIN_IDS = (process.env.ADMIN_IDS || '7183098167').split(',').map((s) => s.trim()).filter(Boolean);
const PUBLIC_URL = (process.env.PUBLIC_URL || process.env.RENDER_EXTERNAL_URL || `http://localhost:${PORT}`).replace(/\/$/, '');
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || '';
const ALLOW_DEV_AUTH = process.env.ALLOW_DEV_AUTH === '1';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const store = await createStore();
const logic = createLogic(store, { adminIds: ADMIN_IDS });
const journal = createJournal({ logic, store });
const shop = createShop({ logic, store });
const nudges = createNudges({ logic, journal, shop, store });
{ const n = shop.migrate(); if (n) console.log(`[shop] оставили бесплатно уже выбранных маскотов: ${n}`); }
{ const r = shop.revokeGifts(); if (r) { for (const x of r) console.log('[shop-v2] ' + JSON.stringify(x)); console.log(`[shop-v2-end] забрали подаренных маскотов у ${r.length}`); } }
// shop-v3: отменить покупку маскотов Бегзоду и Наргизе (купили по старой схеме, со второго счёта)
{ const r = shop.refundMascots('shop-v3', ['w06a4cd71', 'w4cc03e3b']); if (r) for (const x of r) console.log('[shop-v3] ' + JSON.stringify(x)); }
console.log(`[store] ${store.backend}`);

// Тесты, которые Claude готовит из конспектов, лежат в content/lessons/*.json — подхватываем при старте.
const CODE = loadCode(path.join(root, 'content', 'code'));
logic.setCode(CODE);
// Общение и «свой путь»: страницы, вопросы, оценки друг другу, звания, одежда питомцев, «Дом для питомца», опрос интересов
const social = createSocial({ logic, store, code: () => CODE, notifyTeacher: (text) => tg?.notifyAdmins(text) });
const world = createWorld({ logic, store, root });
logic.setExtraXp((uid) => social.peerXp(uid));
// Опрос интересов: учитель называет ученика → запись в content/interest.json [{ id, userId }]; каждый id один раз
{
  const f = path.join(root, 'content', 'interest.json');
  if (fs.existsSync(f)) for (const r of JSON.parse(fs.readFileSync(f, 'utf8'))) { const x = social.armInterest('interest:' + r.id, r.userId); if (x) console.log('[interest-arm] ' + JSON.stringify(x)); }
}
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

// Входы на сайт из content/accounts.json: [{ id, login, name, salt, hash }] (пароль только хешем scrypt); каждый id один раз
{
  const f = path.join(root, 'content', 'accounts.json');
  if (fs.existsSync(f)) for (const r of JSON.parse(fs.readFileSync(f, 'utf8'))) {
    const key = 'account:' + r.id;
    logic.S.migrations ||= {};
    if (logic.S.migrations[key]) continue;
    const login = String(r.login || '').trim().toLowerCase();
    if (logic.S.accounts?.[login]) { console.log(`[accounts-file] логин занят: ${login}`); logic.S.migrations[key] = Date.now(); continue; }
    const acc = logic.ensureAccount({ email: login, name: r.name, salt: r.salt, hash: r.hash });
    logic.S.migrations[key] = Date.now();
    store.save();
    console.log('[accounts-file] ' + JSON.stringify({ login, name: r.name, userId: acc?.userId }));
  }
}

// Группы из content/groups.json: [{ id, name, emoji, track, members: [userId] }]. Каждый id один раз:
// группа ищется по имени (нет — создаётся), ставится курс, ученики добавляются (лог [groups-file]).
{
  const f = path.join(root, 'content', 'groups.json');
  if (fs.existsSync(f)) for (const r of JSON.parse(fs.readFileSync(f, 'utf8'))) {
    const key = 'group:' + r.id;
    logic.S.migrations ||= {};
    if (logic.S.migrations[key]) continue;
    let g = Object.values(logic.S.groups).find((x) => x.name.trim().toLowerCase() === String(r.name).trim().toLowerCase());
    if (!g) g = logic.createGroup({ name: r.name, emoji: r.emoji, track: r.track });
    logic.updateGroup(g.id, { track: r.track || 'main', ...(r.emoji ? { emoji: r.emoji } : {}) });
    const added = [];
    let missing = 0;
    for (const uid of r.members || []) { if (!logic.S.users[uid]) { missing++; console.error(`[groups-file] нет ученика ${uid} — попробую при следующем запуске`); continue; } try { logic.addMember(g.id, uid); added.push(logic.name(logic.S.users[uid])); } catch (e) { console.error(`[groups-file] ${uid}: ${e.message}`); } }
    if (!missing) logic.S.migrations[key] = Date.now();
    store.save();
    console.log('[groups-file] ' + JSON.stringify({ group: g.name, id: g.id, track: g.track, added }));
  }
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

// Время уроков из content/schedule.json: объект или массив [{ id, groups: [{ match, slots }], students: [{ userId | username, slots, tzMin? }] }.
// Каждый id применяется один раз; дальше учитель меняет время в приложении.
const schedFile = path.join(root, 'content', 'schedule.json');
if (fs.existsSync(schedFile)) {
  const scs = [].concat(JSON.parse(fs.readFileSync(schedFile, 'utf8')));
  logic.S.migrations ||= {};
  for (const sc of scs) if (!logic.S.migrations['schedule:' + sc.id]) {
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
// Удалить тесты совсем (content/remove.json: ["id", …]); решённые не удаляются, а скрываются
// Удалить ученика полностью (content/purge.json: [{ id, userId }]); каждый id — один раз
const purgeFile = path.join(root, 'content', 'purge.json');
if (fs.existsSync(purgeFile)) for (const r of JSON.parse(fs.readFileSync(purgeFile, 'utf8'))) { const x = logic.purgeUser('purge:' + r.id, r.userId); if (x) console.log('[purge] ' + JSON.stringify(x)); }
// Второй шанс по тесту (content/resets.json: [{ id, userId, lessonId }]); каждый id — один раз
const resetsFile = path.join(root, 'content', 'resets.json');
if (fs.existsSync(resetsFile)) for (const r of JSON.parse(fs.readFileSync(resetsFile, 'utf8'))) { const x = logic.resetAttempts('reset:' + r.id, r.userId, r.lessonId); if (x) console.log('[reset] ' + JSON.stringify(x)); }
// Прибавка времени в контрольной (content/extend.json: [{ id, userId, lessonId, seconds }]); каждый id — один раз
// Вернуть в контрольную с сохранёнными ответами (content/resume.json: [{ id, userId, lessonId, seconds }]); каждый id — один раз
const resumeFile = path.join(root, 'content', 'resume.json');
if (fs.existsSync(resumeFile)) for (const r of JSON.parse(fs.readFileSync(resumeFile, 'utf8'))) { const x = logic.resumeGrant('resume:' + r.id, r.userId, r.lessonId, Number(r.seconds) || 0); if (x) console.log('[resume] ' + JSON.stringify(x)); }
const extendFile = path.join(root, 'content', 'extend.json');
if (fs.existsSync(extendFile)) for (const r of JSON.parse(fs.readFileSync(extendFile, 'utf8'))) { const x = logic.extendTime('extend:' + r.id, r.userId, r.lessonId, Number(r.seconds) || 0); if (x) console.log('[extend] ' + JSON.stringify(x)); }
const removeFile = path.join(root, 'content', 'remove.json');
if (fs.existsSync(removeFile)) for (const r of logic.removeLessons(JSON.parse(fs.readFileSync(removeFile, 'utf8')))) console.log('[remove] ' + JSON.stringify(r));

const tg = BOT_TOKEN && process.env.NO_BOT !== '1' ? createBot({ token: BOT_TOKEN, logic, journal, nudges, store, appUrl: PUBLIC_URL + '/', adminIds: ADMIN_IDS }) : null;

const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '2mb' }));

// ───────── авторизация ─────────
function auth(req, _res, next) {
  let tgUser = null;
  const initData = req.get('x-init-data');
  if (initData) tgUser = verifyInitData(initData, BOT_TOKEN);
  if (initData && !tgUser) {
    // подпись не сошлась или данные старые: пишем, кто это был (без проверки) и насколько старые данные
    const p = new URLSearchParams(initData);
    let who = null;
    try { const u = JSON.parse(p.get('user') || 'null'); who = u && { id: u.id, name: [u.first_name, u.last_name].filter(Boolean).join(' '), username: u.username || null }; } catch { /* */ }
    const age = Math.round(Date.now() / 1000 - Number(p.get('auth_date') || 0));
    console.log('[auth-fail] ' + JSON.stringify({ reason: age > 7 * 24 * 3600 ? 'старые данные Telegram' : 'подпись не сошлась', ageHours: Math.round(age / 3600), who, path: req.path }));
  }
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
  if (!tgUser) {
    if (!initData) console.log('[auth-fail] ' + JSON.stringify({ reason: 'нет данных Telegram и нет входа (открыли как сайт?)', path: req.path, ua: String(req.get('user-agent') || '').slice(0, 80) }));
    return next(httpError(401, 'Открой приложение через Telegram-бота'));
  }
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
// ───────── Мир Roblox (запросы от сервера игры по X-World-Token) ─────────
api.post('/world/link', h((req) => world.link(req.body || {})));
api.get('/world/pull', h((req) => world.pull(req.get('x-world-token'))));
api.post('/world/event', h((req) => world.event(req.get('x-world-token'), req.body || {})));
api.post('/world/win', h(async (req) => {
  const r = world.win(req.get('x-world-token'), req.body || {});
  if (r.xpAwarded > 0) await tg?.notifyWorldWin(r);
  return r;
}));

api.use(auth);
// ───────── Мир Roblox (запросы ученика из приложения) ─────────
api.get('/world/status', h((req) => world.status(req.user.id)));
api.post('/world/pair', h((req) => world.pair(req.user.id)));
api.post('/world/push', h((req) => world.push(req.user.id, req.body || {})));
api.post('/auth/logout', h((req) => (logic.logout(req.session), { ok: true })));

// ───────── ученик ─────────
// Главная + магазин: баланс XP, свои маскоты, зелья, состояние маскота
const withShop = (uid, m) => (m && !m.isAdmin && !m.isParent && !m.needRole ? { ...m, shop: { balance: shop.balance(uid), owned: shop.owned(uid), potions: logic.S.users[uid]?.potions || 0, pet: shop.pet(uid) } } : m);
api.get('/me', h((req) => { const m = withShop(req.user.id, logic.home(req.user.id)); const soc = m && !m.isAdmin && !m.isParent && !m.needRole ? social.summary(req.user.id) : null; return soc ? { ...m, social: soc } : m; }));
// ───── общение учеников ─────
api.get('/page/:uid', h((req) => social.page(req.user.id, req.params.uid)));
api.get('/inbox', h((req) => social.inbox(req.user.id)));
api.post('/ask', h((req) => social.ask(req.user.id, req.body?.to, req.body?.text)));
api.post('/answer', h((req) => social.answer(req.user.id, req.body?.id, req.body?.text)));
api.delete('/questions/:id', h((req) => social.removeQuestion(req.user.id, req.params.id)));
api.post('/rate', h((req) => social.rate(req.user.id, req.body?.to, req.body?.stars)));
api.get('/wardrobe', h((req) => social.wardrobe(req.user.id)));
api.post('/wardrobe/wear', h((req) => social.wear(req.user.id, req.body?.slot, req.body?.item || null)));
api.post('/wish', h((req) => social.wish(req.user.id, req.body?.text)));
api.get('/house', h((req) => social.house(req.user.id)));
api.post('/house/done', h((req) => social.houseDone(req.user.id, req.body?.k, req.body?.files, wasAccepted(req.user.id, 'house', 'h' + Number(req.body?.k), req.body?.files))));
api.post('/reflect', h((req) => social.reflect(req.user.id, req.body?.k, req.body?.text)));
api.post('/me/interests', h((req) => social.saveInterests(req.user.id, req.body?.answers)));
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
// задания «пишем код» прикрепляются к обучалке; домашка — отдельно (после теста)
const codeFor = (lessonId, lang) => { const c = CODE[lessonId]; return c ? localize({ allow: c.allow || [], topic: c.topic || '', sections: c.sections || {}, homework: c.homework || null }, lang) : null; };
api.post('/learn/start', h((req) => { const r = logic.startLearn(req.user.id, req.body || {}); return { ...r, code: codeFor(r.lesson.id, req.user.prefs?.lang || 'ru') }; }));
api.get('/code/:lessonId', h((req) => codeFor(req.params.lessonId, req.user.prefs?.lang || 'ru') || { none: true }));
// «Задачи» ученика по полочкам: ДЗ после теста, классная работа (код в обучалке), контрольные, испытания дома.
// Отдельно от «Пути»: здесь видно, что решено, а что ждёт.
function tasksOf(uid) {
  const lang = logic.S.users[uid]?.prefs?.lang || 'ru';
  const home = logic.home(uid);
  const done = (lessonId, key) => logic.S.code?.[`${uid}:${lessonId}:${key}`]?.at || null;
  const later = logic.S.users[uid]?.hwLater || {};
  const hw = [], cls = [], exams = [];
  for (const p of home.path || []) {
    if (p.exam) {
      exams.push({ kind: 'exam', pubId: p.pubId, lessonId: p.lessonId, title: p.title, emoji: p.emoji, strict: p.strict, timeLimit: p.timeLimit, questions: p.questions, codeCount: p.codeCount, done: p.best != null, best: p.best, at: p.publishedAt });
      continue;
    }
    const c = codeFor(p.lessonId, lang);
    if (!c) continue;
    const tested = p.best != null || Object.values(logic.S.attempts).some((a) => a.userId === String(uid) && a.lessonId === p.lessonId && a.finishedAt && !a.preview);
    if (c.homework && (tested || done(p.lessonId, 'hw'))) {
      hw.push({ kind: 'hw', key: 'hw', pubId: p.pubId, lessonId: p.lessonId, order: p.order, lesson: p.title, emoji: p.emoji, title: c.homework.title, intro: c.homework.intro || '', steps: c.homework.steps?.length || 0, done: done(p.lessonId, 'hw'), later: later[p.lessonId] || null });
    }
    if (p.learnDone || Object.keys(c.sections || {}).some((k) => done(p.lessonId, 's' + k))) {
      for (const [k, t] of Object.entries(c.sections || {})) {
        cls.push({ kind: 'class', key: 's' + k, pubId: p.pubId, lessonId: p.lessonId, order: p.order, lesson: p.title, emoji: p.emoji, title: t.title, intro: t.intro || '', steps: t.steps?.length || 0, section: Number(k) + 1, done: done(p.lessonId, 's' + k) });
      }
    }
  }
  const byOrder = (a, b) => Boolean(a.done) - Boolean(b.done) || (b.order ?? 0) - (a.order ?? 0);
  hw.sort(byOrder); cls.sort(byOrder); exams.sort((a, b) => Boolean(a.done) - Boolean(b.done) || b.at - a.at);
  const h = social.house(uid);
  const house = { done: h.done.length, total: h.total, pet: h.pet };
  const pending = hw.filter((x) => !x.done).length + cls.filter((x) => !x.done).length + exams.filter((x) => !x.done).length + (house.done < house.total ? 1 : 0);
  return { hw, class: cls, exams, house, pending };
}
// Подарки ученику из content/grants.json: [{ id, userId | login, unlockAll?: true, setXp?: N, reason? }].
// unlockAll — вся мебель и вся одежда открыты; setXp — XP становится ровно N (разница пишется бонусом).
// Каждый id один раз (лог [grant]).
{
  const f = path.join(root, 'content', 'grants.json');
  if (fs.existsSync(f)) for (const g of JSON.parse(fs.readFileSync(f, 'utf8'))) {
    const key = 'grant:' + g.id;
    logic.S.migrations ||= {};
    if (logic.S.migrations[key]) continue;
    const uid = g.userId || logic.S.accounts?.[String(g.login || '').trim().toLowerCase()]?.userId;
    const u = uid && logic.S.users[uid];
    if (!u) { console.error(`[grant] не найден ученик: ${g.login || g.userId}`); continue; }
    if (g.unlockAll) { u.unlockAll = true; u.wardrobe ||= { owned: [], wear: {} }; u.wardrobe.owned = Object.keys(ITEMS); }
    if (g.allMascots) u.owned = [...new Set([...(u.owned || []), ...MASCOT_IDS])];
    let diff = 0;
    if (Number.isFinite(g.setXp)) {
      diff = Math.trunc(g.setXp - logic.totalXp(u.id));
      if (diff) { logic.S.bonuses ||= {}; logic.S.bonuses[key] = { id: key, userId: u.id, xp: diff, reason: String(g.reason || 'Подарок учителя').slice(0, 200), at: Date.now() }; }
    }
    logic.S.migrations[key] = Date.now();
    store.save();
    console.log('[grant] ' + JSON.stringify({ user: { id: u.id, name: logic.name(u) }, unlockAll: Boolean(g.unlockAll), mascots: g.allMascots ? (u.owned || []).length : undefined, xpDiff: diff, xpNow: logic.totalXp(u.id) }));
  }
}
api.get('/tasks', h((req) => tasksOf(req.user.id)));
api.get('/room', h((req) => social.room(req.user.id)));
api.post('/room', h((req) => social.saveRoom(req.user.id, req.body?.room)));
api.post('/tasks/later', h((req) => {
  const u = logic.S.users[req.user.id];
  const id = String(req.body?.lessonId || '').slice(0, 80);
  u.hwLater ||= {};
  u.hwLater[id] = Date.now();
  store.save();
  console.log('[hw-later] ' + JSON.stringify({ user: { id: u.id, name: logic.name(u) }, lesson: id }));
  return { ok: true };
}));
// «Проверить» в редакторе: шаги регэкспами, а что не засчитано — смотрит Claude (src/review.js)
api.post('/code/review', h(async (req) => {
  const { lessonId, key, files, console: consoleText } = req.body || {};
  const lang = req.user.prefs?.lang || 'ru';
  let task = null, topic = '';
  if (lessonId === 'house') {
    const k = Number(String(key || '').replace(/^h/, ''));
    const c = social.HOUSE(req.user.id)[k - 1];
    if (c) { task = social.personalize(c, social.ctxOf(req.user.id)); topic = 'Pet house'; }
  } else {
    const c = CODE[String(lessonId || '')];
    const raw = !c ? null : key === 'hw' ? c.homework : /^s\d+$/.test(String(key)) ? c.sections?.[String(key).slice(1)] : null;
    if (raw) { task = localize(raw, lang); topic = localize(c.topic || '', lang); }
  }
  if (!task) throw httpError(404, 'Нет такого задания');
  return reviewCode({ uid: req.user.id, lessonId, key, task, files, consoleText: String(consoleText || ''), lang, topic });
}));
api.post('/code/done', h((req) => {
  const { lessonId, task, files } = req.body || {};
  const key = `${req.user.id}:${String(lessonId).slice(0, 80)}:${String(task).slice(0, 20)}`;
  logic.S.code ||= {};
  const first = !logic.S.code[key];
  logic.S.code[key] = { at: Date.now(), files: files && typeof files === 'object' ? Object.fromEntries(Object.entries(files).slice(0, 6).map(([k, v]) => [String(k).slice(0, 40), String(v).slice(0, 20000)])) : null };
  store.save();
  console.log('[code] ' + JSON.stringify({ user: { id: req.user.id, name: logic.name(req.user) }, lesson: lessonId, task, first }));
  return { ok: true };
}));
api.post('/learn/check', h((req) => logic.checkLearn(req.user.id, req.body || {}, Number(req.body.section), Number(req.body.index), req.body.answer)));
api.post('/learn/finish', h((req) => logic.finishLearn(req.user.id, req.body || {})));
api.post('/attempts/:id/answer', h((req) => logic.answer(req.user.id, req.params.id, Number(req.body.index), req.body.answer, Boolean(req.body.timeout))));
api.post('/attempts/:id/retry', h((req) => logic.retry(req.user.id, req.params.id, Number(req.body.index), req.body.answer)));
api.post('/attempts/:id/finish', h((req) => logic.finish(req.user.id, req.params.id)));
// строгая контрольная: предупреждение (ушёл с полного экрана / из приложения) и выход из теста
api.post('/attempts/:id/warn', h((req) => logic.warn(req.user.id, req.params.id, req.body?.why)));
api.post('/attempts/:id/forfeit', h((req) => logic.forfeit(req.user.id, req.params.id, req.body?.reason)));

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
adm.get('/social', h(() => social.adminFeed()));
adm.get('/roster', h(() => {
  const o = logic.adminOverview();
  const gName = Object.fromEntries(o.groups.map((g) => [g.id, `${g.emoji} ${g.name}`]));
  return o.students.map((s) => {
    const u = logic.S.users[s.id];
    const ts = logic.testStatus(s.id);
    const done = ts.filter((t) => t.doneAt);
    const debts = ts.filter((t) => !t.doneAt).map((t) => t.title('ru'));
    const pcts = done.map((t) => t.pct).filter((x) => x != null);
    let d = null;
    try { d = journal.diary(s.id).stats; } catch { /* нет журнала */ }
    let t = null;
    try { t = tasksOf(s.id); } catch { /* */ }
    const pr = social.progressOf(s.id);
    const lastRes = Object.values(logic.S.attempts).filter((a) => a.userId === s.id && a.finishedAt && !a.preview).reduce((m, a) => Math.max(m, a.finishedAt), 0) || null;
    return {
      id: s.id, name: s.name, prefs: u?.prefs || null, groups: (s.groups || []).map((g) => gName[g]).filter(Boolean), groupIds: s.groups || [],
      xp: logic.totalXp(s.id), streak: u?.streak || 0,
      tests: { given: ts.length, done: done.length, avg: pcts.length ? Math.round(pcts.reduce((a, b) => a + b, 0) / pcts.length) : null }, debts,
      hw: t ? { done: t.hw.filter((x) => x.done).length, total: t.hw.length } : null,
      attendance: d ? { pct: d.attendance, missed: d.missed, lessons: d.lessons } : null, grade: d?.avgGrade ?? null,
      house: pr.house, lastSeenAt: u?.lastSeenAt || null, lastResultAt: lastRes,
    };
  });
}));
adm.post('/wishes/:id', h((req) => social.wishDone(req.params.id, req.body?.done !== false)));
adm.get('/students/:uid/diary', h((req) => journal.diary(req.params.uid)));
adm.post('/groups/:gid/schedule', h((req) => ({ schedule: journal.setSchedule(req.params.gid, req.body?.slots) })));
adm.post('/students/:uid/schedule', h((req) => ({ schedule: journal.setUserSchedule(req.params.uid, req.body?.slots) })));
adm.post('/students/:uid/sessions', h(async (req) => {
  const r = journal.studentSession(req.params.uid, req.body || {});
  if (req.body?.present !== undefined) await tg?.onAttendance(r.session, r.fresh, { fromApp: true });
  return { session: journal.sessionOut(r.session) };
}));
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
// Родители: кто у кого, вход на сайт, привязка детей
adm.get('/parents', h(() => logic.parentsOverview()));
adm.post('/parents/:uid/login', h(async (req) => {
  const l = logic.issueLogin(req.params.uid, { reset: true });
  await tg?.sendLogin(l);
  return l;
}));
adm.post('/parents/:uid/children', h((req) => logic.setChildren(req.params.uid, req.body?.ids)));
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
// Monaco — редактор из VS Code (npm monaco-editor), для мини VS Code на компьютере
app.use('/monaco/vs', express.static(path.join(root, 'node_modules', 'monaco-editor', 'min', 'vs'), { maxAge: '30d', immutable: true }));
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
    // Сообщить родителям о нерешённых тестах ребёнка (content/parent-notify.json: [{ id, userId }]); каждый id — один раз
    const pnFile = path.join(root, 'content', 'parent-notify.json');
    if (fs.existsSync(pnFile)) for (const r of JSON.parse(fs.readFileSync(pnFile, 'utf8'))) {
      const key = 'pnotify:' + r.id;
      logic.S.migrations ||= {};
      if (logic.S.migrations[key]) continue;
      logic.S.migrations[key] = Date.now();
      store.save();
      console.log('[parent-notify] ' + JSON.stringify(await tg.notifyParentsDebts(r.userId)));
    }
  } catch (e) {
    console.error('[bot] не удалось запустить:', e.message);
  }
  setInterval(() => tg.tickReminders().catch((e) => console.error('[reminders]', e)), 30_000);
  setInterval(() => { try { logic.sweepStrict(); } catch (e) { console.error('[strict]', e); } }, 5 * 60_000);
  // журнал: в начале урока по расписанию бот спрашивает учителя «кого нет?»
  setInterval(() => tg.tickAttendance().catch((e) => console.error('[attendance]', e)), 30_000);
  // напоминалки ученикам и родителям три раза в день
  setInterval(() => tg.tickNudges().catch((e) => console.error('[nudge]', e)), 60_000);
});

// Бесплатные хостинги (Render, Koyeb) усыпляют сервис без запросов — тогда не уходят напоминания.
// Пингуем себя по публичному адресу, чтобы сервис не засыпал.
if (PUBLIC_URL.startsWith('https://') && process.env.KEEP_ALIVE !== '0') {
  setInterval(() => fetch(PUBLIC_URL + '/healthz').catch(() => {}), 10 * 60_000);
}

for (const sig of ['SIGTERM', 'SIGINT']) {
  process.on(sig, async () => {
    await store.flushNow().catch(() => {});
    process.exit(0);
  });
}
