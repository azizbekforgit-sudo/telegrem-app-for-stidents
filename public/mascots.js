// Маскоты-напарники. Мягкий «кавай»-стиль: SVG с объёмом за счёт градиентов, румянец, блики.
// Каждый персонаж = тело (своё) + лицо (общая система эмоций) + позы лапок + эффекты.
//
// Эмоции: happy (обычное), cheer (правильный ответ), oops (ошибка), sad (грусть), think (думает),
//         wow (восторг, звёзды в глазах), love (100%), sleepy (скучает), peace (подмигивает с «V»),
//         talk (говорит — рот двигается), teach (учитель: очки + волшебная палочка, тоже говорит).

export const EMOTIONS = ['happy', 'cheer', 'oops', 'sad', 'think', 'wow', 'love', 'sleepy', 'peace', 'talk', 'teach'];

export const MASCOTS = {
  mimi: { name: 'Мими', about: 'Котёнок-отличница. Обожает, когда всё на 100%', color: '#ff8fb8' },
  kapi: { name: 'Капи', about: 'Капибара. Никогда не паникует, даже на контрольной', color: '#d9955f' },
  dino: { name: 'Дино', about: 'Динозаврик. Маленький, но рычит на ошибки', color: '#4fcf86' },
  axi: { name: 'Акси', about: 'Аксолотль. Отращивает знания, как жабры', color: '#ff7eb0' },
  boo: { name: 'Бу', about: 'Призрак в капюшоне. Звонит спросить: «Ну что, решил тест?»', color: '#3b3644' },
  ano: { name: 'Ано', about: 'Хакер в маске. Взламывает любые задачи — честно', color: '#2b2a33' },
  zip: { name: 'Зип', about: 'Супербыстрый. Решает тесты быстрее молнии', color: '#e8322f' },
  fox: { name: 'Рыжик', about: 'Хитрый лис в галстуке. Находит подвох в любом вопросе', color: '#f07b2a' },
  hog: { name: 'Шустрик', about: 'Быстрый ёжик. Решает на ходу и не ждёт никого', color: '#1bb5a2' },
  bot: { name: 'Бит', about: 'Робот-помощник. Проверяет ответы быстрее калькулятора', color: '#5b8def' },
  ugo: { name: 'Уголёк', about: 'Чёрный котик. Замечает ошибки даже в темноте', color: '#ff9a1f' },
};

let uid = 0;

const DARK_INK = '#3b2a35';
let INK = DARK_INK; // меняется на время рисования лица тёмного персонажа (f.ink)

