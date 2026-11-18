// Задания «пишем код» для обучалки и домашки (content/code/<lessonId>.json).
// Тексты пишутся тройкой { ru, uz, en }; ученику отдаём на его языке.
import fs from 'node:fs';
import path from 'node:path';

export function loadCode(dir) {
  const map = {};
  if (!fs.existsSync(dir)) return map;
  for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.json'))) {
    try {
      const c = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
      map[c.lessonId || f.replace(/\.json$/, '')] = c;
    } catch (e) { console.error('[code] не прочитал', f, e.message); }
  }
  return map;
}
// { ru, uz, en } → строка на нужном языке (вглубь по объекту)
export function localize(v, lang) {
  if (Array.isArray(v)) return v.map((x) => localize(x, lang));
  if (v && typeof v === 'object') {
    if (typeof v.ru === 'string' && Object.keys(v).every((k) => ['ru', 'uz', 'en'].includes(k))) return v[lang] || v.ru;
    return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, localize(x, lang)]));
  }
  return v;
}
