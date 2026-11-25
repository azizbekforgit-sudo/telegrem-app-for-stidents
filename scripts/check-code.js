// Проверка заданий «пишем код» (content/code/*.json): регэкспы компилируются, файлы шагов существуют,
// стартовый код ещё не решает задание, тексты есть на трёх языках.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkSteps } from '../public/ide.js';
import { personalize } from '../src/social.js';
import { evaluateLayout, loadWorldLevels } from '../src/world.js';

const dir = path.join(path.dirname(new URL(import.meta.url).pathname), '..', 'content', 'code');
let bad = 0;
const tri = (v, where) => { if (!v || typeof v !== 'object' || !v.ru || !v.uz || !v.en) { console.log(`✗ ${where}: нужен текст { ru, uz, en }`); bad++; } };
for (const f of fs.existsSync(dir) ? fs.readdirSync(dir).filter((x) => x.endsWith('.json')) : []) {
  const c = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
  if (c.house) {
    // «Дом для питомца»: четыре уровня (zero, junior, middle, senior), каждый на трёх языках на примере (Капи, ученица Аня)
    const sets = c.house.levels || { senior: c.house.challenges };
    for (const [lv, challenges] of Object.entries(sets)) {
      if (!challenges?.length) { console.log(`✗ ${f} уровень ${lv}: нет испытаний`); bad++; continue; }
      for (const lang of ['ru', 'uz', 'en']) {
        let files = null;
        for (const [i, raw] of challenges.entries()) {
          const t = personalize(raw, { lang, pet: 'Капи', petId: 'kapi', name: 'Аня' });
          const where = `${f} ${lv} испытание ${i + 1}`;
          if (lang === 'ru') { tri(raw.title, `${where} title`); tri(raw.intro, `${where} intro`); tri(raw.reflect, `${where} reflect`); if (raw.praise) tri(raw.praise.text, `${where} praise`); }
          files = { ...(files || t.files || {}), ...(t.addFiles || {}) };
          for (const [k, st] of t.steps.entries()) {
            if (lang === 'ru') tri(raw.steps[k].say, `${where} шаг ${k + 1}`);
            try { new RegExp(st.re, st.flags ?? 'i'); } catch (e) { console.log(`✗ ${where} шаг ${k + 1}: ${e.message}`); bad++; }
            if (files[st.file] == null) { console.log(`✗ ${where} шаг ${k + 1}: нет файла ${st.file}`); bad++; }
          }
          if (checkSteps(t, files, '').every(Boolean)) { console.log(`✗ ${where} (${lang}): стартовый код уже решает задание`); bad++; }
        }
      }
      console.log(`✓ ${f} — «Дом для питомца», уровень ${lv}: ${challenges.length} испытания`);
    }
    continue;
  }
  const lessonFile = path.join(dir, '..', 'lessons', `${c.lessonId}.json`);
  if (!fs.existsSync(lessonFile)) { console.log(`✗ ${f}: нет урока ${c.lessonId}`); bad++; continue; }
  const lesson = JSON.parse(fs.readFileSync(lessonFile, 'utf8'));
  const exam = c.exam?.pool || null;
  if (exam) {
    // контрольная: пул заданий «напиши код»; на попытку берётся count штук вместо вопросов с номером replaces
    const seen = new Set();
    for (const [i, p] of exam.entries()) {
      const t = p.task;
      if (!Number.isInteger(p.replaces) || !lesson.questions?.[p.replaces]) { console.log(`✗ ${f} пул ${i + 1}: replaces ${p.replaces} — нет такого вопроса`); bad++; }
      if (seen.has(p.replaces)) { console.log(`✗ ${f} пул ${i + 1}: два задания заменяют вопрос ${p.replaces}`); bad++; }
      seen.add(p.replaces);
      tri(p.topic, `${f} пул ${i + 1} topic`); tri(t.title, `${f} пул ${i + 1} title`); tri(t.intro, `${f} пул ${i + 1} intro`);
      if (!t.sample) { console.log(`✗ ${f} пул ${i + 1}: нет sample`); bad++; }
      for (const [k, st] of t.steps.entries()) {
        tri(st.say, `${f} пул ${i + 1} шаг ${k + 1}`);
        if (!st.re) { console.log(`✗ ${f} пул ${i + 1} шаг ${k + 1}: в контрольной проверка только по re`); bad++; continue; }
        try { new RegExp(st.re, st.flags ?? 'i'); } catch (e) { console.log(`✗ ${f} пул ${i + 1} шаг ${k + 1}: ${e.message}`); bad++; }
        if (t.files[st.file] == null && !(t.extra || []).includes(st.file)) { console.log(`✗ ${f} пул ${i + 1} шаг ${k + 1}: нет файла ${st.file}`); bad++; }
      }
      if (checkSteps(t, t.files, '').every(Boolean)) { console.log(`✗ ${f} пул ${i + 1}: стартовый код уже решает задание`); bad++; }
      // образец должен проходить свои шаги: подставляем его в файл первого шага
      const F = { ...t.files };
      for (const st of t.steps) F[st.file] = (F[st.file] || '') + '\n' + t.sample;
      if (!checkSteps(t, F, '').every(Boolean)) { console.log(`✗ ${f} пул ${i + 1}: образец sample не проходит шаги`); bad++; }
    }
    console.log(`✓ ${f} — пул контрольной: ${exam.length} заданий, на попытку ${c.exam.count || 5}`);
    continue;
  }
  const tasks = [...Object.entries(c.sections || {}).map(([k, t]) => [`раздел ${k}`, t, Number(k)]), ['домашка', c.homework, null]];
  let n = 0;
  for (const [name, t, si] of tasks) {
    if (!t) { console.log(`✗ ${f}: нет ${name}`); bad++; continue; }
    if (si != null && !lesson.learn?.sections?.[si]) { console.log(`✗ ${f}: в уроке нет раздела ${si}`); bad++; }
    tri(t.title, `${f} ${name} title`); tri(t.intro, `${f} ${name} intro`);
    for (const [i, st] of t.steps.entries()) {
      tri(st.say, `${f} ${name} шаг ${i + 1}`);
      if (st.re) { try { new RegExp(st.re, st.flags ?? 'i'); } catch (e) { console.log(`✗ ${f} ${name} шаг ${i + 1}: ${e.message}`); bad++; } }
      if (st.file && t.files[st.file] == null && !(t.extra || []).includes(st.file)) { console.log(`✗ ${f} ${name} шаг ${i + 1}: нет файла ${st.file}`); bad++; }
    }
    const start = checkSteps(t, t.files, '');
    if (start.every(Boolean)) { console.log(`✗ ${f} ${name}: стартовый код уже решает всё задание`); bad++; }
    n += t.steps.length;
  }
  console.log(`✓ ${f} — заданий ${tasks.length}, шагов ${n}`);
}
// Проверка уровней «Мира Roblox» (content/world/levels.json)
const worldLevels = loadWorldLevels(path.join(path.dirname(fileURLToPath(import.meta.url)), '..'));
for (const wl of worldLevels) {
  tri(wl.title, `world:${wl.id} title`);
  tri(wl.intro, `world:${wl.id} intro`);
  if (!wl.files?.ru || !wl.files?.uz || !wl.files?.en) { console.log(`✗ world:${wl.id}: нужны files для ru/uz/en`); bad++; }
  if (!wl.kapi?.ru || !wl.kapi?.uz || !wl.kapi?.en) { console.log(`✗ world:${wl.id}: нужны реплики kapi для ru/uz/en`); bad++; }
  const r = wl.rules || {};
  let startBoxes, goodBoxes;
  if (wl.evalType === 'stairs') {
    startBoxes = Array.from({ length: r.count || 4 }, (_, i) => ({ x: 0, y: i * 48, w: 100, h: 40 }));
    goodBoxes = Array.from({ length: r.count || 4 }, (_, i) => ({ x: i * 50, y: i * 48, w: 100, h: 40 }));
  } else if (wl.evalType === 'pyramid') {
    startBoxes = Array.from({ length: 3 }, (_, i) => ({ x: 0, y: i * 51, w: 280, h: 45 }));
    goodBoxes = [120, 200, 280].map((w, i) => ({ x: (300 - w) / 2, y: i * 51, w, h: 45 }));
  } else {
    const cnt = r.count || 6, cols = r.cols || 3, minW = r.minWidth || 300;
    const gap = Math.min(10, r.star2Gap ?? 10);
    // Стартовая раскладка: 1 колонка или слишком узкая
    startBoxes = Array.from({ length: cnt }, (_, i) => ({ x: cols === 1 ? i * 40 : 0, y: cols === 1 ? 0 : i * 60, w: cols === 1 ? 35 : minW, h: 55 }));
    const colW = (minW - (cols - 1) * gap) / cols;
    goodBoxes = Array.from({ length: cnt }, (_, i) => ({
      x: (i % cols) * (colW + gap),
      y: Math.floor(i / cols) * (55 + gap),
      w: colW,
      h: 55,
    }));
  }
  const startV = evaluateLayout(wl, startBoxes, { x: 0, y: 0, w: 300, h: 360 }, wl.files?.ru?.['style.css'] || '', 1, 'ru');
  if (startV.stars > 0) { console.log(`✗ world:${wl.id}: стартовая раскладка не должна проходить`); bad++; }
  const goodV = evaluateLayout(wl, goodBoxes, { x: 0, y: 0, w: r.minWidth || 300, h: 160 }, wl.sampleCss || '', 1, 'ru');
  if (goodV.stars !== 3) { console.log(`✗ world:${wl.id}: решение должно давать 3★ (получено ${goodV.stars})`); bad++; }
  console.log(`✓ world:${wl.id} — стартовая не проходит, решение: 3★`);
}
if (bad) { console.log(`\nОшибок: ${bad}`); process.exit(1); }