// ───────── лицо ─────────
function eye(kind, x, y, s, side) {
  let k = s; // масштаб
  switch (kind) {
    case 'happy': // ^ ^
      return `<path d="M${x - 8 * k} ${y + 3 * k} Q${x} ${y - 8 * k} ${x + 8 * k} ${y + 3 * k}" stroke="${INK}" stroke-width="${4.6 * k}" fill="none" stroke-linecap="round"/>`;
    case 'squeeze': { // > <
      const d = side < 0 ? 1 : -1;
      return `<path d="M${x - 7 * k * d} ${y - 7 * k} L${x + 6 * k * d} ${y} L${x - 7 * k * d} ${y + 7 * k}" stroke="${INK}" stroke-width="${4.6 * k}" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;
    }
    case 'closed':
      return `<path d="M${x - 8 * k} ${y} Q${x} ${y + 7 * k} ${x + 8 * k} ${y}" stroke="${INK}" stroke-width="${4.2 * k}" fill="none" stroke-linecap="round"/>`;
    case 'star':
      return `<path transform="translate(${x} ${y}) scale(${k})" d="M0 -12 L3.6 -4 L12 -3.4 L5.6 2.4 L7.6 11 L0 6.4 L-7.6 11 L-5.6 2.4 L-12 -3.4 L-3.6 -4Z" fill="#ffc83d" stroke="#f0a200" stroke-width="1.6" stroke-linejoin="round"/><circle cx="${x - 3 * k}" cy="${y - 3 * k}" r="${2 * k}" fill="#fff" opacity=".8"/>`;
    case 'heart':
      return `<path transform="translate(${x} ${y}) scale(${k})" d="M0 10 C-14 1 -11 -11 -3.5 -9 C-1.5 -8.5 -0.5 -7 0 -5.5 C0.5 -7 1.5 -8.5 3.5 -9 C11 -11 14 1 0 10Z" fill="#ff4f8b"/><circle cx="${x - 4 * k}" cy="${y - 4 * k}" r="${2 * k}" fill="#fff" opacity=".85"/>`;
    case 'droopy': { // вытянутые грустно-хитрые глаза, уголки вниз наружу
      const d = side;
      k = k * 1.45;
      return `<path d="M${x - 6 * k * d} ${y - 9 * k} C${x + 4 * k * d} ${y - 8 * k} ${x + 11 * k * d} ${y + 2 * k} ${x + 9 * k * d} ${y + 11 * k} C${x + 6 * k * d} ${y + 15 * k} ${x - 4 * k * d} ${y + 8 * k} ${x - 9 * k * d} ${y - 1 * k} C${x - 11 * k * d} ${y - 6 * k} ${x - 9 * k * d} ${y - 9 * k} ${x - 6 * k * d} ${y - 9 * k}Z" fill="${INK}"/>
        <circle cx="${x - 3 * k * d}" cy="${y - 3 * k}" r="${2.6 * k}" fill="#fff" opacity=".9"/>`;
    }
    case 'slit': { // хитрые глаза-щёлочки с высокими бровями
      const d = side;
      return `<path d="M${x - 10 * k * d} ${y + 1 * k} C${x - 4 * k * d} ${y - 6 * k} ${x + 5 * k * d} ${y - 6 * k} ${x + 10 * k * d} ${y - 2 * k} C${x + 5 * k * d} ${y + 4 * k} ${x - 4 * k * d} ${y + 5 * k} ${x - 10 * k * d} ${y + 1 * k}Z" fill="${INK}"/>
        <path d="M${x - 12 * k * d} ${y - 9 * k} Q${x - 2 * k * d} ${y - 22 * k} ${x + 12 * k * d} ${y - 14 * k}" stroke="${INK}" stroke-width="${3 * k}" fill="none" stroke-linecap="round"/>`;
    }
    case 'wink':
      return `<path d="M${x - 8 * k} ${y + 1 * k} Q${x} ${y - 6 * k} ${x + 8 * k} ${y + 1 * k}" stroke="${INK}" stroke-width="${4.6 * k}" fill="none" stroke-linecap="round"/>`;
    case 'orb': { // большие круглые глаза с оранжевым ободком (Уголёк)
      const r = 15.5 * k;
      const gid = 'o' + ++uid;
      return `<defs><radialGradient id="${gid}" cx="50%" cy="50%" r="50%"><stop offset=".72" stop-color="#ffd23d"/><stop offset="1" stop-color="#ff7a00"/></radialGradient></defs>
        <circle cx="${x}" cy="${y}" r="${r + 4 * k}" fill="url(#${gid})"/><circle cx="${x}" cy="${y}" r="${r}" fill="#0b0b0f"/>
        <circle cx="${x + 6 * k}" cy="${y - 7 * k}" r="${4 * k}" fill="#fff"/><circle cx="${x - 5 * k}" cy="${y + 6 * k}" r="${1.5 * k}" fill="#fff" opacity=".7"/>`;
    }
    case 'look': // смотрит вверх-вбок
    case 'sad':
    case 'open':
    default: {
      const ox = kind === 'look' ? 2.5 * k : 0;
      const oy = kind === 'look' ? -2.5 * k : kind === 'sad' ? 1.5 * k : 0;
      return `<ellipse cx="${x + ox}" cy="${y + oy}" rx="${8.8 * k}" ry="${11 * k}" fill="${INK}"/>
        <circle cx="${x + ox - 2.8 * k}" cy="${y + oy - 4.2 * k}" r="${3.6 * k}" fill="#fff"/>
        <circle cx="${x + ox + 3 * k}" cy="${y + oy + 3.6 * k}" r="${1.7 * k}" fill="#fff" opacity=".9"/>`;
    }
  }
}

function mouth(kind, x, y, s, tongue = '#ff8aa8') {
  const k = s;
  switch (kind) {
    case 'cat': // ω
      return `<path d="M${x - 8 * k} ${y - 1 * k} Q${x - 4 * k} ${y + 5 * k} ${x} ${y} Q${x + 4 * k} ${y + 5 * k} ${x + 8 * k} ${y - 1 * k}" stroke="${INK}" stroke-width="${3.4 * k}" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;
    case 'open':
    case 'big': {
      const w = kind === 'big' ? 12 : 9;
      const h = kind === 'big' ? 17 : 12;
      const id = 'm' + ++uid;
      return `<clipPath id="${id}"><path d="M${x - w * k} ${y - 2 * k} Q${x} ${y + h * k} ${x + w * k} ${y - 2 * k} Z"/></clipPath>
        <path d="M${x - w * k} ${y - 2 * k} Q${x} ${y + h * k} ${x + w * k} ${y - 2 * k} Z" fill="#7a2c3e" stroke="${INK}" stroke-width="${2.4 * k}" stroke-linejoin="round"/>
        <ellipse clip-path="url(#${id})" cx="${x}" cy="${y + h * 0.62 * k}" rx="${w * 0.7 * k}" ry="${h * 0.38 * k}" fill="${tongue}"/>`;
    }
    case 'tongue': {
      return `<path d="M${x - 16 * k} ${y - 4 * k} Q${x - 2 * k} ${y + 12 * k} ${x + 14 * k} ${y - 2 * k}" stroke="${INK}" stroke-width="${3.6 * k}" fill="none" stroke-linecap="round"/>
        <g transform="rotate(-18 ${x + 5 * k} ${y + 6 * k})"><path d="M${x - 2 * k} ${y + 4 * k} C${x - 3 * k} ${y + 22 * k} ${x + 12 * k} ${y + 24 * k} ${x + 12 * k} ${y + 6 * k} Z" fill="#c2394f" stroke="#8e2236" stroke-width="${2 * k}" stroke-linejoin="round"/>
        <path d="M${x + 5 * k} ${y + 8 * k} L${x + 5 * k} ${y + 17 * k}" stroke="#8e2236" stroke-width="${1.6 * k}" stroke-linecap="round"/></g>`;
    }
    case 'grin':
      return `<path d="M${x - 19 * k} ${y - 5 * k} Q${x} ${y + 13 * k} ${x + 19 * k} ${y - 5 * k}" stroke="${INK}" stroke-width="${3.2 * k}" fill="none" stroke-linecap="round"/>`;
    case 'o':
      return `<ellipse cx="${x}" cy="${y + 2 * k}" rx="${4.4 * k}" ry="${5.4 * k}" fill="#7a2c3e" stroke="${INK}" stroke-width="${2.2 * k}"/>`;
    case 'wavy':
      return `<path d="M${x - 10 * k} ${y + 2 * k} q${2.5 * k} ${-4 * k} ${5 * k} 0 t${5 * k} 0 t${5 * k} 0 t${5 * k} 0" stroke="${INK}" stroke-width="${3.4 * k}" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;
    case 'frown':
      return `<path d="M${x - 7 * k} ${y + 5 * k} Q${x} ${y - 2 * k} ${x + 7 * k} ${y + 5 * k}" stroke="${INK}" stroke-width="${3.6 * k}" fill="none" stroke-linecap="round"/>`;
    case 'flat':
      return `<path d="M${x - 6 * k} ${y + 2 * k} L${x + 6 * k} ${y + 1 * k}" stroke="${INK}" stroke-width="${3.4 * k}" stroke-linecap="round"/>`;
    case 'smile':
    default:
      return `<path d="M${x - 7 * k} ${y} Q${x} ${y + 7 * k} ${x + 7 * k} ${y}" stroke="${INK}" stroke-width="${3.6 * k}" fill="none" stroke-linecap="round"/>`;
  }
}

// Что рисуем для каждой эмоции
const FACE = {
  happy: { l: 'open', r: 'open', m: 'smile', arms: 'down' },
  cheer: { l: 'happy', r: 'happy', m: 'big', arms: 'up', fx: 'sparkles' },
  oops: { l: 'squeeze', r: 'squeeze', m: 'wavy', arms: 'down', fx: 'sweat' },
  sad: { l: 'sad', r: 'sad', m: 'frown', arms: 'down', fx: 'tears', brows: 'sad' },
  think: { l: 'look', r: 'look', m: 'flat', arms: 'chin', fx: 'question' },
  wow: { l: 'star', r: 'star', m: 'open', arms: 'up', fx: 'sparkles' },
  love: { l: 'heart', r: 'heart', m: 'open', arms: 'down', fx: 'hearts' },
  sleepy: { l: 'closed', r: 'closed', m: 'o', arms: 'down', fx: 'zzz' },
  peace: { l: 'squeeze', r: 'squeeze', m: 'big', arms: 'peace' },
  talk: { l: 'open', r: 'open', m: 'talk', arms: 'down' },
  teach: { l: 'open', r: 'open', m: 'talk', arms: 'wand', glasses: true },
};

function fx(kind, b) {
  const [cx, top] = [b.cx, b.top];
  switch (kind) {
    case 'sparkles': {
      const star = (x, y, s, c) => `<path transform="translate(${x} ${y}) scale(${s})" d="M0 -10 C1 -3 3 -1 10 0 C3 1 1 3 0 10 C-1 3 -3 1 -10 0 C-3 -1 -1 -3 0 -10Z" fill="${c}"/>`;
      return `<g class="fx-tw">${star(cx - 72, top + 22, 1.1, '#ffc83d')}${star(cx + 74, top + 8, 0.8, '#ff8fc8')}${star(cx + 80, top + 62, 1.25, '#ffc83d')}${star(cx - 80, top + 74, 0.7, '#8fd3ff')}</g>`;
    }
    case 'sweat':
      return `<path class="fx-drop" d="M${cx + 52} ${top + 18} C${cx + 46} ${top + 30} ${cx + 44} ${top + 36} ${cx + 52} ${top + 38} C${cx + 60} ${top + 36} ${cx + 58} ${top + 30} ${cx + 52} ${top + 18}Z" fill="#8fd3ff" stroke="#4aa8e8" stroke-width="2"/><circle cx="${cx + 50}" cy="${top + 32}" r="2" fill="#fff"/>`;
    case 'tears': {
      const { ex, ey, s } = b.face;
      const t = (x) => `<path class="fx-drop" d="M${x} ${ey + 10 * s} C${x - 5} ${ey + 20 * s} ${x - 5} ${ey + 26 * s} ${x} ${ey + 27 * s} C${x + 5} ${ey + 26 * s} ${x + 5} ${ey + 20 * s} ${x} ${ey + 10 * s}Z" fill="#8fd3ff" opacity=".95"/>`;
      return t(b.face.x - ex - 2) + t(b.face.x + ex + 2);
    }
    case 'question':
      return `<g class="fx-float"><circle cx="${cx + 70}" cy="${top + 10}" r="17" fill="#fff" stroke="#e6dff0" stroke-width="3"/><text x="${cx + 70}" y="${top + 18}" text-anchor="middle" font-family="Nunito,system-ui" font-weight="900" font-size="22" fill="#9b6bff">?</text>
        <circle cx="${cx + 50}" cy="${top + 32}" r="5" fill="#fff" stroke="#e6dff0" stroke-width="2"/></g>`;
    case 'hearts': {
      const h = (x, y, s) => `<path transform="translate(${x} ${y}) scale(${s})" d="M0 10 C-14 1 -11 -11 -3.5 -9 C-1.5 -8.5 -0.5 -7 0 -5.5 C0.5 -7 1.5 -8.5 3.5 -9 C11 -11 14 1 0 10Z" fill="#ff5d9a"/>`;
      return `<g class="fx-float">${h(cx - 70, top + 20, 1)}${h(cx + 72, top + 8, 0.8)}${h(cx + 64, top + 50, 0.6)}</g>`;
    }
    case 'zzz':
      return `<g class="fx-float" font-family="Nunito,system-ui" font-weight="900" fill="#9b8fb5"><text x="${cx + 52}" y="${top + 20}" font-size="20">z</text><text x="${cx + 66}" y="${top + 4}" font-size="15">z</text><text x="${cx + 77}" y="${top - 8}" font-size="11">z</text></g>`;
    default:
      return '';
  }
}

// лицо целиком: глаза, румянец, рот, брови
function face(f, emo, pal) {
  INK = f.ink || DARK_INK;
  try { return faceInner(f, emo, pal); } finally { INK = DARK_INK; }
}
function faceInner(f, emo, pal) {
  const e = FACE[emo];
  const { x, y, ex, ey, my, s } = f;
  let out = '';
  out += `<ellipse cx="${x - ex - 6 * s}" cy="${ey + 13 * s}" rx="${11 * s}" ry="${7 * s}" fill="${pal.blush}" filter="url(#${f.blurId})" opacity=".85"/>`;
  out += `<ellipse cx="${x + ex + 6 * s}" cy="${ey + 13 * s}" rx="${11 * s}" ry="${7 * s}" fill="${pal.blush}" filter="url(#${f.blurId})" opacity=".85"/>`;
  let rightEye = emo === 'peace' ? 'wink' : e.r;
  let leftEye = emo === 'peace' ? 'open' : e.l;
  if ((emo === 'happy' || emo === 'peace' || emo === 'talk') && f.idleEyes) leftEye = rightEye = f.idleEyes;
  if (f.openEye) { if (leftEye === 'open' || leftEye === 'look') leftEye = f.openEye; if (rightEye === 'open' || rightEye === 'look') rightEye = f.openEye; }
  out += eye(leftEye, x - ex, ey, s, -1) + eye(rightEye, x + ex, ey, s, 1);
  if (e.brows === 'sad') {
    out += `<path d="M${x - ex - 9 * s} ${ey - 15 * s} L${x - ex + 6 * s} ${ey - 19 * s}" stroke="${INK}" stroke-width="${3.2 * s}" stroke-linecap="round"/>`;
    out += `<path d="M${x + ex + 9 * s} ${ey - 15 * s} L${x + ex - 6 * s} ${ey - 19 * s}" stroke="${INK}" stroke-width="${3.2 * s}" stroke-linecap="round"/>`;
  }
  if (e.glasses) {
    const r = (f.glassR || 14) * s;
    out += `<g class="glasses"><circle cx="${x - ex}" cy="${ey}" r="${r}" fill="#bfe6ff" fill-opacity=".25" stroke="${INK}" stroke-width="${3.2 * s}"/>
      <circle cx="${x + ex}" cy="${ey}" r="${r}" fill="#bfe6ff" fill-opacity=".25" stroke="${INK}" stroke-width="${3.2 * s}"/>
      <path d="M${x - ex + r} ${ey - 2 * s} Q${x} ${ey - 8 * s} ${x + ex - r} ${ey - 2 * s}" stroke="${INK}" stroke-width="${3 * s}" fill="none"/>
      <path d="M${x - ex - r * 0.5} ${ey - r * 0.6} L${x - ex - r * 0.1} ${ey - r * 0.9}" stroke="#fff" stroke-width="${2.4 * s}" stroke-linecap="round"/></g>`;
  }
  let m = e.m;
  if (m === 'talk') {
    const closed = f.idleMouth || 'smile';
    return out + `<g class="mouth-a">${mouth(closed, x, my, s, pal.tongue)}</g><g class="mouth-b">${mouth('open', x, my, s, pal.tongue)}</g>`;
  }
  if ((emo === 'happy' || (emo === 'peace' && f.idleEyes)) && f.idleMouth) m = f.idleMouth;
  out += mouth(m, x, my, s, pal.tongue);
  return out;
}

// лапки: позы down / up / chin / peace
function arms(pose, a, fill, stroke) {
  const paw = (x, y, rot) => `<ellipse cx="${x}" cy="${y}" rx="13" ry="10" transform="rotate(${rot} ${x} ${y})" fill="${fill}" stroke="${stroke}" stroke-width="3"/>`;
  const L = a.l, R = a.r;
  switch (pose) {
    case 'up':
      return paw(L[0] - 10, L[1] - 34, -55) + paw(R[0] + 10, R[1] - 34, 55);
    case 'chin':
      return paw(L[0], L[1], -20) + paw(a.chin[0], a.chin[1], -30);
    case 'peace': {
      const [px, py] = [R[0] + 6, R[1] - 30];
      return paw(L[0], L[1], -20) +
        `<g transform="rotate(14 ${px} ${py})"><rect x="${px - 9}" y="${py - 22}" width="8" height="22" rx="4" fill="${fill}" stroke="${stroke}" stroke-width="2.6"/>
         <rect x="${px + 1}" y="${py - 24}" width="8" height="24" rx="4" fill="${fill}" stroke="${stroke}" stroke-width="2.6"/>
         <ellipse cx="${px}" cy="${py + 2}" rx="12" ry="10" fill="${fill}" stroke="${stroke}" stroke-width="3"/></g>`;
    }
    case 'wand': { // правая лапа поднята и держит волшебную палочку-указку
      const [px, py] = [R[0] + 8, R[1] - 34];
      return paw(L[0], L[1], -20) +
        `<g class="wand"><path d="M${px} ${py} L${px + 22} ${py - 40}" stroke="#7a4a2a" stroke-width="5" stroke-linecap="round"/>
         <path d="M${px + 16} ${py - 29} L${px + 22} ${py - 40}" stroke="#fff" stroke-width="5" stroke-linecap="round"/>
         <path class="fx-tw" transform="translate(${px + 24} ${py - 46}) scale(1.05)" d="M0 -10 L3 -3 L10 -3 L4.5 2 L6.5 9.5 L0 5.5 L-6.5 9.5 L-4.5 2 L-10 -3 L-3 -3Z" fill="#ffc83d" stroke="#f0a200" stroke-width="1.6" stroke-linejoin="round"/></g>` +
        paw(px, py + 4, 30);
    }
    case 'left': // вторая лапа занята (держит телефон)
      return paw(L[0], L[1], -20);
    default:
      return paw(L[0], L[1], -20) + paw(R[0], R[1], 20);
  }
}

// ───────── тела ─────────
function defs(id, top, bottom) {
  return `<defs>
    <radialGradient id="${id}b" cx="38%" cy="28%" r="78%"><stop offset="0" stop-color="${top}"/><stop offset="1" stop-color="${bottom}"/></radialGradient>
    <filter id="${id}s" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="4"/></filter>
    <filter id="${id}k" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="2.4"/></filter>
  </defs>`;
}
const shadow = (id) => `<ellipse cx="100" cy="188" rx="56" ry="7" fill="#3b2a35" opacity=".14" filter="url(#${id}s)"/>`;
const shine = (x, y, rx, ry, rot = -25) => `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" transform="rotate(${rot} ${x} ${y})" fill="#fff" opacity=".55"/>`;

const BODIES = {
  mimi(id, emo) {
    const fill = `url(#${id}b)`;
    const st = '#e9d6e2';
    const ears = `
      <path d="M40 80 C34 56 38 36 46 32 C56 30 76 44 88 56 Z" fill="${fill}" stroke="${st}" stroke-width="3" stroke-linejoin="round"/>
      <path d="M160 80 C166 56 162 36 154 32 C144 30 124 44 112 56 Z" fill="${fill}" stroke="${st}" stroke-width="3" stroke-linejoin="round"/>
      <path d="M50 66 C47 54 49 45 53 43 C59 43 68 50 74 56 Z" fill="#ffc2da"/>
      <path d="M150 66 C153 54 151 45 147 43 C141 43 132 50 126 56 Z" fill="#ffc2da"/>`;
    const head = `<path d="M100 44 C150 44 172 76 172 112 C172 152 142 176 100 176 C58 176 28 152 28 112 C28 76 50 44 100 44Z" fill="${fill}" stroke="${st}" stroke-width="3"/>`;
    const feet = `<ellipse cx="74" cy="178" rx="17" ry="10" fill="${fill}" stroke="${st}" stroke-width="3"/><ellipse cx="126" cy="178" rx="17" ry="10" fill="${fill}" stroke="${st}" stroke-width="3"/>`;
    const clip = `<g transform="translate(146 52) rotate(18)"><path d="M0 12 C-17 2 -13 -13 -4 -11 C-2 -10.5 -0.6 -8.6 0 -7 C0.6 -8.6 2 -10.5 4 -11 C13 -13 17 2 0 12Z" fill="#ff5d9a" stroke="#e23f7f" stroke-width="2"/><ellipse cx="-5" cy="-5" rx="3.4" ry="2.2" fill="#fff" opacity=".7" transform="rotate(-30 -5 -5)"/></g>`;
    const whisk = (side) => [0, 1, 2].map((i) => {
      const y = 116 + i * 10;
      const x1 = side < 0 ? 18 : 182;
      const x2 = side < 0 ? 34 : 166;
      return `<path d="M${x1} ${y - (i - 1) * 3} L${x2} ${y}" stroke="#b49aa8" stroke-width="4" stroke-linecap="round" opacity=".75"/>`;
    }).join('');
    const nose = `<ellipse cx="100" cy="124" rx="5" ry="3.6" fill="#ffb03b"/>`;
    const f = { x: 100, y: 112, ex: 30, ey: 110, my: 134, s: 1, blurId: id + 'k', idleMouth: 'cat' };
    const a = { l: [46, 158], r: [154, 158], chin: [86, 150] };
    return { pal: { blush: '#ff9cc2', tongue: '#ff8aa8' }, back: ears + feet, body: head + clip + whisk(-1) + whisk(1) + shine(70, 70, 18, 10), nose, f, a, fill, st, b: { cx: 100, top: 30 } };
  },
  kapi(id) {
    const fill = `url(#${id}b)`;
    const st = '#b26f3f';
    const ears = `<ellipse cx="54" cy="58" rx="13" ry="11" fill="#a8693c" stroke="${st}" stroke-width="3"/><ellipse cx="146" cy="58" rx="13" ry="11" fill="#a8693c" stroke="${st}" stroke-width="3"/>`;
    const body = `<path d="M100 48 C152 48 174 70 174 112 C174 156 148 178 100 178 C52 178 26 156 26 112 C26 70 48 48 100 48Z" fill="${fill}" stroke="${st}" stroke-width="3"/>`;
    const snout = `<path d="M100 112 C134 112 146 124 146 140 C146 158 128 166 100 166 C72 166 54 158 54 140 C54 124 66 112 100 112Z" fill="#efc196" stroke="#c9895a" stroke-width="2.4"/>
      <rect x="82" y="120" width="10" height="16" rx="5" fill="#6b3d22"/><rect x="108" y="120" width="10" height="16" rx="5" fill="#6b3d22"/>`;
    const yuzu = `<g transform="translate(100 44)"><ellipse cx="0" cy="0" rx="21" ry="17" fill="#ffa53b" stroke="#e8801a" stroke-width="2.6"/><ellipse cx="-7" cy="-6" rx="6" ry="3.4" fill="#fff" opacity=".55" transform="rotate(-20 -7 -6)"/>
      <path d="M2 -16 C8 -30 22 -28 24 -22 C16 -18 8 -16 2 -16Z" fill="#5cc96b" stroke="#3ea64f" stroke-width="2"/></g>`;
    const feet = `<ellipse cx="70" cy="180" rx="16" ry="9" fill="#a8693c" stroke="${st}" stroke-width="3"/><ellipse cx="130" cy="180" rx="16" ry="9" fill="#a8693c" stroke="${st}" stroke-width="3"/>`;
    const f = { x: 100, y: 90, ex: 36, ey: 92, my: 150, s: 0.86, blurId: id + 'k' };
    const a = { l: [36, 160], r: [164, 160], chin: [84, 168] };
    return { pal: { blush: '#ff9a8a', tongue: '#ff8a8a' }, back: ears + feet, body: body + shine(66, 72, 18, 9) + snout, top: yuzu, f, a, fill: '#c98552', st, b: { cx: 100, top: 34 } };
  },
  dino(id) {
    const fill = `url(#${id}b)`;
    const st = '#36a96a';
    const spikes = [[62, 50, -30], [86, 36, -10], [114, 36, 10], [138, 50, 30]].map(([x, y, r]) => `<path transform="rotate(${r} ${x} ${y})" d="M${x - 11} ${y + 10} Q${x} ${y - 22} ${x + 11} ${y + 10} Z" fill="#ffd25e" stroke="#f0ac2a" stroke-width="2.6" stroke-linejoin="round"/>`).join('');
    const tail = `<path d="M150 150 C176 150 190 136 192 118 C180 130 168 132 154 132 Z" fill="${fill}" stroke="${st}" stroke-width="3" stroke-linejoin="round"/>`;
    const body = `<path d="M100 42 C146 42 166 72 166 110 C166 154 140 178 100 178 C60 178 34 154 34 110 C34 72 54 42 100 42Z" fill="${fill}" stroke="${st}" stroke-width="3"/>`;
    const belly = `<ellipse cx="100" cy="150" rx="40" ry="24" fill="#e8ffd9" opacity=".95"/>`;
    const feet = `<ellipse cx="74" cy="180" rx="16" ry="9" fill="#46c27b" stroke="${st}" stroke-width="3"/><ellipse cx="126" cy="180" rx="16" ry="9" fill="#46c27b" stroke="${st}" stroke-width="3"/>`;
    const nostr = `<circle cx="94" cy="122" r="2.2" fill="#2d8a56"/><circle cx="106" cy="122" r="2.2" fill="#2d8a56"/>`;
    const f = { x: 100, y: 100, ex: 28, ey: 98, my: 130, s: 1, blurId: id + 'k' };
    const a = { l: [42, 150], r: [158, 150], chin: [86, 146] };
    return { pal: { blush: '#ff9cb0', tongue: '#ff8aa8' }, back: spikes + tail + feet, body: body + belly + shine(70, 66, 17, 9) + nostr, f, a, fill: '#5fd690', st, b: { cx: 100, top: 30 } };
  },
  axi(id) {
    const fill = `url(#${id}b)`;
    const st = '#f07aa8';
    const gill = (x, y, r, flip) => `<g transform="translate(${x} ${y}) rotate(${r}) scale(${flip} 1)"><path d="M0 0 C-10 -4 -26 -6 -34 -2 C-40 2 -36 8 -28 8 C-20 8 -10 6 0 4Z" fill="#ff5f9e" stroke="#e2427f" stroke-width="2.2"/>
      <circle cx="-30" cy="2" r="3" fill="#ff8fbe"/><circle cx="-20" cy="0" r="2.2" fill="#ff8fbe"/></g>`;
    const gills = gill(52, 74, 48, 1) + gill(42, 92, 18, 1) + gill(40, 112, -8, 1) + gill(148, 74, -48, -1) + gill(158, 92, -18, -1) + gill(160, 112, 8, -1);
    const head = `<path d="M100 56 C150 56 166 82 166 112 C166 148 140 170 100 170 C60 170 34 148 34 112 C34 82 50 56 100 56Z" fill="${fill}" stroke="${st}" stroke-width="3"/>`;
    const feet = `<ellipse cx="76" cy="176" rx="14" ry="9" fill="#ffb2cf" stroke="${st}" stroke-width="3"/><ellipse cx="124" cy="176" rx="14" ry="9" fill="#ffb2cf" stroke="${st}" stroke-width="3"/>`;
    const spots = `<circle cx="134" cy="76" r="4" fill="#ffd1e3"/><circle cx="144" cy="88" r="2.6" fill="#ffd1e3"/>`;
    const f = { x: 100, y: 110, ex: 38, ey: 108, my: 132, s: 0.95, blurId: id + 'k' };
    const a = { l: [46, 158], r: [154, 158], chin: [86, 152] };
    return { pal: { blush: '#ff6fa3', tongue: '#ff8aa8' }, back: gills + feet, body: head + spots + shine(70, 78, 18, 9), f, a, fill: '#ffc0d8', st, b: { cx: 100, top: 40 } };
  },
  boo(id, emo) {
    const st = '#0d0b11';
    const hood = `<path d="M100 20 C152 20 174 60 174 104 C174 152 160 182 100 182 C40 182 26 152 26 104 C26 60 48 20 100 20Z" fill="url(#${id}b)" stroke="${st}" stroke-width="3"/>
      <path d="M100 40 C136 40 152 70 150 106 C148 146 128 170 100 170 C72 170 52 146 50 106 C48 70 64 40 100 40Z" fill="#0e0c13"/>`;
    const face = `<defs><radialGradient id="${id}f" cx="40%" cy="30%" r="80%"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#dcd8e4"/></radialGradient></defs>
      <path d="M100 50 C128 50 140 72 138 98 C136 124 126 146 110 160 C104 166 96 166 90 160 C74 146 64 124 62 98 C60 72 72 50 100 50Z" fill="url(#${id}f)" stroke="#c9c3d4" stroke-width="2"/>
      <path d="M93 112 C95 116 97 118 100 118 C103 118 105 116 107 112" stroke="#b9b2c6" stroke-width="2.4" fill="none" stroke-linecap="round"/>`;
    const phone = ['happy', 'think'].includes(emo)
      ? `<g transform="rotate(14 150 96)"><rect x="140" y="66" width="20" height="44" rx="6" fill="#f2f0f5" stroke="#9c96a8" stroke-width="2.4"/><rect x="144" y="74" width="12" height="10" rx="2" fill="#bfe3ff"/>
         <circle cx="147" cy="91" r="1.6" fill="#9c96a8"/><circle cx="153" cy="91" r="1.6" fill="#9c96a8"/><circle cx="147" cy="97" r="1.6" fill="#9c96a8"/><circle cx="153" cy="97" r="1.6" fill="#9c96a8"/>
         <rect x="155" y="52" width="4" height="16" rx="2" fill="#f2f0f5" stroke="#9c96a8" stroke-width="2"/></g>
         <ellipse cx="156" cy="112" rx="13" ry="11" fill="#2a2631" stroke="${st}" stroke-width="3"/>`
      : '';
    const f = { x: 100, y: 96, ex: 19, ey: 88, my: 128, s: 0.85, blurId: id + 'k', idleEyes: 'droopy', idleMouth: 'tongue' };
    const a = { l: [42, 160], r: [158, 160], chin: [84, 154] };
    return { pal: { blush: '#ffb3c8', tongue: '#ff8aa8' }, back: '', body: hood + shine(64, 52, 16, 7) + face, top: '', extra: phone, f, a, fill: '#2a2631', st, b: { cx: 100, top: 26 } };
  },
};

BODIES.ano = function ano(id) {
  const st = '#0d0c11';
  const hood = `<path d="M100 22 C150 22 174 58 174 104 C174 152 158 182 100 182 C42 182 26 152 26 104 C26 58 50 22 100 22Z" fill="url(#${id}b)" stroke="${st}" stroke-width="3"/>
    <path d="M100 38 C138 38 156 66 154 104 C152 146 130 170 100 170 C70 170 48 146 46 104 C44 66 62 38 100 38Z" fill="#0f0e14"/>
    <path d="M88 172 L84 188 M112 172 L116 188" stroke="#d8d6de" stroke-width="3" stroke-linecap="round"/><circle cx="84" cy="189" r="3" fill="#d8d6de"/><circle cx="116" cy="189" r="3" fill="#d8d6de"/>`;
  const mask = `<defs><radialGradient id="${id}f" cx="40%" cy="28%" r="80%"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#e2dfe8"/></radialGradient></defs>
    <path d="M100 48 C134 48 148 72 146 100 C144 126 132 144 112 152 L100 166 L88 152 C68 144 56 126 54 100 C52 72 66 48 100 48Z" fill="url(#${id}f)" stroke="#cdc8d6" stroke-width="2"/>`;
  const stache = `<path d="M100 114 C92 110 82 110 76 116 C72 120 66 118 66 112 C70 116 74 112 76 110 C84 104 94 106 100 110 C106 106 116 104 124 110 C126 112 130 116 134 112 C134 118 128 120 124 116 C118 110 108 110 100 114Z" fill="${INK}"/>
    <path d="M100 136 L100 150" stroke="${INK}" stroke-width="3.4" stroke-linecap="round"/><path d="M96 140 L100 154 L104 140Z" fill="${INK}"/>
    <path d="M100 86 L100 104" stroke="#c9c3d4" stroke-width="2.2" stroke-linecap="round"/>`;
  const f = { x: 100, y: 96, ex: 21, ey: 90, my: 124, s: 0.85, blurId: id + 'k', idleEyes: 'slit', idleMouth: 'grin' };
  const a = { l: [42, 160], r: [158, 160], chin: [84, 154] };
  return { pal: { blush: '#ff7f9e', tongue: '#ff8aa8' }, back: '', body: hood + shine(64, 52, 16, 7) + mask, nose: stache, f, a, fill: '#2a2933', st, b: { cx: 100, top: 26 } };
};

BODIES.zip = function zip(id) {
  const st = '#9e1414';
  const bolt = (x, y, sc, rot = 0) => `<path transform="translate(${x} ${y}) rotate(${rot}) scale(${sc})" d="M2 -14 L-7 2 L-1 2 L-4 14 L7 -3 L1 -3 L5 -14Z" fill="#ffd23d" stroke="#e8a000" stroke-width="1.6" stroke-linejoin="round"/>`;
  // линии скорости позади
  const speed = `<g opacity=".55" stroke="#ffb3a8" stroke-width="5" stroke-linecap="round"><path d="M12 92 L36 92"/><path d="M4 112 L30 112"/><path d="M14 132 L34 132"/></g>`;
  const body = `<path d="M100 34 C150 34 170 70 170 110 C170 152 144 178 100 178 C56 178 30 152 30 110 C30 70 50 34 100 34Z" fill="url(#${id}b)" stroke="${st}" stroke-width="3"/>`;
  // открытая нижняя часть лица и «стёкла» маски
  const face = `<path d="M62 112 C62 142 80 158 100 158 C120 158 138 142 138 112 C126 120 114 122 100 122 C86 122 74 120 62 112Z" fill="#ffd8bd" stroke="#e8a98a" stroke-width="2"/>
    <ellipse cx="78" cy="96" rx="17" ry="14" fill="#fff" stroke="${st}" stroke-width="2.4"/><ellipse cx="122" cy="96" rx="17" ry="14" fill="#fff" stroke="${st}" stroke-width="2.4"/>
    <path d="M100 66 L100 80" stroke="#ff8a7a" stroke-width="3" stroke-linecap="round" opacity=".7"/>`;
  const extras = bolt(100, 26, 1.1) + bolt(160, 88, 0.75, 20) + bolt(40, 88, 0.75, -20) + bolt(100, 168, 0.8);
  const feet = `<ellipse cx="74" cy="180" rx="16" ry="9" fill="#ffd23d" stroke="#e8a000" stroke-width="3"/><ellipse cx="126" cy="180" rx="16" ry="9" fill="#ffd23d" stroke="#e8a000" stroke-width="3"/>`;
  const f = { x: 100, y: 100, ex: 22, ey: 96, my: 136, s: 0.9, blurId: id + 'k' };
  const a = { l: [38, 150], r: [162, 150], chin: [86, 146] };
  return { pal: { blush: '#ff9c8a', tongue: '#ff8aa8' }, back: speed + feet, body: body + shine(68, 60, 18, 9) + face, top: extras, f, a, fill: '#e8322f', st, b: { cx: 100, top: 28 } };
};

BODIES.ugo = function ugo(id) {
  const st = '#000000';
  const fill = `url(#${id}b)`;
  // хвост завитком слева
  const tail = `<path d="M52 170 C22 172 10 150 18 128 C24 112 40 108 44 120 C47 130 36 132 34 142 C32 154 44 160 58 156 Z" fill="${fill}" stroke="${st}" stroke-width="3" stroke-linejoin="round"/>`;
  const ears = `<path d="M50 74 C44 50 46 28 54 22 C64 20 84 40 92 52 Z" fill="${fill}" stroke="${st}" stroke-width="3" stroke-linejoin="round"/>
    <path d="M150 74 C156 50 154 28 146 22 C136 20 116 40 108 52 Z" fill="${fill}" stroke="${st}" stroke-width="3" stroke-linejoin="round"/>
    <path d="M57 58 C54 46 55 36 59 33 C65 33 75 43 80 50 Z" fill="#f2876f"/>
    <path d="M143 58 C146 46 145 36 141 33 C135 33 125 43 120 50 Z" fill="#f2876f"/>`;
  const body = `<path d="M100 40 C146 40 168 66 168 100 C168 118 162 128 160 138 C166 156 160 180 128 180 L72 180 C40 180 34 156 40 138 C38 128 32 118 32 100 C32 66 54 40 100 40Z" fill="${fill}" stroke="${st}" stroke-width="3"/>`;
  const nose = `<path d="M95 116 L105 116 L100 122Z" fill="#ff8fa0" stroke="#e86f82" stroke-width="1.2" stroke-linejoin="round"/>`;
  const feet = `<ellipse cx="78" cy="181" rx="15" ry="8" fill="#1d1c22" stroke="${st}" stroke-width="3"/><ellipse cx="122" cy="181" rx="15" ry="8" fill="#1d1c22" stroke="${st}" stroke-width="3"/>`;
  const f = { x: 100, y: 96, ex: 31, ey: 92, my: 128, s: 1, glassR: 21, blurId: id + 'k', ink: '#ffa62b', openEye: 'orb', idleMouth: 'cat' };
  const a = { l: [44, 158], r: [156, 158], chin: [86, 150] };
  return { pal: { blush: '#ff6f8f', tongue: '#ff6f8f' }, back: tail + ears + feet, body: body + `<ellipse cx="68" cy="60" rx="14" ry="6" transform="rotate(-25 68 60)" fill="#fff" opacity=".22"/>`, nose, f, a, fill: '#1d1c22', st, b: { cx: 100, top: 28 } };
};

BODIES.fox = function fox(id) {
  const st = '#c25512';
  const fill = `url(#${id}b)`;
  const tail = `<path d="M150 152 C192 152 200 112 184 82 C178 108 162 118 146 122 Z" fill="#f07b2a" stroke="${st}" stroke-width="3" stroke-linejoin="round"/><path d="M184 82 C174 98 178 108 190 102 C197 94 191 86 184 84Z" fill="#fff" stroke="#e6dccf" stroke-width="2"/>`;
  const ears = `<path d="M52 72 C46 42 52 20 60 16 C72 22 88 44 92 60 Z" fill="${fill}" stroke="${st}" stroke-width="3" stroke-linejoin="round"/><path d="M148 72 C154 42 148 20 140 16 C128 22 112 44 108 60 Z" fill="${fill}" stroke="${st}" stroke-width="3" stroke-linejoin="round"/>
    <path d="M59 62 C56 46 59 33 63 30 C71 35 80 47 84 58 Z" fill="#5b2a17"/><path d="M141 62 C144 46 141 33 137 30 C129 35 120 47 116 58 Z" fill="#5b2a17"/>`;
  const body = `<path d="M100 46 C150 46 172 74 172 112 C172 156 146 178 100 178 C54 178 28 156 28 112 C28 74 50 46 100 46Z" fill="${fill}" stroke="${st}" stroke-width="3"/>`;
  const muzzle = `<path d="M100 102 C124 102 140 111 140 124 C140 137 122 144 100 144 C78 144 60 137 60 124 C60 111 76 102 100 102Z" fill="#fff1dc"/>`;
  const shirt = `<path d="M42 152 C62 144 82 147 100 152 C118 147 138 144 158 152 C162 166 142 178 100 178 C58 178 38 166 42 152Z" fill="#a7d957" stroke="#7fae30" stroke-width="2.4" stroke-linejoin="round"/>
    <path d="M100 152 L83 146 L89 162Z" fill="#c5eb7e" stroke="#7fae30" stroke-width="2"/><path d="M100 152 L117 146 L111 162Z" fill="#c5eb7e" stroke="#7fae30" stroke-width="2"/>
    <path d="M100 152 L94 158 L97 176 L100 180 L103 176 L106 158Z" fill="#4b3f9e"/><path d="M96 162 L104 160 M96.6 168 L103.4 166 M97 174 L103 172" stroke="#b6acff" stroke-width="2"/>`;
  const nose = `<path d="M93 109 Q100 104 107 109 Q104 118 100 119 Q96 118 93 109Z" fill="#2b1b17"/>`;
  const f = { x: 100, y: 96, ex: 25, ey: 90, my: 129, s: 0.85, blurId: id + 'k', idleEyes: 'slit', idleMouth: 'grin' };
  const a = { l: [38, 156], r: [162, 156], chin: [86, 152] };
  return { pal: { blush: '#ff9a7a', tongue: '#ff8aa8' }, back: tail + ears, body: body + shine(68, 66, 17, 9) + muzzle + shirt, nose, f, a, fill: '#ff9a4d', st, b: { cx: 100, top: 22 } };
};

BODIES.hog = function hog(id) {
  const st = '#0f8579';
  const fill = `url(#${id}b)`;
  const quills = [-178, -152, -126, -100, -74, -48, -22, 4, 28, 152, 178].map((deg) => {
    const r = (d) => (d * Math.PI) / 180;
    const pt = (rad, d) => `${(100 + rad * Math.cos(r(d))).toFixed(1)} ${(104 + rad * Math.sin(r(d))).toFixed(1)}`;
    return `<path d="M${pt(66, deg - 13)} L${pt(106, deg)} L${pt(66, deg + 13)}Z" fill="#12968a" stroke="${st}" stroke-width="2.6" stroke-linejoin="round"/>`;
  }).join('');
  const ears = `<circle cx="62" cy="52" r="13" fill="${fill}" stroke="${st}" stroke-width="3"/><circle cx="138" cy="52" r="13" fill="${fill}" stroke="${st}" stroke-width="3"/><circle cx="62" cy="53" r="6.5" fill="#ffd9c2"/><circle cx="138" cy="53" r="6.5" fill="#ffd9c2"/>`;
  const body = `<path d="M100 42 C146 42 166 72 166 110 C166 154 140 178 100 178 C60 178 34 154 34 110 C34 72 54 42 100 42Z" fill="${fill}" stroke="${st}" stroke-width="3"/>`;
  const patch = `<path d="M100 88 C126 84 152 96 152 120 C152 146 128 162 100 162 C72 162 48 146 48 120 C48 96 74 84 100 88Z" fill="#ffe9c9"/>`;
  const band = `<path d="M40 80 Q100 60 160 80 L157 91 Q100 73 43 91Z" fill="#ffd23d" stroke="#e8a000" stroke-width="2.4" stroke-linejoin="round"/><path transform="translate(100 74)" d="M2 -9 L-5 2 L-1 2 L-3 9 L5 -3 L1 -3 L4 -9Z" fill="#fff"/>`;
  const nose = `<ellipse cx="100" cy="121" rx="6.5" ry="4.8" fill="#2b2b33"/><circle cx="98" cy="119.5" r="1.4" fill="#fff" opacity=".8"/>`;
  const feet = `<ellipse cx="72" cy="180" rx="21" ry="11" fill="#ffd23d" stroke="#e8a000" stroke-width="3"/><rect x="62" y="170" width="20" height="5" rx="2.5" fill="#fff"/><ellipse cx="128" cy="180" rx="21" ry="11" fill="#ffd23d" stroke="#e8a000" stroke-width="3"/><rect x="118" y="170" width="20" height="5" rx="2.5" fill="#fff"/>`;
  const f = { x: 100, y: 108, ex: 25, ey: 106, my: 138, s: 0.9, blurId: id + 'k' };
  const a = { l: [40, 152], r: [160, 152], chin: [86, 150] };
  return { pal: { blush: '#ff9cae', tongue: '#ff8aa8' }, back: quills + ears + feet, body: body + shine(66, 62, 16, 8) + patch, top: band, nose, f, a, fill: '#9ff3e6', st, b: { cx: 100, top: 26 } };
};

BODIES.bot = function bot(id) {
  const st = '#6f88a3';
  const fill = `url(#${id}b)`;
  const antenna = `<path d="M100 40 L100 20" stroke="${st}" stroke-width="5" stroke-linecap="round"/><circle cx="100" cy="14" r="7.5" fill="#ff5f5f" stroke="#d93a3a" stroke-width="2.4"/><circle cx="97.5" cy="11.5" r="2.4" fill="#fff" opacity=".8"/>`;
  const ears = `<rect x="14" y="88" width="20" height="44" rx="9" fill="#9db4cc" stroke="${st}" stroke-width="3"/><rect x="166" y="88" width="20" height="44" rx="9" fill="#9db4cc" stroke="${st}" stroke-width="3"/><circle cx="24" cy="110" r="4" fill="#5d7694"/><circle cx="176" cy="110" r="4" fill="#5d7694"/>`;
  const feet = `<rect x="52" y="170" width="38" height="16" rx="8" fill="#6f88a3" stroke="#53698a" stroke-width="3"/><rect x="110" y="170" width="38" height="16" rx="8" fill="#6f88a3" stroke="#53698a" stroke-width="3"/>`;
  const body = `<path d="M46 40 H154 Q172 40 172 58 V148 Q172 178 142 178 H58 Q28 178 28 148 V58 Q28 40 46 40Z" fill="${fill}" stroke="${st}" stroke-width="3"/>`;
  const screen = `<rect x="42" y="56" width="116" height="86" rx="24" fill="#14233a" stroke="#3e5877" stroke-width="3"/><path d="M54 66 Q70 60 96 62" stroke="#fff" stroke-width="3.4" stroke-linecap="round" opacity=".28" fill="none"/>`;
  const lights = `<circle cx="82" cy="160" r="4.6" fill="#ff5f5f"/><circle cx="100" cy="160" r="4.6" fill="#ffd23d"/><circle cx="118" cy="160" r="4.6" fill="#4cd964"/>`;
  const f = { x: 100, y: 100, ex: 25, ey: 98, my: 122, s: 0.82, blurId: id + 'k', ink: '#7cf3ff', idleMouth: 'smile' };
  const a = { l: [34, 150], r: [166, 150], chin: [86, 150] };
  return { pal: { blush: '#ff6fa8', tongue: '#ff6fa8' }, back: antenna + ears + feet, body: body + shine(64, 52, 16, 7) + screen + lights, f, a, fill: '#e8f1fb', st, b: { cx: 100, top: 30 } };
};

const GRAD = { mimi: ['#ffffff', '#f3e6ef'], kapi: ['#e6aa74', '#c07b48'], dino: ['#8ff0b4', '#45c27b'], axi: ['#ffd6e6', '#ff9cc4'], boo: ['#56505f', '#17141c'], ano: ['#4a4952', '#141319'], zip: ['#ff6b5e', '#c41e1e'], ugo: ['#3a3842', '#0a0a0d'], fox: ['#ffa458', '#e8661a'], hog: ['#7ff0e0', '#14a896'], bot: ['#f3f8ff', '#a9bfd8'] };

export function mascot(id = 'mimi', emo = 'happy', size = 120, cls = '', crop = false) {
  if (!BODIES[id]) id = 'mimi';
  if (!FACE[emo]) emo = 'happy';
  const uidStr = 'z' + ++uid;
  const B = BODIES[id](uidStr, emo);
  const e = FACE[emo];
  const fillPaw = B.fill.startsWith('url') ? GRAD[id][0] : B.fill;
  const pose = B.extra && e.arms === 'down' ? 'left' : e.arms;
  return `<svg class="mascot m-${emo} ${cls}" width="${size}" height="${size}" viewBox="${crop ? '26 30 148 148' : '0 0 200 200'}" role="img" aria-label="${MASCOTS[id].name}">
    ${defs(uidStr, GRAD[id][0], GRAD[id][1])}
    ${shadow(uidStr)}
    <g class="m-body">${B.back}${B.body}${B.top || ''}${B.nose || ''}${face(B.f, emo, B.pal)}${arms(pose, B.a, fillPaw, B.st)}${B.extra || ''}</g>
    ${e.fx ? fx(e.fx, { ...B.b, face: B.f }) : ''}
  </svg>`;
}
