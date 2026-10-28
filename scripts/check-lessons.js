// Проверяет все уроки в content/lessons: `npm run check`
import fs from 'node:fs';
import path from 'node:path';
import { validateLesson } from '../src/grading.js';

const dir = path.resolve('content/lessons');
let bad = 0;
const ids = new Set();
for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.json'))) {
  let lesson;
  try {
    lesson = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
  } catch (e) {
    console.log(`✗ ${f}: невалидный JSON — ${e.message}`);
    bad++;
    continue;
  }
  const errs = validateLesson(lesson);
  if (ids.has(lesson.id)) errs.push(`повторяется id "${lesson.id}"`);
  ids.add(lesson.id);
  if (errs.length) {
    bad++;
    console.log(`✗ ${f}\n  - ${errs.join('\n  - ')}`);
  } else {
    console.log(`✓ ${f} — ${lesson.questions.length} вопросов`);
  }
}
process.exit(bad ? 1 : 0);
