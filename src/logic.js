// Вся предметная логика: ученики, группы, тесты, попытки, статистика.
import crypto from 'node:crypto';
import { checkAnswer, choicePerm, publicQuestion, validateLesson } from './grading.js';

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

export const MASCOT_IDS = ['mimi', 'kapi', 'dino', 'axi', 'boo', 'ano', 'zip'];
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
    const u = S.users[id] || { id, joinedAt: Date.now(), streak: 0, lastDay: null };
    u.firstName = tg.first_name ?? tg.firstName ?? u.firstName ?? '';
    u.lastName = tg.last_name ?? tg.lastName ?? u.lastName ?? '';
    u.username = tg.username ?? u.username ?? '';
    if (tg.photo_url) u.photoUrl = tg.photo_url;
    S.users[id] = u;
    store.save();
    return { user: u, isNew: !existed };
  }

  const userGroups = (uid) => Object.values(S.groups).filter((g) => g.memberIds.includes(String(uid)));
  const students = () => Object.values(S.users).filter((u) => !isAdmin(u.id));
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
  function login(email, password) {
    const acc = S.accounts?.[String(email || '').trim().toLowerCase()];
    const ok = acc && crypto.timingSafeEqual(Buffer.from(hashPw(password, acc.salt), 'hex'), Buffer.from(acc.hash, 'hex'));
    if (!ok) throw httpError(401, 'Неверная почта или пароль');
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
      learn: lesson.learn || null,
      personal: lesson.personal || null,
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
      return { lesson: S.lessons[pub.lessonId], pub, preview: isAdmin(uid), seed: `learn:${uid}:${pubId}` };
    }
    if (!isAdmin(uid)) throw httpError(403, 'Нет доступа');
    const lesson = S.lessons[lessonId];
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
      L.xp = 15;
      touchStreak(S.users[String(uid)]);
      log('learn', { user: { id: String(uid), name: name(S.users[String(uid)]) }, lesson: lesson.id, title: lesson.title, checks: L.answers });
    }
    L.correct = vals.filter((v) => v.correct).length;
    L.total = vals.length;
    store.save();
    return { ok: true, correct: L.correct, total: L.total, xp: L.xp };
  }
  const learnXp = (uid, pubIds) => Object.entries(S.learn || {}).filter(([k, v]) => k.startsWith(String(uid) + ':') && v.doneAt && (!pubIds || pubIds.has(k.split(':')[1]))).reduce((sum, [, v]) => sum + (v.xp || 0), 0);

  // Ответ ученика текстом — для отчётов, которые читает Claude
  function answerText(q, v) {
    switch (q?.type) {
      case 'choice': return q.options[v] ?? '—';
      case 'truefalse': return v ? 'Верно' : 'Неверно';
      case 'order': return Array.isArray(v) ? v.join(' ') : '—';
      case 'match': return v && typeof v === 'object' ? q.pairs.map((p, i) => `${p[0]} → ${v[i] ?? '?'}`).join('; ') : '—';
      default: return String(v ?? '—');
    }
  }

  // ───────── попытки ─────────
  const scoreOf = (a) => {
    const correct = a.answers.filter((x) => x.correct).length;
    const total = itemsOf(a).length || a.answers.length;
    return { correct, total, pct: pct(correct, total) };
  };
  // Вопросы попытки: у обычной — все вопросы урока, у «работы над ошибками» — свой список
  const itemsOf = (a) => a.items || (S.lessons[a.lessonId]?.questions || []).map((_, i) => ({ lessonId: a.lessonId, index: i }));
  const qOf = (it) => S.lessons[it?.lessonId]?.questions[it.index];

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
      const q = qOf(m);
      const l = S.lessons[m.lessonId];
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
  const firstAttempt = (uid, pubId) => finishedAttempts(uid, pubId).sort((a, b) => a.finishedAt - b.finishedAt)[0] || null;

  const MISTAKES_PER_SESSION = 10;

  function startAttempt(uid, { pubId, lessonId, mistakes }) {
    uid = String(uid);
    if (mistakes) {
      const items = mistakesOf(uid).slice(0, MISTAKES_PER_SESSION).map(({ lessonId: l, index }) => ({ lessonId: l, index }));
      if (!items.length) throw httpError(400, 'Ошибок нет — ты всё исправил!');
      const a = { id: store.nextId('a'), kind: 'mistakes', items, pubId: null, lessonId: null, userId: uid, preview: false, practice: false, startedAt: Date.now(), finishedAt: null, answers: [], combo: 0, maxCombo: 0, xp: 0 };
      S.attempts[a.id] = a;
      store.save();
      return {
        attemptId: a.id,
        preview: false,
        practice: false,
        mistakes: true,
        lesson: { id: 'mistakes', title: 'Работа над ошибками', emoji: '🔁', description: '' },
        questions: items.map((it, i) => ({ ...publicQuestion(qOf(it), `${a.id}:${i}`), from: S.lessons[it.lessonId].title })),
      };
    }
    let lesson;
    let preview = false;
    if (pubId) {
      const pub = S.pubs[pubId];
      if (!pub) throw httpError(404, 'Тест не найден');
      if (!canSeePub(uid, pub)) throw httpError(403, 'Этот тест не для твоей группы');
      lesson = S.lessons[pub.lessonId];
      preview = isAdmin(uid);
      if (!preview && lesson?.learn && !learnDone(uid, pubId)) throw httpError(403, 'Сначала пройди обучалку — тест откроется после неё');
    } else {
      if (!isAdmin(uid)) throw httpError(403, 'Нет доступа');
      lesson = S.lessons[lessonId];
      preview = true;
    }
    if (!lesson) throw httpError(404, 'Тест не найден');
    const practice = !preview && finishedAttempts(uid, pubId).length > 0;
    const a = { id: store.nextId('a'), pubId: pubId || null, lessonId: lesson.id, userId: uid, preview, practice, startedAt: Date.now(), finishedAt: null, answers: [], combo: 0, maxCombo: 0, xp: 0 };
    S.attempts[a.id] = a;
    store.save();
    return {
      attemptId: a.id,
      preview,
      practice,
      lesson: { id: lesson.id, title: lesson.title, emoji: lesson.emoji, description: lesson.description },
      questions: lesson.questions.map((q, i) => publicQuestion(q, `${a.id}:${i}`)),
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

  function answer(uid, aid, index, value) {
    const a = getOwnAttempt(uid, aid);
    if (a.finishedAt) throw httpError(400, 'Тест уже завершён');
    const q = qOf(itemsOf(a)[index]);
    if (!q || index !== a.answers.length) throw httpError(400, 'Неверный номер вопроса');
    const res = checkAnswer(q, toOriginal(q, a, index, value));
    a.combo = res.correct ? a.combo + 1 : 0;
    a.maxCombo = Math.max(a.maxCombo, a.combo);
    const mult = a.combo >= 5 ? 3 : a.combo >= 3 ? 2 : 1;
    const gained = res.correct && !a.preview && !a.practice ? 10 * mult : 0;
    a.xp += gained;
    a.answers.push({ index, correct: res.correct, value });
    store.save();
    return { correct: res.correct, correctText: res.correctText, explain: q.explain || null, combo: a.combo, mult, xpGained: gained };
  }

  // «Работа над ошибками»: перепроверка без записи в статистику
  function retry(uid, aid, index, value) {
    const a = getOwnAttempt(uid, aid);
    const q = qOf(itemsOf(a)[index]);
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
      if (!a.preview && !a.practice && scoreOf(a).pct === 100) a.xp += 20; // бонус за идеал
      if (!a.preview) touchStreak(S.users[a.userId]);
      store.save();
      if (!a.preview) logResult(a);
    }
    const s = scoreOf(a);
    const topics = {};
    a.answers.forEach((x) => {
      const t = qOf(items[x.index])?.topic || 'Общее';
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
      questions: a.answers.map((x) => ({ prompt: qOf(items[x.index])?.prompt || '', correct: x.correct })),
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
      kind: a.kind || (a.practice ? 'practice' : 'test'),
      pct: scoreOf(a).pct,
      wrong: a.answers.filter((x) => !x.correct).map((x) => {
        const it = items[x.index];
        const q = qOf(it);
        return { lesson: it.lessonId, q: it.index, topic: q?.topic, prompt: q?.prompt, given: answerText(q, toOriginal(q, a, x.index, x.value)), right: q ? checkAnswer(q, null).correctText : null };
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
  const totalXp = (uid) => Object.values(S.attempts).filter((a) => a.userId === String(uid) && a.finishedAt && !a.preview).reduce((s, a) => s + (a.xp || 0), 0) + learnXp(uid);
  function groupXp(uid, gid) {
    const pubIds = new Set(pubsForGroup(gid).map((p) => p.id));
    return Object.values(S.attempts).filter((a) => a.userId === String(uid) && a.finishedAt && !a.preview && pubIds.has(a.pubId)).reduce((s, a) => s + (a.xp || 0), 0) + learnXp(uid, pubIds);
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
      f?.answers.forEach((x) => { perQ[x.index].total++; if (x.correct) perQ[x.index].correct++; });
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
      learned: lesson.learn ? members.filter((uid) => learnDone(uid, pubId)).length : null,
      done: ranking.map((r) => r.userId),
      notDone,
      ranking,
      avg: avg(ranking.map((r) => r.pct)),
      questions: perQ.map((q) => ({ ...q, pct: q.total ? pct(q.correct, q.total) : null })),
    };
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
      const l = S.lessons[p.lessonId];
      const ps = pubStats(p.id);
      if (b) progress.push({ pubId: p.id, title: l.title, emoji: l.emoji, pct: b.pct, groupAvg: ps.avg, at: b.at });
      const a = b && S.attempts[b.attemptId];
      a?.answers.forEach((x) => {
        const t = l.questions[x.index].topic || l.title;
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

  function groupStats(gid) {
    const g = S.groups[gid];
    if (!g) throw httpError(404, 'Группа не найдена');
    const pubs = pubsForGroup(gid);
    const ps = pubs.map((p) => pubStats(p.id));
    const lb = leaderboard(gid);
    const heat = lb.rows.map((r) => ({ userId: r.userId, name: r.name, cells: pubs.map((p) => best(r.userId, p.id)?.pct ?? null), avg: r.avg, mistakes: mistakesOf(r.userId).length }));
    const hardest = ps
      .flatMap((s) => s.questions.map((q) => ({ ...q, test: s.title })))
      .filter((q) => q.total > 0 && q.pct < 100)
      .sort((a, b) => a.pct - b.pct)
      .slice(0, 5);
    return {
      group: groupCard(g),
      tests: ps.map((s) => ({ pubId: s.pubId, title: s.title, emoji: s.emoji, avg: s.avg, done: s.done.length, size: s.size, publishedAt: s.publishedAt, notDone: s.notDone.map((id) => name(S.users[id])) })),
      heat,
      hardest,
      leaderboard: lb,
    };
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

  function feed(gids, limit = 12) {
    const pubToGroup = {};
    for (const p of Object.values(S.pubs)) if (gids.includes(p.groupId)) pubToGroup[p.id] = p;
    return Object.values(S.attempts)
      .filter((a) => a.finishedAt && !a.preview && pubToGroup[a.pubId])
      .sort((a, b) => b.finishedAt - a.finishedAt)
      .slice(0, limit)
      .map((a) => {
        const s = scoreOf(a);
        return { name: name(S.users[a.userId]), userId: a.userId, prefs: S.users[a.userId]?.prefs || null, title: S.lessons[a.lessonId].title, emoji: S.lessons[a.lessonId].emoji, pct: s.pct, practice: a.practice, at: a.finishedAt, combo: a.maxCombo };
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
    if (ACCENTS.includes(p.accent)) next.accent = p.accent;
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
    const groups = userGroups(uid);
    const path = pubsForUser(uid).map((p) => {
      const l = S.lessons[p.lessonId];
      const b = best(uid, p.id);
      return { pubId: p.id, title: l.title, emoji: l.emoji, description: l.description, questions: l.questions.length, topics: l.topics, groupId: p.groupId, groupName: p.userId ? 'Лично' : S.groups[p.groupId].name, personal: Boolean(p.userId), hasLearn: Boolean(l.learn), learnDone: learnDone(uid, p.id), learnSections: l.learn?.sections.length || 0, publishedAt: p.publishedAt, best: b ? b.pct : null, stars: b ? (b.pct === 100 ? 3 : b.pct >= 80 ? 2 : b.pct >= 50 ? 1 : 0) : null };
    });
    return {
      user: publicUser(u),
      isAdmin: isAdmin(uid),
      xp: totalXp(uid),
      streak: currentStreak(u),
      groups: groups.map((g) => ({ id: g.id, name: g.name, emoji: g.emoji })),
      path,
      mistakes: mistakesOf(uid).length,
      feed: feed(groups.map((g) => g.id)),
    };
  }

  function adminOverview() {
    const groups = Object.values(S.groups).sort((a, b) => a.createdAt - b.createdAt).map(groupCard);
    const lessons = Object.values(S.lessons)
      .sort((a, b) => b.createdAt - a.createdAt)
      .map((l) => ({
        id: l.id, title: l.title, emoji: l.emoji, description: l.description, topics: l.topics, questions: l.questions.length,
        types: [...new Set(l.questions.map((q) => q.type))],
        sentTo: Object.values(S.pubs).filter((p) => p.lessonId === l.id && S.groups[p.groupId]).map((p) => {
          const s = pubStats(p.id);
          return { pubId: p.id, groupId: p.groupId, groupName: S.groups[p.groupId].name, done: s.done.length, size: s.size, avg: s.avg, learned: s.learned, publishedAt: p.publishedAt };
        }),
        personalFor: Object.values(S.pubs).filter((p) => p.lessonId === l.id && p.userId).map((p) => {
          const b = best(p.userId, p.id);
          return { pubId: p.id, userId: p.userId, name: name(S.users[p.userId]), best: b ? b.pct : null, learnDone: learnDone(p.userId, p.id) };
        }),
        hasLearn: Boolean(l.learn),
        learnSections: l.learn?.sections.length || 0,
      }));
    const allStudents = students().map((u) => ({ ...publicUser(u), groups: userGroups(u.id).map((g) => g.id) }));
    const avgs = groups.map((g) => g.avg).filter((x) => x !== null);
    return {
      totals: { students: allStudents.length, groups: groups.length, sent: Object.keys(S.pubs).length, avg: avg(avgs) },
      groups,
      lessons,
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
    S, isAdmin, name, upsertUser, userGroups, unassigned, createGroup, updateGroup, deleteGroup, addMember, removeMember, findUserByUsername,
    upsertLesson, deleteLesson, publish, unpublish, pubsForGroup, pubStats, startAttempt, answer, retry, finish,
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
