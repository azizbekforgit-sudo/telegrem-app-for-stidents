// Журнал: расписание групп, посещаемость по урокам и оценки по 10-балльной шкале.
// Всё лежит в общем состоянии: group.schedule, S.classes (занятия), S.grades. (S.sessions — это входы на сайт!)
//
//  group.schedule = [{ dow: 1..7 (пн..вс), start: 'HH:MM', end: 'HH:MM' }]
//  S.classes[id] = { id, groupId, date: 'YYYY-MM-DD', start, end, members: [uid], absent: [uid], status: 'asking'|'done',
//                     reasons: { uid: текст }, notified: [uid], createdAt, markedAt }
//  S.grades[id]   = { id, userId, value: 1..10, xp, lessonId, comment, date, at }
//
// Время — местное (по умолчанию Ташкент, UTC+5: TZ_OFFSET_MIN=300). Бот спрашивает «кого нет?»
// через ATTEND_ASK_AFTER_MIN минут после начала урока (по умолчанию 10).

const TZ_MIN = Number(process.env.TZ_OFFSET_MIN ?? 300);
const ASK_AFTER = Number(process.env.ATTEND_ASK_AFTER_MIN ?? 10);
export const XP_PER_POINT = 20; // 10 баллов = 200 XP, 9 = 180 …

const local = (ts = Date.now()) => new Date(ts + TZ_MIN * 60_000); // читать через getUTC*
const dateOf = (d) => d.toISOString().slice(0, 10);
const hmOf = (d) => d.toISOString().slice(11, 16);
const dowOf = (d) => ((d.getUTCDay() + 6) % 7) + 1;
const toMin = (hm) => { const [h, m] = String(hm).split(':').map(Number); return h * 60 + m; };
const HM = /^([01]\d|2[0-3]):[0-5]\d$/;

