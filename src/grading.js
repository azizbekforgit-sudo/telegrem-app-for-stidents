// Типы вопросов, их «публичный» вид для ученика (без ответов) и проверка.
//
//   choice    { prompt, options: [..], answer: <индекс> }
//   truefalse { prompt, answer: true|false }
//   input     { prompt, answer: ["вариант", "другой вариант"] }   — ввод с клавиатуры
//   order     { prompt, tokens: [..в правильном порядке..], extra: [..лишние..] }
//   match     { prompt, pairs: [[левое, правое], ...] }
//
// У любого вопроса может быть topic (тема для радар-диаграммы), explain (пояснение) и hint.

export const QUESTION_TYPES = ['choice', 'truefalse', 'input', 'order', 'match'];

export function normalize(s) {
  return String(s ?? '')
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/[\s ]+/g, ' ')
    .replace(/[.!?,;:]+$/g, '')
    .trim();
}

function shuffle(arr, seed) {
  const a = arr.slice();
  let s = seed >>> 0 || 1;
  const rnd = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function hashSeed(str) {
  let h = 2166136261;
  for (const ch of String(str)) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return h >>> 0;
}

// То, что уходит на клиент: без правильных ответов, с перемешанными вариантами.
export function publicQuestion(q, seedKey) {
  const seed = hashSeed(seedKey);
  const base = { type: q.type, prompt: q.prompt, topic: q.topic || null, hint: q.hint || null, code: q.code || null };
  switch (q.type) {
    case 'choice':
      return { ...base, options: q.options };
    case 'truefalse':
      return base;
    case 'input':
      return { ...base, placeholder: q.placeholder || 'Введи ответ' };
    case 'order':
      return { ...base, bank: shuffle([...q.tokens, ...(q.extra || [])], seed) };
    case 'match':
      return { ...base, left: q.pairs.map((p) => p[0]), right: shuffle(q.pairs.map((p) => p[1]), seed) };
    default:
      return base;
  }
}

// Проверка ответа. Возвращает { correct, correctText } — correctText показываем, если ошибся.
export function checkAnswer(q, answer) {
  switch (q.type) {
    case 'choice':
      return { correct: Number(answer) === Number(q.answer), correctText: q.options[q.answer] };
    case 'truefalse':
      return { correct: Boolean(answer) === Boolean(q.answer), correctText: q.answer ? 'Верно' : 'Неверно' };
    case 'input': {
      const variants = Array.isArray(q.answer) ? q.answer : [q.answer];
      return { correct: variants.some((v) => normalize(v) === normalize(answer)), correctText: variants[0] };
    }
    case 'order': {
      const got = Array.isArray(answer) ? answer.map(normalize).join(' ') : '';
      return { correct: got === q.tokens.map(normalize).join(' '), correctText: q.tokens.join(' ') };
    }
    case 'match': {
      // answer: { "<индекс левого>": "<текст правого>" }
      const ok = q.pairs.every((p, i) => answer && normalize(answer[i]) === normalize(p[1]));
      return { correct: ok, correctText: q.pairs.map((p) => `${p[0]} → ${p[1]}`).join('; ') };
    }
    default:
      return { correct: false, correctText: '' };
  }
}

// Валидация урока (используется при импорте и в scripts/check-lessons.js).
export function validateLesson(l) {
  const errs = [];
  if (!l || typeof l !== 'object') return ['урок должен быть объектом'];
  if (!/^[a-z0-9-]+$/.test(l.id || '')) errs.push('id: только латиница, цифры и дефис');
  if (!l.title) errs.push('нет title');
  if (!Array.isArray(l.questions) || !l.questions.length) errs.push('нет questions');
  (l.questions || []).forEach((q, i) => {
    const p = `вопрос ${i + 1}`;
    if (!QUESTION_TYPES.includes(q.type)) errs.push(`${p}: неизвестный type "${q.type}"`);
    if (!q.prompt) errs.push(`${p}: нет prompt`);
    if (q.type === 'choice' && (!Array.isArray(q.options) || q.options[q.answer] === undefined)) errs.push(`${p}: options/answer`);
    if (q.type === 'truefalse' && typeof q.answer !== 'boolean') errs.push(`${p}: answer должен быть true/false`);
    if (q.type === 'input' && !q.answer) errs.push(`${p}: нет answer`);
    if (q.type === 'order' && (!Array.isArray(q.tokens) || q.tokens.length < 2)) errs.push(`${p}: tokens`);
    if (q.type === 'match' && (!Array.isArray(q.pairs) || q.pairs.length < 2)) errs.push(`${p}: pairs`);
  });
  return errs;
}
