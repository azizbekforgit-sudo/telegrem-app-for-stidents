// Уровни сложности теста урока: 1 — как в уроке, 2 и 3 — сложнее (собираются из того же урока автоматически).
//
//  1 «Лёгкий»  — вопросы урока как есть.                                        Награда 80 XP.
//  2 «Средний» — + вопросы из проверок обучалки, без подсказок; в «пропусках» и «собери»
//                добавляются похожие ложные плитки (свойство к свойству, число к числу, тег к тегу),
//                в «выборе» — до 5 вариантов.                                     Награда 150 XP.
//  3 «Сложный» — то же, но ложных плиток ещё больше, в «выборе» до 6 вариантов, вопросы перемешаны,
//                на каждый вопрос 45 секунд.                                       Награда 350 XP.
//
// Очки = награда × процент правильных, один раз за каждый уровень урока.

export const LEVEL_XP = { 1: 80, 2: 150, 3: 350 };
export const LEVEL_TIME = { 1: 0, 2: 0, 3: 45 }; // секунд на вопрос (0 — без таймера)

const norm = (s) => String(s ?? '').trim().toLowerCase().replace(/ё/g, 'е');
function rng(seedStr) {
  let h = 2166136261;
  for (const ch of String(seedStr)) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  let s = h >>> 0 || 1;
  return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296);
}
const shuffle = (arr, rnd) => { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

// «Форма» плитки: ложные варианты подбираем той же формы, чтобы нельзя было угадать по виду
function shape(t) {
  const s = String(t).trim();
  if (/^-?\d+(\.\d+)?(px|%|fr|em|rem|s|ms|vh|vw)?$/i.test(s)) return 'num';
  if (/^["'«].*["'»]$/.test(s)) return 'str';
  if (/^<\/?[a-z][a-z0-9]*>?$/i.test(s) || /^[a-z][a-z0-9]{0,9}$/.test(s)) return 'word';
  if (/^[a-z]+(-[a-z]+)+$/.test(s)) return 'kebab';
  if (/^[a-z][a-zA-Z0-9]*[A-Z][a-zA-Z0-9]*$/.test(s)) return 'camel';
  if (/[(){}.;:#=[\]]/.test(s) && !/\s{2,}/.test(s) && s.length <= 40) return 'code';
  if (!/\s/.test(s)) return 'oneword';
  return s.length <= 40 ? 'phrase' : 'long';
}

// Все короткие «кусочки» урока, из которых берём ложные варианты
function poolOf(questions) {
  const out = [];
  const add = (t) => { if (t != null && String(t).trim() && String(t).length <= 40) out.push(String(t)); };
  for (const q of questions) {
    if (q.type === 'fill') { q.answer.forEach(add); (q.extra || []).forEach(add); }
    if (q.type === 'order') { q.tokens.forEach(add); (q.extra || []).forEach(add); }
    if (q.type === 'choice') q.options.forEach(add);
    if (q.type === 'match') q.pairs.forEach(([a, b]) => { add(a); add(b); });
  }
  return [...new Map(out.map((t) => [norm(t), t])).values()];
}
function similar(pool, like, n, exclude, rnd) {
  if (n <= 0) return [];
  const ex = new Set(exclude.map(norm));
  const shapes = new Set(like.map(shape));
  const same = shuffle(pool.filter((t) => shapes.has(shape(t)) && !ex.has(norm(t))), rnd);
  return same.slice(0, n);
}

// Вопросы для уровня. lesson — урок на языке ученика. Возвращает { questions, src }:
// src[i] = { lessonId, index } для вопросов урока (по ним работает «работа над ошибками»), null — для вопросов из обучалки.
export function buildLevel(lesson, level, seed) {
  const rnd = rng(`${seed}:${level}`);
  const base = lesson.questions.map((q, index) => ({ q, src: { lessonId: lesson.id, index } }));
  if (level === 1 || lesson.kind === 'exam') return { questions: base.map((x) => x.q), src: base.map((x) => x.src) };
  const seen = new Set(base.map((x) => norm(x.q.prompt)));
  const checks = [];
  for (const s of lesson.learn?.sections || []) for (const q of s.check || []) {
    if (seen.has(norm(q.prompt))) continue;
    seen.add(norm(q.prompt));
    checks.push({ q, src: null });
  }
  let items = [...base, ...checks];
  const pool = poolOf(items.map((x) => x.q));
  const more = level === 3 ? { fill: 5, order: 3, choice: 6 } : { fill: 3, order: 2, choice: 5 };
  // правильные ответы всех «выборов» урока — их не подкладываем как ложные варианты
  const rightAnswers = items.filter((x) => x.q.type === 'choice').map((x) => x.q.options[x.q.answer]);
  items = items.map(({ q, src }) => {
    const h = { ...q };
    delete h.hint;
    if (q.type === 'fill') {
      const extra = [...(q.extra || [])];
      extra.push(...similar(pool, q.answer, more.fill, [...q.answer, ...extra], rnd));
      h.extra = extra.slice(0, 9);
    } else if (q.type === 'order') {
      const extra = [...(q.extra || [])];
      extra.push(...similar(pool, q.tokens, more.order, [...q.tokens, ...extra], rnd));
      h.extra = extra;
    } else if (q.type === 'choice' && q.options.length < more.choice) {
      const right = q.options[q.answer];
      const add = similar(pool, q.options, more.choice - q.options.length, [...q.options, ...rightAnswers, right], rnd);
      h.options = [...q.options, ...add];
    }
    return { q: h, src };
  });
  if (level === 3) items = shuffle(items, rnd);
  return { questions: items.map((x) => x.q), src: items.map((x) => x.src) };
}