// для сравнения имён: нижний регистр, ё→е, кириллица → латиница
const TR = { а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'j', з: 'z', и: 'i', й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'x', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'sh', ъ: '', ы: 'i', ь: '', э: 'e', ю: 'yu', я: 'ya', ў: 'o', қ: 'q', ғ: 'g', ҳ: 'h' };
const latin = (s) => String(s || '').toLowerCase().replace(/[ʼ'`‘’]/g, '').split('').map((c) => TR[c] ?? c).join('').replace(/kh/g, 'x').replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();

export function createJournal({ logic, store }) {
  const S = logic.S;
  S.classes ||= {};
  // раньше занятия по ошибке лежали в S.sessions (там входы на сайт) — переносим их сюда один раз
  for (const [k, v] of Object.entries(S.sessions || {})) {
    if (v && typeof v === 'object' && v.groupId && v.date) { S.classes[k] = v; delete S.sessions[k]; }
  }
  S.grades ||= {};
  const httpError = (status, message) => Object.assign(new Error(message), { status });
  const nameOf = (uid) => logic.name(S.users[uid]);
  const members = (gid) => (S.groups[gid]?.memberIds || []).filter((id) => S.users[id] && !logic.isAdmin(id) && !logic.isParent(id));

  // ───────── расписание ─────────
  function setSchedule(gid, slots) {
    const g = S.groups[gid];
    if (!g) throw httpError(404, 'Группа не найдена');
    const clean = (Array.isArray(slots) ? slots : []).slice(0, 21).map((s) => ({ dow: Number(s.dow), start: String(s.start || ''), end: String(s.end || '') }));
    for (const s of clean) {
      if (!(s.dow >= 1 && s.dow <= 7) || !HM.test(s.start) || !HM.test(s.end) || toMin(s.end) <= toMin(s.start)) throw httpError(400, 'Проверь дни и время: начало раньше конца, формат 14:00');
    }
    g.schedule = clean.sort((a, b) => a.dow - b.dow || toMin(a.start) - toMin(b.start));
    store.save();
    return g.schedule;
  }

  // ───────── занятия и посещаемость ─────────
  const findSession = (gid, date, start) => Object.values(S.classes).find((s) => s.groupId === gid && s.date === date && s.start === start);
  function newSession(gid, date, start, end) {
    const s = { id: store.nextId('s'), groupId: gid, date, start, end, members: members(gid), absent: [], status: 'asking', reasons: {}, notified: [], createdAt: Date.now(), markedAt: null };
    S.classes[s.id] = s;
    store.save();
    return s;
  }
  // Занятия, о которых пора спросить учителя (создаются один раз)
  function dueSessions(now = Date.now()) {
    const d = local(now);
    const today = dateOf(d), dow = dowOf(d), cur = toMin(hmOf(d));
    const out = [];
    for (const g of Object.values(S.groups)) {
      for (const sl of g.schedule || []) {
        if (sl.dow !== dow) continue;
        const ask = toMin(sl.start) + ASK_AFTER;
        if (cur < ask || cur > toMin(sl.end) + 30) continue; // сервер спал весь урок — не спрашиваем задним числом
        if (findSession(g.id, today, sl.start)) continue;
        if (!members(g.id).length) continue;
        out.push(newSession(g.id, today, sl.start, sl.end));
      }
    }
    return out;
  }
  // Учитель отмечает урок вручную (не по расписанию)
  function startSession(gid, { date, start, end } = {}) {
    if (!S.groups[gid]) throw httpError(404, 'Группа не найдена');
    const d = local();
    date = /^\d{4}-\d\d-\d\d$/.test(date || '') ? date : dateOf(d);
    start = HM.test(start || '') ? start : hmOf(d);
    end = HM.test(end || '') ? end : start;
    return findSession(gid, date, start) || newSession(gid, date, start, end);
  }
  // Отметить отсутствующих. Возвращает тех, кому ещё не писали о пропуске
  function markAttendance(sid, absentIds) {
    const s = S.classes[sid];
    if (!s) throw httpError(404, 'Занятие не найдено');
    const set = new Set((absentIds || []).map(String));
    s.absent = s.members.filter((id) => set.has(id));
    s.status = 'done';
    s.markedAt = Date.now();
    const fresh = s.absent.filter((id) => !s.notified.includes(id));
    s.notified.push(...fresh);
    store.save();
    logic.log?.('attendance', { group: S.groups[s.groupId]?.name, date: s.date, start: s.start, absent: s.absent.map(nameOf) });
    return { session: s, fresh };
  }
  function deleteSession(sid) {
    if (!S.classes[sid]) throw httpError(404, 'Занятие не найдено');
    delete S.classes[sid];
    store.save();
  }
  // Последнее занятие, о котором бот спросил учителя и ответа ещё нет (за последние 16 часов)
  const pendingSession = () => Object.values(S.classes).filter((s) => s.status === 'asking' && Date.now() - s.createdAt < 16 * 3600_000).sort((a, b) => b.createdAt - a.createdAt)[0] || null;

  // «Бегзод, Наргиза» → ученики группы. «все пришли» → никого нет в отсутствующих
  function parseNames(sid, text) {
    const s = S.classes[sid];
    const raw = String(text || '').trim();
    const t = latin(raw);
    if (/^(vse (prishli|byli|zdes|na meste)|nikogo net|net otsutstvuyushih|hammasi (keldi|bor)|all (here|present))/.test(t) || ['vse', 'all', 'hammasi', '0', '-'].includes(t)) return { all: true, ids: [], unknown: [] };
    const people = s.members.map((id) => {
      const u = S.users[id];
      const words = latin(`${u.firstName || ''} ${u.lastName || ''} ${logic.name(u)} ${u.username || ''}`).split(' ').filter((w) => w.length >= 2);
      return { id, words: [...new Set(words)] };
    });
    const ids = new Set();
    const unknown = [];
    for (const part of raw.split(/[,;\n]+| и | va | and /i).map((x) => x.trim()).filter(Boolean)) {
      const tokens = latin(part).split(' ').filter((w) => w.length >= 2);
      if (!tokens.length) continue;
      const hits = people.filter((p) => tokens.every((tk) => p.words.some((w) => w.startsWith(tk.slice(0, Math.max(3, tk.length - 2))) || tk.startsWith(w))));
      if (hits.length === 1) ids.add(hits[0].id);
      else unknown.push(part);
    }
    return { all: false, ids: [...ids], unknown };
  }

  // Ученик ответил, почему не пришёл: к последнему пропуску за 3 дня без ответа
  function setReason(uid, text) {
    uid = String(uid);
    const s = Object.values(S.classes)
      .filter((x) => x.absent.includes(uid) && x.notified.includes(uid) && !x.reasons[uid] && Date.now() - (x.markedAt || x.createdAt) < 3 * 86400_000)
      .sort((a, b) => b.markedAt - a.markedAt)[0];
    if (!s) return null;
    s.reasons[uid] = String(text).slice(0, 500);
    store.save();
    return s;
  }

  // ───────── оценки ─────────
  function addGrade({ userId, value, lessonId, comment, date }) {
    const uid = String(userId || '');
    if (!S.users[uid] || logic.isAdmin(uid)) throw httpError(404, 'Ученик не найден');
    const v = Math.round(Number(value));
    if (!(v >= 1 && v <= 10)) throw httpError(400, 'Оценка от 1 до 10');
    if (lessonId && !S.lessons[lessonId]) throw httpError(404, 'Урок не найден');
    const g = { id: store.nextId('m'), userId: uid, value: v, xp: v * XP_PER_POINT, lessonId: lessonId || null, comment: String(comment || '').slice(0, 300),
      date: /^\d{4}-\d\d-\d\d$/.test(date || '') ? date : dateOf(local()), at: Date.now() };
    S.grades[g.id] = g;
    store.save();
    logic.log?.('grade', { user: { id: uid, name: nameOf(uid) }, value: v, xp: g.xp, lesson: lessonId || null, comment: g.comment });
    return g;
  }
  function deleteGrade(id) {
    if (!S.grades[id]) throw httpError(404, 'Оценка не найдена');
    delete S.grades[id];
    store.save();
  }
  // название темы — на языке ученика (если есть перевод урока)
  const gradeOut = (g, lang = null) => {
    const l = g.lessonId ? S.lessons[g.lessonId] : null;
    const title = l ? (lang && l.tr?.[lang]?.title) || l.title : null;
    return { ...g, name: nameOf(g.userId), lesson: l ? { id: l.id, title, emoji: l.emoji, order: l.order ?? null } : null };
  };

  // ───────── ответы для приложения ─────────
  const sessionOut = (s) => {
    const g = S.groups[s.groupId];
    return { id: s.id, groupId: s.groupId, group: g ? { id: g.id, name: g.name, emoji: g.emoji } : null, date: s.date, start: s.start, end: s.end, status: s.status,
      members: s.members.filter((id) => S.users[id]).map((id) => ({ id, name: nameOf(id), absent: s.absent.includes(id), reason: s.reasons[id] || null })) };
  };
  // Журнал учителя: расписание, занятия и оценки
  function adminJournal() {
    const groups = Object.values(S.groups).sort((a, b) => a.createdAt - b.createdAt).map((g) => ({ id: g.id, name: g.name, emoji: g.emoji, schedule: g.schedule || [], size: members(g.id).length }));
    const sessions = Object.values(S.classes).sort((a, b) => `${b.date}${b.start}`.localeCompare(`${a.date}${a.start}`)).slice(0, 600).map(sessionOut);
    // ученики каждой группы: плюсы (был), минусы (не был) и оценки
    const allGrades = Object.values(S.grades);
    for (const g of groups) {
      const done = Object.values(S.classes).filter((c) => c.groupId === g.id && c.status === 'done');
      g.lessons = done.length;
      g.students = members(g.id).map((uid) => {
        const mine = done.filter((c) => c.members.includes(uid));
        const minus = mine.filter((c) => c.absent.includes(uid)).length;
        const gr = allGrades.filter((x) => x.userId === uid).sort((a, b) => a.at - b.at);
        const u = S.users[uid];
        return { id: uid, name: nameOf(uid), prefs: u?.prefs || null, photoUrl: u?.photoUrl || null, plus: mine.length - minus, minus,
          grades: gr.slice(-5).map((x) => x.value), avg: gr.length ? Math.round((gr.reduce((n, x) => n + x.value, 0) / gr.length) * 10) / 10 : null };
      }).sort((a, b) => a.name.localeCompare(b.name));
    }
    const grades = Object.values(S.grades).sort((a, b) => b.at - a.at).slice(0, 1000).map((g) => gradeOut(g));
    return { today: dateOf(local()), groups, sessions, grades, xpPerPoint: XP_PER_POINT };
  }
  // Дневник ученика: дни с уроками (был / не был), оценки, сводка
  function diary(uid) {
    uid = String(uid);
    const days = Object.values(S.classes)
      .filter((s) => s.status === 'done' && s.members.includes(uid))
      .sort((a, b) => `${a.date}${a.start}`.localeCompare(`${b.date}${b.start}`))
      .map((s) => ({ id: s.id, date: s.date, start: s.start, end: s.end, group: S.groups[s.groupId] ? { name: S.groups[s.groupId].name, emoji: S.groups[s.groupId].emoji } : null, present: !s.absent.includes(uid), reason: s.reasons[uid] || null }));
    const lang = S.users[uid]?.prefs?.lang || null;
    const grades = Object.values(S.grades).filter((g) => g.userId === uid).sort((a, b) => a.at - b.at).map((g) => gradeOut(g, lang));
    const present = days.filter((d) => d.present).length;
    const schedule = logic.userGroups(uid).flatMap((g) => (g.schedule || []).map((sl) => ({ ...sl, group: { name: g.name, emoji: g.emoji } })));
    return {
      today: dateOf(local()),
      days,
      grades,
      schedule,
      stats: {
        lessons: days.length, present, missed: days.length - present,
        attendance: days.length ? Math.round((present / days.length) * 100) : null,
        avgGrade: grades.length ? Math.round((grades.reduce((n, g) => n + g.value, 0) / grades.length) * 10) / 10 : null,
        gradeXp: grades.reduce((n, g) => n + g.xp, 0),
      },
    };
  }
  const gradeXp = (uid) => Object.values(S.grades).filter((g) => g.userId === String(uid)).reduce((n, g) => n + g.xp, 0);

  return { setSchedule, dueSessions, startSession, markAttendance, deleteSession, pendingSession, parseNames, setReason, addGrade, deleteGrade, adminJournal, diary, gradeXp, sessionOut, members, latin };
}
