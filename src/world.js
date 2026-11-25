// Серверная логика «Мира Зубрика» (Roblox): сопряжение, проверка CSS Grid по прямоугольникам,
// выдача раскладки игре, фиксация событий и побед (XP + предмет в «Дом питомца»).
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
    needGrid: 'Нужна сетка 3 колонки и 2 ряда (6 досок). Попробуй: display: grid; grid-template-columns: repeat(3, 1fr);',
    needEqualCols: 'Колонки разной ширины — попробуй grid-template-columns: repeat(3, 1fr);',
    needGap: (g) => `Щели слишком большие (${g}px > 40px) — уменьши gap (например, gap: 10px;)`,
    needOverlap: 'Доски накладываются друг на друга — проверь размеры и gap.',
    needWidth: (w) => `Мост слишком узкий (${w}px < 300px) — проверь width: 300px; у .bridge`,
    okGrid: '3 колонки × 2 ряда ✓',
    okCols: 'Колонки ровные ✓',
    okGap: (g) => `Щели ${g}px ✓`,
    okWidth: (w) => `Ширина ${w}px ✓`,
    great: 'Отличный мост!',
    useRepeat: 'Для 3★ используй repeat(3, 1fr) и уложись в 3 отправки.',
    winReason: (id, stars) => `Мир Roblox: уровень ${id} (${'★'.repeat(stars)})`,
  },
  uz: {
    needGrid: '3 ustun va 2 qator (6 taxta) kerak. Sinab ko\'r: display: grid; grid-template-columns: repeat(3, 1fr);',
    needEqualCols: 'Ustunlar kengligi har xil — grid-template-columns: repeat(3, 1fr); yozib ko\'r',
    needGap: (g) => `Oraliq juda katta (${g}px > 40px) — gap ni kamaytir (masalan, gap: 10px;)`,
    needOverlap: 'Taxtalar ustma-ust tushib qolgan — o\'lcham va gap ni tekshir.',
    needWidth: (w) => `Ko'prik juda tor (${w}px < 300px) — .bridge da width: 300px; ni tekshir`,
    okGrid: '3 ustun × 2 qator ✓',
    okCols: 'Ustunlar teng ✓',
    okGap: (g) => `Oraliq ${g}px ✓`,
    okWidth: (w) => `Kenglik ${w}px ✓`,
    great: 'Ajoyib ko\'prik!',
    useRepeat: '3★ uchun repeat(3, 1fr) ishlat va 3 ta urinishda bajar.',
    winReason: (id, stars) => `Roblox dunyosi: ${id} daraja (${'★'.repeat(stars)})`,
  },
  en: {
    needGrid: 'Need a 3 columns × 2 rows grid (6 planks). Try: display: grid; grid-template-columns: repeat(3, 1fr);',
    needEqualCols: 'Columns have different widths — try grid-template-columns: repeat(3, 1fr);',
    needGap: (g) => `Gaps are too wide (${g}px > 40px) — reduce gap (e.g. gap: 10px;)`,
    needOverlap: 'Planks are overlapping — check plank sizes and gap.',
    needWidth: (w) => `Bridge is too narrow (${w}px < 300px) — check width: 300px; on .bridge`,
    okGrid: '3 cols × 2 rows ✓',
    okCols: 'Equal columns ✓',
    okGap: (g) => `Gaps ${g}px ✓`,
    okWidth: (w) => `Width ${w}px ✓`,
    great: 'Great bridge!',
    useRepeat: 'For 3★ use repeat(3, 1fr) within 3 pushes.',
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
  return [160, 82, 45]; // sienna по умолчанию
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

  const strippedCss = String(cssText || '').replace(/\/\*[\s\S]*?\*\//g, '');
  const usedRepeatFr = /\brepeat\s*\(/i.test(strippedCss) && /\b\d*\.?\d+fr\b/i.test(strippedCss);

  let stars = 0;
  if (gridOk && equalCols && gapOk && widthOk) {
    stars = 1;
    if (maxGap <= star2Gap) stars = 2;
    if (stars === 2 && usedRepeatFr && attempts <= maxAttempts3) stars = 3;
  }

  const tips = [];
  if (!gridOk) tips.push(L.needGrid);
  else if (!equalCols) tips.push(L.needEqualCols);
  else if (overlap) tips.push(L.needOverlap);
  else if (!gapOk) tips.push(L.needGap(Math.round(maxGap)));
  else if (!widthOk) tips.push(L.needWidth(totalWidth));
  else {
    tips.push(`${L.okGrid} · ${L.okCols} · ${L.okGap(Math.max(0, Math.round(maxGap)))} · ${L.okWidth(totalWidth)} — ${L.great}`);
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

  // Одноразовые коды сопряжения хранятся только в памяти (не в БД и не в логах)
  const pairCodes = new Map();
  const pushAt = new Map();
  const pullAt = new Map();

  const ensureStore = () => {
    S.world ||= {};
    S.worldTokens ||= {};
  };

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
    for (const [k, v] of pairCodes.entries()) {
      if (v.userId === uid || v.expiresAt <= Date.now() || v.used) pairCodes.delete(k);
    }
    let code;
    do { code = String(crypto.randomInt(100000, 1000000)); } while (pairCodes.has(code));
    const expiresAt = Date.now() + PAIR_TTL_MS;
    pairCodes.set(code, { userId: uid, expiresAt, used: false });
    return { code, expiresInSec: Math.round(PAIR_TTL_MS / 1000) };
  }

  function link({ code, robloxUserId, robloxName }) {
    const cleanCode = String(code || '').trim();
    const rec = pairCodes.get(cleanCode);
    if (!rec || rec.used || rec.expiresAt <= Date.now()) {
      throw httpError(400, 'Код неверный или устарел');
    }
    const rId = String(robloxUserId || '').trim().slice(0, 40);
    if (!rId) throw httpError(400, 'Нужен robloxUserId');
    rec.used = true;
    pairCodes.delete(cleanCode);

    ensureStore();
    // Отзываем прошлые токены этого robloxUserId / userId, чтобы не копились
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
    const attempts = (prev.levelId === level.id ? (prev.pushes || 0) : 0) + 1;
    const lang = S.users[uid]?.prefs?.lang || 'ru';
    const verdict = evaluateLayout(level, cleanedBoxes, cleanedContainer, code, attempts, lang);

    S.world[uid] = {
      ...prev,
      levelId: level.id,
      boxes: cleanedBoxes,
      container: cleanedContainer,
      verdict,
      code,
      pushes: attempts,
      pushId: (prev.pushId || 0) + 1,
      stars: Math.max(prev.stars || 0, verdict.stars),
      won: Boolean(prev.won),
      at: now,
    };
    store.save();
    logic.log('world', { event: 'push', user: { id: uid, name: logic.name(S.users[uid]) }, levelId: level.id, boxes: cleanedBoxes.length, stars: verdict.stars });
    return { ok: true, verdict, pushes: attempts, pushId: S.world[uid].pushId };
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
    const level = byId[w.levelId || '8-1'] || levels[0];
    const kapi = level?.kapi?.[lang] || level?.kapi?.ru || {};

    return {
      levelId: level?.id || '8-1',
      user: {
        id: auth.userId,
        name: logic.name(u),
        mascot: u?.prefs?.mascot || 'kapi',
        lang,
        accent: u?.prefs?.accent || 'lime',
      },
      kapi,
      state: w.boxes ? {
        pushId: w.pushId || 1,
        boxes: w.boxes,
        container: w.container || null,
        verdict: w.verdict || null,
        cssLines: String(w.code || '').split('\n').slice(0, PULL_CSS_LINES),
        stars: w.stars || 0,
        won: Boolean(w.won),
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

    const verdictStars = w.verdict?.stars || 0;
    const stars = Math.max(1, Math.min(3, Number(body?.stars) || verdictStars || 1));
    const maxXp = level.reward?.maxXp ?? 240;
    const perStar = level.reward?.xpPerStar ?? 80;
    const xp = Math.min(maxXp, stars * perStar);

    w.won = true;
    w.wonAt = Date.now();
    w.stars = Math.max(w.stars || 0, stars);
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
    return { ok: true, stars, xpAwarded: bonusRes.already ? 0 : xp, decorId, newDecor };
  }

  function status(uid) {
    uid = String(uid);
    const lang = S.users[uid]?.prefs?.lang || 'ru';
    const w = S.world?.[uid] || null;
    return {
      linked: Boolean(w?.robloxUserId),
      robloxName: w?.robloxName || null,
      verdict: w?.verdict || null,
      stars: w?.stars || 0,
      won: Boolean(w?.won),
      pushes: w?.pushes || 0,
      pushedAt: w?.at || null,
      levels: levels.map((l) => ({
        id: l.id,
        lesson: l.lesson,
        lessonId: l.lessonId,
        title: l.title?.[lang] || l.title?.ru || l.id,
        intro: l.intro?.[lang] || l.intro?.ru || '',
        allow: l.allow || ['html', 'css'],
        open: l.open || 'style.css',
        selectors: l.selectors || { box: '.bridge', plank: '.plank' },
        files: l.files?.[lang] || l.files?.ru || {},
      })),
    };
  }

  return { pair, link, push, pull, event, win, status, levels };
}
