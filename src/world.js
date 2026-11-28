// Серверная логика «Мира Зубрика» (Roblox): 11 уровней, сопряжение, проверка CSS раскладок,
// прогресс по уровням, выдача раскладки игре, фиксация событий и побед (XP + предмет в «Дом питомца»).
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { httpError } from './logic.js';

const PAIR_TTL_MS = 10 * 60_000;
const PUSH_COOLDOWN_MS = 2_000;
const PULL_COOLDOWN_MS = 1_000;
const MAX_BOXES = 24;
const MAX_CSS_LINES = 40;
const PULL_CSS_LINES = 12;

const sha256 = (s) => crypto.createHash('sha256').update(String(s)).digest('hex');

const T = {
  ru: {
    needGrid: (c, r, n) => `Нужна сетка ${c} кол. × ${r} ряд. (${n} блоков). Попробуй: display: grid; grid-template-columns: repeat(${c}, 1fr);`,
    needEqualCols: (c) => `Колонки разной ширины — попробуй grid-template-columns: repeat(${c}, 1fr);`,
    needGap: (g, m) => `Щели слишком большие (${g}px > ${m}px) — уменьши gap`,
    needOverlap: 'Блоки накладываются друг на друга — проверь размеры и gap.',
    needWidth: (w, m) => `Ширина меньше нужной (${w}px < ${m}px) — проверь width: ${m}px`,
    needStairs: 'Каждая следующая ступенька должна сдвигаться вправо на 30–110px (margin-left).',
    needPyramid: 'Выстрой 3 яруса по центру так, чтобы каждый нижний был шире верхнего.',
    okGrid: (c, r) => `${c}×${r} ✓`,
    okCols: 'Колонки ровные ✓',
    okGap: (g) => `Щели ${g}px ✓`,
    okWidth: (w) => `Ширина ${w}px ✓`,
    great: 'Отлично!',
    useRepeat: 'Для 3★ используй repeat(..., 1fr) и уложись в 3 отправки.',
    winReason: (id, stars) => `Мир Roblox: уровень ${id} (${'★'.repeat(stars)})`,
  },
  uz: {
    needGrid: (c, r, n) => `${c} ustun × ${r} qator (${n} blok) kerak. Sinab ko'r: display: grid; grid-template-columns: repeat(${c}, 1fr);`,
    needEqualCols: (c) => `Ustunlar kengligi har xil — grid-template-columns: repeat(${c}, 1fr); yoz`,
    needGap: (g, m) => `Oraliq juda katta (${g}px > ${m}px) — gap ni kamaytir`,
    needOverlap: 'Bloklar ustma-ust tushgan — o\'lcham va gap ni tekshir.',
    needWidth: (w, m) => `Kenglik kam (${w}px < ${m}px) — width: ${m}px ni tekshir`,
    needStairs: 'Har bir keyingi zinapoya o\'ngga 30–110px siljishi kerak (margin-left).',
    needPyramid: '3 qavatni markazga tekisla, pastki qavat yuqoridan keng bo\'lsin.',
    okGrid: (c, r) => `${c}×${r} ✓`,
    okCols: 'Ustunlar teng ✓',
    okGap: (g) => `Oraliq ${g}px ✓`,
    okWidth: (w) => `Kenglik ${w}px ✓`,
    great: 'Ajoyib!',
    useRepeat: '3★ uchun repeat(..., 1fr) ishlat va 3 ta urinishda bajar.',
    winReason: (id, stars) => `Roblox dunyosi: ${id} daraja (${'★'.repeat(stars)})`,
  },
  en: {
    needGrid: (c, r, n) => `Need a ${c} cols × ${r} rows grid (${n} blocks). Try: display: grid; grid-template-columns: repeat(${c}, 1fr);`,
    needEqualCols: (c) => `Columns have different widths — try grid-template-columns: repeat(${c}, 1fr);`,
    needGap: (g, m) => `Gaps are too wide (${g}px > ${m}px) — reduce gap`,
    needOverlap: 'Blocks are overlapping — check sizes and gap.',
    needWidth: (w, m) => `Too narrow (${w}px < ${m}px) — check width: ${m}px`,
    needStairs: 'Each next step should shift right by 30–110px (margin-left).',
    needPyramid: 'Center the 3 tiers so each lower tier is wider than the one above.',
    okGrid: (c, r) => `${c}×${r} ✓`,
    okCols: 'Equal columns ✓',
    okGap: (g) => `Gaps ${g}px ✓`,
    okWidth: (w) => `Width ${w}px ✓`,
    great: 'Awesome!',
    useRepeat: 'For 3★ use repeat(..., 1fr) within 3 pushes.',
    winReason: (id, stars) => `Roblox World: level ${id} (${'★'.repeat(stars)})`,
  },
};

