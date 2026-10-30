// Точка входа: HTTP API для Mini App + Telegram-бот + планировщик напоминаний.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import express from 'express';
import { webhookCallback } from 'grammy';
import { createStore } from './store.js';
import { createLogic, httpError } from './logic.js';
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

// Учётные записи для входа на сайте: SEED_ACCOUNTS="почта:пароль:Имя;почта2:пароль2:Имя2"
for (const row of (process.env.SEED_ACCOUNTS || '').split(';').map((x) => x.trim()).filter(Boolean)) {
  const [email, password, name] = row.split(':');
  if (logic.ensureAccount({ email, password, name })) console.log(`[accounts] ${email}`);
}

const tg = BOT_TOKEN && process.env.NO_BOT !== '1' ? createBot({ token: BOT_TOKEN, logic, store, appUrl: PUBLIC_URL + '/', adminIds: ADMIN_IDS }) : null;

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
api.get('/me', h((req) => logic.home(req.user.id)));
api.post('/me/prefs', h((req) => logic.setPrefs(req.user.id, req.body || {})));
api.get('/stats/me', h((req) => logic.userStats(req.user.id)));
api.get('/leaderboard/:gid', h((req) => {
  if (!req.admin && !logic.userGroups(req.user.id).some((g) => g.id === req.params.gid)) throw httpError(403, 'Не твоя группа');
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
adm.get('/students/:uid', h((req) => logic.userStats(req.params.uid)));
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
adm.delete('/pubs/:pid', h((req) => (logic.unpublish(req.params.pid), { ok: true })));
adm.get('/pubs/:pid', h((req) => logic.pubStats(req.params.pid)));
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
app.use(express.static(path.join(root, 'public'), { extensions: ['html'], maxAge: '5m' }));
app.get('*', (_req, res) => res.sendFile(path.join(root, 'public', 'index.html')));

// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  const status = err.status || 500;
  if (status >= 500) console.error(err);
  res.status(status).json({ error: err.message || 'Ошибка сервера' });
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
