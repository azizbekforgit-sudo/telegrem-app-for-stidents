// Вся предметная логика: ученики, группы, тесты, попытки, статистика.
import crypto from 'node:crypto';
import { checkAnswer, choicePerm, publicQuestion, validateLesson } from './grading.js';
import { buildLevel, LEVEL_XP, LEVEL_TIME } from './levels.js';

const log = (tag, obj) => console.log(`[${tag}] ` + JSON.stringify(obj));

const TZ = process.env.TZ_NAME || 'Asia/Tashkent';
const dayKey = (d = new Date()) => new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(d);
const prevDay = (key) => {
  const d = new Date(key + 'T12:00:00Z');
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
};
const pct = (c, t) => (t ? Math.round((c / t) * 100) : 0);
const avg = (xs) => (xs.length ? Math.round(xs.reduce((a, b) => a + b, 0) / xs.length) : null);

export const MASCOT_IDS = ['mimi', 'kapi', 'dino', 'axi', 'boo', 'ano', 'zip', 'ugo', 'fox', 'bot', 'plu'];
export const ACCENTS = ['lime', 'sakura', 'lavender', 'ocean', 'peach', 'mint'];

export const ACHIEVEMENTS = {
  first: { icon: '🌱', title: 'Первый шаг', desc: 'Пройди первый тест' },
  five: { icon: '🖐️', title: 'Пятёрка', desc: 'Пройди 5 тестов' },
  perfect: { icon: '💎', title: 'Идеально', desc: 'Сдай тест на 100%' },
  combo5: { icon: '⚡', title: 'Комбо-мастер', desc: 'Ответь правильно 5 раз подряд' },
  streak3: { icon: '🔥', title: 'В огне', desc: 'Занимайся 3 дня подряд' },
  champion: { icon: '🏆', title: 'Чемпион', desc: 'Стань №1 в лиге группы' },
};