export function parseColorRgb(raw) {
  const s = String(raw || '').trim().toLowerCase();
  const rgb = /^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/.exec(s);
  if (rgb) return [Number(rgb[1]), Number(rgb[2]), Number(rgb[3])].map((n) => Math.max(0, Math.min(255, Math.round(n))));
  const hex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/.exec(s);
  if (hex) {
    let h = hex[1];
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
  }
  return [160, 82, 45];
}

function cluster1D(items, coordFn, tol) {
  const sorted = [...items].sort((a, b) => coordFn(a) - coordFn(b));
  const groups = [];
  for (const it of sorted) {
    const v = coordFn(it);
    const last = groups[groups.length - 1];
    if (last && Math.abs(v - last.mean) <= tol) {
      last.items.push(it);
      last.mean = last.items.reduce((s, x) => s + coordFn(x), 0) / last.items.length;
    } else {
      groups.push({ mean: v, items: [it] });
    }
  }
  return groups;
}

export function evaluateLayout(level, boxes, container, cssText = '', attempts = 1, lang = 'ru') {
  const L = T[lang] || T.ru;
  const rules = level.rules || {};
  const kind = level.evalType || 'grid';
  const strippedCss = String(cssText || '').replace(/\/\*[\s\S]*?\*\//g, '');

  if (kind === 'stairs') {
    const sorted = [...boxes].sort((a, b) => a.y - b.y);
    const countOk = sorted.length === (rules.count ?? 4);
    let shiftOk = countOk;
    let gapOk = countOk;
    for (let i = 1; i < sorted.length; i++) {
      const dx = sorted[i].x - sorted[i - 1].x;
      const dy = sorted[i].y - (sorted[i - 1].y + sorted[i - 1].h);
      if (dx < (rules.minShift ?? 30) || dx > (rules.maxShift ?? 110)) shiftOk = false;
      if (dy < -2 || dy > (rules.maxGapY ?? 24)) gapOk = false;
    }
    const ok = countOk && shiftOk && gapOk;
    const stars = !ok ? 0 : (attempts <= 3 ? 3 : 2);
    return {
      gridOk: countOk, equalCols: shiftOk, gapOk, widthOk: true, maxGap: 0, totalWidth: Math.round(container?.w || 320), stars,
      tips: ok ? [L.great] : [L.needStairs],
    };
  }

  if (kind === 'pyramid') {
    const sorted = [...boxes].sort((a, b) => a.y - b.y);
    const countOk = sorted.length === (rules.count ?? 3);
    let orderOk = countOk;
    let centerOk = countOk;
    let gapOk = countOk;
    const centers = sorted.map((b) => b.x + b.w / 2);
    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i].w <= sorted[i - 1].w + 15) orderOk = false;
      if (Math.abs(centers[i] - centers[0]) > 12) centerOk = false;
      const dy = sorted[i].y - (sorted[i - 1].y + sorted[i - 1].h);
      if (dy < -2 || dy > (rules.maxGapY ?? 20)) gapOk = false;
    }
    const ok = countOk && orderOk && centerOk && gapOk;
    const stars = !ok ? 0 : (attempts <= 3 ? 3 : 2);
    return {
      gridOk: countOk && orderOk, equalCols: centerOk, gapOk, widthOk: true, maxGap: 0, totalWidth: Math.round(container?.w || 300), stars,
      tips: ok ? [L.great] : [L.needPyramid],
    };
  }

  const count = rules.count ?? 6;
  const needCols = rules.cols ?? 3;
  const needRows = rules.rows ?? 2;
  const maxGapAllowed = rules.maxGap ?? 40;
  const star2Gap = rules.star2Gap ?? 20;
  const minWidth = rules.minWidth ?? 300;
  const tolX = rules.tolX ?? 3;
  const tolW = rules.tolW ?? 2;
  const maxAttempts3 = rules.maxAttemptsFor3Stars ?? 3;

  const cols = cluster1D(boxes, (b) => b.x + b.w / 2, tolX);
  const rows = cluster1D(boxes, (b) => b.y + b.h / 2, tolX);

  let gridOk = boxes.length === count && cols.length === needCols && rows.length === needRows
    && cols.every((c) => c.items.length === needRows)
    && rows.every((r) => r.items.length === needCols);

  if (gridOk) {
    const cells = new Set();
    for (const b of boxes) {
      const ci = cols.findIndex((c) => c.items.includes(b));
      const ri = rows.findIndex((r) => r.items.includes(b));
      const key = `${ci}:${ri}`;
      if (ci < 0 || ri < 0 || cells.has(key)) { gridOk = false; break; }
      cells.add(key);
    }
  }

  let equalCols = false;
  if (gridOk) {
    const colWidths = cols.map((c) => c.items.reduce((s, b) => s + b.w, 0) / c.items.length);
    equalCols = Math.max(...colWidths) - Math.min(...colWidths) <= tolW;
  }

  let gapOk = false;
  let maxGap = 0;
  let overlap = false;
  if (gridOk) {
    const colBounds = cols.map((c) => ({
      left: Math.min(...c.items.map((b) => b.x)),
      right: Math.max(...c.items.map((b) => b.x + b.w)),
    }));
    const rowBounds = rows.map((r) => ({
      top: Math.min(...r.items.map((b) => b.y)),
      bottom: Math.max(...r.items.map((b) => b.y + b.h)),
    }));
    const gaps = [];
    for (let i = 0; i < colBounds.length - 1; i++) gaps.push(colBounds[i + 1].left - colBounds[i].right);
    for (let i = 0; i < rowBounds.length - 1; i++) gaps.push(rowBounds[i + 1].top - rowBounds[i].bottom);
    const minG = gaps.length ? Math.min(...gaps) : 0;
    maxGap = gaps.length ? Math.max(...gaps) : 0;
    overlap = minG < -2;
    gapOk = !overlap && maxGap <= maxGapAllowed;
  }

  const totalWidth = boxes.length
    ? Math.round(Math.max(...boxes.map((b) => b.x + b.w)) - Math.min(...boxes.map((b) => b.x)))
    : Math.round(container?.w || 0);
  const widthOk = boxes.length > 0 && totalWidth >= minWidth - 1;

  const usedRepeatFr = /\brepeat\s*\(/i.test(strippedCss) && /\b\d*\.?\d+fr\b/i.test(strippedCss);

  let stars = 0;
  if (gridOk && equalCols && gapOk && widthOk) {
    stars = 1;
    if (maxGap <= star2Gap) stars = 2;
    if (stars === 2 && usedRepeatFr && attempts <= maxAttempts3) stars = 3;
  }

  const tips = [];
  if (!gridOk) tips.push(L.needGrid(needCols, needRows, count));
  else if (!equalCols) tips.push(L.needEqualCols(needCols));
  else if (overlap) tips.push(L.needOverlap);
  else if (!gapOk) tips.push(L.needGap(Math.round(maxGap), maxGapAllowed));
  else if (!widthOk) tips.push(L.needWidth(totalWidth, minWidth));
  else {
    tips.push(`${L.okGrid(needCols, needRows)} · ${L.okCols} · ${L.okGap(Math.max(0, Math.round(maxGap)))} · ${L.okWidth(totalWidth)} — ${L.great}`);
    if (stars < 3 && !usedRepeatFr) tips.push(L.useRepeat);
  }

  return {
    gridOk,
    equalCols,
    gapOk,
    widthOk,
    maxGap: Math.max(0, Math.round(maxGap)),
    totalWidth,
    stars,
    tips,
  };
}

