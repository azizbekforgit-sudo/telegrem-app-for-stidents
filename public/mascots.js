// Маскоты-напарники. Мягкий «кавай»-стиль: SVG с объёмом за счёт градиентов, румянец, блики.
// Каждый персонаж = тело (своё) + лицо (общая система эмоций) + позы лапок + эффекты.
//
// Эмоции: happy (обычное), cheer (правильный ответ), oops (ошибка), sad (грусть), think (думает),
//         wow (восторг, звёзды в глазах), love (100%), sleepy (скучает), peace (подмигивает с «V»).

export const EMOTIONS = ['happy', 'cheer', 'oops', 'sad', 'think', 'wow', 'love', 'sleepy', 'peace'];

export const MASCOTS = {
  mimi: { name: 'Мими', about: 'Котёнок-отличница. Обожает, когда всё на 100%', color: '#ff8fb8' },
  kapi: { name: 'Капи', about: 'Капибара. Никогда не паникует, даже на контрольной', color: '#d9955f' },
  dino: { name: 'Дино', about: 'Динозаврик. Маленький, но рычит на ошибки', color: '#4fcf86' },
  axi: { name: 'Акси', about: 'Аксолотль. Отращивает знания, как жабры', color: '#ff7eb0' },
};

let uid = 0;

const INK = '#3b2a35';

// ───────── лицо ─────────
function eye(kind, x, y, s, side) {
  const k = s; // масштаб
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
    case 'wink':
      return `<path d="M${x - 8 * k} ${y + 1 * k} Q${x} ${y - 6 * k} ${x + 8 * k} ${y + 1 * k}" stroke="${INK}" stroke-width="${4.6 * k}" fill="none" stroke-linecap="round"/>`;
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
  const e = FACE[emo];
  const { x, y, ex, ey, my, s } = f;
  let out = '';
  out += `<ellipse cx="${x - ex - 6 * s}" cy="${ey + 13 * s}" rx="${11 * s}" ry="${7 * s}" fill="${pal.blush}" filter="url(#${f.blurId})" opacity=".85"/>`;
  out += `<ellipse cx="${x + ex + 6 * s}" cy="${ey + 13 * s}" rx="${11 * s}" ry="${7 * s}" fill="${pal.blush}" filter="url(#${f.blurId})" opacity=".85"/>`;
  const rightEye = emo === 'peace' ? 'wink' : e.r;
  const leftEye = emo === 'peace' ? 'open' : e.l;
  out += eye(leftEye, x - ex, ey, s, -1) + eye(rightEye, x + ex, ey, s, 1);
  if (e.brows === 'sad') {
    out += `<path d="M${x - ex - 9 * s} ${ey - 15 * s} L${x - ex + 6 * s} ${ey - 19 * s}" stroke="${INK}" stroke-width="${3.2 * s}" stroke-linecap="round"/>`;
    out += `<path d="M${x + ex + 9 * s} ${ey - 15 * s} L${x + ex - 6 * s} ${ey - 19 * s}" stroke="${INK}" stroke-width="${3.2 * s}" stroke-linecap="round"/>`;
  }
  let m = e.m;
  if (emo === 'happy' && f.idleMouth) m = f.idleMouth;
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
};

const GRAD = { mimi: ['#ffffff', '#f3e6ef'], kapi: ['#e6aa74', '#c07b48'], dino: ['#8ff0b4', '#45c27b'], axi: ['#ffd6e6', '#ff9cc4'] };

export function mascot(id = 'mimi', emo = 'happy', size = 120, cls = '', crop = false) {
  if (!BODIES[id]) id = 'mimi';
  if (!FACE[emo]) emo = 'happy';
  const uidStr = 'z' + ++uid;
  const B = BODIES[id](uidStr, emo);
  const e = FACE[emo];
  const fillPaw = B.fill.startsWith('url') ? GRAD[id][0] : B.fill;
  return `<svg class="mascot m-${emo} ${cls}" width="${size}" height="${size}" viewBox="${crop ? '26 30 148 148' : '0 0 200 200'}" role="img" aria-label="${MASCOTS[id].name}">
    ${defs(uidStr, GRAD[id][0], GRAD[id][1])}
    ${shadow(uidStr)}
    <g class="m-body">${B.back}${B.body}${B.top || ''}${B.nose || ''}${face(B.f, emo, B.pal)}${arms(e.arms, B.a, fillPaw, B.st)}</g>
    ${e.fx ? fx(e.fx, { ...B.b, face: B.f }) : ''}
  </svg>`;
}