export function createLogic(store, { adminIds }) {
  const S = store.state;
  const isAdmin = (id) => adminIds.includes(String(id));
  const name = (u) => (u ? [u.firstName, u.lastName].filter(Boolean).join(' ') || (u.username ? '@' + u.username : `ID ${u.id}`) : '—');

  // ───────── пользователи и группы ─────────
  function upsertUser(tg) {
    const id = String(tg.id);
    const existed = Boolean(S.users[id]);
    // новые пользователи сначала выбирают роль (ученик / родитель); старых это не касается
    const u = S.users[id] || { id, joinedAt: Date.now(), streak: 0, lastDay: null, needRole: !isAdmin(id) };
    u.firstName = tg.first_name ?? tg.firstName ?? u.firstName ?? '';
    u.lastName = tg.last_name ?? tg.lastName ?? u.lastName ?? '';
    u.username = tg.username ?? u.username ?? '';
    if (tg.photo_url) u.photoUrl = tg.photo_url;
    u.lastSeenAt = Date.now();
    S.users[id] = u;
    store.save();
    return { user: u, isNew: !existed };
  }

  const userGroups = (uid) => Object.values(S.groups).filter((g) => g.memberIds.includes(String(uid)));
  const isParent = (id) => S.users[String(id)]?.role === 'parent';
  const students = () => Object.values(S.users).filter((u) => !isAdmin(u.id) && u.role !== 'parent');

  // ───────── родители ─────────
  function setRole(uid, role) {
    const u = S.users[String(uid)];
    if (!u) throw httpError(404, 'Пользователь не найден');
    if (!['student', 'parent'].includes(role)) throw httpError(400, 'Неизвестная роль');
    if (!u.needRole) throw httpError(400, 'Роль уже выбрана');
    u.role = role;
    delete u.needRole;
    if (role === 'parent') u.children = [];
    store.save();
    return u;
  }
  function setChildren(uid, ids) {
    const u = S.users[String(uid)];
    if (!isParent(uid)) throw httpError(403, 'Только для родителей');
    const ok = new Set(students().map((x) => x.id));
    u.children = [...new Set((ids || []).map(String))].filter((id) => ok.has(id)).slice(0, 10);
    store.save();
    return { children: u.children };
  }
  const leagueRank = () => new Map(globalLeague().rows.map((r) => [r.userId, r.rank]));
  function studentCard(u, ranks) {
    const bests = pubsForUser(u.id).map((p) => best(u.id, p.id)).filter(Boolean);
    return { ...publicUser(u), groups: userGroups(u.id).map((g) => ({ id: g.id, name: g.name, emoji: g.emoji })), xp: totalXp(u.id), streak: currentStreak(u), done: bests.length, total: pubsForUser(u.id).length, avg: avg(bests.map((b) => b.pct)), rank: ranks.get(u.id) || null, mistakes: mistakesOf(u.id).length };
  }
  function parentHome(uid) {
    const u = S.users[String(uid)];
    const ranks = leagueRank();
    const kids = (u.children || []).map((id) => S.users[id]).filter(Boolean).map((k) => studentCard(k, ranks));
    const gids = [...new Set(kids.flatMap((k) => k.groups.map((g) => g.id)))];
    return {
      user: publicUser(u), isAdmin: false, isParent: true, role: 'parent', xp: 0, streak: 0,
      children: kids, childIds: kids.map((k) => k.id),
      groups: gids.map((id) => S.groups[id]).filter(Boolean).map((g) => ({ id: g.id, name: g.name, emoji: g.emoji })),
      totalStudents: students().length,
    };
  }
  // Для учителя: все родители, их дети, когда заходили, есть ли вход на сайт; и ученики без родителя в приложении
  function parentsOverview() {
    const kids = new Map();
    const parents = Object.values(S.users).filter((u) => u.role === 'parent').map((p) => {
      const children = (p.children || []).map((id) => S.users[id]).filter(Boolean).map((k) => {
        if (!kids.has(k.id)) kids.set(k.id, []);
        kids.get(k.id).push(name(p));
        return { id: k.id, name: name(k), groups: userGroups(k.id).map((g) => ({ name: g.name, emoji: g.emoji })) };
      });
      return { ...publicUser(p), lastSeenAt: p.lastSeenAt || null, login: accountOf(p.id)?.[0] || null, children };
    }).sort((a, b) => (b.children.length ? 1 : 0) - (a.children.length ? 1 : 0) || (b.lastSeenAt || 0) - (a.lastSeenAt || 0));
    const pending = Object.values(S.users).filter((u) => u.needRole && !isAdmin(u.id)).map((u) => ({ ...publicUser(u), lastSeenAt: u.lastSeenAt || null }));
    const withoutParent = students().filter((u) => !kids.has(u.id)).map((u) => ({ id: u.id, name: name(u), groups: userGroups(u.id).map((g) => ({ name: g.name, emoji: g.emoji })) })).sort((a, b) => a.name.localeCompare(b.name));
    return { parents, pending, withoutParent };
  }
  function parentStudents() {
    const ranks = leagueRank();
    return students().map((u) => studentCard(u, ranks)).sort((a, b) => (a.rank || 1e9) - (b.rank || 1e9) || a.name.localeCompare(b.name));
  }
  const unassigned = () => students().filter((u) => userGroups(u.id).length === 0).sort((a, b) => b.joinedAt - a.joinedAt);

  function createGroup({ name: gname, emoji }) {
    const g = { id: store.nextId('g'), name: String(gname || '').trim().slice(0, 40) || 'Группа', emoji: emoji || '📘', chatId: null, chatTitle: null, memberIds: [], createdAt: Date.now() };
    S.groups[g.id] = g;
    store.save();
    return g;
  }
  function updateGroup(gid, patch) {
    const g = S.groups[gid];
    if (!g) throw httpError(404, 'Группа не найдена');
    if (patch.name) g.name = String(patch.name).trim().slice(0, 40);
    if (patch.emoji) g.emoji = patch.emoji;
    store.save();
    return g;
  }
  function deleteGroup(gid) {
    delete S.groups[gid];
    for (const p of Object.values(S.pubs)) if (p.groupId === gid) delete S.pubs[p.id];
    for (const r of Object.values(S.reminders)) if (r.groupId === gid) delete S.reminders[r.id];
    store.save();
  }
  function addMember(gid, uid) {
    const g = S.groups[gid];
    if (!g) throw httpError(404, 'Группа не найдена');
    uid = String(uid);
    if (!S.users[uid]) S.users[uid] = { id: uid, firstName: '', lastName: '', username: '', joinedAt: Date.now(), streak: 0, lastDay: null };
    if (!g.memberIds.includes(uid)) g.memberIds.push(uid);
    store.save();
    return g;
  }
  function removeMember(gid, uid) {
    const g = S.groups[gid];
    if (g) g.memberIds = g.memberIds.filter((x) => x !== String(uid));
    store.save();
  }
  // ───────── вход на сайте по почте и паролю (для тех, у кого нет Telegram) ─────────
  const sha = (t) => crypto.createHash('sha256').update(String(t)).digest('hex');
  const hashPw = (pw, salt) => crypto.scryptSync(String(pw), salt, 32).toString('hex');
  const SESSION_DAYS = 120;
  function ensureAccount({ email, password, name }) {
    S.accounts ||= {};
    const key = String(email || '').trim().toLowerCase();
    if (!key || !password) return null;
    let acc = S.accounts[key];
    if (!acc) {
      const userId = 'w' + crypto.randomBytes(4).toString('hex');
      acc = S.accounts[key] = { userId, createdAt: Date.now() };
      S.users[userId] = { id: userId, firstName: name || key.split('@')[0], lastName: '', username: '', email: key, joinedAt: Date.now(), streak: 0, lastDay: null };
    }
    if (!acc.hash || hashPw(password, acc.salt) !== acc.hash) {
      acc.salt = crypto.randomBytes(16).toString('hex');
      acc.hash = hashPw(password, acc.salt);
    }
    if (name && S.users[acc.userId]) S.users[acc.userId].firstName = name;
    store.save();
    return acc;
  }
  // Вход на сайт для ученика из Telegram: логин и пароль ведут в его же аккаунт (тот же ID)
  const TRANSLIT = { а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'yo', ж: 'j', з: 'z', и: 'i', й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'h', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'sh', ъ: '', ы: 'i', ь: '', э: 'e', ю: 'yu', я: 'ya', ў: 'o', қ: 'q', ғ: 'g', ҳ: 'h' };
  const accountOf = (uid) => Object.entries(S.accounts || {}).find(([, a]) => a.userId === String(uid));
  function newLogin(u) {
    const base = [...String(u.firstName || u.username || '').toLowerCase()].map((ch) => TRANSLIT[ch] ?? ch).join('').replace(/[^a-z0-9]/g, '').slice(0, 12) || 'student';
    let login = base + String(u.id).slice(-4);
    for (let i = 2; S.accounts?.[login]; i++) login = base + String(u.id).slice(-4) + i;
    return login;
  }
  const newPassword = () => { const abc = 'abcdefghjkmnpqrstuvwxyz23456789'; return Array.from(crypto.randomBytes(8), (b) => abc[b % abc.length]).join(''); };
  // reset: выдать новый пароль, даже если вход уже есть
  function issueLogin(uid, { reset = false } = {}) {
    const u = S.users[String(uid)];
    if (!u || isAdmin(u.id)) throw httpError(404, 'Пользователь не найден');
    S.accounts ||= {};
    const had = accountOf(u.id);
    if (had && !reset) return { userId: u.id, name: name(u), login: had[0], password: null };
    const login = had ? had[0] : newLogin(u);
    const password = newPassword();
    const salt = crypto.randomBytes(16).toString('hex');
    S.accounts[login] = { ...(had?.[1] || { createdAt: Date.now() }), userId: u.id, salt, hash: hashPw(password, salt) };
    store.save();
    return { userId: u.id, name: name(u), login, password };
  }
  // Входы всем ученикам из Telegram, у которых их ещё нет
  function issueLoginsAll() {
    return students().filter((u) => !accountOf(u.id) && !String(u.id).startsWith('w')).map((u) => issueLogin(u.id));
  }

  function login(email, password) {
    const acc = S.accounts?.[String(email || '').trim().toLowerCase()];
    const ok = acc && crypto.timingSafeEqual(Buffer.from(hashPw(password, acc.salt), 'hex'), Buffer.from(acc.hash, 'hex'));
    if (!ok) throw httpError(401, 'Неверный логин или пароль');
    const token = crypto.randomBytes(24).toString('hex');
    S.sessions ||= {};
    S.sessions[sha(token)] = { userId: acc.userId, createdAt: Date.now() };
    store.save();
    return { token };
  }
  function sessionUser(token) {
    const s = token && S.sessions?.[sha(token)];
    if (!s || Date.now() - s.createdAt > SESSION_DAYS * 86400e3) return null;
    return S.users[s.userId] || null;
  }
  function logout(token) {
    if (token && S.sessions) delete S.sessions[sha(token)];
    store.save();
  }

  function findUserByUsername(username) {
    const n = String(username).replace(/^@/, '').toLowerCase();
    return Object.values(S.users).find((u) => (u.username || '').toLowerCase() === n);
  }

  // ───────── уроки и публикации ─────────
  function upsertLesson(lesson, { source = 'api' } = {}) {
    const errs = validateLesson(lesson);
    if (errs.length) throw httpError(400, 'Урок с ошибками: ' + errs.join('; '));
    const prev = S.lessons[lesson.id];
    const hasAttempts = prev && Object.values(S.attempts).some((a) => a.lessonId === lesson.id && !a.preview);
    if (prev && hasAttempts && source === 'content') {
      // уже решали — вопросы теста не меняем, но обучалку и список «личных» обновить можно
      prev.learn = lesson.learn || prev.learn || null;
      prev.personal = lesson.personal || prev.personal || null;
      prev.tr = lesson.tr || prev.tr || null;
      prev.kind = lesson.kind || prev.kind || 'lesson';
      if (lesson.order !== undefined) prev.order = lesson.order == null ? null : Number(lesson.order);
      // qrev: вопросы поправили на месте (тот же порядок и число) — заменяем, результаты остаются
      if ((lesson.qrev || 0) > (prev.qrev || 0) && lesson.questions.length === prev.questions.length) {
        prev.questions = lesson.questions;
        prev.topics = [...new Set(lesson.questions.map((q) => q.topic).filter(Boolean))];
        prev.qrev = lesson.qrev;
        console.log(`[qrev] ${lesson.id} → ${lesson.qrev}`);
      }
      store.save();
      return prev;
    }
    const topics = [...new Set(lesson.questions.map((q) => q.topic).filter(Boolean))];
    S.lessons[lesson.id] = {
      id: lesson.id,
      title: lesson.title,
      emoji: lesson.emoji || '📗',
      description: lesson.description || '',
      topics,
      questions: lesson.questions,
      kind: lesson.kind || 'lesson',
      qrev: lesson.qrev || 0,
      order: lesson.order != null ? Number(lesson.order) : (prev?.order ?? null),
      archived: prev?.archived || false,
      archiveApplied: prev?.archiveApplied || false,
      learn: lesson.learn || null,
      personal: lesson.personal || null,
      tr: lesson.tr || null,
      createdAt: prev?.createdAt || Date.now(),
      updatedAt: Date.now(),
    };
    store.save();
    return S.lessons[lesson.id];
  }
  // Личные задания: урок с полем personal: [userId] сразу назначается этим ученикам
  function assignPersonal(lessonId) {
    const l = S.lessons[lessonId];
    const created = [];
    for (const uid of l?.personal || []) {
      const id = String(uid);
      if (Object.values(S.pubs).some((p) => p.lessonId === lessonId && p.userId === id)) continue;
      if (!S.users[id]) S.users[id] = { id, firstName: '', lastName: '', username: '', joinedAt: Date.now(), streak: 0, lastDay: null };
      const pub = { id: store.nextId('p'), lessonId, groupId: null, userId: id, publishedAt: Date.now() };
      S.pubs[pub.id] = pub;
      created.push(pub);
    }
    if (created.length) store.save();
    return created;
  }

  function deleteLesson(lid) {
    if (Object.values(S.pubs).some((p) => p.lessonId === lid)) throw httpError(400, 'Тест уже отправлен — сначала отзови его у групп');
    delete S.lessons[lid];
    store.save();
  }
  function publish(lessonId, groupId) {
    if (!S.lessons[lessonId]) throw httpError(404, 'Тест не найден');
    if (!S.groups[groupId]) throw httpError(404, 'Группа не найдена');
    const exists = Object.values(S.pubs).find((p) => p.lessonId === lessonId && p.groupId === groupId);
    if (exists) return { pub: exists, already: true };
    const pub = { id: store.nextId('p'), lessonId, groupId, publishedAt: Date.now() };
    S.pubs[pub.id] = pub;
    store.save();
    return { pub, already: false };
  }
  // Отправить тест одному ученику (личная публикация). noLearn: сразу тест, без обучалки
  function sendToStudent(lessonId, userId, noLearn, extra = {}) {
    if (!S.lessons[lessonId]) throw httpError(404, 'Тест не найден');
    const id = String(userId || '');
    if (!S.users[id] || isAdmin(id)) throw httpError(404, 'Ученик не найден');
    // доступ уже есть (лично или через группу) — второй раз не выдаём
    const exists = pubsForUser(id).find((p) => p.lessonId === lessonId);
    if (exists) return { pub: exists, already: true };
    const pub = { id: store.nextId('p'), lessonId, groupId: null, userId: id, noLearn: Boolean(noLearn), publishedAt: Date.now(), ...(extra.noXp ? { noXp: true } : {}), ...(extra.auto ? { auto: true } : {}) };
    S.pubs[pub.id] = pub;
    store.save();
    return { pub, already: false };
  }
  // Открыть выбранным ученикам сразу несколько тестов
  function grantLessons(userIds, lessonIds, noLearn) {
    const users = [...new Set((userIds || []).map(String))];
    const lessons = [...new Set((lessonIds || []).map(String))];
    if (!users.length) throw httpError(400, 'Выбери хотя бы одного ученика');
    if (!lessons.length) throw httpError(400, 'Выбери хотя бы один тест');
    for (const lid of lessons) if (!S.lessons[lid]) throw httpError(404, 'Тест не найден');
    const byUser = {};
    let already = 0;
    for (const uid of users) {
      for (const lid of lessons) {
        const r = sendToStudent(lid, uid, noLearn);
        if (r.already) already++; else (byUser[uid] ||= []).push(r.pub);
      }
    }
    return { byUser, given: Object.values(byUser).reduce((n, a) => n + a.length, 0), already };
  }
  // Один раз: каждому, у кого уже есть доступ к уроку N, открываем все уроки с 1 по N. Эти уроки без очков (ученик их уже проходил)
  function migrateAccess(key = 'access-v1') {
    S.migrations ||= {};
    if (S.migrations[key]) return null;
    const report = [];
    const course = Object.values(S.lessons).filter((l) => Number.isFinite(l.order) && l.order < 100 && !l.personal && !l.archived).sort((a, b) => a.order - b.order);
    for (const u of students()) {
      const mine = pubsForUser(u.id);
      const orders = mine.map((p) => S.lessons[p.lessonId]?.order ?? (p.lessonId === 'lessons-01-03-html-css' ? 3 : undefined)).filter((o) => Number.isFinite(o) && o < 100);
      if (!orders.length) continue;
      const max = Math.max(...orders);
      const have = new Set(mine.map((p) => p.lessonId));
      const opened = [];
      for (const l of course) {
        if (l.order > max || have.has(l.id)) continue;
        const r = sendToStudent(l.id, u.id, false, { noXp: true, auto: true });
        if (!r.already) opened.push(l.order);
      }
      report.push({ user: { id: u.id, name: name(u) }, had: [...new Set(orders)].sort((a, b) => a - b), opened });
    }
    S.migrations[key] = Date.now();
    store.save();
    return report;
  }
  // Дать доступ к тесту сразу нескольким ученикам. Повторно тем, у кого он уже есть, не выдаётся
  function sendToStudents(lessonId, userIds, noLearn) {
    if (!S.lessons[lessonId]) throw httpError(404, 'Тест не найден');
    const ids = [...new Set((userIds || []).map(String))];
    if (!ids.length) throw httpError(400, 'Выбери хотя бы одного ученика');
    const created = [];
    let already = 0;
    for (const id of ids) {
      const r = sendToStudent(lessonId, id, noLearn);
      if (r.already) already++; else created.push(r.pub);
    }
    return { created, already };
  }
  // Скрыть тест из списка учителя (ученики и результаты не трогаем) или вернуть обратно
  function setArchived(lessonId, archived) {
    const l = S.lessons[lessonId];
    if (!l) throw httpError(404, 'Тест не найден');
    l.archived = Boolean(archived);
    store.save();
    return l;
  }
  // Один раз при запуске скрываем тесты из content/archive.json; вернуть их учитель может сам
  function applyArchive(ids) {
    let n = 0;
    for (const id of ids || []) {
      const l = S.lessons[id];
      if (l && !l.archiveApplied) { l.archived = true; l.archiveApplied = true; n++; }
    }
    if (n) store.save();
    return n;
  }
  function unpublish(pid) {
    delete S.pubs[pid];
    for (const r of Object.values(S.reminders)) if (r.pubId === pid) delete S.reminders[r.id];
    store.save();
  }
  const pubsForGroup = (gid) => Object.values(S.pubs).filter((p) => p.groupId === gid && S.lessons[p.lessonId]).sort((a, b) => a.publishedAt - b.publishedAt);
  const personalPubs = (uid) => Object.values(S.pubs).filter((p) => p.userId === String(uid) && S.lessons[p.lessonId]);
  const pubsForUser = (uid) => [...userGroups(uid).flatMap((g) => pubsForGroup(g.id)), ...personalPubs(uid)].sort((a, b) => a.publishedAt - b.publishedAt);
  const canSeePub = (uid, pub) => isAdmin(uid) || pub.userId === String(uid) || Boolean(S.groups[pub.groupId]?.memberIds.includes(String(uid)));
  const teacherName = () => process.env.TEACHER_NAME || S.users[adminIds[0]]?.firstName || 'Учитель';

  // ───────── обучалка ─────────
  const learnKey = (uid, pubId) => `${uid}:${pubId}`;
  const learnDone = (uid, pubId) => Boolean(S.learn?.[learnKey(uid, pubId)]?.doneAt);
  function learnTarget(uid, { pubId, lessonId }) {
    uid = String(uid);
    if (pubId) {
      const pub = S.pubs[pubId];
      if (!pub || !S.lessons[pub.lessonId]) throw httpError(404, 'Тест не найден');
      if (!canSeePub(uid, pub)) throw httpError(403, 'Этот урок не для тебя');
      return { lesson: loc(S.lessons[pub.lessonId], langOf(uid)), pub, preview: isAdmin(uid), seed: `learn:${uid}:${pubId}` };
    }
    if (!isAdmin(uid)) throw httpError(403, 'Нет доступа');
    const lesson = loc(S.lessons[lessonId], langOf(uid));
    if (!lesson) throw httpError(404, 'Тест не найден');
    return { lesson, pub: null, preview: true, seed: `learn:${uid}:${lessonId}` };
  }
  const fillTeacher = (t) => String(t ?? '').replace(/\{teacher\}/g, teacherName());
  function startLearn(uid, target) {
    const { lesson, seed } = learnTarget(uid, target);
    if (!lesson.learn) throw httpError(404, 'У этого урока нет обучалки');
    return {
      lesson: { id: lesson.id, title: lesson.title, emoji: lesson.emoji },
      teacher: teacherName(),
      intro: fillTeacher(lesson.learn.intro || ''),
      sections: lesson.learn.sections.map((sec, si) => ({
        title: sec.title,
        slides: sec.slides.map((sl) => ({ ...sl, text: fillTeacher(sl.text) })),
        check: (sec.check || []).map((q, i) => publicQuestion(q, `${seed}:${si}:${i}`)),
      })),
    };
  }
  function checkLearn(uid, target, si, i, value) {
    const { lesson, pub, preview, seed } = learnTarget(uid, target);
    const q = lesson.learn?.sections[si]?.check?.[i];
    if (!q) throw httpError(400, 'Нет такого вопроса');
    const orig = q.type === 'choice' ? choicePerm(q.options.length, `${seed}:${si}:${i}`)[Number(value)] ?? -1 : value;
    const res = checkAnswer(q, orig);
    if (pub && !preview) {
      const key = learnKey(uid, pub.id);
      S.learn[key] ||= { answers: {}, startedAt: Date.now() };
      if (!(`${si}:${i}` in S.learn[key].answers)) S.learn[key].answers[`${si}:${i}`] = { correct: res.correct, given: answerText(q, orig) };
      store.save();
    }
    return { correct: res.correct, correctText: res.correctText, explain: q.explain || null };
  }
  function finishLearn(uid, target) {
    const { lesson, pub, preview } = learnTarget(uid, target);
    if (!pub || preview) return { ok: true, preview: true };
    const key = learnKey(uid, pub.id);
    S.learn[key] ||= { answers: {}, startedAt: Date.now() };
    const L = S.learn[key];
    const vals = Object.values(L.answers);
    if (!L.doneAt) {
      L.doneAt = Date.now();
      const learnedBefore = Object.entries(S.learn).some(([k, v]) => k !== key && k.startsWith(String(uid) + ':') && v.doneAt && S.pubs[k.split(':')[1]]?.lessonId === lesson.id);
      L.xp = learnedBefore || pub.noXp ? 0 : 15;
      touchStreak(S.users[String(uid)]);
      log('learn', { user: { id: String(uid), name: name(S.users[String(uid)]) }, lesson: lesson.id, title: lesson.title, checks: L.answers });
    }
    L.correct = vals.filter((v) => v.correct).length;
    L.total = vals.length;
    store.save();
    return { ok: true, correct: L.correct, total: L.total, xp: L.xp };
  }
  // Очки за урок даются один раз: если урок пришёл ученику дважды (лично и через группу),
  // повторное прохождение не засчитывается. Сами попытки не удаляются.
  function countedLearn(uid) {
    const seen = new Set();
    return Object.entries(S.learn || {})
      .filter(([k, v]) => k.startsWith(String(uid) + ':') && v.doneAt)
      .sort((a, b) => a[1].doneAt - b[1].doneAt)
      .filter(([k]) => {
        const lid = S.pubs[k.split(':')[1]]?.lessonId;
        if (!lid) return true;
        if (seen.has(lid)) return false;
        seen.add(lid);
        return true;
      });
  }
  const learnXp = (uid, pubIds) => countedLearn(uid).filter(([k]) => !pubIds || pubIds.has(k.split(':')[1])).reduce((sum, [, v]) => sum + (v.xp || 0), 0);
  function countedAttempts(uid) {
    const seen = new Set();
    return Object.values(S.attempts)
      .filter((a) => a.userId === String(uid) && a.finishedAt && !a.preview)
      .sort((a, b) => a.finishedAt - b.finishedAt)
      .filter((a) => {
        if (a.kind === 'mistakes' || !a.lessonId || a.practice) return true;
        const key = `${a.lessonId}#${a.level || 1}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
  }
  // Кто получил лишние очки за повторное прохождение урока (для лога при запуске)
  function duplicateXp() {
    const out = [];
    for (const u of Object.values(S.users)) {
      const all = Object.values(S.attempts).filter((a) => a.userId === u.id && a.finishedAt && !a.preview);
      const kept = new Set(countedAttempts(u.id).map((a) => a.id));
      const extraTests = all.filter((a) => !kept.has(a.id) && a.xp);
      const allLearn = Object.entries(S.learn || {}).filter(([k, v]) => k.startsWith(u.id + ':') && v.doneAt);
      const keptLearn = new Set(countedLearn(u.id).map(([k]) => k));
      const extraLearn = allLearn.filter(([k, v]) => !keptLearn.has(k) && v.xp);
      const xp = extraTests.reduce((s2, a) => s2 + a.xp, 0) + extraLearn.reduce((s2, [, v]) => s2 + v.xp, 0);
      if (!xp) continue;
      const lessons = [...new Set([...extraTests.map((a) => a.lessonId), ...extraLearn.map(([k]) => S.pubs[k.split(':')[1]]?.lessonId)])].filter(Boolean);
      out.push({ user: { id: u.id, name: name(u) }, extraXp: xp, lessons: lessons.map((id) => S.lessons[id]?.title || id) });
    }
    return out;
  }

  // Ответ ученика текстом — для отчётов, которые читает Claude
  function answerText(q, v) {
    switch (q?.type) {
      case 'choice': return q.options[v] ?? '—';
      case 'truefalse': return v ? 'Верно' : 'Неверно';
      case 'order': return Array.isArray(v) ? v.join(' ') : '—';
      case 'fill': return Array.isArray(v) ? v.join(', ') : String(v ?? '—');
      case 'match': return v && typeof v === 'object' ? q.pairs.map((p, i) => `${p[0]} → ${v[i] ?? '?'}`).join('; ') : '—';
      default: return String(v ?? '—');
    }
  }

  // ───────── попытки ─────────
  const questionAt = (a, index, lang = a.lang) => (a.qs ? a.qs[index] : qOf(itemsOf(a)[index], lang));
  // Уровни урока для ученика: что пройдено, что закрыто. Кто решал тест до уровней — уровень 1 закрыт (уже пройден).
  function levelsOf(uid, lessonId) {
    uid = String(uid);
    if (S.lessons[lessonId]?.kind === 'exam') return null;
    const mine = Object.values(S.attempts).filter((a) => a.userId === uid && a.lessonId === lessonId && a.finishedAt && !a.preview && a.kind !== 'mistakes');
    const legacy = mine.some((a) => !a.level);
    return [1, 2, 3].map((lv) => {
      const at = mine.filter((a) => (a.level || 1) === lv);
      const best = at.reduce((m, a) => Math.max(m, scoreOf(a).pct), -1);
      const xp = at.reduce((m, a) => m + (a.xp || 0), 0);
      return { level: lv, reward: LEVEL_XP[lv], time: LEVEL_TIME[lv], done: at.length > 0, best: best >= 0 ? best : null, xp, locked: lv === 1 && legacy };
    });
  }
  const scoreOf = (a) => {
    const correct = a.answers.filter((x) => x.correct).length;
    const total = itemsOf(a).length || a.answers.length;
    return { correct, total, pct: pct(correct, total) };
  };
  // Вопросы попытки: у обычной — все вопросы урока, у «работы над ошибками» — свой список
  // Язык ученика и урок на этом языке (перевод из lesson.tr[lang], иначе оригинал)
  const langOf = (uid) => S.users[String(uid)]?.prefs?.lang || 'ru';
  function loc(l, lang) {
    const t = l && lang && lang !== 'ru' ? l.tr?.[lang] : null;
    if (!t) return l;
    const questions = t.questions || l.questions;
    return { ...l, title: t.title || l.title, description: t.description ?? l.description, questions, learn: t.learn || l.learn, topics: [...new Set(questions.map((q) => q.topic).filter(Boolean))] };
  }

  const itemsOf = (a) => a.items || (S.lessons[a.lessonId]?.questions || []).map((_, i) => ({ lessonId: a.lessonId, index: i }));
  const qOf = (it, lang) => (it ? loc(S.lessons[it.lessonId], lang)?.questions[it.index] : undefined);

  // Копилка ошибок: вопросы, на которые последний ответ ученика был неверным.
  // Считается по истории ответов, поэтому учитывает и старые попытки.
  function mistakesOf(uid) {
    uid = String(uid);
    const visible = new Set(pubsForUser(uid).map((p) => p.lessonId));
    const last = new Map();
    const atts = Object.values(S.attempts).filter((a) => a.userId === uid && !a.preview).sort((a, b) => a.startedAt - b.startedAt);
    for (const a of atts) {
      const items = itemsOf(a);
      for (const x of a.answers) {
        const it = items[x.index];
        if (!it) continue;
        const key = it.lessonId + ':' + it.index;
        const prev = last.get(key);
        last.set(key, { lessonId: it.lessonId, index: it.index, correct: x.correct, wrong: (prev?.wrong || 0) + (x.correct ? 0 : 1), at: a.startedAt });
      }
    }
    return [...last.values()].filter((m) => !m.correct && visible.has(m.lessonId) && qOf(m)).sort((a, b) => b.at - a.at || b.wrong - a.wrong);
  }
  function mistakesInfo(uid) {
    const list = mistakesOf(uid).map((m) => {
      const q = qOf(m, langOf(uid));
      const l = loc(S.lessons[m.lessonId], langOf(uid));
      return { prompt: q.prompt, topic: q.topic || l.title, lessonTitle: l.title, emoji: l.emoji, wrong: m.wrong };
    });
    const topics = {};
    for (const m of list) topics[m.topic] = (topics[m.topic] || 0) + 1;
    return { count: list.length, list, topics: Object.entries(topics).map(([topic, n]) => ({ topic, n })).sort((a, b) => b.n - a.n) };
  }

  const finishedAttempts = (uid, pubId) =>
    Object.values(S.attempts).filter((a) => a.userId === String(uid) && a.pubId === pubId && a.finishedAt && !a.preview);
  function best(uid, pubId) {
    let b = null;
    for (const a of finishedAttempts(uid, pubId)) {
      const s = scoreOf(a);
      if (!b || s.pct > b.pct) b = { ...s, attemptId: a.id, at: a.finishedAt, xp: a.xp };
    }
    return b;
  }
  // Тесты ученика для напоминалок: что выдано и что решено (лучший результат по всем доступам к уроку).
  // Уроки, открытые «задним числом» миграцией (auto), долгом не считаются.
  function testStatus(uid) {
    uid = String(uid);
    const byLesson = new Map();
    for (const p of pubsForUser(uid)) {
      const l = S.lessons[p.lessonId];
      if (!l || l.archived) continue;
      if (!byLesson.has(p.lessonId)) byLesson.set(p.lessonId, []);
      byLesson.get(p.lessonId).push(p);
    }
    return [...byLesson].filter(([, pubs]) => pubs.some((p) => !p.auto)).map(([lessonId, pubs]) => {
      const l = S.lessons[lessonId];
      const b = pubs.map((p) => best(uid, p.id)).filter(Boolean).sort((x, y) => y.pct - x.pct)[0] || null;
      const first = pubs.flatMap((p) => finishedAttempts(uid, p.id)).sort((x, y) => x.finishedAt - y.finishedAt)[0];
      return { lessonId, order: l.order ?? null, emoji: l.emoji, title: (lang) => loc(l, lang).title, givenAt: Math.min(...pubs.filter((p) => !p.auto).map((p) => p.publishedAt)), pct: b ? b.pct : null, doneAt: first ? first.finishedAt : null };
    }).sort((x, y) => (x.order ?? 999) - (y.order ?? 999) || x.givenAt - y.givenAt);
  }
  const firstAttempt = (uid, pubId) => finishedAttempts(uid, pubId).sort((a, b) => a.finishedAt - b.finishedAt)[0] || null;

  const MISTAKES_PER_SESSION = 10;

  function startAttempt(uid, { pubId, lessonId, mistakes, level }) {
    uid = String(uid);
    if (mistakes) {
      const items = mistakesOf(uid).slice(0, MISTAKES_PER_SESSION).map(({ lessonId: l, index }) => ({ lessonId: l, index }));
      if (!items.length) throw httpError(400, 'Ошибок нет — ты всё исправил!');
      const a = { id: store.nextId('a'), kind: 'mistakes', lang: langOf(uid), items, pubId: null, lessonId: null, userId: uid, preview: false, practice: false, startedAt: Date.now(), finishedAt: null, answers: [], combo: 0, maxCombo: 0, xp: 0 };
      S.attempts[a.id] = a;
      store.save();
      return {
        attemptId: a.id,
        preview: false,
        practice: false,
        mistakes: true,
        lesson: { id: 'mistakes', title: 'Работа над ошибками', emoji: '🔁', description: '' },
        questions: items.map((it, i) => ({ ...publicQuestion(qOf(it, a.lang), `${a.id}:${i}`), from: loc(S.lessons[it.lessonId], a.lang).title })),
      };
    }
    let lesson;
    let preview = false;
    if (pubId) {
      const pub = S.pubs[pubId];
      if (!pub) throw httpError(404, 'Тест не найден');
      if (!canSeePub(uid, pub)) throw httpError(403, 'Этот тест не для твоей группы');
      lesson = loc(S.lessons[pub.lessonId], langOf(uid));
      preview = isAdmin(uid);
      if (!preview && lesson?.learn && !pub.noLearn && !learnDone(uid, pubId)) throw httpError(403, 'Сначала пройди обучалку — тест откроется после неё');
    } else {
      if (!isAdmin(uid)) throw httpError(403, 'Нет доступа');
      lesson = loc(S.lessons[lessonId], langOf(uid));
      preview = true;
    }
    if (!lesson) throw httpError(404, 'Тест не найден');
    const noXp = Boolean(pubId && S.pubs[pubId]?.noXp);
    // уровень сложности (у готовых тестов-экзаменов уровней нет)
    const lv = lesson.kind === 'exam' ? null : [1, 2, 3].includes(Number(level)) ? Number(level) : 1;
    let practice;
    if (lv) {
      const st = levelsOf(uid, lesson.id)[lv - 1];
      if (!preview && st.locked) throw httpError(403, 'Первый уровень ты уже прошёл раньше — выбери уровень 2 или 3');
      // уровень уже пройден — без очков; «открыт задним числом» (noXp) касается только уровня 1, уровни 2 и 3 новые
      practice = !preview && ((noXp && lv === 1) || st.done);
    } else {
      practice = !preview && (noXp || finishedAttempts(uid, pubId).length > 0 || Object.values(S.attempts).some((x) => x.userId === uid && x.lessonId === lesson.id && x.finishedAt && !x.preview));
    }
    const id = store.nextId('a');
    const built = lv ? buildLevel(lesson, lv, id) : null;
    const a = { id, lang: langOf(uid), pubId: pubId || null, lessonId: lesson.id, userId: uid, preview, practice, startedAt: Date.now(), finishedAt: null, answers: [], combo: 0, maxCombo: 0, xp: 0,
      ...(lv ? { level: lv, qs: built.questions, items: built.src } : {}) };
    S.attempts[a.id] = a;
    store.save();
    const qs = built ? built.questions : lesson.questions;
    return {
      attemptId: a.id,
      preview,
      practice,
      level: lv,
      reward: lv ? LEVEL_XP[lv] : null,
      timeLimit: lv ? LEVEL_TIME[lv] : 0,
      lesson: { id: lesson.id, title: lesson.title, emoji: lesson.emoji, description: lesson.description },
      questions: qs.map((q, i) => publicQuestion(q, `${a.id}:${i}`)),
    };
  }

  // Индекс варианта, который видел ученик, → индекс в уроке
  const toOriginal = (q, a, index, value) =>
    q.type === 'choice' ? choicePerm(q.options.length, `${a.id}:${index}`)[Number(value)] ?? -1 : value;

  function getOwnAttempt(uid, aid) {
    const a = S.attempts[aid];
    if (!a || a.userId !== String(uid)) throw httpError(404, 'Попытка не найдена');
    return a;
  }

  // Для лупы и зелья: вопрос попытки и его урок (на языке попытки)
  function attemptQuestion(uid, aid, index) {
    const a = getOwnAttempt(uid, aid);
    if (a.finishedAt) throw httpError(400, 'Тест уже завершён');
    const it = itemsOf(a)[Number(index)];
    const q = questionAt(a, Number(index));
    if (!q) throw httpError(400, 'Неверный номер вопроса');
    return { a, q, lesson: loc(S.lessons[it?.lessonId || a.lessonId], a.lang), lang: a.lang || 'ru' };
  }
  // Сколько раз и когда ученик решал тесты (для состояния маскота)
  const finishedAt = (uid) => Object.values(S.attempts).filter((a) => a.userId === String(uid) && a.finishedAt && !a.preview).map((a) => a.finishedAt);

  function answer(uid, aid, index, value, timeout = false) {
    const a = getOwnAttempt(uid, aid);
    if (a.finishedAt) throw httpError(400, 'Тест уже завершён');
    const q = questionAt(a, index);
    if (!q || index !== a.answers.length) throw httpError(400, 'Неверный номер вопроса');
    const res = timeout ? { correct: false, correctText: checkAnswer(q, null).correctText } : checkAnswer(q, toOriginal(q, a, index, value));
    a.combo = res.correct ? a.combo + 1 : 0;
    a.maxCombo = Math.max(a.maxCombo, a.combo);
    const mult = a.combo >= 5 ? 3 : a.combo >= 3 ? 2 : 1;
    const gained = res.correct && !a.preview && !a.practice && !a.level ? 10 * mult : 0;
    a.xp += gained;
    a.answers.push({ index, correct: res.correct, value, ...(timeout ? { timeout: true } : {}) });
    store.save();
    return { correct: res.correct, correctText: res.correctText, explain: q.explain || null, combo: a.combo, mult, xpGained: gained, timeout };
  }

  // «Работа над ошибками»: перепроверка без записи в статистику
  function retry(uid, aid, index, value) {
    const a = getOwnAttempt(uid, aid);
    const q = questionAt(a, index);
    if (!q || a.answers.length < itemsOf(a).length) throw httpError(400, 'Сначала ответь на все вопросы');
    const res = checkAnswer(q, toOriginal(q, a, index, value));
    return { correct: res.correct, correctText: res.correctText, explain: q.explain || null };
  }

  function finish(uid, aid) {
    const a = getOwnAttempt(uid, aid);
    const items = itemsOf(a);
    if (!a.finishedAt) {
      if (a.answers.length < items.length) throw httpError(400, 'Есть неотвеченные вопросы');
      a.finishedAt = Date.now();
      if (a.level) {
        // уровень: награда × процент правильных (если уровень ещё не был пройден)
        if (!a.preview && !a.practice) a.xp = Math.round((LEVEL_XP[a.level] * scoreOf(a).pct) / 100);
      } else if (!a.preview && !a.practice && scoreOf(a).pct === 100) a.xp += 20; // бонус за идеал
      if (!a.preview) touchStreak(S.users[a.userId]);
      store.save();
      if (!a.preview) logResult(a);
    }
    const s = scoreOf(a);
    const topics = {};
    a.answers.forEach((x) => {
      const t = questionAt(a, x.index)?.topic || 'Общее';
      topics[t] ||= { topic: t, correct: 0, total: 0 };
      topics[t].total++;
      if (x.correct) topics[t].correct++;
    });
    let group = null;
    if (a.pubId && S.pubs[a.pubId]) {
      const ps = pubStats(a.pubId);
      const rank = ps.ranking.findIndex((r) => r.userId === a.userId);
      group = { avg: ps.avg, done: ps.done.length, size: ps.size, rank: rank >= 0 ? rank + 1 : null };
    }
    return {
      ...s,
      xp: a.xp,
      maxCombo: a.maxCombo,
      practice: a.practice,
      preview: a.preview,
      durationSec: Math.round(((a.finishedAt || Date.now()) - a.startedAt) / 1000),
      topics: Object.values(topics).map((t) => ({ ...t, pct: pct(t.correct, t.total) })),
      questions: a.answers.map((x) => ({ prompt: questionAt(a, x.index)?.prompt || '', correct: x.correct })),
      level: a.level || null,
      reward: a.level ? LEVEL_XP[a.level] : null,
      levels: a.level && !a.preview ? levelsOf(a.userId, a.lessonId) : null,
      group,
      mistakesLeft: mistakesOf(a.userId).length,
      streak: currentStreak(S.users[a.userId]),
    };
  }

  function logResult(a) {
    const items = itemsOf(a);
    const pub = S.pubs[a.pubId];
    log('result', {
      user: { id: a.userId, name: name(S.users[a.userId]) },
      group: pub?.groupId ? S.groups[pub.groupId]?.name : pub?.userId ? 'личное' : null,
      lesson: a.kind === 'mistakes' ? 'mistakes' : a.lessonId,
      level: a.level || null,
      kind: a.kind || (a.practice ? 'practice' : 'test'),
      pct: scoreOf(a).pct,
      wrong: a.answers.filter((x) => !x.correct).map((x) => {
        const it = items[x.index];
        const q = it ? qOf(it) : questionAt(a, x.index);
        const ql = questionAt(a, x.index);
        return { lesson: it?.lessonId || a.lessonId, q: it ? it.index : null, timeout: x.timeout || undefined, topic: q?.topic, prompt: q?.prompt, lang: a.lang || 'ru', given: answerText(ql, toOriginal(ql, a, x.index, x.value)), right: q ? checkAnswer(q, null).correctText : null };
      }),
    });
  }

  // Полный отчёт по ученикам в лог сервера — его читает Claude, чтобы готовить личные задания
  function report() {
    const out = [];
    for (const u of students()) {
      const groups = userGroups(u.id);
      if (!groups.length && !personalPubs(u.id).length) continue;
      const tests = pubsForUser(u.id).map((p) => {
        const b = best(u.id, p.id);
        return { lesson: p.lessonId, title: S.lessons[p.lessonId].title, best: b ? b.pct : null, learnDone: learnDone(u.id, p.id) };
      });
      const row = { user: { id: u.id, name: name(u), username: u.username || null }, groups: groups.map((g) => g.name), xp: totalXp(u.id), tests, mistakes: mistakesOf(u.id).map((m) => {
        const q = qOf(m);
        return { lesson: m.lessonId, q: m.index, topic: q.topic, prompt: q.prompt, wrongTimes: m.wrong, right: checkAnswer(q, null).correctText };
      }) };
      log('report', row);
      out.push(row);
    }
    log('report-end', { students: out.length, at: new Date().toISOString() });
    return { students: out.length };
  }

  function touchStreak(u) {
    if (!u) return;
    const today = dayKey();
    if (u.lastDay === today) return;
    u.streak = u.lastDay === prevDay(today) ? (u.streak || 0) + 1 : 1;
    u.lastDay = today;
  }
  function currentStreak(u) {
    if (!u?.lastDay) return 0;
    const today = dayKey();
    return u.lastDay === today || u.lastDay === prevDay(today) ? u.streak || 0 : 0;
  }

  // ───────── статистика ─────────
  // Бонусы учителя считаются и в общей лиге, и в лиге группы
  // + оценки учителя (журнал): 10 баллов = 200 XP
  const bonusXp = (uid) => Object.values(S.bonuses || {}).filter((b) => b.userId === String(uid)).reduce((s, b) => s + b.xp, 0)
    + Object.values(S.grades || {}).filter((g) => g.userId === String(uid)).reduce((s, g) => s + (g.xp || 0), 0);
  // Один XP на всё: заработано минус потрачено в магазине. Это число видно в общей лиге, в лиге группы, вверху экрана и в магазине.
  const earnedXp = (uid) => countedAttempts(uid).reduce((s, a) => s + (a.xp || 0), 0) + learnXp(uid) + bonusXp(uid);
  const spentXp = (uid) => Object.values(S.purchases || {}).filter((p) => p.userId === String(uid)).reduce((s, p) => s + (p.price || 0), 0);
  const totalXp = (uid) => earnedXp(uid) - spentXp(uid);
  // лига группы показывает тот же XP, что и общая
  const groupXp = (uid) => totalXp(uid);
  // Начислить (или снять, если xp < 0) баллы вручную. id делает начисление однократным
  function addBonus({ id, userId, xp, reason }) {
    const u = S.users[String(userId)];
    if (!u || isAdmin(u.id)) throw httpError(404, 'Ученик не найден');
    xp = Math.trunc(Number(xp));
    if (!xp || Math.abs(xp) > 1000) throw httpError(400, 'Баллы: целое число от -1000 до 1000');
    S.bonuses ||= {};
    const bid = id || store.nextId('b');
    if (S.bonuses[bid]) return { bonus: S.bonuses[bid], already: true };
    S.bonuses[bid] = { id: bid, userId: u.id, xp, reason: String(reason || '').slice(0, 200), at: Date.now() };
    store.save();
    log('bonus', { user: { id: u.id, name: name(u) }, xp, reason: S.bonuses[bid].reason, total: totalXp(u.id) });
    return { bonus: S.bonuses[bid], already: false, total: totalXp(u.id) };
  }

  function pubStats(pubId) {
    const pub = S.pubs[pubId];
    const g = S.groups[pub.groupId];
    const lesson = S.lessons[pub.lessonId];
    const members = pub.userId ? [pub.userId] : g ? g.memberIds.filter((id) => !isAdmin(id)) : [];
    const ranking = [];
    const notDone = [];
    const perQ = lesson.questions.map((q) => ({ prompt: q.prompt, topic: q.topic || null, correct: 0, total: 0 }));
    for (const uid of members) {
      const b = best(uid, pubId);
      if (!b) { notDone.push(uid); continue; }
      ranking.push({ userId: uid, name: name(S.users[uid]), pct: b.pct, at: b.at });
      const f = firstAttempt(uid, pubId);
      // у попытки с уровнем номер ответа ≠ номер вопроса урока: переводим через items (вопросы из обучалки пропускаем)
      f?.answers.forEach((x) => { const it = f.level ? f.items?.[x.index] : { index: x.index }; const row = it && perQ[it.index]; if (!row) return; row.total++; if (x.correct) row.correct++; });
    }
    ranking.sort((a, b) => b.pct - a.pct || a.at - b.at);
    return {
      pubId,
      lessonId: lesson.id,
      title: lesson.title,
      emoji: lesson.emoji,
      groupId: g?.id,
      groupName: pub.userId ? `Лично: ${name(S.users[pub.userId])}` : g?.name,
      personal: Boolean(pub.userId),
      publishedAt: pub.publishedAt,
      size: members.length,
      learned: lesson.learn && !pub.noLearn ? members.filter((uid) => learnDone(uid, pubId)).length : null,
      done: ranking.map((r) => r.userId),
      notDone,
      ranking,
      avg: avg(ranking.map((r) => r.pct)),
      questions: perQ.map((q) => ({ ...q, pct: q.total ? pct(q.correct, q.total) : null })),
    };
  }

  // Общая лига: все ученики курса, только по XP
  function globalLeague() {
    const rows = students()
      .map((u) => {
        const bests = pubsForUser(u.id).map((p) => best(u.id, p.id)).filter(Boolean);
        return { userId: u.id, name: name(u), username: u.username || '', photoUrl: u.photoUrl || null, prefs: u.prefs || null, xp: totalXp(u.id), done: bests.length, avg: avg(bests.map((b) => b.pct)), streak: currentStreak(u), group: userGroups(u.id).map((g) => g.name).join(', ') };
      })
      .filter((r) => r.xp > 0 || r.group)
      .sort((a, b) => b.xp - a.xp || (b.avg ?? -1) - (a.avg ?? -1) || a.name.localeCompare(b.name));
    rows.forEach((r, i) => (r.rank = i + 1));
    return { rows, total: rows.length };
  }
  // Кто из учеников сколько раз решал тест и с каким результатом каждый раз
  function pubAttempts(pubId) {
    const pub = S.pubs[pubId];
    if (!pub) throw httpError(404, 'Тест не найден');
    const lesson = S.lessons[pub.lessonId];
    const g = S.groups[pub.groupId];
    const members = pub.userId ? [pub.userId] : g ? g.memberIds.filter((id) => !isAdmin(id)) : [];
    const rows = members.map((uid) => {
      const u = S.users[uid];
      const attempts = finishedAttempts(uid, pubId).sort((a, b) => a.finishedAt - b.finishedAt).map((a, i) => ({ n: i + 1, ...scoreOf(a), at: a.finishedAt, practice: Boolean(a.practice), xp: a.xp || 0 }));
      const b = best(uid, pubId);
      return { userId: uid, name: name(u), username: u?.username || '', photoUrl: u?.photoUrl || null, prefs: u?.prefs || null, learnDone: lesson?.learn && !pub.noLearn ? learnDone(uid, pubId) : null, attempts, best: b ? b.pct : null };
    }).sort((a, b) => (b.best ?? -1) - (a.best ?? -1) || a.name.localeCompare(b.name));
    return { pubId, title: lesson?.title, emoji: lesson?.emoji, groupName: pub.userId ? 'Лично' : g?.name, publishedAt: pub.publishedAt, size: rows.length, started: rows.filter((r) => r.attempts.length).length, avg: avg(rows.filter((r) => r.best != null).map((r) => r.best)), rows };
  }

  function leaderboard(gid) {
    const g = S.groups[gid];
    if (!g) throw httpError(404, 'Группа не найдена');
    const pubs = pubsForGroup(gid);
    const rows = g.memberIds
      .filter((id) => !isAdmin(id))
      .map((uid) => {
        const u = S.users[uid];
        const bests = pubs.map((p) => best(uid, p.id)).filter(Boolean);
        return { userId: uid, name: name(u), username: u?.username || '', photoUrl: u?.photoUrl || null, prefs: u?.prefs || null, xp: groupXp(uid, gid), done: bests.length, avg: avg(bests.map((b) => b.pct)), streak: currentStreak(u) };
      })
      .sort((a, b) => b.xp - a.xp || (b.avg ?? -1) - (a.avg ?? -1));
    rows.forEach((r, i) => (r.rank = i + 1));
    const teacherId = adminIds[0];
    const teacher = { userId: teacherId, name: name(S.users[teacherId]) || 'Учитель', teacher: true, photoUrl: S.users[teacherId]?.photoUrl || null, prefs: S.users[teacherId]?.prefs || null };
    return { group: { id: g.id, name: g.name, emoji: g.emoji }, teacher, rows, tests: pubs.length };
  }

  function userStats(uid) {
    uid = String(uid);
    const u = S.users[uid];
    const pubs = pubsForUser(uid);
    const progress = [];
    const topics = {};
    let maxCombo = 0;
    for (const p of pubs) {
      const b = best(uid, p.id);
      const l = loc(S.lessons[p.lessonId], langOf(uid));
      const ps = pubStats(p.id);
      if (b) progress.push({ pubId: p.id, title: l.title, emoji: l.emoji, pct: b.pct, groupAvg: ps.avg, at: b.at });
      const a = b && S.attempts[b.attemptId];
      a?.answers.forEach((x) => {
        const t = questionAt(a, x.index, langOf(uid))?.topic || l.title;
        topics[t] ||= { topic: t, correct: 0, total: 0 };
        topics[t].total++;
        if (x.correct) topics[t].correct++;
      });
    }
    for (const a of Object.values(S.attempts)) if (a.userId === uid && !a.preview) maxCombo = Math.max(maxCombo, a.maxCombo || 0);
    const streak = currentStreak(u);
    const ranks = userGroups(uid).map((g) => leaderboard(g.id).rows.find((r) => r.userId === uid)?.rank);
    const ach = {
      first: progress.length >= 1,
      five: progress.length >= 5,
      perfect: progress.some((p) => p.pct === 100),
      combo5: maxCombo >= 5,
      streak3: (u?.streak || 0) >= 3,
      champion: ranks.includes(1) && progress.length > 0,
    };
    return {
      user: publicUser(u),
      xp: totalXp(uid),
      streak,
      overall: avg(progress.map((p) => p.pct)),
      done: progress.length,
      total: pubs.length,
      progress,
      topics: Object.values(topics).map((t) => ({ ...t, pct: pct(t.correct, t.total) })),
      maxCombo,
      achievements: Object.entries(ACHIEVEMENTS).map(([id, a]) => ({ id, ...a, got: Boolean(ach[id]) })),
      groups: userGroups(uid).map((g) => ({ id: g.id, name: g.name, emoji: g.emoji })),
      mistakes: mistakesInfo(uid),
    };
  }

  // Все уроки, к которым у учеников группы есть доступ: отправленные всей группе И выданные лично
  // (через «Выдать доступ ученикам»). Личные задания от Claude сюда не входят.
  function groupLessons(gid) {
    const g = S.groups[gid];
    if (!g) throw httpError(404, 'Группа не найдена');
    const members = g.memberIds.filter((id) => !isAdmin(id) && S.users[id]);
    const byLesson = new Map();
    for (const uid of members) {
      for (const p of pubsForUser(uid)) {
        const l = S.lessons[p.lessonId];
        if (!l || l.personal) continue;
        if (p.groupId && p.groupId !== gid) continue;
        let L = byLesson.get(p.lessonId);
        if (!L) byLesson.set(p.lessonId, (L = { lessonId: p.lessonId, users: new Map(), publishedAt: p.publishedAt }));
        L.publishedAt = Math.min(L.publishedAt, p.publishedAt);
        if (!L.users.has(uid)) L.users.set(uid, []);
        if (!L.users.get(uid).includes(p.id)) L.users.get(uid).push(p.id);
      }
    }
    const bestOf = (uid, pubIds) => pubIds.map((pid) => best(uid, pid)).filter(Boolean).sort((x, y) => y.pct - x.pct)[0] || null;
    const list = [...byLesson.values()].map((L) => {
      const l = S.lessons[L.lessonId];
      const bests = [...L.users].map(([uid, pids]) => [uid, bestOf(uid, pids)]);
      const done = bests.filter(([, b]) => b);
      return { ...L, title: l.title, emoji: l.emoji, order: l.order ?? null, bestOf, done: done.length, size: L.users.size,
        avg: avg(done.map(([, b]) => b.pct)), notDone: bests.filter(([, b]) => !b).map(([uid]) => uid) };
    }).sort((x, y) => (x.order ?? 999) - (y.order ?? 999) || x.publishedAt - y.publishedAt);
    return { g, members, list };
  }

  function groupStats(gid) {
    const { g, members, list } = groupLessons(gid);
    const ps = pubsForGroup(gid).map((p) => pubStats(p.id));
    const lb = leaderboard(gid);
    const heat = lb.rows.map((r) => ({ userId: r.userId, name: r.name, cells: list.map((L) => (L.users.has(r.userId) ? L.bestOf(r.userId, L.users.get(r.userId))?.pct ?? null : null)), avg: r.avg, mistakes: mistakesOf(r.userId).length }));
    const hardest = ps
      .flatMap((s) => s.questions.map((q) => ({ ...q, test: s.title })))
      .filter((q) => q.total > 0 && q.pct < 100)
      .sort((a, b) => a.pct - b.pct)
      .slice(0, 5);
    return {
      group: groupCard(g),
      members: members.length,
      tests: list.map((L) => ({ key: `${gid}|${L.lessonId}`, lessonId: L.lessonId, title: L.title, emoji: L.emoji, avg: L.avg, done: L.done, size: L.size, publishedAt: L.publishedAt, notDone: L.notDone.map((id) => name(S.users[id])) })),
      heat,
      hardest,
      leaderboard: lb,
    };
  }
  // Кто из группы решал урок и сколько раз — по всем его доступам (группе и лично)
  function groupLessonAttempts(gid, lessonId) {
    const { g, list } = groupLessons(gid);
    const L = list.find((x) => x.lessonId === lessonId);
    if (!L) throw httpError(404, 'Тест не найден');
    const lesson = S.lessons[lessonId];
    const rows = [...L.users].map(([uid, pids]) => {
      const u = S.users[uid];
      const attempts = pids.flatMap((pid) => finishedAttempts(uid, pid)).sort((a, b) => a.finishedAt - b.finishedAt).map((a, i) => ({ n: i + 1, ...scoreOf(a), at: a.finishedAt, practice: Boolean(a.practice), xp: a.xp || 0 }));
      const b = L.bestOf(uid, pids);
      const learnable = lesson?.learn && pids.some((pid) => !S.pubs[pid]?.noLearn);
      return { userId: uid, name: name(u), username: u?.username || '', photoUrl: u?.photoUrl || null, prefs: u?.prefs || null, learnDone: learnable ? pids.some((pid) => learnDone(uid, pid)) : null, attempts, best: b ? b.pct : null };
    }).sort((a, b) => (b.best ?? -1) - (a.best ?? -1) || a.name.localeCompare(b.name));
    return { title: lesson?.title, emoji: lesson?.emoji, groupName: g.name, publishedAt: L.publishedAt, size: rows.length, started: rows.filter((r) => r.attempts.length).length, avg: avg(rows.filter((r) => r.best != null).map((r) => r.best)), rows };
  }


  function groupCard(g) {
    const pubs = pubsForGroup(g.id);
    const members = g.memberIds.filter((id) => !isAdmin(id));
    const avgs = pubs.map((p) => pubStats(p.id).avg).filter((x) => x !== null);
    return {
      id: g.id,
      name: g.name,
      emoji: g.emoji,
      chatTitle: g.chatTitle,
      linked: Boolean(g.chatId),
      members: members.map((id) => publicUser(S.users[id])),
      tests: pubs.length,
      avg: avg(avgs),
    };
  }

  function feed(gids, limit = 12, lang = 'ru') {
    const pubToGroup = {};
    for (const p of Object.values(S.pubs)) if (gids.includes(p.groupId)) pubToGroup[p.id] = p;
    return Object.values(S.attempts)
      .filter((a) => a.finishedAt && !a.preview && pubToGroup[a.pubId])
      .sort((a, b) => b.finishedAt - a.finishedAt)
      .slice(0, limit)
      .map((a) => {
        const s = scoreOf(a);
        return { name: name(S.users[a.userId]), userId: a.userId, prefs: S.users[a.userId]?.prefs || null, title: loc(S.lessons[a.lessonId], lang).title, emoji: S.lessons[a.lessonId].emoji, pct: s.pct, practice: a.practice, at: a.finishedAt, combo: a.maxCombo };
      });
  }

  function publicUser(u) {
    if (!u) return null;
    return { id: u.id, name: name(u), username: u.username || '', photoUrl: u.photoUrl || null, joinedAt: u.joinedAt, prefs: u.prefs || null, email: u.email || null };
  }

  // Внешний вид, который ученик выбирает сам: напарник, цвет, светлая/тёмная тема
  function setPrefs(uid, p = {}) {
    const u = S.users[String(uid)];
    if (!u) throw httpError(404, 'Пользователь не найден');
    const next = { ...(u.prefs || {}) };
    if (MASCOT_IDS.includes(p.mascot)) next.mascot = p.mascot;
    if (ACCENTS.includes(p.accent) || /^#[0-9a-f]{6}$/i.test(p.accent || '')) next.accent = p.accent;
    if (['auto', 'light', 'dark'].includes(p.mode)) next.mode = p.mode;
    if (['ru', 'uz', 'en'].includes(p.lang)) next.lang = p.lang;
    u.prefs = next;
    store.save();
    return next;
  }

  // Главный экран ученика
  function home(uid) {
    uid = String(uid);
    const u = S.users[uid];
    if (u?.needRole) return { user: publicUser(u), needRole: true, isAdmin: false, groups: [], path: [], xp: 0, streak: 0, mistakes: 0, feed: [] };
    if (isParent(uid)) return parentHome(uid);
    const groups = userGroups(uid);
    const path = pubsForUser(uid).map((p) => {
      const l = loc(S.lessons[p.lessonId], langOf(uid));
      const b = best(uid, p.id);
      return { pubId: p.id, title: l.title, emoji: l.emoji, description: l.description, questions: l.questions.length, topics: l.topics, groupId: p.groupId, groupName: p.userId ? 'Лично' : S.groups[p.groupId].name, personal: Boolean(p.userId), forYou: Boolean(S.lessons[p.lessonId].personal), order: S.lessons[p.lessonId].order ?? null, lessonId: p.lessonId, exam: l.kind === 'exam', levels: levelsOf(uid, p.lessonId), hasLearn: Boolean(l.learn) && !p.noLearn, learnDone: learnDone(uid, p.id), learnSections: l.learn?.sections.length || 0, publishedAt: p.publishedAt, best: b ? b.pct : null, stars: b ? (b.pct === 100 ? 3 : b.pct >= 80 ? 2 : b.pct >= 50 ? 1 : 0) : null };
    });
    return {
      user: publicUser(u),
      isAdmin: isAdmin(uid),
      role: 'student',
      xp: totalXp(uid),
      streak: currentStreak(u),
      groups: groups.map((g) => ({ id: g.id, name: g.name, emoji: g.emoji })),
      path,
      // уроки курса, которые учитель ещё не открыл: ученик видит их закрытыми
      locked: Object.values(S.lessons)
        .filter((l) => Number.isFinite(l.order) && l.order < 100 && !l.personal && !l.archived && !path.some((p) => p.lessonId === l.id))
        .sort((a, b) => a.order - b.order)
        .map((l) => { const t = loc(l, langOf(uid)); return { lessonId: l.id, order: l.order, title: t.title, emoji: l.emoji, description: t.description, questions: t.questions.length, hasLearn: Boolean(l.learn) }; }),
      mistakes: mistakesOf(uid).length,
      feed: feed(groups.map((g) => g.id), 12, langOf(uid)),
    };
  }

  function adminOverview() {
    const groups = Object.values(S.groups).sort((a, b) => a.createdAt - b.createdAt).map(groupCard);
    const lessonsAll = Object.values(S.lessons).sort((a, b) => (a.order ?? 999) - (b.order ?? 999) || b.createdAt - a.createdAt);
    const hidden = lessonsAll.filter((l) => l.archived).map((l) => ({ id: l.id, title: l.title, emoji: l.emoji }));
    const lessons = lessonsAll
      .filter((l) => !l.archived)
      .map((l) => ({
        id: l.id, order: l.order ?? null, course: Number.isFinite(l.order) && l.order < 100 && !l.personal, title: l.title, emoji: l.emoji, description: l.description, topics: l.topics, questions: l.questions.length,
        types: [...new Set(l.questions.map((q) => q.type))],
        sentTo: Object.values(S.pubs).filter((p) => p.lessonId === l.id && S.groups[p.groupId]).map((p) => {
          const s = pubStats(p.id);
          return { pubId: p.id, groupId: p.groupId, groupName: S.groups[p.groupId].name, done: s.done.length, size: s.size, avg: s.avg, learned: s.learned, publishedAt: p.publishedAt };
        }),
        personalFor: Object.values(S.pubs).filter((p) => p.lessonId === l.id && p.userId).map((p) => {
          const b = best(p.userId, p.id);
          return { pubId: p.id, userId: p.userId, name: name(S.users[p.userId]), best: b ? b.pct : null, noLearn: Boolean(p.noLearn), learnDone: learnDone(p.userId, p.id) };
        }),
        hasLearn: Boolean(l.learn),
        exam: l.kind === 'exam',
        learnSections: l.learn?.sections.length || 0,
      }));
    const allStudents = students().map((u) => ({ ...publicUser(u), groups: userGroups(u.id).map((g) => g.id) }));
    const avgs = groups.map((g) => g.avg).filter((x) => x !== null);
    return {
      totals: { students: allStudents.length, groups: groups.length, sent: Object.keys(S.pubs).length, avg: avg(avgs) },
      groups,
      lessons,
      hiddenLessons: hidden,
      students: allStudents,
      unassigned: unassigned().map(publicUser),
      feed: feed(Object.keys(S.groups), 15),
    };
  }

  // ───────── напоминания ─────────
  function createReminder({ groupId, pubId, text, intervalMin, maxCount, nextAt }) {
    if (!S.groups[groupId]) throw httpError(404, 'Группа не найдена');
    const interval = Math.max(1, Math.min(7 * 24 * 60, Number(intervalMin) || 60));
    const r = {
      id: store.nextId('r'),
      groupId,
      pubId: pubId && S.pubs[pubId] ? pubId : null,
      text: String(text || '').trim().slice(0, 1500) || 'Не забудьте решить тест! 💪',
      intervalMin: interval,
      maxCount: Math.max(1, Math.min(100, Number(maxCount) || 10)),
      sent: 0,
      active: true,
      nextAt: Number(nextAt) || Date.now(),
      createdAt: Date.now(),
    };
    S.reminders[r.id] = r;
    store.save();
    return r;
  }
  const listReminders = () =>
    Object.values(S.reminders)
      .filter((r) => S.groups[r.groupId])
      .sort((a, b) => b.createdAt - a.createdAt)
      .map((r) => ({ ...r, groupName: S.groups[r.groupId].name, testTitle: r.pubId && S.pubs[r.pubId] ? S.lessons[S.pubs[r.pubId].lessonId]?.title : null }));
  function setReminder(rid, patch) {
    const r = S.reminders[rid];
    if (!r) throw httpError(404, 'Напоминание не найдено');
    if ('active' in patch) {
      r.active = Boolean(patch.active);
      if (r.active) { r.nextAt = Date.now(); if (r.sent >= r.maxCount) r.sent = 0; }
    }
    store.save();
    return r;
  }
  function deleteReminder(rid) {
    delete S.reminders[rid];
    store.save();
  }

  return {
    S, log, earnedXp, spentXp, levelsOf, parentsOverview, testStatus, attemptQuestion, finishedAt, totalXp, isAdmin, isParent, duplicateXp, grantLessons, migrateAccess, groupLessonAttempts, pubAttempts, sendToStudents, setArchived, applyArchive, addBonus, issueLogin, issueLoginsAll, accountOf, setRole, setChildren, parentStudents, name, upsertUser, userGroups, unassigned, createGroup, updateGroup, deleteGroup, addMember, removeMember, findUserByUsername,
    upsertLesson, deleteLesson, publish, sendToStudent, unpublish, pubsForGroup, pubStats, globalLeague, startAttempt, answer, retry, finish,
    leaderboard, userStats, groupStats, home, adminOverview, publicUser,
    createReminder, listReminders, setReminder, deleteReminder, setPrefs,
    startLearn, checkLearn, finishLearn, assignPersonal, report, teacherName,
    ensureAccount, login, sessionUser, logout,
  };
}

export function httpError(status, message) {
  const e = new Error(message);
  e.status = status;
  return e;
}