export function loadWorldLevels(root) {
  const f = path.join(root, 'content', 'world', 'levels.json');
  if (!fs.existsSync(f)) return [];
  const data = JSON.parse(fs.readFileSync(f, 'utf8'));
  return Array.isArray(data?.levels) ? data.levels : [];
}

export function createWorld({ logic, store, root }) {
  const S = logic.S;
  const levels = loadWorldLevels(root);
  const byId = Object.fromEntries(levels.map((l) => [l.id, l]));

  // коды хранятся в базе (только хеш): после перезапуска сервера они не пропадают
  const pairs = () => (S.worldPairs ||= {});
  const pushAt = new Map();
  const pullAt = new Map();

  const ensureStore = () => {
    S.world ||= {};
    S.worldTokens ||= {};
  };

  function isUnlocked(uid, level) {
    if (!level) return false;
    if (logic.isAdmin(uid)) return true;
    const ord = level.order || 1;
    if (ord <= 1) return true;
    const prev = levels.find((l) => (l.order || 1) === ord - 1);
    if (!prev) return true;
    return Boolean(S.world?.[uid]?.byLevel?.[prev.id]?.won);
  }

  function cleanBox(b) {
    if (!b || typeof b !== 'object') throw httpError(400, 'Некорректный блок');
    const x = Number(b.x), y = Number(b.y), w = Number(b.w), h = Number(b.h);
    if (![x, y, w, h].every(Number.isFinite)) throw httpError(400, 'Координаты должны быть числами');
    if (w < 4 || w > 2000 || h < 4 || h > 2000) throw httpError(400, 'Размер блока должен быть от 4 до 2000 px');
    if (Math.abs(x) > 20000 || Math.abs(y) > 20000) throw httpError(400, 'Координаты блока вне допустимого диапазона');
    return { x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10, w: Math.round(w * 10) / 10, h: Math.round(h * 10) / 10, color: parseColorRgb(b.color) };
  }

  function cleanContainer(c) {
    if (!c || typeof c !== 'object') return { x: 0, y: 0, w: 300, h: 130 };
    const x = Number(c.x) || 0, y = Number(c.y) || 0, w = Number(c.w), h = Number(c.h);
    if (![x, y, w, h].every(Number.isFinite) || w < 4 || w > 4000 || h < 4 || h > 4000) {
      throw httpError(400, 'Некорректные размеры контейнера');
    }
    return { x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10, w: Math.round(w * 10) / 10, h: Math.round(h * 10) / 10 };
  }

  function pair(uid) {
    uid = String(uid);
    if (!S.users[uid]) throw httpError(404, 'Пользователь не найден');
    const P = pairs();
    for (const [k, v] of Object.entries(P)) {
      if (v.userId === uid || v.expiresAt <= Date.now()) delete P[k];
    }
    let code;
    do { code = String(crypto.randomInt(100000, 1000000)); } while (P[sha256(code)]);
    P[sha256(code)] = { userId: uid, expiresAt: Date.now() + PAIR_TTL_MS };
    store.save();
    return { code, expiresInSec: Math.round(PAIR_TTL_MS / 1000) };
  }

  function link({ code, robloxUserId, robloxName }) {
    const cleanCode = String(code || '').trim();
    const rec = pairs()[sha256(cleanCode)];
    if (!rec || rec.expiresAt <= Date.now()) {
      throw httpError(400, 'Код неверный или устарел');
    }
    const rId = String(robloxUserId || '').trim().slice(0, 40);
    if (!rId) throw httpError(400, 'Нужен robloxUserId');
    delete pairs()[sha256(cleanCode)];

    ensureStore();
    for (const [h, t] of Object.entries(S.worldTokens)) {
      if (t.userId === rec.userId || t.robloxUserId === rId) delete S.worldTokens[h];
    }

    const token = crypto.randomBytes(32).toString('hex');
    const hash = sha256(token);
    const rName = String(robloxName || 'Player').replace(/[\u0000-\u001f]+/g, ' ').trim().slice(0, 40);
    S.worldTokens[hash] = { userId: rec.userId, robloxUserId: rId, robloxName: rName, linkedAt: Date.now() };
    S.world[rec.userId] = {
      ...(S.world[rec.userId] || {}),
      robloxUserId: rId,
      robloxName: rName,
      linkedAt: Date.now(),
    };
    store.save();

    const u = S.users[rec.userId];
    logic.log('world', { event: 'link', user: { id: rec.userId, name: logic.name(u) }, robloxUserId: rId });
    return {
      token,
      userId: rec.userId,
      name: logic.name(u),
      mascot: u?.prefs?.mascot || 'kapi',
      lang: u?.prefs?.lang || 'ru',
      accent: u?.prefs?.accent || 'lime',
    };
  }

  function authToken(rawToken) {
    const tok = String(rawToken || '').trim();
    if (!tok) throw httpError(401, 'Нужен X-World-Token');
    ensureStore();
    const rec = S.worldTokens[sha256(tok)];
    if (!rec || !S.users[rec.userId]) throw httpError(401, 'Неверный токен мира');
    return rec;
  }

  function push(uid, { levelId, files, boxes, container }) {
    uid = String(uid);
    const now = Date.now();
    if (now - (pushAt.get(uid) || 0) < PUSH_COOLDOWN_MS) {
      throw httpError(429, 'Слишком часто — подожди 2 секунды');
    }
    pushAt.set(uid, now);

    const level = byId[String(levelId || '')];
    if (!level) throw httpError(404, 'Уровень не найден');
    if (!isUnlocked(uid, level)) throw httpError(403, 'Сначала пройди предыдущий уровень в Roblox!');
    if (!Array.isArray(boxes) || boxes.length > MAX_BOXES) {
      throw httpError(400, `Ожидается массив блоков (не более ${MAX_BOXES})`);
    }
    const cleanedBoxes = boxes.map(cleanBox);
    const cleanedContainer = cleanContainer(container);

    const cssRaw = files && typeof files === 'object'
      ? Object.entries(files).filter(([k]) => k.endsWith('.css')).map(([, v]) => String(v || '')).join('\n')
      : '';
    const codeLines = cssRaw.replace(/\r\n/g, '\n').split('\n').slice(0, MAX_CSS_LINES);
    const code = codeLines.join('\n');

    ensureStore();
    const prev = S.world[uid] || {};
    const prevLv = prev.byLevel?.[level.id] || {};
    const attempts = (prevLv.pushes || 0) + 1;
    const lang = S.users[uid]?.prefs?.lang || 'ru';
    const verdict = evaluateLayout(level, cleanedBoxes, cleanedContainer, code, attempts, lang);

    const nextPushId = (prev.pushId || 0) + 1;
    const byLevel = {
      ...(prev.byLevel || {}),
      [level.id]: {
        ...prevLv,
        boxes: cleanedBoxes,
        container: cleanedContainer,
        verdict,
        code,
        pushes: attempts,
        pushId: nextPushId,
        stars: Math.max(prevLv.stars || 0, verdict.stars),
        won: Boolean(prevLv.won),
        at: now,
      },
    };

    S.world[uid] = {
      ...prev,
      levelId: level.id,
      boxes: cleanedBoxes,
      container: cleanedContainer,
      verdict,
      code,
      pushes: attempts,
      pushId: nextPushId,
      stars: Math.max(prev.stars || 0, verdict.stars),
      won: Boolean(prevLv.won),
      byLevel,
      at: now,
    };
    store.save();
    logic.log('world', { event: 'push', user: { id: uid, name: logic.name(S.users[uid]) }, levelId: level.id, boxes: cleanedBoxes.length, stars: verdict.stars });
    return { ok: true, verdict, pushes: attempts, pushId: nextPushId };
  }

  function pull(rawToken) {
    const auth = authToken(rawToken);
    const now = Date.now();
    if (now - (pullAt.get(auth.userId) || 0) < PULL_COOLDOWN_MS) {
      throw httpError(429, 'Слишком частый опрос (лимит 1 раз в секунду)');
    }
    pullAt.set(auth.userId, now);

    const u = S.users[auth.userId];
    const lang = u?.prefs?.lang || 'ru';
    const w = S.world[auth.userId] || {};
    const activeId = w.levelId || '8-1';
    const level = byId[activeId] || levels[0];
    const kapi = level?.kapi?.[lang] || level?.kapi?.ru || {};

    const progress = {};
    for (const lv of levels) {
      const rec = w.byLevel?.[lv.id];
      if (rec?.won || (lv.id === activeId && w.won)) {
        progress[lv.id] = { won: true, stars: rec?.stars || w.stars || 1 };
      } else if (rec?.stars) {
        progress[lv.id] = { won: false, stars: rec.stars };
      }
    }

    return {
      levelId: level?.id || '8-1',
      biome: level?.biome || 'camp',
      user: {
        id: auth.userId,
        name: logic.name(u),
        mascot: u?.prefs?.mascot || 'kapi',
        lang,
        accent: u?.prefs?.accent || 'lime',
      },
      kapi,
      progress,
      state: w.boxes ? {
        levelId: activeId,
        biome: level?.biome || 'camp',
        pushId: w.pushId || 1,
        boxes: w.boxes,
        container: w.container || null,
        verdict: w.verdict || null,
        cssLines: String(w.code || '').split('\n').slice(0, PULL_CSS_LINES),
        stars: w.byLevel?.[activeId]?.stars || w.stars || 0,
        won: Boolean(w.byLevel?.[activeId]?.won || (activeId === w.levelId && w.won)),
        at: w.at || 0,
      } : null,
    };
  }

  function event(rawToken, body) {
    const auth = authToken(rawToken);
    const kind = String(body?.kind || '').slice(0, 40);
    if (!kind) throw httpError(400, 'Нужен kind события');
    const levelId = String(body?.levelId || '8-1').slice(0, 20);
    const detail = body?.detail != null ? String(body.detail).slice(0, 120) : undefined;
    logic.log('world', { event: kind, user: { id: auth.userId, name: logic.name(S.users[auth.userId]) }, levelId, ...(detail ? { detail } : {}) });
    return { ok: true };
  }

  function win(rawToken, body) {
    const auth = authToken(rawToken);
    const uid = auth.userId;
    const u = S.users[uid];
    const lang = u?.prefs?.lang || 'ru';
    const L = T[lang] || T.ru;
    ensureStore();
    const w = S.world[uid] || {};
    const level = byId[String(body?.levelId || w.levelId || '8-1')] || levels[0];
    if (!level) throw httpError(404, 'Уровень не найден');

    const prevLv = w.byLevel?.[level.id] || {};
    const verdictStars = prevLv.verdict?.stars || w.verdict?.stars || 0;
    // победа засчитывается только после «Отправить в мир» с рабочим кодом: звёзды не выше вердикта сервера
    if (verdictStars < 1) throw httpError(400, 'Сначала отправь решение в мир');
    const stars = Math.max(1, Math.min(verdictStars, Number(body?.stars) || verdictStars));
    const maxXp = level.reward?.maxXp ?? 240;
    const perStar = level.reward?.xpPerStar ?? 80;
    const xp = Math.min(maxXp, stars * perStar);

    w.byLevel ||= {};
    w.byLevel[level.id] = { ...prevLv, won: true, wonAt: Date.now(), stars: Math.max(prevLv.stars || 0, stars) };
    const nextLevel = levels.find((l) => (l.order || 1) === (level.order || 1) + 1) || null;
    if (w.levelId === level.id) {
      w.won = true;
      w.wonAt = Date.now();
      w.stars = Math.max(w.stars || 0, stars);
      if (nextLevel) w.levelId = nextLevel.id;
    }
    S.world[uid] = w;

    const bonusRes = logic.addBonus({
      id: `world:${uid}:${level.id}`,
      userId: uid,
      xp,
      reason: L.winReason(level.id, stars),
    });

    const decorId = level.reward?.decorId || 'bridge';
    u.worldDecor ||= [];
    const newDecor = !u.worldDecor.includes(decorId);
    if (newDecor) u.worldDecor.push(decorId);
    store.save();

    logic.log('world', {
      event: 'win',
      user: { id: uid, name: logic.name(u) },
      levelId: level.id,
      stars,
      xp: bonusRes.already ? 0 : xp,
      decor: decorId,
    });
    return {
      ok: true,
      userId: uid,
      levelId: level.id,
      title: level.title?.[lang] || level.title?.ru || level.id,
      nextLevelId: nextLevel?.id || null,
      nextTitle: nextLevel ? (nextLevel.title?.[lang] || nextLevel.title?.ru || nextLevel.id) : null,
      nextIntro: nextLevel ? (nextLevel.intro?.[lang] || nextLevel.intro?.ru || '') : null,
      stars,
      xpAwarded: bonusRes.already ? 0 : xp,
      decorId,
      newDecor,
    };
  }

  function status(uid) {
    uid = String(uid);
    const lang = S.users[uid]?.prefs?.lang || 'ru';
    const w = S.world?.[uid] || null;
    const byLv = w?.byLevel || {};
    const totalStars = levels.reduce((s, l) => s + (byLv[l.id]?.stars || 0), 0);
    const mapped = levels.map((l) => {
      const lvState = byLv[l.id] || null;
      const unlocked = isUnlocked(uid, l);
      return {
        id: l.id,
        order: l.order || 1,
        biome: l.biome || 'camp',
        lesson: l.lesson,
        lessonId: l.lessonId,
        title: l.title?.[lang] || l.title?.ru || l.id,
        intro: l.intro?.[lang] || l.intro?.ru || '',
        allow: l.allow || ['html', 'css'],
        open: l.open || 'style.css',
        selectors: l.selectors || { box: '.bridge', plank: '.plank' },
        files: l.files?.[lang] || l.files?.ru || {},
        stars: lvState?.stars || 0,
        won: Boolean(lvState?.won),
        unlocked,
        verdict: lvState?.verdict || null,
      };
    });
    const current = mapped.find((l) => l.unlocked && !l.won) || mapped[mapped.length - 1] || null;
    return {
      linked: Boolean(w?.robloxUserId),
      robloxName: w?.robloxName || null,
      verdict: w?.verdict || null,
      stars: totalStars || w?.stars || 0,
      maxStars: levels.length * 3,
      currentLevelId: current?.id || '8-1',
      won: Boolean(w?.won),
      pushes: w?.pushes || 0,
      pushedAt: w?.at || null,
      levels: mapped,
    };
  }

  return { pair, link, push, pull, event, win, status, levels };
}
