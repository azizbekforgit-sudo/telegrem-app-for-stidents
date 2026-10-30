// Проверяет все уроки и их переводы в content/lessons: `npm run check`
import fs from 'node:fs';
import path from 'node:path';
import { validateLesson, validateTranslation } from '../src/grading.js';

const dir = path.resolve('content/lessons');
const files = fs.readdirSync(dir).filter((x) => x.endsWith('.json'));
const TR_RE = /^(.+)\.(uz|en)\.json$/;
const read = (f) => JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
let bad = 0;
const ids = new Map();
for (const f of files.filter((x) => !TR_RE.test(x))) {
  let lesson;
  try { lesson = read(f); } catch (e) { console.log(`✗ ${f}: невалидный JSON — ${e.message}`); bad++; continue; }
  const errs = validateLesson(lesson);
  if (ids.has(lesson.id)) errs.push(`повторяется id "${lesson.id}"`);
  ids.set(lesson.id, lesson);
  const langs = [];
  for (const t of files) {
    const m = TR_RE.exec(t);
    if (!m || m[1] !== lesson.id) continue;
    try {
      const te = validateTranslation(lesson, read(t));
      if (te.length) errs.push(...te.map((x) => `${m[2]}: ${x}`));
      else langs.push(m[2]);
    } catch (e) { errs.push(`${t}: ${e.message}`); }
  }
  if (errs.length) { bad++; console.log(`✗ ${f}\n  - ${errs.join('\n  - ')}`); }
  else console.log(`✓ ${f} — ${lesson.questions.length} вопросов${lesson.learn ? `, обучалка ${lesson.learn.sections.length} разд.` : ''}, языки: ru${langs.map((l) => ', ' + l).join('')}`);
}
for (const t of files) { const m = TR_RE.exec(t); if (m && !ids.has(m[1])) { bad++; console.log(`✗ ${t}: нет урока с id ${m[1]}`); } }
process.exit(bad ? 1 : 0);
