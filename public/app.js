// Mini App «Зубрик»: путь уроков в стиле Duolingo, напарник-маскот, лига группы,
// статистика с диаграммами и панель учителя.
import { ICONS } from './icons.js';
import { mascot, MASCOTS } from './mascots.js';
import { LANGS, setLang, tr, detectLang, getLang } from './i18n.js';
import { INFO, STAT_KEYS, FIELDS } from './mascot-info.js';
const LOCALE = () => ({ ru: 'ru-RU', en: 'en-US' })[getLang()] || 'ru-RU';
const UZ_MONTHS = ['yanvar', 'fevral', 'mart', 'aprel', 'may', 'iyun', 'iyul', 'avgust', 'sentabr', 'oktabr', 'noyabr', 'dekabr'];
// Дата на языке интерфейса (для узбекского у браузеров нет названий месяцев — делаем сами)
function fmtDate(ts, year) {
  const d = new Date(ts);
  if (getLang() === 'uz') return `${d.getDate()}-${UZ_MONTHS[d.getMonth()]}${year ? `, ${d.getFullYear()}` : ''}`;
  return d.toLocaleDateString(LOCALE(), year ? { day: 'numeric', month: 'long', year: 'numeric' } : { day: 'numeric', month: 'short' });
}

const tg = window.Telegram?.WebApp;
const params = new URLSearchParams(location.search);
const DEV_USER = params.get('dev');

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const app = $('#app');
const nav = $('#nav');
const layer = $('#layer');

// ───────── иконки (Solar) и 3D-эмодзи (Microsoft Fluent) ─────────
const ic = (name, cls = '') => `<svg class="ic ${cls}" viewBox="0 0 24 24" aria-hidden="true">${ICONS[name] || ''}</svg>`;

const EMO = new Map();
const ANIM = new Set(['1f31f', '1f389', '1f44f', '1f4aa', '1f4af', '1f525', '1f680', '26a1', '2b50']);
const emoKey = (str) => Array.from(String(str)).map((c) => c.codePointAt(0).toString(16)).filter((h) => h !== 'fe0f').join('-');
function emo(ch, { anim = false, cls = '' } = {}) {
  if (!ch) return '';
  const k = emoKey(ch);
  const file = EMO.get(k);
  if (!file) return `<i class="emo-txt">${esc(ch)}</i>`;
  const src = anim && ANIM.has(k) ? `/ea/${k}.webp` : `/e/${file}.webp`;
  return `<img class="emo ${cls}" src="${src}" alt="" loading="lazy" decoding="async">`;
}
async function loadEmoji() {
  try {
    const names = await fetch('/e/index.json').then((r) => r.json());
    for (const n of names) EMO.set(n.split('-').filter((h) => h !== 'fe0f').join('-'), n);
  } catch { /* покажем обычные эмодзи */ }
}
const E = {
  fire: '🔥', bolt: '⚡', trophy: '🏆', crown: '👑', star: '⭐', party: '🎉', gem: '💎', rocket: '🚀', books: '📚',
  target: '🎯', m1: '🥇', m2: '🥈', m3: '🥉', chart: '📈', bulb: '💡', bell: '🔔', cap: '🎓', check: '✅', timer: '⏱️',
  hourglass: '⏳', muscle: '💪', hundred: '💯', clap: '👏', sparkles: '✨', compass: '🧭', swords: '⚔️', bricks: '🧱',
  mega: '📣', robot: '🤖', alarm: '⏰', people: '🏫', student: '🧑‍🎓', outbox: '📤', memo: '📝', palette: '🎨',
  wave: '👋', seed: '🌱', glow: '🌟', map: '🗺️', newb: '🆕', speech: '💬', puzzle: '🧩', medal: '🏅', repeat: '🔁',
  sleep: '💤', link: '🔗', calendar: '📅', laptop: '💻', game: '🎮',
};

// ───────── внешний вид: напарник, цвет, тема ─────────
const ACCENTS = [
  ['lime', 'Лайм', '#58cc02', '#e4f8d2'],
  ['sakura', 'Сакура', '#ff6fae', '#ffe4f0'],
  ['lavender', 'Лаванда', '#9b6bff', '#efe7ff'],
  ['ocean', 'Океан', '#2fa8ff', '#dff1ff'],
  ['peach', 'Персик', '#ff8a3d', '#ffeadb'],
  ['mint', 'Мята', '#14c8a8', '#d8f7f0'],
];
const ACC = Object.fromEntries(ACCENTS.map(([id, name, c, l]) => [id, { name, c, l }]));
// Свой цвет: accent = '#rrggbb'. Остальные оттенки (тёмный, светлый) считаем из него
const HEX_RE = /^#[0-9a-f]{6}$/i;
const hexRgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const rgbHex = (rgb) => '#' + rgb.map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('');
const mixHex = (a, b, t) => { const x = hexRgb(a), y = hexRgb(b); return rgbHex(x.map((v, i) => v + (y[i] - v) * t)); };
function accOf(accent) {
  if (HEX_RE.test(accent || '')) return { name: 'Свой цвет', c: accent, l: mixHex(accent, '#ffffff', 0.82) };
  return ACC[accent] || ACC.lime;
}
let LOOK = { accent: 'lime', mode: 'auto', mascot: 'mimi', lang: '' };
try { LOOK = { ...LOOK, ...JSON.parse(localStorage.getItem('look') || '{}') }; } catch { /* приватный режим */ }

function applyLook(p = {}) {
  LOOK = { ...LOOK, ...Object.fromEntries(Object.entries(p).filter(([, v]) => v)) };
  const root = document.documentElement;
  const sysDark = tg?.colorScheme ? tg.colorScheme === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
  const dark = LOOK.mode === 'dark' || (LOOK.mode === 'auto' && sysDark);
  root.dataset.theme = dark ? 'dark' : 'light';
  const custom = HEX_RE.test(LOOK.accent || '');
  root.dataset.accent = custom ? 'custom' : ACC[LOOK.accent] ? LOOK.accent : 'lime';
  for (const [k, v] of Object.entries(custom ? { '--accent': LOOK.accent, '--accent-d': mixHex(LOOK.accent, '#000000', 0.2), '--accent-l': dark ? mixHex(LOOK.accent, '#1f1a27', 0.78) : mixHex(LOOK.accent, '#ffffff', 0.82), '--accent-2': mixHex(LOOK.accent, '#ffffff', 0.45) } : { '--accent': '', '--accent-d': '', '--accent-l': '', '--accent-2': '' })) {
    if (v) root.style.setProperty(k, v); else root.style.removeProperty(k);
  }
  if (!LOOK.lang) LOOK.lang = detectLang(tg?.initDataUnsafe?.user?.language_code);
  setLang(LOOK.lang);
  try { localStorage.setItem('look', JSON.stringify(LOOK)); } catch { /* */ }
  try {
    const bg = getComputedStyle(root).getPropertyValue('--bg').trim();
    tg?.setHeaderColor?.(bg);
    tg?.setBackgroundColor?.(bg);
    tg?.setBottomBarColor?.(bg);
  } catch { /* старые клиенты */ }
}
let prefsTimer;
function savePrefs(patch) {
  applyLook(patch);
  clearTimeout(prefsTimer);
  prefsTimer = setTimeout(() => api('/me/prefs', { accent: LOOK.accent, mode: LOOK.mode, mascot: LOOK.mascot, lang: LOOK.lang }).catch(() => {}), 400);
}
const me = (emotion, size, cls = '') => mascot(LOOK.mascot, emotion, size, cls, false, S.me?.shop ? PET_COND : null);

// ───────── инфраструктура ─────────
// Вход на сайте (без Telegram): токен сессии хранится в браузере
const IN_TG = Boolean(tg?.initData);
let SESSION = '';
try { SESSION = localStorage.getItem('session') || ''; } catch { /* приватный режим */ }

async function api(path, body, method) {
  const headers = { 'Content-Type': 'application/json' };
  if (tg?.initData) headers['X-Init-Data'] = tg.initData;
  else if (DEV_USER) { headers['X-Dev-User'] = DEV_USER; headers['X-Dev-Name'] = params.get('name') || 'Dev'; }
  else if (SESSION) headers['X-Session'] = SESSION;
  const res = await fetch('/api' + path, { method: method || (body ? 'POST' : 'GET'), headers, body: body ? JSON.stringify(body) : undefined });
  const data = await res.json().catch(() => ({}));
  if (res.status === 401 && SESSION && !path.startsWith('/auth/')) { setSession(''); loginScreen(); }
  if (!res.ok) throw Object.assign(new Error(data.error || 'Ошибка сети'), { code: data.code || null, data });
  return data;
}
const del = (path) => api(path, undefined, 'DELETE');
const patch = (path, body) => api(path, body, 'PATCH');

function toast(msg, err) {
  const t = document.createElement('div');
  t.className = 'toast' + (err ? ' err' : '');
  t.innerHTML = ic(err ? 'close-circle' : 'check-circle') + `<span>${esc(msg)}</span>`;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 2600);
}
const fail = (e) => { haptic('error'); toast(e.message || String(e), true); };
const haptic = (kind) => {
  try {
    if (kind === 'success' || kind === 'error' || kind === 'warning') tg?.HapticFeedback?.notificationOccurred(kind);
    else tg?.HapticFeedback?.impactOccurred(kind || 'light');
  } catch { /* старые клиенты */ }
};

function openSheet(html, mount) {
  const ov = document.createElement('div');
  ov.className = 'overlay';
  ov.innerHTML = `<div class="sheet"><div class="grab"></div>${html}</div>`;
  const close = () => ov.remove();
  ov.addEventListener('click', (e) => { if (e.target === ov) close(); });
  layer.appendChild(ov);
  mount?.($('.sheet', ov), close);
  return close;
}
function confirmSheet(title, text, okLabel = 'Да', danger) {
  return new Promise((resolve) => {
    openSheet(
      `<div class="stack center">${me(danger ? 'oops' : 'think', 96)}<h2>${esc(title)}</h2>${text ? `<p class="muted">${esc(text)}</p>` : ''}
       <button class="btn block ${danger ? 'bad' : ''}" data-ok>${esc(okLabel)}</button>
       <button class="btn ghost dim block" data-no>Отмена</button></div>`,
      (el, c) => {
        $('[data-ok]', el).onclick = () => { c(); resolve(true); };
        $('[data-no]', el).onclick = () => { c(); resolve(false); };
        el.parentElement.addEventListener('click', (e) => { if (e.target === el.parentElement) resolve(false); });
      },
    );
  });
}

// ───────── звуки ─────────
let actx;
function tone(freqs, dur = 0.12, type = 'sine', gap = 0.09) {
  try {
    actx ||= new (window.AudioContext || window.webkitAudioContext)();
    freqs.forEach((f, i) => {
      const o = actx.createOscillator();
      const g = actx.createGain();
      o.type = type;
      o.frequency.value = f;
      const t = actx.currentTime + i * gap;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.16, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g).connect(actx.destination);
      o.start(t);
      o.stop(t + dur + 0.02);
    });
  } catch { /* без звука */ }
}
const sfx = {
  ok: () => tone([660, 990], 0.14, 'triangle'),
  bad: () => tone([240, 190], 0.18, 'sine', 0.12),
  win: () => tone([523, 659, 784, 1047], 0.18, 'triangle', 0.11),
};

// ───────── проигрыш (меньше 60%): звуки ─────────
function audio() {
  try { actx ||= new (window.AudioContext || window.webkitAudioContext)(); actx.resume?.(); return actx; } catch { return null; }
}
function synth(freq, at, dur, { type = 'sawtooth', vol = 0.1, to = null, bus = null, lp = null, vib = 0 } = {}) {
  const a = audio();
  if (!a) return;
  try {
    const t = a.currentTime + at;
    const o = a.createOscillator();
    const g = a.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (to) o.frequency.exponentialRampToValueAtTime(to, t + dur);
    if (vib) {
      const l = a.createOscillator();
      const lg = a.createGain();
      l.frequency.value = 6;
      lg.gain.value = vib;
      l.connect(lg).connect(o.frequency);
      l.start(t + dur * 0.3);
      l.stop(t + dur + 0.05);
    }
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.03);
    g.gain.setValueAtTime(vol, t + dur * 0.7);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g);
    let out = g;
    if (lp) { const f = a.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = lp; g.connect(f); out = f; }
    out.connect(bus || a.destination);
    o.start(t);
    o.stop(t + dur + 0.05);
  } catch { /* без звука */ }
}
function noise(at, dur, { type = 'bandpass', f = 1500, to = null, vol = 0.3, bus = null } = {}) {
  const a = audio();
  if (!a) return;
  try {
    const t = a.currentTime + at;
    const buf = a.createBuffer(1, Math.ceil(a.sampleRate * dur), a.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const src = a.createBufferSource();
    src.buffer = buf;
    const fl = a.createBiquadFilter();
    fl.type = type;
    fl.frequency.setValueAtTime(f, t);
    if (to) fl.frequency.exponentialRampToValueAtTime(to, t + dur);
    const g = a.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(fl).connect(g).connect(bus || a.destination);
    src.start(t);
  } catch { /* без звука */ }
}
const loseSfx = {
  // «ва-ва-ва-ваааа» тромбоном
  sting: (bus) => {
    [[392, 0, 0.4], [370, 0.42, 0.4], [349, 0.84, 0.4]].forEach(([f, at, d]) => synth(f, at, d, { vol: 0.09, lp: 1300, bus }));
    synth(330, 1.26, 1.3, { vol: 0.09, lp: 1300, to: 290, vib: 7, bus });
  },
  // треск разбитого стекла
  crack: (bus) => {
    noise(0, 0.12, { type: 'bandpass', f: 900, vol: 0.9, bus });
    noise(0, 0.6, { type: 'highpass', f: 3500, vol: 0.45, bus });
    synth(2600, 0, 0.07, { type: 'square', vol: 0.06, to: 180, bus });
    for (let i = 0; i < 7; i++) synth(2600 + Math.random() * 2400, 0.08 + i * 0.06 + Math.random() * 0.04, 0.14, { type: 'triangle', vol: 0.035, bus });
  },
  // всё летит вниз
  fall: (bus) => {
    noise(0, 1.5, { type: 'lowpass', f: 2200, to: 120, vol: 0.28, bus });
    synth(320, 0, 1.5, { type: 'sine', to: 50, vol: 0.09, bus });
  },
  sob: (bus) => { [0, 0.35, 0.7].forEach((at, i) => synth(520 - i * 30, at, 0.28, { type: 'triangle', to: 380 - i * 30, vol: 0.05, bus })); },
  drop: (bus) => synth(700, 0, 1.1, { type: 'triangle', to: 110, vol: 0.08, bus }),
};

// Песня поражения (своя мелодия). Начало — «сдувающийся» проигрыш: медь спускается вниз,
// последний звук и вся музыка проседают по высоте, как будто кончилась батарейка (совпадает с падением осколков).
// Дальше — тихая грустная шкатулка: расстроенная, медленная, все мотивы идут вниз (вздохи), бас спускается A–G–F–E.
// Играет по кругу, пока ученик не нажмёт «Продолжить».
const loseSong = {
  out: null,
  play(el = null) {
    this.el = el;
    const a = audio();
    if (!a) return;
    this.stop(0);
    try {
      const master = a.createGain();
      master.gain.value = 1.3;
      const comp = a.createDynamicsCompressor();
      comp.threshold.value = -18;
      comp.ratio.value = 4;
      master.connect(comp).connect(a.destination);
      const len = Math.floor(a.sampleRate * 3.4);
      const ir = a.createBuffer(2, len, a.sampleRate);
      for (let c = 0; c < 2; c++) { const d = ir.getChannelData(c); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.5); }
      const rev = a.createConvolver();
      rev.buffer = ir;
      const wet = a.createGain();
      wet.gain.value = 0.65;
      rev.connect(wet).connect(master);
      const dry = a.createGain();
      dry.gain.value = 0.7;
      dry.connect(master);
      const send = (node) => { node.connect(dry); node.connect(rev); };
      this.out = master;
      const hz = (n) => 440 * Math.pow(2, n / 12); // n — полутоны от A4
      const osc = (type, f, t, end, det = 0) => { const o = a.createOscillator(); o.type = type; o.frequency.value = f; o.detune.value = det; o.start(t); o.stop(end); return o; };
      const now = a.currentTime;

      // ── 1. проигрыш: «ва… ва… ва… ваааау» медью, всё проседает ──
      const brass = (n, t, dur, vol, bendTo = null) => {
        const g = a.createGain();
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(vol, t + 0.04);
        g.gain.setValueAtTime(vol, t + dur * 0.6);
        g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        const lp = a.createBiquadFilter();
        lp.type = 'lowpass';
        lp.Q.value = 6;
        // «уа»: фильтр открывается и закрывается, как сурдина у трубы
        lp.frequency.setValueAtTime(500, t);
        lp.frequency.exponentialRampToValueAtTime(1800, t + 0.12);
        lp.frequency.exponentialRampToValueAtTime(bendTo ? 250 : 700, t + dur);
        g.connect(lp);
        send(lp);
        [-9, 0, 9].forEach((det) => {
          const o = osc('sawtooth', hz(n), t, t + dur + 0.05, det);
          if (bendTo != null) o.frequency.setTargetAtTime(hz(bendTo), t + 0.35, dur / 3);
          const l = osc('sine', 6, t, t + dur + 0.05);
          const lg = a.createGain();
          lg.gain.value = bendTo != null ? 25 : 8;
          l.connect(lg).connect(o.detune);
          o.connect(g);
        });
      };
      const s0 = now + 0.02;
      brass(-2, s0, 0.36, 0.12);          // G4
      brass(-3, s0 + 0.38, 0.36, 0.12);   // F#4
      brass(-4, s0 + 0.76, 0.36, 0.12);   // F4
      brass(-5, s0 + 1.14, 2.2, 0.13, -17); // E4 → сползает вниз на октаву
      // аккорд под ним тоже «сдувается»
      {
        const t = s0 + 1.14;
        const g = a.createGain();
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(0.07, t + 0.05);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 2.4);
        const lp = a.createBiquadFilter();
        lp.type = 'lowpass';
        lp.frequency.setValueAtTime(1500, t);
        lp.frequency.exponentialRampToValueAtTime(200, t + 2.3);
        g.connect(lp);
        send(lp);
        [-24, -12, -9, -5].forEach((n) => {
          const o = osc('sawtooth', hz(n), t, t + 2.5);
          o.detune.setValueAtTime(0, t + 0.3);
          o.detune.linearRampToValueAtTime(-900, t + 2.3);
          o.connect(g);
        });
      }

      // ── 2. грустная шкатулка по кругу ──
      const B = 0.9;
      let t0 = now + 3.6;
      const T = (beat) => t0 + beat * B;
      // музыкальная шкатулка: чистый тон + звонкий обертон, чуть расстроена
      const box = (n, at, vol = 0.11) => {
        const t = T(at);
        const g = a.createGain();
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(vol, t + 0.006);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 2.4);
        send(g);
        const det = -14 + Math.random() * 10;
        osc('sine', hz(n), t, t + 2.5, det).connect(g);
        const hg = a.createGain();
        hg.gain.setValueAtTime(0.35, t);
        hg.gain.exponentialRampToValueAtTime(0.001, t + 0.6);
        osc('sine', hz(n) * 4.2, t, t + 0.7, det).connect(hg).connect(g);
      };
      // низкое мягкое пианино для баса
      const low = (n, at, beats, vol = 0.12) => {
        const t = T(at);
        const g = a.createGain();
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(vol, t + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, t + beats * B + 1);
        const lp = a.createBiquadFilter();
        lp.type = 'lowpass';
        lp.frequency.value = 700;
        g.connect(lp);
        send(lp);
        osc('triangle', hz(n), t, t + beats * B + 1.1).connect(g);
        osc('sine', hz(n) * 2, t, t + beats * B + 1.1).connect(g);
      };
      // тихий хор «ууу»
      const ooh = (notes, at, beats, vol = 0.03) => {
        const t = T(at), end = T(at + beats);
        const g = a.createGain();
        g.gain.setValueAtTime(0.0001, t);
        g.gain.linearRampToValueAtTime(vol, t + 1.4);
        g.gain.setValueAtTime(vol, end - 0.4);
        g.gain.linearRampToValueAtTime(0.0001, end + 1);
        send(g);
        const mix = a.createGain();
        [[380, 8, 1], [800, 10, 0.4]].forEach(([f, q, v]) => {
          const bp = a.createBiquadFilter();
          bp.type = 'bandpass';
          bp.frequency.value = f;
          bp.Q.value = q;
          const bg = a.createGain();
          bg.gain.value = v * 7;
          mix.connect(bp).connect(bg).connect(g);
        });
        notes.forEach((n) => [-8, 8].forEach((det) => {
          const o = osc('sawtooth', hz(n), t, end + 1.1, det);
          const l = osc('sine', 4.5, t, end + 1.1);
          const lg = a.createGain();
          lg.gain.value = 5;
          l.connect(lg).connect(o.detune);
          o.connect(mix);
        }));
      };
      const sched = () => {
        // бас спускается: A – G – F – E (по 4 доли)
        [[-24, [-12, -9, -5]], [-26, [-14, -10, -7]], [-28, [-16, -12, -9]], [-29, [-17, -13, -10]]].forEach(([b, chord], i) => {
          low(b, i * 4, 4);
          low(b + 12, i * 4 + 2, 2, 0.05);
          ooh(chord, i * 4, 4);
        });
        // мелодия: только вниз, «вздохи» по две ноты, с паузами
        [[7, 0], [5, 1], [3, 2], [2, 2.5],
          [5, 4], [3, 5], [2, 6], [0, 6.5],
          [3, 8], [2, 9], [0, 10], [-2, 10.5],
          [2, 12], [-1, 13], [-5, 14.5]].forEach(([n, at]) => box(n + 12, at));
      };
      sched();
      const loopMs = 16 * B * 1000;
      const loop = () => {
        if (this.out !== master || (this.el && !this.el.isConnected)) { if (this.out === master) this.stop(); return; }
        t0 = a.currentTime + 0.25;
        sched();
        this.timer = setTimeout(loop, loopMs);
      };
      this.timer = setTimeout(loop, (t0 - a.currentTime) * 1000 + loopMs - 250);
    } catch { /* без звука */ }
  },
  stop(fade = 0.6) {
    clearTimeout(this.timer);
    const a = actx;
    const out = this.out;
    this.out = null;
    if (!a || !out) return;
    try {
      out.gain.cancelScheduledValues(a.currentTime);
      out.gain.setTargetAtTime(0.0001, a.currentTime, Math.max(0.01, fade / 3));
      setTimeout(() => { try { out.disconnect(); } catch { /* */ } }, fade * 1000 + 300);
    } catch { /* */ }
  },
};

// ───────── победа (80% и выше) ─────────
// Своя фанфара: барабанная дробь → удар оркестра (медь, литавра, тарелка, взлёт струнных) →
// мотив меди C–E–G–A–G–C с хором на последнем аккорде → дальше бодрый победный грув по кругу,
// пока ученик не нажмёт «Продолжить». winSong.ding(i) — звон звезды.
const winSong = {
  out: null,
  bus: null,
  play(el = null) {
    this.el = el;
    const a = audio();
    if (!a) return;
    this.stop(0);
    try {
      const master = a.createGain();
      master.gain.value = 0.62;
      const comp = a.createDynamicsCompressor();
      comp.threshold.value = -16;
      comp.ratio.value = 4;
      master.connect(comp).connect(a.destination);
      const len = Math.floor(a.sampleRate * 2.6);
      const ir = a.createBuffer(2, len, a.sampleRate);
      for (let c = 0; c < 2; c++) { const d = ir.getChannelData(c); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6); }
      const rev = a.createConvolver();
      rev.buffer = ir;
      const wet = a.createGain();
      wet.gain.value = 0.4;
      rev.connect(wet).connect(master);
      const send = (node) => { node.connect(master); node.connect(rev); };
      this.out = master;
      this.send = send;
      const mhz = (m) => 440 * Math.pow(2, (m - 69) / 12);
      const osc = (type, f, t, end, det = 0) => { const o = a.createOscillator(); o.type = type; o.frequency.value = f; o.detune.value = det; o.start(t); o.stop(end); return o; };
      const nb = (() => { const b = a.createBuffer(1, a.sampleRate, a.sampleRate); const d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; return b; })();
      const hiss = (t, dur, type, f, vol, q = 1, toRev = false) => {
        const s = a.createBufferSource();
        s.buffer = nb;
        const fl = a.createBiquadFilter();
        fl.type = type;
        fl.frequency.value = f;
        fl.Q.value = q;
        const g = a.createGain();
        g.gain.setValueAtTime(vol, t);
        g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        s.connect(fl).connect(g).connect(master);
        if (toRev) g.connect(rev);
        s.start(t, Math.random() * 0.4, dur + 0.02);
      };
      // медь: аккорд из пил, фильтр «раскрывается» как у трубы
      const brass = (notes, t, dur, vol = 0.07) => {
        const g = a.createGain();
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(vol, t + 0.04);
        g.gain.setValueAtTime(vol * 0.8, t + Math.max(0.05, dur - 0.08));
        g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.25);
        const lp = a.createBiquadFilter();
        lp.type = 'lowpass';
        lp.Q.value = 2;
        lp.frequency.setValueAtTime(700, t);
        lp.frequency.exponentialRampToValueAtTime(4200, t + 0.07);
        lp.frequency.exponentialRampToValueAtTime(2200, t + 0.35);
        g.connect(lp);
        send(lp);
        notes.forEach((m) => [-7, 0, 7].forEach((det) => {
          const o = osc('sawtooth', mhz(m), t, t + dur + 0.3, det);
          if (dur > 0.5) { const l = osc('sine', 5.5, t + 0.3, t + dur + 0.3); const lg = a.createGain(); lg.gain.value = 6; l.connect(lg).connect(o.detune); }
          o.connect(g);
        }));
      };
      const timp = (t, m, vol = 0.8) => {
        const g = a.createGain();
        g.gain.setValueAtTime(vol, t);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 1.6);
        send(g);
        const o = osc('sine', mhz(m) * 1.06, t, t + 1.7);
        o.frequency.exponentialRampToValueAtTime(mhz(m), t + 0.15);
        o.connect(g);
        hiss(t, 0.12, 'lowpass', 600, vol * 0.6);
      };
      const crash = (t, vol = 0.3) => hiss(t, 2.4, 'highpass', 5000, vol, 0.7, true);
      const roll = (t, dur) => { for (let x = 0; x < dur; x += 0.035) hiss(t + x, 0.06, 'bandpass', 2200, 0.05 + 0.3 * (x / dur), 1.4); };
      const glock = (m, t, vol = 0.09) => {
        const g = a.createGain();
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(vol, t + 0.004);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 1.3);
        send(g);
        [[1, 1], [2.76, 0.35], [5.4, 0.12]].forEach(([k, v]) => { const og = a.createGain(); og.gain.value = v; osc('sine', mhz(m) * k, t, t + 1.35).connect(og).connect(g); });
      };
      const choir = (notes, t, dur, vol = 0.05) => {
        const g = a.createGain();
        g.gain.setValueAtTime(0.0001, t);
        g.gain.linearRampToValueAtTime(vol, t + 0.25);
        g.gain.setValueAtTime(vol, t + dur - 0.3);
        g.gain.linearRampToValueAtTime(0.0001, t + dur + 0.6);
        send(g);
        const mix = a.createGain();
        [[730, 7, 1], [1150, 9, 0.6], [2700, 10, 0.2]].forEach(([f, q, v]) => { const bp = a.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = f; bp.Q.value = q; const bg = a.createGain(); bg.gain.value = v * 6; mix.connect(bp).connect(bg).connect(g); });
        notes.forEach((m) => [-9, 0, 9].forEach((det) => { const o = osc('sawtooth', mhz(m), t, t + dur + 0.7, det); const l = osc('sine', 5, t, t + dur + 0.7); const lg = a.createGain(); lg.gain.value = 5; l.connect(lg).connect(o.detune); o.connect(mix); }));
      };
      const pluck = (m, t, dur, vol = 0.05, type = 'sawtooth') => {
        const g = a.createGain();
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(vol, t + 0.008);
        g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        const lp = a.createBiquadFilter();
        lp.type = 'lowpass';
        lp.frequency.setValueAtTime(3000, t);
        lp.frequency.exponentialRampToValueAtTime(500, t + dur);
        g.connect(lp);
        send(lp);
        osc(type, mhz(m), t, t + dur + 0.05).connect(g);
      };
      this.glock = glock;

      // ── фанфара ──
      const s = a.currentTime + 0.02;
      roll(s, 0.7);
      const H = s + 0.7; // удар — вместе со вспышкой и кубком
      timp(H, 36);
      timp(H, 48, 0.4);
      crash(H, 0.35);
      brass([48, 55, 60, 64], H, 0.55, 0.08);
      [60, 62, 64, 65, 67, 69, 71, 72].forEach((m, i) => pluck(m, H + 0.08 + i * 0.06, 0.25, 0.04)); // взлёт струнных
      // мотив: C5 E5 G5 | A5 G5 | C6 — под ним F, G, C
      const M = H + 0.62;
      brass([53, 57, 60], M, 0.42, 0.05);
      [[72, 0, 0.14], [76, 0.15, 0.14], [79, 0.3, 0.14]].forEach(([m, d, l]) => brass([m], M + d, l, 0.08));
      brass([55, 59, 62], M + 0.46, 0.5, 0.05);
      brass([81], M + 0.46, 0.26, 0.09);
      brass([79], M + 0.74, 0.22, 0.09);
      timp(M + 0.46, 43, 0.5);
      const F = M + 1.0; // финальный аккорд
      brass([48, 55, 60, 64, 67, 72], F, 1.7, 0.075);
      brass([84], F, 1.7, 0.08);
      choir([60, 64, 67, 72], F, 1.8, 0.045);
      timp(F, 36, 0.9);
      crash(F, 0.3);
      for (let i = 0; i < 6; i++) glock([84, 88, 91, 96, 91, 96][i], F + 0.1 + i * 0.09, 0.05);

      // ── бодрый победный грув по кругу (124 bpm, C – Am – F – G) ──
      const BEAT = 60 / 124;
      let t0 = F + 2.0;
      const T = (b) => t0 + b * BEAT;
      const CH = [{ c: [60, 64, 67], b: 36 }, { c: [57, 60, 64], b: 33 }, { c: [57, 60, 65], b: 29 }, { c: [59, 62, 67], b: 31 }];
      const MEL = [
        [[76, 0, 0.5], [79, 0.5, 0.5], [84, 1, 1], [83, 2, 0.5], [79, 2.5, 0.5], [76, 3, 1]],
        [[76, 0, 0.5], [72, 0.5, 0.5], [76, 1, 1], [81, 2, 1.5], [79, 3.5, 0.5]],
        [[77, 0, 0.5], [81, 0.5, 0.5], [84, 1, 1], [86, 2, 0.5], [84, 2.5, 0.5], [81, 3, 1]],
        [[83, 0, 1], [79, 1, 0.5], [83, 1.5, 0.5], [86, 2, 2]],
      ];
      const kick = (t) => { const g = a.createGain(); g.gain.setValueAtTime(0.75, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.3); g.connect(master); const o = osc('sine', 140, t, t + 0.32); o.frequency.exponentialRampToValueAtTime(48, t + 0.1); o.connect(g); };
      const snare = (t) => { hiss(t, 0.16, 'bandpass', 1900, 0.3, 1, true); const g = a.createGain(); g.gain.setValueAtTime(0.18, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.1); g.connect(master); osc('triangle', 200, t, t + 0.12).connect(g); };
      const sched = () => {
        CH.forEach((ch, bar) => {
          const o = bar * 4;
          for (let k = 0; k < 4; k++) kick(T(o + k));
          snare(T(o + 1));
          snare(T(o + 3));
          for (let k = 0; k < 8; k++) hiss(T(o + k * 0.5), 0.04, 'highpass', 8000, k % 2 ? 0.1 : 0.06);
          for (let k = 0; k < 8; k++) pluck(ch.b + (k % 2 ? 12 : 0), T(o + k * 0.5), 0.22, 0.09, 'sawtooth');
          [1.5, 3.5].forEach((b) => brass(ch.c.map((m) => m + 12), T(o + b), 0.18, 0.04));
          MEL[bar].forEach(([m, b, d]) => { glock(m, T(o + b), 0.07); pluck(m - 12, T(o + b), d * BEAT, 0.035, 'square'); });
        });
      };
      sched();
      const loopBeats = 16;
      const loop = () => {
        if (this.out !== master || (this.el && !this.el.isConnected)) { if (this.out === master) this.stop(); return; }
        t0 += loopBeats * BEAT;
        sched();
        this.timer = setTimeout(loop, loopBeats * BEAT * 1000);
      };
      this.timer = setTimeout(loop, (t0 - a.currentTime) * 1000 + loopBeats * BEAT * 1000 - 600);
    } catch { /* без звука */ }
  },
  // звон звезды (i = 0, 1, 2 — всё выше)
  ding(i) {
    const a = actx;
    if (!a || !this.glock) return;
    try { const t = a.currentTime; [[91, 0], [96, 0.06]].forEach(([m, d]) => this.glock(m + i * 2, t + d, 0.12)); } catch { /* */ }
  },
  stop(fade = 0.6) {
    clearTimeout(this.timer);
    const a = actx;
    const out = this.out;
    this.out = null;
    if (!a || !out) return;
    try {
      out.gain.cancelScheduledValues(a.currentTime);
      out.gain.setTargetAtTime(0.0001, a.currentTime, Math.max(0.01, fade / 3));
      setTimeout(() => { try { out.disconnect(); } catch { /* */ } }, fade * 1000 + 300);
    } catch { /* */ }
  },
};

// Сцена победы: золотой свет и лучи → удар, вспышка, кубок падает сверху с волной → «ПОБЕДА!» →
// проценты набегают → звёзды по одной → маскот выпрыгивает: «Я в тебя верил!». Нажатие пропускает.
function winShow(el, pct) {
  return new Promise((resolve) => {
    winSong.play(el);
    haptic('success');
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) { setTimeout(resolve, 600); return; }
    const timers = [];
    const at = (ms, fn) => timers.push(setTimeout(fn, ms));
    const stars = pct === 100 ? 3 : 2;
    const stage = document.createElement('div');
    stage.className = 'win-stage';
    stage.dataset.noi18n = '1';
    stage.innerHTML = `<div class="win-rays"></div><div class="win-glow"></div>
      <div class="win-trophy">${emo(E.trophy, { anim: true })}</div><div class="win-ring"></div>
      <div class="win-title">${esc(tr('ПОБЕДА!'))}</div>
      <div class="win-pct"><b>0</b>%</div>
      <div class="win-stars">${[0, 1, 2].map((i) => `<span class="ws ${i < stars ? 'on' : ''}">${emo(E.star)}</span>`).join('')}</div>
      <div class="win-m"><div class="win-say"></div><div class="win-body">${me('cheer', 140)}</div></div>
      <div class="win-flash"></div>`;
    document.body.appendChild(stage);
    requestAnimationFrame(() => stage.classList.add('s1'));
    let ended = false;
    const end = () => {
      if (ended) return;
      ended = true;
      timers.forEach(clearTimeout);
      document.removeEventListener('pointerdown', skip, true);
      stage.classList.add('out');
      setTimeout(() => stage.remove(), 350);
      resolve();
    };
    function skip(e) { e.preventDefault(); e.stopPropagation(); end(); }
    at(400, () => document.addEventListener('pointerdown', skip, true));
    at(700, () => { stage.classList.add('s2'); haptic('heavy'); confetti(); });
    at(1300, () => stage.classList.add('s3'));
    at(1700, () => {
      const b = $('.win-pct b', stage);
      const t0 = performance.now();
      const step = (now) => { const k = Math.min(1, (now - t0) / 900); b.textContent = Math.round(pct * (1 - Math.pow(1 - k, 3))); if (k < 1 && !ended) requestAnimationFrame(step); };
      requestAnimationFrame(step);
      stage.classList.add('s4');
    });
    [0, 1, 2].forEach((i) => at(2700 + i * 320, () => { $$('.ws', stage)[i].classList.add('pop'); if (i < stars) { winSong.ding(i); haptic('light'); } }));
    at(3900, () => { stage.classList.add('s5'); confetti(); });
    at(4300, () => speak($('.win-say', stage), 'Я в тебя верил!', $('.win-body .mascot', stage)));
    at(6600, end);
  });
}

// Сцена проигрыша: красный свет, трещина как у зеркала, всё падает в пустоту, маскот «ну я же тебе говорил» и тоже падает.
// Нажатие в любом месте пропускает сцену.
function loseShow(el) {
  return new Promise((resolve) => {
    const a = audio();
    let bus = null;
    try { bus = a.createGain(); bus.connect(a.destination); } catch { bus = null; }
    loseSong.play(el);
    haptic('error');
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) { setTimeout(resolve, 600); return; }
    const timers = [];
    const at = (ms, fn) => timers.push(setTimeout(fn, ms));
    const tint = document.createElement('div');
    tint.className = 'lose-tint';
    document.body.appendChild(tint);
    let stage = null;
    let ended = false;
    const end = () => {
      if (ended) return;
      ended = true;
      timers.forEach(clearTimeout);
      try { bus?.gain.setTargetAtTime(0.0001, a.currentTime, 0.05); } catch { /* */ }
      document.removeEventListener('pointerdown', skip, true);
      tint.remove();
      stage?.remove();
      el.style.visibility = '';
      resolve();
    };
    function skip(e) { e.preventDefault(); e.stopPropagation(); end(); }
    at(300, () => document.addEventListener('pointerdown', skip, true));

    const W = innerWidth, H = innerHeight;
    const cx = W * (0.38 + Math.random() * 0.24), cy = H * (0.32 + Math.random() * 0.2);
    // 2. трещина
    at(450, () => {
      loseSfx.crack(bus);
      haptic('heavy');
      const pts = [[0, 0], [W, 0], [W, H], [0, H]];
      for (let i = 0; i < 9; i++) {
        const ang = (i / 9) * Math.PI * 2 + Math.random() * 0.5;
        const dx = Math.cos(ang), dy = Math.sin(ang);
        const tx = dx > 0 ? (W - cx) / dx : dx < 0 ? -cx / dx : Infinity;
        const ty = dy > 0 ? (H - cy) / dy : dy < 0 ? -cy / dy : Infinity;
        const k = Math.min(tx, ty);
        pts.push([cx + dx * k, cy + dy * k]);
      }
      pts.sort((p, q) => Math.atan2(p[1] - cy, p[0] - cx) - Math.atan2(q[1] - cy, q[0] - cx));
      const ring = pts.map((p) => { const f = 0.22 + Math.random() * 0.22; return [cx + (p[0] - cx) * f, cy + (p[1] - cy) * f]; });
      const polys = [];
      pts.forEach((p, i) => {
        const j = (i + 1) % pts.length;
        polys.push([[cx, cy], ring[i], ring[j]]);
        polys.push([ring[i], p, pts[j], ring[j]]);
      });
      stage = document.createElement('div');
      stage.className = 'lose-stage';
      const snap = el.cloneNode(true);
      snap.style.visibility = '';
      const P = (p) => `${p[0].toFixed(1)}px ${p[1].toFixed(1)}px`;
      polys.forEach((poly) => {
        const s = document.createElement('div');
        s.className = 'shard';
        s.style.clipPath = `polygon(${poly.map(P).join(',')})`;
        s.dataset.mx = poly.reduce((n, p) => n + p[0], 0) / poly.length;
        s.dataset.my = poly.reduce((n, p) => n + p[1], 0) / poly.length;
        s.appendChild(snap.cloneNode(true));
        stage.appendChild(s);
      });
      const L = (p, q) => `<line x1="${p[0].toFixed(1)}" y1="${p[1].toFixed(1)}" x2="${q[0].toFixed(1)}" y2="${q[1].toFixed(1)}"/>`;
      const lines = pts.map((p) => L([cx, cy], p)).join('') + ring.map((p, i) => L(p, ring[(i + 1) % ring.length])).join('');
      stage.insertAdjacentHTML('beforeend', `<svg class="crack" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}"><g class="sh">${lines}</g><g class="ln">${lines}</g><circle cx="${cx}" cy="${cy}" r="10"/></svg><div class="lose-flash"></div>`);
      document.body.appendChild(stage);
      el.style.visibility = 'hidden';
      stage.classList.add('shake');
      requestAnimationFrame(() => $$('.shard', stage).forEach((s) => { s.style.transform = `translate(${(s.dataset.mx - cx) * 0.018}px,${(s.dataset.my - cy) * 0.018}px)`; }));
    });
    // 3. всё падает в пустоту
    at(1150, () => {
      loseSfx.fall(bus);
      $('.crack', stage).classList.add('gone');
      tint.classList.add('void');
      $$('.shard', stage).forEach((s) => {
        const d = Math.random() * 450;
        const rot = (Math.random() - 0.5) * 80;
        const dx = (s.dataset.mx - cx) * 0.25;
        s.style.transition = `transform ${950 + Math.random() * 500}ms cubic-bezier(.5,0,.9,.4) ${d}ms, opacity 300ms ease ${d + 1000}ms`;
        s.style.transform = `translate(${dx}px, ${H * 1.35}px) rotate(${rot}deg) scale(.85)`;
        s.style.opacity = '0';
      });
    });
    // 4. выходит маскот
    const m = document.createElement('div');
    m.className = 'lose-m';
    at(2700, () => {
      m.innerHTML = `<div class="lose-say" data-noi18n></div><div class="lose-body">${me('angry', 150)}</div>`;
      stage.appendChild(m);
    });
    at(3200, () => speak($('.lose-say', m), 'Ну я же тебе говорил…', $('.lose-body .mascot', m)));
    at(4700, () => {
      $('.lose-body', m).innerHTML = `${me('sad', 150)}<i class="tear l"></i><i class="tear r"></i>`;
      m.classList.add('grief');
      loseSfx.sob(bus);
    });
    // 5. и он тоже падает
    at(6600, () => { m.classList.add('fall'); loseSfx.drop(bus); });
    at(7700, end);
  });
}

// ───────── помощники UI ─────────
function avatar(u, cls = '') {
  const p = u?.prefs;
  if (p?.mascot && MASCOTS[p.mascot]) return `<div class="ava ${cls}" style="background:${accOf(p.accent).l}">${mascot(p.mascot, 'happy', 100, 'still', true)}</div>`;
  if (u?.photoUrl) return `<img class="ava ${cls}" src="${esc(u.photoUrl)}" alt="">`;
  const n = (u?.name || '?').replace('@', '');
  let h = 0;
  for (const ch of String(u?.id || u?.userId || n)) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return `<div class="ava ${cls}" style="background:${ACCENTS[h % ACCENTS.length][2]}">${esc(n[0]?.toUpperCase() || '?')}</div>`;
}
const pctColor = (p) => (p == null ? 'var(--track)' : p >= 80 ? 'var(--good)' : p >= 50 ? 'var(--gold)' : 'var(--bad)');
const pctPill = (p) => (p == null ? '<span class="pill">—</span>' : `<span class="pill ${p >= 80 ? 'good' : p >= 50 ? 'gold' : 'bad'}">${p}%</span>`);
const pctText = (p) => (p == null ? '—' : p + '%');
const plural = (n, a, b, c) => { const m = n % 10, mm = n % 100; return `${n} ${m === 1 && mm !== 11 ? a : m >= 2 && m <= 4 && (mm < 10 || mm >= 20) ? b : c}`; };
function ago(ts) {
  const s = (Date.now() - ts) / 1000;
  if (s < 60) return 'только что';
  if (s < 3600) return `${Math.floor(s / 60)} мин назад`;
  if (s < 86400) return `${Math.floor(s / 3600)} ч назад`;
  return fmtDate(ts, false);
}
const firstName = (n) => String(n || '').split(' ')[0];
const sectionTitle = (e, title, right = '') => `<div class="section-title"><h2>${emo(e)}${esc(title)}</h2>${right}</div>`;
const emptyState = (emotion, title, text, extra = '') => `<div class="empty">${me(emotion, 130)}<h2>${esc(title)}</h2><p>${text}</p>${extra}</div>`;

// Подсветка JavaScript в вопросах с кодом
function highlight(code) {
  const re = /(\/\/.*$)|(`(?:[^`\\]|\\.)*`|"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')|\b(let|const|var|if|else|return|function|for|while|of|in|new|typeof|switch|case|break)\b|\b(true|false|null|undefined)\b|\b(\d+(?:\.\d+)?)\b|\b(console|log|Math|alert|prompt|length)\b/g;
  const cls = [null, 'c', 's', 'k', 'b', 'n', 'f'];
  return String(code).split('\n').map((line) => {
    let out = '';
    let last = 0;
    let m;
    re.lastIndex = 0;
    while ((m = re.exec(line))) {
      out += esc(line.slice(last, m.index));
      const g = m.findIndex((x, i) => i > 0 && x !== undefined);
      out += `<span class="${cls[g]}">${esc(m[0])}</span>`;
      last = m.index + m[0].length;
    }
    return `<span class="ln">${out + esc(line.slice(last)) || ' '}</span>`;
  }).join('');
}
// **жирный**, `код`, перенос строки — в тексте обучалки
const rich = (t) => esc(t).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/`([^`]+)`/g, '<code>$1</code>').replace(/\n/g, '<br>');

// Маскот «говорит»: текст печатается по буквам, пока у него двигается рот.
// Возвращает skip() — допечатать сразу (если ученик нажал «Дальше» раньше).
function speak(box, text, svg) {
  text = tr(text);
  box.dataset.noi18n = '1';
  const plain = String(text).replace(/\*\*|`/g, '');
  let i = 0;
  let timer = null;
  const done = () => { clearInterval(timer); timer = null; box.innerHTML = rich(text); svg?.classList.add('quiet'); };
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) { done(); return { skip: done, typing: () => false }; }
  svg?.classList.remove('quiet');
  box.textContent = '';
  timer = setInterval(() => {
    i += 2;
    box.textContent = plain.slice(0, i);
    if (i >= plain.length) done();
  }, 24);
  return { skip: done, typing: () => timer !== null };
}

const looksLikeCode = (s) => /[(){};=<>&|`]|\b(let|const|if|else)\b/.test(s);

// ───────── диаграммы (SVG) ─────────
function donut(p, { size = 130, stroke = 16, color, label = '', sub = '' } = {}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const val = Math.max(0, Math.min(100, p ?? 0));
  const col = color || pctColor(p);
  const id = 'd' + Math.random().toString(36).slice(2, 7);
  setTimeout(() => { const el = document.getElementById(id); if (el) el.style.strokeDashoffset = c * (1 - val / 100); }, 60);
  return `<div class="donut-wrap"><svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><title>${pctText(p)}</title>
    <circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="var(--track)" stroke-width="${stroke}"/>
    <circle id="${id}" cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="${col}" stroke-width="${stroke}" stroke-linecap="round"
      stroke-dasharray="${c}" stroke-dashoffset="${c}" transform="rotate(-90 ${size / 2} ${size / 2})" style="transition:stroke-dashoffset 1.1s cubic-bezier(.2,.8,.2,1)"/>
  </svg><div class="lbl"><b>${label || pctText(p)}</b><span>${esc(sub)}</span></div></div>`;
}

function lineChart(items, { h = 170 } = {}) {
  if (!items.length) return '<p class="muted center small">Пока нет данных</p>';
  const w = 320, pl = 30, pr = 12, pt = 14, pb = 26;
  const n = items.length;
  const x = (i) => (n === 1 ? (pl + w - pr) / 2 : pl + (i * (w - pl - pr)) / (n - 1));
  const y = (v) => pt + (1 - v / 100) * (h - pt - pb);
  const grid = [0, 50, 100].map((v) => `<line x1="${pl}" x2="${w - pr}" y1="${y(v)}" y2="${y(v)}" stroke="var(--line)" stroke-width="1.5" stroke-dasharray="${v ? '3 5' : ''}"/><text x="${pl - 6}" y="${y(v) + 4}" text-anchor="end">${v}</text>`).join('');
  const line = (key, color, dashed) => {
    const pts = items.map((it, i) => (it[key] == null ? null : [x(i), y(it[key]), it])).filter(Boolean);
    if (!pts.length) return '';
    const d = pts.map((p, i) => (i ? 'L' : 'M') + p[0] + ',' + p[1]).join(' ');
    const area = !dashed && pts.length > 1 ? `<path d="${d} L${pts.at(-1)[0]},${y(0)} L${pts[0][0]},${y(0)} Z" fill="var(--accent)" opacity=".12"/>` : '';
    return `${area}<path d="${d}" fill="none" stroke="${color}" stroke-width="${dashed ? 2 : 3}" stroke-linecap="round" stroke-linejoin="round" ${dashed ? 'stroke-dasharray="5 6"' : ''}/>` +
      (dashed ? '' : pts.map((p) => `<g><title>${esc(p[2].title)}: ${p[2][key]}%</title><circle cx="${p[0]}" cy="${p[1]}" r="12" fill="transparent"/><circle cx="${p[0]}" cy="${p[1]}" r="5" fill="var(--card)" stroke="${color}" stroke-width="3"/></g>`).join(''));
  };
  const labels = items.map((it, i) => (n <= 8 || i % Math.ceil(n / 8) === 0 ? `<text x="${x(i)}" y="${h - 6}" text-anchor="middle">${esc(it.short ?? i + 1)}</text>` : '')).join('');
  return `<svg class="chart" viewBox="0 0 ${w} ${h}">${grid}${line('groupAvg', 'var(--faint)', true)}${line('pct', 'var(--accent)')}${labels}</svg>`;
}

function radar(items, { size = 290 } = {}) {
  const n = items.length;
  const cx = size / 2, cy = size / 2 + 4, R = size / 2 - 70;
  const pt = (i, v) => { const a = -Math.PI / 2 + (i * 2 * Math.PI) / n; return [cx + Math.cos(a) * R * v, cy + Math.sin(a) * R * v]; };
  const ring = (v) => `<polygon points="${items.map((_, i) => pt(i, v).join(',')).join(' ')}" fill="none" stroke="var(--line)" stroke-width="1.5"/>`;
  const axes = items.map((_, i) => `<line x1="${cx}" y1="${cy}" x2="${pt(i, 1)[0]}" y2="${pt(i, 1)[1]}" stroke="var(--line)" stroke-width="1.5"/>`).join('');
  const shape = items.map((it, i) => pt(i, Math.max(0.05, it.pct / 100)).join(',')).join(' ');
  const labels = items.map((it, i) => {
    const [lx, ly] = pt(i, 1.22);
    const anchor = Math.abs(lx - cx) < 8 ? 'middle' : lx > cx ? 'start' : 'end';
    const t = it.topic.length > 15 ? it.topic.slice(0, 14) + '…' : it.topic;
    return `<text x="${lx}" y="${ly}" text-anchor="${anchor}" dominant-baseline="middle">${esc(t)}</text><text x="${lx}" y="${ly + 14}" text-anchor="${anchor}" dominant-baseline="middle" style="fill:var(--text);font-weight:900">${it.pct}%</text>`;
  }).join('');
  return `<svg class="chart" viewBox="0 0 ${size} ${size}">${[0.33, 0.66, 1].map(ring).join('')}${axes}
    <polygon points="${shape}" fill="var(--accent)" fill-opacity=".22" stroke="var(--accent)" stroke-width="2.5" stroke-linejoin="round"/>
    ${items.map((it, i) => { const [px, py] = pt(i, Math.max(0.05, it.pct / 100)); return `<g><title>${esc(it.topic)}: ${it.pct}% (${it.correct}/${it.total})</title><circle cx="${px}" cy="${py}" r="11" fill="transparent"/><circle cx="${px}" cy="${py}" r="4.5" fill="var(--card)" stroke="var(--accent)" stroke-width="2.5"/></g>`; }).join('')}
    ${labels}</svg>`;
}

function hbars(items) {
  // items: [{ label, value, compare?, right?, color? }]
  return items.map((it) => `<div class="hbar" title="${esc(it.label)}: ${pctText(it.value)}"><div class="t"><span class="ellipsis">${it.labelHtml || esc(it.label)}</span><b>${it.right ?? pctText(it.value)}</b></div>
    <div class="track"><div class="fill" style="width:${it.value ?? 0}%;background:${it.color || pctColor(it.value)}"></div></div>
    ${it.compare !== undefined ? `<div class="track"><div class="fill" style="width:${it.compare ?? 0}%;background:var(--faint)"></div></div>` : ''}</div>`).join('');
}
function topicsChart(topics) {
  if (!topics.length) return '<p class="muted center small">Реши тест — здесь появится карта твоих тем</p>';
  return topics.length >= 3 ? radar(topics.slice(0, 8)) : hbars(topics.map((t) => ({ label: t.topic, value: t.pct, color: 'var(--accent)' })));
}

function confetti() {
  const c = document.createElement('canvas');
  c.className = 'confetti';
  c.width = innerWidth * devicePixelRatio;
  c.height = innerHeight * devicePixelRatio;
  document.body.appendChild(c);
  const ctx = c.getContext('2d');
  const accent = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim();
  const cols = [accent, '#ffc23d', '#ff6fae', '#2fa8ff', '#9b6bff', '#2bc46b'];
  const parts = Array.from({ length: 150 }, () => ({ x: c.width / 2, y: c.height * 0.3, vx: (Math.random() - 0.5) * 28, vy: -Math.random() * 26 - 6, s: 7 + Math.random() * 9, r: Math.random() * 6, vr: (Math.random() - 0.5) * 0.4, c: cols[(Math.random() * cols.length) | 0], round: Math.random() > 0.6 }));
  let t = 0;
  (function frame() {
    ctx.clearRect(0, 0, c.width, c.height);
    for (const p of parts) {
      p.vy += 0.7; p.vx *= 0.99; p.x += p.vx; p.y += p.vy; p.r += p.vr;
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r); ctx.fillStyle = p.c;
      if (p.round) { ctx.beginPath(); ctx.arc(0, 0, p.s / 2.4, 0, 7); ctx.fill(); } else ctx.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2);
      ctx.restore();
    }
    if (++t < 170) requestAnimationFrame(frame); else c.remove();
  })();
}

// ───────── состояние и навигация ─────────
const S = { me: null, tab: null, view: null, overview: null, leagueGroup: null, groupTab: 'members' };
const STUDENT_TABS = [['home', 'home-smile', 'Путь'], ['diary', 'calendar', 'Дневник'], ['shop', 'shop', 'Магазин'], ['league', 'cup-star', 'Лига'], ['stats', 'chart-2', 'Прогресс'], ['profile', 'user-rounded', 'Профиль']];
const PARENT_TABS = [['phome', 'home-smile', 'Главная'], ['league', 'cup-star', 'Лига'], ['kids', 'users-group-rounded', 'Ученики'], ['pprofile', 'user-rounded', 'Профиль']];
const ADMIN_TABS = [['dash', 'widget-5', 'Панель'], ['path', 'home-smile', 'Путь'], ['groups', 'users-group-rounded', 'Группы'], ['journal', 'calendar', 'Журнал'], ['tests', 'notebook-bookmark', 'Тесты'], ['bot', 'chat-round-dots', 'Бот']];

function renderNav() {
  const tabs = S.me.isAdmin ? ADMIN_TABS : S.me.isParent ? PARENT_TABS : STUDENT_TABS;
  nav.hidden = false;
  nav.innerHTML = `<div class="in">${tabs.map(([id, icon, t]) => `<button data-tab="${id}" class="${S.tab === id ? 'on' : ''}">${ic(icon)}${t}</button>`).join('')}</div>`;
  $$('[data-tab]', nav).forEach((b) => (b.onclick = () => { haptic('light'); go(b.dataset.tab); }));
}
function go(tab, view = null) {
  S.tab = tab;
  S.view = view;
  renderNav();
  tg?.BackButton?.hide();
  scrollTo(0, 0);
  route().catch(fail);
}
function openView(view) {
  S.view = view;
  scrollTo(0, 0);
  route().catch(fail);
  tg?.BackButton?.show();
}
tg?.BackButton?.onClick(() => back());
function back() {
  S.view = S.view?.parent || null;
  if (!S.view) tg?.BackButton?.hide();
  route().catch(fail);
}
async function route() {
  if (S.view?.type === 'group') return viewGroup(S.view.id);
  if (S.view?.type === 'student') return viewStudent(S.view.id);
  if (S.view?.type === 'league') return viewLeague();
  const r = { home: tabHome, league: tabLeague, stats: tabStats, profile: tabProfile, dash: tabDash, groups: tabGroups, path: tabTeacherPath, journal: tabJournal, diary: tabDiary, shop: tabShop, tests: tabTests, bot: tabBot, phome: tabParentHome, kids: tabKids, pprofile: tabParentProfile }[S.tab];
  await r();
}
async function refreshMe() {
  S.me = await api('/me');
  syncShop(S.me);
  return S.me;
}

function topbar(left = '') {
  const m = S.me;
  if (m.isParent) return parentTop();
  return `<div class="topbar"><div class="row">${left || (m.groups[0] ? `<span class="pill accent">${emo(m.groups[0].emoji)}${esc(m.groups[0].name)}</span>` : '<span class="pill">Без группы</span>')}</div>
    <div class="row" style="gap:6px"><span class="chip ${m.streak ? '' : 'off'}">${emo(E.fire)}${m.streak}</span><span class="chip">${emo(E.bolt)}${m.xp}</span></div></div>`;
}

// ═══════════════ УЧЕНИК ═══════════════
async function tabHome() {
  const m = await refreshMe();
  if (!m.groups.length && !m.path.length && !(m.locked || []).length) {
    app.innerHTML = topbar() + emptyState('think', 'Почти готово!', `Учитель скоро добавит тебя в группу — и тут появятся тесты.<br><br>Твой ID: <code>${esc(m.user.id)}</code>`, '<br><button class="btn ghost" data-reload>' + ic('refresh') + 'Обновить</button>');
    $('[data-reload]').onclick = () => tabHome().catch(fail);
    return;
  }
  const rank = (p) => (p.forYou ? -1 : p.order ?? 999);
  const todo = [...m.path].sort((a, b) => rank(a) - rank(b)).find((p) => (p.hasLearn && !p.learnDone) || p.best == null);
  const allDone = m.path.length && !todo;
  const hero = !m.path.length
    ? { emo: 'sleepy', say: 'Пока тихо… Как только учитель отправит тест — я тебя позову!' }
    : allDone
      ? { emo: 'wow', say: 'Все тесты пройдены! Ты просто космос. Можешь улучшить результат в любом уроке.' }
      : { emo: 'talk', say: todo.hasLearn && !todo.learnDone ? `Тема «${todo.title}» ждёт! Сначала пройдём обучалку — я всё объясню, а потом проверим тестом.` : m.streak >= 2 ? `Серия ${plural(m.streak, 'день', 'дня', 'дней')}! Не останавливайся — тест «${todo.title}» ждёт.` : `Тест «${todo.title}» уже ждёт тебя. Погнали?` };
  let html = topbar() + `<div class="hero">${me(hero.emo === 'sleepy' ? 'sleepy' : 'talk', 112, hero.emo === 'sleepy' ? '' : 'quiet')}<div class="grow"><h1>Привет, ${esc(firstName(m.user.name))}!</h1><div class="say" data-say>${esc(hero.say)}</div>
    ${todo ? `<button class="btn" data-next>${ic('play')}${todo.hasLearn && !todo.learnDone ? 'К обучалке' : 'Начать'}</button>` : ''}</div></div>`;

  if (m.mistakes > 0) {
    html += `<button class="card tap mistakes-card" data-mistakes>${me('think', 70, 'still')}<div class="grow"><b>Работа над ошибками</b>
      <span>${plural(m.mistakes, 'вопрос ждёт', 'вопроса ждут', 'вопросов ждут')} исправления. Ответишь верно — уйдут из списка.</span></div>
      <span class="btn sm">${ic('refresh', 'sm')}${Math.min(m.mistakes, 10)}</span></button>`;
  }
  // Весь курс одной дорожкой: открытые уроки + закрытые (их откроет учитель)
  const seen = new Set();
  const course = m.path.filter((p) => !p.forYou && p.order != null && !seen.has(p.lessonId) && seen.add(p.lessonId))
    .map((p) => ({ order: p.order, p }))
    .concat((m.locked || []).map((l) => ({ order: l.order, l })))
    .sort((a, b) => a.order - b.order);
  if (course.length) {
    const opened = course.filter((c) => c.p);
    const done = opened.filter((c) => c.p.best != null).length;
    html += `<div class="unit"><div class="grow"><small>${done} из ${course.length} пройдено</small><h2>${emo(E.books)}Курс</h2><div class="bar"><i style="width:${(done / course.length) * 100}%"></i></div></div>${emo(done === course.length ? E.trophy : E.books)}</div><div class="path">`;
    let k = 0;
    course.forEach((c) => { if (c.p) { html += pathNodes(c.p, k, todo); k += c.p.hasLearn ? 2 : 1; } else { html += lockedNode(c.l, k); k++; } });
    html += '</div>';
  }
  m.groups.forEach((g) => {
    const items = m.path.filter((p) => p.groupId === g.id && !p.personal && !p.forYou && p.order == null);
    if (!items.length) return;
    const done = items.filter((p) => p.best != null).length;
    html += `<div class="unit"><div class="grow"><small>${done} из ${items.length} пройдено</small><h2>${emo(g.emoji)}${esc(g.name)}</h2><div class="bar"><i style="width:${(done / items.length) * 100}%"></i></div></div>${emo(done === items.length ? E.trophy : E.books)}</div><div class="path">`;
    let k = 0;
    items.forEach((p) => { html += pathNodes(p, k, todo); k += p.hasLearn ? 2 : 1; });
    html += '</div>';
  });
  const loose = m.path.filter((p) => p.personal && !p.forYou && p.order == null);
  if (loose.length) {
    html += `<div class="unit personal"><div class="grow"><small>отдельно от курса</small><h2>${emo('📝')}Другие тесты</h2></div>${emo('🎁')}</div><div class="path">`;
    loose.forEach((p, i) => { html += pathNodes(p, i, todo); });
    html += '</div>';
  }
  const personal = m.path.filter((p) => p.forYou);
  if (personal.length) {
    html += `<div class="unit personal"><div class="grow"><small>сделано специально для тебя</small><h2>${emo('🎯')}Личные задания</h2></div>${emo('🎁')}</div><div class="path">`;
    personal.forEach((p, i) => { html += pathNodes(p, i, todo); });
    html += '</div>';
  }
  if (m.feed.length) html += sectionTitle(E.speech, 'Лента группы') + `<div class="card" style="padding:6px 8px">${m.feed.map(feedItem).join('')}</div>`;
  app.innerHTML = html;
  $$('[data-pub]').forEach((b) => (b.onclick = () => { haptic('medium'); lessonSheet(m.path.find((p) => p.pubId === b.dataset.pub)); }));
  $$('[data-learn]').forEach((b) => (b.onclick = () => { haptic('medium'); learnSheet(m.path.find((p) => p.pubId === b.dataset.learn)); }));
  if (hero.emo !== 'sleepy') speak($('[data-say]'), hero.say, $('.hero .mascot'));
  $$('[data-locked]').forEach((b) => (b.onclick = () => { haptic('light'); lockedSheet(m.locked.find((l) => l.lessonId === b.dataset.locked)); }));
  const mk = $('[data-mistakes]');
  if (mk) mk.onclick = () => { haptic('medium'); startLesson({ mistakes: true }); };
  const nx = $('[data-next]');
  if (nx) nx.onclick = () => (todo.hasLearn && !todo.learnDone ? learnSheet(todo) : lessonSheet(todo));
}

// Узлы пути для одной темы: 📖 обучалка (если есть) и тест. Тест закрыт, пока обучалка не пройдена.
const OFFS = [0, 48, 76, 48, 0, -48, -76, -48];
function pathNodes(p, k, todo) {
  let out = '';
  const isCur = (step) => todo && p.pubId === todo.pubId && step === (p.hasLearn && !p.learnDone ? 'learn' : 'test');
  const node = (idx, step, inner, cls, attr, label) => `<div class="pnode ${isCur(step) && idx > 0 ? 'has-bubble' : ''}" style="transform:translateX(${OFFS[idx % OFFS.length]}px)">${isCur(step) ? `<div class="bubble">${step === 'learn' ? 'УЧИМСЯ' : p.exam ? 'ИТОГОВЫЙ ТЕСТ' : 'СТАРТ'}</div>` : ''}
    <button class="node ${cls} ${isCur(step) ? 'cur' : ''}" ${attr} aria-label="${esc(p.title)}">${inner}</button>${label}</div>`;
  if (p.hasLearn) {
    out += node(k, 'learn', emo(p.learnDone ? '✅' : '📖'), p.learnDone ? 'learned' : 'learn', `data-learn="${p.pubId}"`, `<div class="lbl"><b>${learnName(p)}</b><br>${plural(p.learnSections, 'раздел', 'раздела', 'разделов')}</div>`);
    k++;
  }
  const locked = p.hasLearn && !p.learnDone;
  const cls = (locked ? 'locked' : p.best == null ? '' : p.best < 50 ? 'weak' : 'done') + (p.exam ? ' exam' : '');
  const stars = p.stars != null ? `<div class="stars">${[0, 1, 2].map((s) => emo(E.star, { cls: s < p.stars ? '' : 'off' })).join('')}</div>` : '';
  out += node(k, 'test', locked ? ic('lock-keyhole', 'lg') : emo(p.best === 100 ? E.crown : p.emoji), cls, `data-pub="${p.pubId}"`, `${stars}<div class="lbl">${p.exam ? '<span class="pill gold sm">📝 тест</span><br>' : ''}<b>${esc(p.title)}</b>${p.best != null ? `<br>${p.best}%` : locked ? '<br>после обучалки' : ''}</div>`);
  return out;
}

// «Обучалка 11 урока» (переводится шаблоном)
function learnName(p) { return p.order != null && p.order < 100 ? `Обучалка ${p.order} урока` : 'Обучалка'; }

// Путь глазами учителя: тот же вид, что у учеников, но всё открыто
async function tabTeacherPath() {
  const o = await loadOverview();
  const list = [...o.lessons].sort((a, b) => (a.order ?? 999) - (b.order ?? 999));
  let html = adminTop('Путь') + `<div class="hero" style="margin-top:8px">${me('talk', 96, 'quiet')}<div class="grow"><div class="say">Так Путь видят ученики. Для тебя все уроки открыты: нажми на кружок, чтобы пройти обучалку или тест.</div></div></div>`;
  if (!list.length) html += emptyState('sleepy', 'Тестов пока нет', 'Жду конспект — пришли его Claude.');
  else {
    html += `<div class="unit"><div class="grow"><small>${list.length} уроков, все открыты</small><h2>${emo(E.books)}Курс</h2></div>${emo(E.books)}</div><div class="path">`;
    let k = 0;
    list.forEach((l) => {
      const named = l.order != null && l.order < 100;
      const node = (idx, inner, cls, attr, label) => `<div class="pnode" style="transform:translateX(${OFFS[idx % OFFS.length]}px)"><button class="node ${cls}" ${attr} aria-label="${esc(l.title)}">${inner}</button>${label}</div>`;
      if (l.hasLearn) {
        html += node(k, emo('📖'), 'learn', `data-tlearn="${esc(l.id)}"`, `<div class="lbl"><b>${named ? `Обучалка ${l.order} урока` : 'Обучалка'}</b><br>${plural(l.learnSections, 'раздел', 'раздела', 'разделов')}</div>`);
        k++;
      }
      html += node(k, emo(l.emoji), l.exam ? 'exam' : '', `data-ttest="${esc(l.id)}"`, `<div class="lbl">${l.exam ? '<span class="pill gold sm">📝 тест</span><br>' : ''}<b>${esc(l.title)}</b><br>${plural(l.questions, 'вопрос', 'вопроса', 'вопросов')}</div>`);
      k++;
    });
    html += '</div>';
  }
  app.innerHTML = html;
  bindAdminTop();
  $$('[data-tlearn]').forEach((b) => (b.onclick = () => { haptic('medium'); startLearn({ lessonId: b.dataset.tlearn }); }));
  $$('[data-ttest]').forEach((b) => (b.onclick = () => { haptic('medium'); startLesson({ lessonId: b.dataset.ttest }); }));
}

// Закрытый урок курса: учитель ещё не дал доступ
function lockedNode(l, k) {
  return `<div class="pnode" style="transform:translateX(${OFFS[k % OFFS.length]}px)"><button class="node locked" data-locked="${esc(l.lessonId)}" aria-label="${esc(l.title)}">${ic('lock-keyhole', 'lg')}</button>
    <div class="lbl"><b>${new RegExp('(^|\\D)' + l.order + '(\\D|$)').test(l.title) ? '' : l.order + '. '}${esc(l.title)}</b><br>закрыто</div></div>`;
}
function lockedSheet(l) {
  if (!l) return;
  openSheet(`<div class="stack center"><div data-m>${me('sleepy', 120)}</div><h2>${emo(l.emoji)} ${esc(l.title)}</h2><div class="say-box" data-say></div>
    <div class="tags" style="justify-content:center"><span class="pill">${ic('lock-keyhole', 'sm')}Закрыто</span><span class="pill accent">${plural(l.questions, 'вопрос', 'вопроса', 'вопросов')}</span></div></div>`, (el) => {
    speak($('[data-say]', el), 'Этот урок пока закрыт. Когда учитель откроет доступ — он появится здесь, и я тебе напишу!', $('[data-m] .mascot', el));
  });
}

function feedItem(f) {
  return `<div class="item">${avatar({ name: f.name, id: f.userId, prefs: f.prefs })}<div class="grow"><b>${esc(f.name)}</b> <span class="muted">${f.practice ? 'потренировался в' : 'прошёл'}</span> «${esc(f.title)}»
    <div class="small muted">${ago(f.at)}${f.combo >= 3 ? ` · комбо ×${f.combo}` : ''}</div></div>${pctPill(f.pct)}</div>`;
}

function learnSheet(p) {
  openSheet(
    `<div class="stack center"><div data-m>${me('teach', 130)}</div><h2>${emo('📖')} ${learnName(p)}</h2><p class="muted">${esc(p.title)}</p>
      <div class="say-box" data-say></div>
      <div class="tags" style="justify-content:center"><span class="pill accent">${plural(p.learnSections, 'раздел', 'раздела', 'разделов')}</span><span class="pill">после каждого — мини-проверка</span></div>
      <button class="btn block" data-go>${ic('play')}${p.learnDone ? 'Повторить обучалку' : 'Начать обучалку'}</button></div>`,
    (el, close) => {
      speak($('[data-say]', el), p.learnDone ? 'Хочешь повторить тему? Отличная идея — повторение мать учения!' : 'Сначала я объясню тему по шагам, как на уроке. После каждого раздела — пара вопросов. А потом откроется тест!', $('[data-m] .mascot', el));
      $('[data-go]', el).onclick = () => { close(); startLearn({ pubId: p.pubId }); };
    },
  );
}

function lessonSheet(p) {
  if (p.hasLearn && !p.learnDone) {
    openSheet(`<div class="stack center"><div data-m>${me('talk', 120)}</div><h2>Тест пока закрыт ${ic('lock-keyhole')}</h2><div class="say-box" data-say></div>
      <button class="btn block" data-go>${emo('📖')} К обучалке</button></div>`, (el, close) => {
      speak($('[data-say]', el), 'Сначала пройди обучалку — я всё объясню, и тест покажется лёгким!', $('[data-m] .mascot', el));
      $('[data-go]', el).onclick = () => { close(); learnSheet(p); };
    });
    return;
  }
  const again = p.best != null;
  openSheet(
    `<div class="stack center">${me(again ? 'peace' : 'wow', 120)}
      <h2>${emo(p.emoji)} ${esc(p.title)}</h2>
      ${p.description ? `<p class="muted">${esc(p.description)}</p>` : ''}
      <div class="tags" style="justify-content:center"><span class="pill accent">${emo(E.puzzle)}${plural(p.questions, 'вопрос', 'вопроса', 'вопросов')}</span>${p.topics.slice(0, 4).map((t) => `<span class="pill">${esc(t)}</span>`).join('')}</div>
      ${again ? `<div>${donut(p.best, { size: 116, stroke: 13, sub: 'лучший' })}</div><p class="muted small">Повторное прохождение — тренировка: XP не начисляется, но лучший результат обновится.</p>` : `<p class="muted small">${emo(E.fire)} Правильные ответы подряд дают комбо: ×2 и ×3 XP</p>`}
      <button class="btn block" data-go>${ic('play')}${again ? 'Пройти ещё раз' : 'Начать'}</button></div>`,
    (el, close) => { $('[data-go]', el).onclick = () => { close(); startLesson({ pubId: p.pubId }); }; },
  );
}

async function tabLeague() {
  const m = S.me || (await refreshMe());
  S.leagueMode ||= m.groups.length ? 'group' : 'global';
  const modeSeg = `<div class="seg league-mode">${[['group', 'users-group-rounded', 'В группе'], ['global', 'cup-star', 'Общая лига']].map(([id, icon, t]) => `<button data-mode-l="${id}" class="${S.leagueMode === id ? 'on' : ''}">${ic(icon, 'sm')}${t}</button>`).join('')}</div>`;
  let body;
  if (S.leagueMode === 'global') body = globalLeagueHtml(await api('/league/global'), m.user.id);
  else if (!m.groups.length) body = m.isParent ? emptyState('think', 'Лига группы недоступна', 'Выберите своего ребёнка на главной — и здесь появится лига его группы.') : emptyState('think', 'Лига группы недоступна', 'Сначала учитель добавит тебя в группу. А пока загляни в общую лигу!');
  else {
    S.leagueGroup ||= m.groups[0].id;
    const lb = await api('/leaderboard/' + S.leagueGroup);
    const switcher = m.groups.length > 1 ? `<div class="seg" style="margin-top:10px">${m.groups.map((g) => `<button data-g="${g.id}" class="${g.id === S.leagueGroup ? 'on' : ''}">${emo(g.emoji)}${esc(g.name)}</button>`).join('')}</div>` : '';
    body = switcher + leagueHtml(lb, m.user.id);
  }
  app.innerHTML = topbar() + modeSeg + body;
  const lk = $('[data-look]');
  if (lk) lk.onclick = () => appearanceSheet(false);
  $$('[data-mode-l]').forEach((b) => (b.onclick = () => { haptic('light'); S.leagueMode = b.dataset.modeL; tabLeague().catch(fail); }));
  $$('[data-g]').forEach((b) => (b.onclick = () => { S.leagueGroup = b.dataset.g; tabLeague().catch(fail); }));
  bindLeagueStudents();
}
function bindLeagueStudents() {
  if (!S.me?.isAdmin && !S.me?.isParent) return;
  $$('[data-student]').forEach((b) => (b.onclick = () => openView({ type: 'student', id: b.dataset.student, parent: S.view })));
}
// Общая лига для учителя (с панели)
async function viewLeague() {
  const lb = await api('/league/global');
  app.innerHTML = `<div class="topbar"><button class="back" data-back>${ic('alt-arrow-left')}Назад</button></div>` + globalLeagueHtml(lb, null);
  $('[data-back]').onclick = () => back();
  bindLeagueStudents();
}

// Общая лига: топ-3 на большом пьедестале, остальные списком. Учитель может открыть любого ученика
function globalLeagueHtml(lb, meId) {
  const rows = lb.rows;
  const admin = S.me?.isAdmin || S.me?.isParent;
  const tap = (r) => (admin ? `data-student="${esc(r.userId)}"` : '');
  const kids = new Set(S.me?.childIds || []);
  const champ = (r, place) => {
    if (!r) return '<div class="champ empty"></div>';
    return `<div class="champ c${place} ${r.userId === meId || kids.has(r.userId) ? 'me' : ''} ${admin ? 'tap' : ''}" ${tap(r)}>
      ${place === 1 ? `<div class="rays"></div>${emo(E.crown, { anim: true, cls: 'crown' })}` : ''}
      <div class="ring">${avatar(r)}</div>
      <div class="medal">${emo([E.m1, E.m2, E.m3][place - 1], { anim: true })}</div>
      <b class="nm ellipsis">${esc(firstName(r.name))}${r.userId === meId ? ' (ты)' : ''}</b>
      ${r.group ? `<span class="grp ellipsis">${esc(r.group)}</span>` : ''}
      <span class="xp">${emo(E.bolt)}${r.xp} XP</span>
      <div class="block">${place}</div></div>`;
  };
  const meRow = rows.find((r) => r.userId === meId);
  return `<div class="center" style="margin-top:14px">${emo(E.trophy, { anim: true, cls: 'big' })}<h1>Общая лига</h1><p class="muted">Все ученики курса · ${plural(lb.total, 'участник', 'участника', 'участников')}</p></div>
    ${meRow && meRow.rank > 3 ? `<div class="card my-rank"><div class="rk">${meRow.rank}</div>${avatar(meRow)}<div class="grow"><b>Твоё место</b><div class="small muted">до топ-3 осталось ${Math.max(0, rows[2].xp - meRow.xp + 1)} XP</div></div><span class="pill gold">${meRow.xp} XP</span></div>` : ''}
    ${rows.length ? `<div class="champs">${champ(rows[1], 2)}${champ(rows[0], 1)}${champ(rows[2], 3)}</div>` : ''}
    <div class="card" style="padding:8px">
      ${rows.length ? '' : '<p class="muted center" style="padding:16px">Пока никто не набрал очков</p>'}
      ${rows.slice(3).map((r) => `<div class="item ${r.userId === meId || kids.has(r.userId) ? 'me' : ''} ${admin ? 'tap' : ''}" ${tap(r)}>
        <div class="rk">${r.rank}</div>${avatar(r)}
        <div class="grow"><b class="ellipsis" style="display:block">${esc(r.name)}${r.userId === meId ? ' (ты)' : ''}</b><div class="small muted ellipsis">${r.group ? esc(r.group) + ' · ' : ''}${plural(r.done, 'тест', 'теста', 'тестов')}${r.streak ? ` · ${emo(E.fire)}${r.streak}` : ''}</div></div>
        <span class="pill gold">${r.xp} XP</span></div>`).join('')}
      ${rows.length && rows.length <= 3 ? '<p class="muted center small" style="padding:10px">Остальные места пока свободны — реши тест и займи своё!</p>' : ''}
    </div>`;
}

function leagueHtml(lb, meId) {
  const rows = lb.rows;
  const pod = [rows[1], rows[0], rows[2]];
  const podium = rows.length
    ? `<div class="podium">${pod.map((r, i) => (r ? `<div class="p p${[2, 1, 3][i]}">${i === 1 ? emo(E.crown, { cls: 'crown' }) : ''}${avatar(r)}<b class="nm ellipsis">${esc(firstName(r.name))}</b><span class="pill gold">${emo(E.bolt)}${r.xp}</span><div class="stand">${[2, 1, 3][i]}</div></div>` : '<div></div>')).join('')}</div>`
    : '';
  return `<div class="center" style="margin-top:14px">${emo(E.trophy, { cls: 'big' })}<h1>Лига группы</h1><p class="muted">${emo(lb.group.emoji)} ${esc(lb.group.name)} · ${plural(lb.tests, 'тест', 'теста', 'тестов')}</p></div>
    ${podium}
    <div class="card" style="padding:8px">
      <div class="item teacher">${avatar(lb.teacher)}<div class="grow"><b>${esc(lb.teacher.name)}</b><div class="small" style="color:var(--gold-d)">Учитель · ведёт группу</div></div>${emo(E.cap)}</div>
      ${rows.length ? '' : '<p class="muted center" style="padding:16px">Пока никто не решал тесты</p>'}
      ${rows.map((r, i) => `${i === 3 ? `<div class="zone">${emo(E.sparkles)} зона лидеров ${emo(E.sparkles)}</div>` : ''}<div class="item ${r.userId === meId || S.me.childIds?.includes(r.userId) ? 'me' : ''} ${S.me.isParent ? 'tap' : ''}" ${S.me.isAdmin || S.me.isParent ? `data-student="${r.userId}"` : ''}>
        <div class="rk">${r.rank <= 3 ? emo([E.m1, E.m2, E.m3][r.rank - 1]) : r.rank}</div>${avatar(r)}
        <div class="grow"><b class="ellipsis" style="display:block">${esc(r.name)}${r.userId === meId ? ' (ты)' : ''}</b><div class="small muted">${plural(r.done, 'тест', 'теста', 'тестов')} · ср. ${pctText(r.avg)}${r.streak ? ` · ${emo(E.fire)}${r.streak}` : ''}</div></div>
        <span class="pill gold">${r.xp} XP</span></div>`).join('')}
    </div>`;
}

function statsHtml(st, { self }) {
  const progress = st.progress.map((p, i) => ({ ...p, short: i + 1 }));
  const verdict = st.overall == null ? 'Реши первый тест — и тут появится твой уровень' : st.overall >= 80 ? 'Отличный уровень! Так держать' : st.overall >= 50 ? 'Хорошо, есть куда расти' : 'Нужно подтянуть темы — у тебя получится';
  return `
    <div class="card" style="margin-top:12px"><div class="row" style="gap:18px">
      ${donut(st.overall, { size: 136, stroke: 16, sub: 'успеваемость' })}
      <div class="grow stack"><div><b style="font-size:24px">${st.done}</b><span class="muted"> / ${st.total} тестов</span></div><p class="muted small">${verdict}</p></div>
    </div></div>
    <div class="tiles" style="margin-top:12px">
      <div class="tile">${emo(E.bolt, { anim: true })}<div><b>${st.xp}</b><span>опыта (XP)</span></div></div>
      <div class="tile">${emo(E.fire, { anim: true })}<div><b>${st.streak}</b><span>дней подряд</span></div></div>
      <div class="tile">${emo(E.target)}<div><b>×${st.maxCombo}</b><span>лучшее комбо</span></div></div>
      <div class="tile">${emo(E.check)}<div><b>${st.done}</b><span>тестов сдано</span></div></div>
    </div>
    ${sectionTitle(E.chart, 'Прогресс')}
    <div class="card">${lineChart(progress)}<div class="legend"><span><i style="background:var(--accent)"></i>${self ? 'Ты' : 'Ученик'}</span><span><i style="background:var(--faint)"></i>Среднее по группе</span></div></div>
    ${sectionTitle(E.compass, 'Карта тем')}
    <div class="card">${topicsChart(st.topics)}</div>
    ${sectionTitle(E.repeat, self ? 'Мои ошибки' : 'Ошибки ученика', st.mistakes.count ? `<span class="pill bad">${st.mistakes.count}</span>` : '')}
    <div class="card">${!st.mistakes.count ? `<p class="muted center small">${self ? 'Ошибок нет — всё исправлено!' : 'Сейчас ошибок нет'}</p>`
      : `${st.mistakes.topics.length ? `<p class="small muted" style="margin-bottom:8px">Слабые темы:</p><div class="tags" style="margin-bottom:12px">${st.mistakes.topics.map((t) => `<span class="pill bad">${esc(t.topic)} · ${t.n}</span>`).join('')}</div>` : ''}
        ${self ? `<button class="btn block" data-fix>${ic('refresh')}Исправить ошибки</button>`
          : `<div class="qlist">${st.mistakes.list.map((q) => `<div><span style="color:var(--bad)">${ic('close-circle', 'sm')}</span><span class="grow">${esc(q.prompt)}<br><span class="faint small">${esc(q.lessonTitle)}${q.wrong > 1 ? ` · ошибся ${plural(q.wrong, 'раз', 'раза', 'раз')}` : ''}</span></span></div>`).join('')}</div>`}`}</div>
    ${sectionTitle(E.swords, self ? 'Ты vs группа' : 'Ученик vs группа')}
    <div class="card">${st.progress.length ? hbars(st.progress.map((p) => ({ label: p.title, labelHtml: `${emo(p.emoji)} ${esc(p.title)}`, value: p.pct, compare: p.groupAvg, color: 'var(--accent)' }))) + `<div class="legend"><span><i style="background:var(--accent)"></i>${self ? 'Твой' : 'Его'} результат</span><span><i style="background:var(--faint)"></i>Группа</span></div>` : '<p class="muted center small">Пока нет решённых тестов</p>'}</div>`;
}

async function tabStats() {
  const st = await api('/stats/me');
  app.innerHTML = topbar() + statsHtml(st, { self: true });
  const fx = $('[data-fix]');
  if (fx) fx.onclick = () => startLesson({ mistakes: true });
}

// Палитра «свой цвет»: квадрат насыщенности/яркости + полоска оттенка
function hsvHex(h, s, v) {
  const f = (n) => { const k = (n + h / 60) % 6; return v - v * s * Math.max(0, Math.min(k, 4 - k, 1)); };
  return rgbHex([f(5), f(3), f(1)].map((x) => x * 255));
}
function hexHsv(hex) {
  const [r, g, b] = hexRgb(hex).map((x) => x / 255);
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
  let h = 0;
  if (d) h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [(h * 60 + 360) % 360, mx ? d / mx : 0, mx];
}
function colorPicker(start, onPick) {
  let [h, s, v] = hexHsv(start);
  openSheet(`<div class="cpick" data-noi18n>
      <div class="cp-head" data-head>${ic('pallete-2')}<b data-rgb></b></div>
      <div class="cp-body"><div class="cp-sv" data-sv><i data-svk></i></div><div class="cp-hue" data-hue><i data-huek></i></div></div>
      <div class="row" style="gap:10px;margin-top:14px"><div class="cp-prev" data-prev></div><button class="btn grow" data-ok>${ic('check-circle')}<span>${tr('Готово')}</span></button></div>
    </div>`, (el, close) => {
    const sv = $('[data-sv]', el), hue = $('[data-hue]', el);
    const draw = () => {
      const hex = hsvHex(h, s, v);
      const [r, g, b] = hexRgb(hex);
      sv.style.background = `linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, ${hsvHex(h, 1, 1)})`;
      $('[data-svk]', el).style.cssText = `left:${s * 100}%;top:${(1 - v) * 100}%;background:${hex}`;
      $('[data-huek]', el).style.cssText = `top:${(h / 360) * 100}%;background:${hsvHex(h, 1, 1)}`;
      const head = $('[data-head]', el);
      head.style.background = hex;
      head.style.color = r * 0.299 + g * 0.587 + b * 0.114 > 160 ? '#1b1b1f' : '#fff';
      $('[data-rgb]', el).textContent = `rgb(${r}, ${g}, ${b})`;
      $('[data-prev]', el).style.background = hex;
    };
    const drag = (box, fn) => {
      const at = (e) => { const rc = box.getBoundingClientRect(); fn(Math.max(0, Math.min(1, (e.clientX - rc.left) / rc.width)), Math.max(0, Math.min(1, (e.clientY - rc.top) / rc.height))); draw(); };
      box.addEventListener('pointerdown', (e) => { box.setPointerCapture(e.pointerId); at(e); e.preventDefault(); });
      box.addEventListener('pointermove', (e) => { if (box.hasPointerCapture(e.pointerId)) at(e); });
    };
    drag(sv, (x, y) => { s = x; v = 1 - y; });
    drag(hue, (x, y) => { h = Math.min(359.9, y * 360); });
    $('[data-ok]', el).onclick = () => { haptic('success'); onPick(hsvHex(h, s, v)); close(); };
    draw();
  });
}

// Выбор напарника, цвета и темы (первый вход, профиль, настройки учителя)
function appearanceHtml() {
  return `<div class="field"><span>Напарник</span><div class="mascot-cur" data-curm data-noi18n>${curMascotInner()}</div>
      <button class="btn ghost block" data-pickm style="margin-top:10px">${ic('refresh')}Выбрать другого напарника</button></div>
    <div class="field" style="margin-top:18px"><span>Цвет приложения</span><div class="swatches">${ACCENTS.map(([id, name, c]) => `<button class="swatch ${LOOK.accent === id ? 'on' : ''}" data-accent="${id}" title="${name}" style="background:${c};color:${c}">${ic('check-circle')}</button>`).join('')}<button class="swatch rainbow ${HEX_RE.test(LOOK.accent) ? 'on' : ''}" data-custom title="Свой цвет" style="color:${HEX_RE.test(LOOK.accent) ? LOOK.accent : '#ff4d8d'}"><i style="background:${HEX_RE.test(LOOK.accent) ? LOOK.accent : 'transparent'}"></i></button></div></div>
    <div class="field" style="margin-top:18px"><span>Тема</span><div class="seg">${[['auto', 'monitor', 'Авто'], ['light', 'sun-2', 'Светлая'], ['dark', 'moon', 'Тёмная']].map(([id, icon, t]) => `<button data-mode="${id}" class="${LOOK.mode === id ? 'on' : ''}">${ic(icon, 'sm')}${t}</button>`).join('')}</div></div>
    <div class="field" style="margin-top:18px"><span>Язык</span><div class="seg" data-noi18n>${LANGS.map(([id, t]) => `<button data-lang="${id}" class="${LOOK.lang === id ? 'on' : ''}">${t}</button>`).join('')}</div></div>`;
}
function curMascotInner() {
  const id = MASCOTS[LOOK.mascot] ? LOOK.mascot : 'mimi';
  return `${mascot(id, 'cheer', 96)}<div class="grow"><b>${esc(tr(MASCOTS[id].name))}</b><span>${esc(tr(MASCOTS[id].about))}</span></div>`;
}

// Выбор напарника как в рилсах: на весь экран, листаем снизу вверх, инфа выезжает сбоку
const STAT_EMOJI = ['💨', '🧠', '🦁', '🦊', '🥰'];
function mascotReels(current, onPick) {
  const ids = Object.keys(MASCOTS);
  const L = getLang();
  const infoOf = (id) => { const i = INFO[id]; return { s: i.s, t: i[L] || i.ru }; };
  const root = document.createElement('div');
  root.className = 'reels';
  root.dataset.noi18n = '1';
  root.innerHTML = `<div class="reels-top"><button class="reels-x" data-x aria-label="${esc(tr('Закрыть'))}">${ic('close-circle')}</button><b data-count></b></div>
    <div class="reels-list" data-list>${ids.map((id) => {
    const m = MASCOTS[id];
    const { s: st, t } = infoOf(id);
    return `<section class="reel" data-id="${id}" style="--c:${m.color}">
      <div class="halo"></div><div class="art" data-art></div>
      <div class="side">${FIELDS.map(([icon, label], i) => `<button class="sb" data-f="${i}" style="--i:${i}"><em>${icon}</em><small>${esc(tr(label))}</small></button>`).join('')}</div>
      <div class="rbub" data-bubble><small></small><p></p></div>
      <div class="meta"><h2>${esc(tr(m.name))}</h2><p>${esc(tr(m.about))}</p>
        <div class="stat5">${STAT_KEYS.map((k, i) => `<div style="--i:${i}"><span>${STAT_EMOJI[i]} ${esc(tr(k))}</span><div class="bar5">${[1, 2, 3, 4, 5].map((n) => `<i class="${n <= st[i] ? 'on' : ''}"></i>`).join('')}</div></div>`).join('')}</div></div>
      <button class="reel-pick ${S.me?.shop && !S.me.shop.owned.includes(id) ? 'locked' : ''}" data-pick>${id === current ? '✓ ' + esc(tr('Твой напарник')) : S.me?.shop && !S.me.shop.owned.includes(id) ? `${ic('lock-keyhole', 'sm')} ${esc(tr('В магазине'))}` : esc(tr('Выбрать')) + ': ' + esc(tr(m.name))}</button>
      ${S.me?.shop && !S.me.shop.owned.includes(id) ? `<div class="reel-lock">${ic('lock-keyhole')}</div>` : ''}
      ${id === ids[0] ? `<div class="swipe-hint" data-hint>${ic('alt-arrow-left')}<span>${esc(tr('Свайпни вверх'))}</span></div>` : ''}
    </section>`;
  }).join('')}</div>`;
  layer.appendChild(root);
  const list = $('[data-list]', root);
  const slides = $$('.reel', root);
  let active = -1;
  const art = (i, on) => { $('[data-art]', slides[i]).innerHTML = mascot(ids[i], on ? 'cheer' : 'happy', 280, on ? '' : 'still'); };
  slides.forEach((_, i) => art(i, false));
  const close = () => { document.removeEventListener('keydown', onKey); root.classList.add('out'); setTimeout(() => root.remove(), 220); };
  let hideT = 0;
  const hideFact = (i) => {
    clearTimeout(hideT);
    $$('.sb', slides[i]).forEach((b) => b.classList.remove('on'));
    const bub = $('[data-bubble]', slides[i]);
    if (bub.classList.contains('show')) { bub.classList.remove('show'); bub.classList.add('hide'); }
  };
  const showFact = (i, fi) => {
    const sl = slides[i];
    clearTimeout(hideT);
    const { t } = infoOf(ids[i]);
    const btns = $$('.sb', sl);
    btns.forEach((b, k) => b.classList.toggle('on', k === fi));
    const bub = $('[data-bubble]', sl);
    bub.classList.remove('show', 'hide');
    void bub.offsetWidth;
    $('small', bub).textContent = `${FIELDS[fi][0]} ${tr(FIELDS[fi][1])}`;
    $('p', bub).textContent = t[fi];
    const br = btns[fi].getBoundingClientRect();
    bub.style.top = `${br.top - sl.getBoundingClientRect().top + 26}px`;
    bub.classList.add('show');
    hideT = setTimeout(() => hideFact(i), 5000);
  };
  const activate = (i) => {
    if (i === active || i < 0 || i >= ids.length) return;
    if (active >= 0) { hideFact(active); slides[active].classList.remove('on'); art(active, false); }
    active = i;
    slides[i].classList.add('on');
    art(i, true);
    $('[data-count]', root).textContent = `${i + 1} / ${ids.length}`;
    haptic('light');
    $('[data-hint]', root)?.classList.add('gone');
    clearTimeout(activate.t);
    activate.t = setTimeout(() => showFact(i, 0), 420); // инфа выезжает сбоку
  };
  slides.forEach((sl, i) => {
    $$('.sb', sl).forEach((b) => (b.onclick = () => { haptic('light'); if (b.classList.contains('on')) hideFact(i); else showFact(i, Number(b.dataset.f)); }));
    $('[data-pick]', sl).onclick = () => { if (ids[i] !== current) onPick(ids[i]); close(); };
  });
  // параллакс при свайпе: соседние слайды уезжают и уменьшаются
  const place = () => {
    const H = list.clientHeight || 1;
    slides.forEach((sl, i) => {
      const d = (i * H - list.scrollTop) / H;
      const t = Math.min(1, Math.abs(d));
      const a = $('[data-art]', sl);
      a.style.transform = `translate(-50%, -50%) translateY(${(d * -70).toFixed(0)}px) scale(${(1 - 0.35 * t).toFixed(3)}) rotate(${(d * 8).toFixed(1)}deg)`;
      a.style.opacity = (1 - 0.8 * t).toFixed(3);
    });
    activate(Math.round(list.scrollTop / H));
  };
  let raf = 0;
  list.addEventListener('scroll', () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(place); });
  // мышью на компьютере: тянем
  let drag = null;
  list.addEventListener('pointerdown', (e) => { if (e.pointerType !== 'mouse' || e.target.closest('button')) return; drag = { y: e.clientY, top: list.scrollTop }; list.style.scrollSnapType = 'none'; list.setPointerCapture(e.pointerId); });
  list.addEventListener('pointermove', (e) => { if (drag) list.scrollTop = drag.top - (e.clientY - drag.y); });
  const end = () => { if (!drag) return; drag = null; list.style.scrollSnapType = ''; list.scrollTo({ top: Math.round(list.scrollTop / list.clientHeight) * list.clientHeight, behavior: 'smooth' }); };
  list.addEventListener('pointerup', end);
  list.addEventListener('pointercancel', end);
  const go = (n) => list.scrollTo({ top: Math.max(0, Math.min(ids.length - 1, n)) * list.clientHeight, behavior: 'smooth' });
  const onKey = (e) => { if (e.key === 'Escape') close(); else if (e.key === 'ArrowDown') { e.preventDefault(); go(active + 1); } else if (e.key === 'ArrowUp') { e.preventDefault(); go(active - 1); } };
  document.addEventListener('keydown', onKey);
  $('[data-x]', root).onclick = close;
  const start = Math.max(0, ids.indexOf(current));
  requestAnimationFrame(() => { list.scrollTop = start * list.clientHeight; place(); });
}

function bindAppearance(el, onChange) {
  const pk = $('[data-pickm]', el);
  if (pk) pk.onclick = () => mascotReels(LOOK.mascot, (id) => {
    if (S.me?.shop && !S.me.shop.owned.includes(id)) { $$('.sheet-wrap, .overlay').forEach((x) => x.remove()); go('shop'); return; }
    haptic('success');
    savePrefs({ mascot: id });
    $('[data-curm]', el).innerHTML = curMascotInner();
    onChange?.();
  });
  const sw = $$('[data-accent], [data-custom]', el);
  $$('[data-accent]', el).forEach((b) => (b.onclick = () => { haptic('light'); savePrefs({ accent: b.dataset.accent }); sw.forEach((x) => x.classList.toggle('on', x === b)); onChange?.(); }));
  const cb = $('[data-custom]', el);
  if (cb) cb.onclick = () => colorPicker(HEX_RE.test(LOOK.accent) ? LOOK.accent : '#ff0000', (hex) => {
    savePrefs({ accent: hex });
    sw.forEach((x) => x.classList.toggle('on', x === cb));
    cb.style.color = hex;
    $('i', cb).style.background = hex;
    onChange?.();
  });
  $$('[data-mode]', el).forEach((b) => (b.onclick = () => { haptic('light'); savePrefs({ mode: b.dataset.mode }); $$('[data-mode]', el).forEach((x) => x.classList.toggle('on', x === b)); onChange?.(); }));
  $$('[data-lang]', el).forEach((b) => (b.onclick = () => {
    if (LOOK.lang === b.dataset.lang) return;
    haptic('medium');
    savePrefs({ lang: b.dataset.lang });
    // перерисовываем всё на новом языке
    layer.innerHTML = '';
    renderNav();
    route().then(() => appearanceSheet(false)).catch(fail);
  }));
}
function appearanceSheet(first) {
  openSheet(
    `<div class="center" style="margin-bottom:14px"><h2>${first ? 'Выбери напарника!' : 'Внешний вид'}</h2><p class="muted small" style="margin-top:4px">${first ? 'Он будет болеть за тебя на каждом тесте. Поменять можно в профиле.' : 'Напарник, цвет, тема и язык'}</p></div>
     ${appearanceHtml()}<button class="btn block" style="margin-top:22px" data-done>Готово</button>`,
    (el, close) => {
      bindAppearance(el);
      $('[data-done]', el).onclick = () => { if (first) savePrefs({}); close(); route().catch(fail); };
    },
  );
}

// Уровень по XP: на каждый следующий нужно на 50 XP больше (100, 150, 200…)
function levelOf(xp) {
  let level = 1, need = 100, left = xp;
  while (left >= need) { left -= need; level++; need += 50; }
  return { level, cur: left, need };
}

function achievementsSheet(st) {
  const got = st.achievements.filter((a) => a.got).length;
  openSheet(`<div class="center" style="margin-bottom:16px"><h2>Достижения</h2><p class="muted small" style="margin-top:4px">Получено ${got} из ${st.achievements.length}</p></div>
    <div class="ach">${st.achievements.map((a) => `<div class="a ${a.got ? '' : 'off'}">${emo(a.icon)}<b>${esc(a.title)}</b><span>${esc(a.desc)}</span></div>`).join('')}</div>`);
}
function howSheet() {
  openSheet(`<div class="center" style="margin-bottom:16px">${me('think', 100)}<h2>Как это работает</h2></div>
    <div class="stack small">
      <div class="row">${emo(E.bolt)}<p><b>XP</b> — 10 за правильный ответ. 3 подряд — ×2, 5 подряд — ×3. За 100% бонус +20.</p></div>
      <div class="row">${emo(E.glow)}<p><b>Уровень</b> растёт от XP. Каждый следующий уровень чуть дальше предыдущего.</p></div>
      <div class="row">${emo(E.fire)}<p><b>Серия</b> — решай хотя бы один тест в день, и огонёк не погаснет.</p></div>
      <div class="row">${emo(E.star)}<p><b>Звёзды</b> за тест: 50% = 1, 80% = 2, 100% = 3.</p></div>
      <div class="row">${emo(E.repeat)}<p>Ошибки повторяются в конце теста — «работа над ошибками». Оценку они не портят.</p></div>
      <div class="row">${emo(E.trophy)}<p><b>Лига</b> — рейтинг твоей группы по XP.</p></div>
    </div>`);
}

async function tabProfile() {
  const st = await api('/stats/me');
  const u = st.user;
  const lv = levelOf(st.xp);
  const got = st.achievements.filter((a) => a.got);
  const acc = accOf(LOOK.accent);
  const row = (attr, icon, title, sub, right) => `<button class="mrow" ${attr}>${emo(icon)}<div class="grow"><b>${title}</b>${sub ? `<span>${sub}</span>` : ''}</div>${right}<span class="faint">${ic('alt-arrow-right')}</span></button>`;
  app.innerHTML = topbar() + `
    <div class="pcard">
      <div class="pcard-top">
        <button class="pmascot" data-poke aria-label="Напарник">${me('peace', 104)}</button>
        <div class="grow"><h1 class="ellipsis">${esc(u.name)}</h1>
          <p class="muted small">${u.username ? '@' + esc(u.username) + ' · ' : ''}<span>В Зубрике с</span> ${fmtDate(u.joinedAt, true)}</p>
          <div class="tags" style="margin-top:8px">${st.groups.map((g) => `<span class="pill accent">${emo(g.emoji)}${esc(g.name)}</span>`).join('') || '<span class="pill">Без группы</span>'}</div></div>
      </div>
      <div class="lvl"><div class="row between"><b>${emo(E.glow)} Уровень ${lv.level}</b><span class="muted small">${lv.cur} / ${lv.need} XP</span></div>
        <div class="lvl-bar"><i style="width:${(lv.cur / lv.need) * 100}%"></i></div></div>
      <div class="strip">
        <div>${emo(E.fire, { anim: st.streak > 0 })}<b>${st.streak}</b><span>серия</span></div>
        <div>${emo(E.bolt)}<b>${st.xp}</b><span>XP</span></div>
        <div>${emo(E.check)}<b>${st.done}/${st.total}</b><span>тестов</span></div>
      </div>
    </div>
    <div class="menu">
      ${row('data-open="look"', E.palette, 'Внешний вид', `${esc(tr(MASCOTS[LOOK.mascot]?.name || ''))} · ${tr(acc.name)}`, `<span class="mrow-prev">${mascot(LOOK.mascot, 'happy', 40, 'still', true)}<i style="background:${acc.c}"></i></span>`)}
      ${row('data-open="ach"', E.medal, 'Достижения', `${got.length} из ${st.achievements.length}`, `<span class="mrow-badges">${got.slice(-3).map((a) => emo(a.icon)).join('')}</span>`)}
      ${row('data-open="stats"', E.chart, 'Моя статистика', 'Прогресс, карта тем, сравнение с группой', st.overall != null ? pctPill(st.overall) : '')}
      ${row('data-open="league"', E.trophy, 'Лига группы', 'Твоё место среди одногруппников', '')}
      ${row('data-open="how"', E.bulb, 'Как это работает', 'XP, уровни, серия и звёзды', '')}
      ${!IN_TG && SESSION ? row('data-open="logout"', '🚪', 'Выйти', esc(u.email || ''), '') : ''}
    </div>
    <p class="center faint small" style="margin-top:18px">ID: ${esc(u.id)}</p>`;
  const poke = $('[data-poke]');
  const reactions = ['cheer', 'wow', 'love', 'peace', 'oops'];
  let k = 0;
  poke.onclick = () => { haptic('light'); poke.innerHTML = me(reactions[k++ % reactions.length], 104); };
  $$('[data-open]').forEach((b) => (b.onclick = () => {
    haptic('light');
    const what = b.dataset.open;
    if (what === 'look') appearanceSheet(false);
    else if (what === 'ach') achievementsSheet(st);
    else if (what === 'how') howSheet();
    else if (what === 'logout') {
      api('/auth/logout', {}).catch(() => {});
      setSession('');
      loginScreen();
    }
    else go(what);
  }));
}

// ═══════════════ РОДИТЕЛЬ ═══════════════
// Новый пользователь: ученик или родитель (то же спрашивает бот при /start)
function roleScreen() {
  nav.hidden = true;
  app.innerHTML = `<div class="role-pick"><div class="center">${mascot(LOOK.mascot || 'mimi', 'wow', 120)}<h1>Добро пожаловать в Зубрик!</h1><p class="muted">Скажи, кто ты?</p></div>
    <button class="card tap role-card" data-role="student">${mascot('dino', 'cheer', 84, 'still')}<div class="grow"><b>Я ученик</b><span>Обучалки, тесты, лига и прогресс</span></div>${ic('alt-arrow-right')}</button>
    <button class="card tap role-card" data-role="parent">${mascot('kapi', 'love', 84, 'still')}<div class="grow"><b>Я родитель</b><span>Прогресс ребёнка, лиги и успехи всего курса</span></div>${ic('alt-arrow-right')}</button></div>`;
  $$('[data-role]').forEach((b) => (b.onclick = async () => {
    haptic('medium');
    $$('[data-role]').forEach((x) => (x.disabled = true));
    try { S.me = await api('/me/role', { role: b.dataset.role }); await start(); } catch (e) { $$('[data-role]').forEach((x) => (x.disabled = false)); fail(e); }
  }));
}

function parentTop() {
  return `<div class="topbar"><span class="pill accent">${emo('👨‍👩‍👧')}Родитель</span><button class="iconbtn" data-look aria-label="Внешний вид">${ic('pallete-2')}</button></div>`;
}
const PARENT_TIPS = [
  'Здравствуйте! Я слежу за учёбой и всё вам расскажу.',
  'Маленький шаг каждый день — и знания растут, как бамбук!',
  'Похвалите ребёнка за старание — это лучшая мотивация.',
  'Ошибки — это нормально. Главное, что они исправляются!',
  'Загляните в общую лигу — там видно, кто сегодня в ударе.',
  'Регулярность важнее скорости. 15 минут в день творят чудеса.',
  'Спросите ребёнка, что нового он узнал сегодня — ему будет приятно рассказать.',
  'Хорошая новость: каждый решённый тест приносит очки в лигу!',
];
function parentPhrases(kids) {
  const out = [...PARENT_TIPS];
  for (const k of kids) {
    const n = firstName(k.name);
    if (k.xp) out.push(`У ${n} уже ${k.xp} XP — отличный результат!`);
    if (k.rank && k.rank <= 3) out.push(`${n} — в тройке лидеров общей лиги! Место: ${k.rank}.`);
    else if (k.rank) out.push(`${n} — на ${k.rank}-м месте в общей лиге. Вперёд, к вершине!`);
    if (k.streak >= 2) out.push(`${n} занимается ${k.streak} дн. подряд — так держать!`);
    if (!k.done) out.push(`У ${n} пока нет решённых тестов. Самое время начать!`);
    if (k.mistakes) out.push(`Ошибок у ${n} ждут исправления: ${k.mistakes}. Можно разобрать их вместе!`);
    if (k.avg != null && k.avg >= 80) out.push(`Средний балл ${n} — ${k.avg}%. Это очень круто!`);
  }
  return out;
}
const kidCard = (k, mine) => `<button class="card tap kid-card" data-student="${esc(k.id)}">
    <div class="row" style="gap:12px">${avatar(k)}<div class="grow" style="min-width:0"><b class="ellipsis" style="display:block">${esc(k.name)}${mine ? ` <span class="pill accent sm">${emo('💛')}мой ребёнок</span>` : ''}</b>
      <div class="small muted ellipsis">${k.groups.map((g) => esc(g.name)).join(', ') || 'без группы'}</div></div>${ic('alt-arrow-right')}</div>
    <div class="kid-stats"><span>${emo(E.bolt)}<b>${k.xp}</b> XP</span><span>${emo(E.trophy)}<b>${k.rank ? '#' + k.rank : '—'}</b></span><span>${emo(E.target)}<b>${pctText(k.avg)}</b></span><span>${emo(E.check)}<b>${k.done}/${k.total}</b></span>${k.streak ? `<span>${emo(E.fire)}<b>${k.streak}</b></span>` : ''}</div></button>`;

async function tabParentHome() {
  const m = await refreshMe();
  const phrases = parentPhrases(m.children);
  let k = Math.floor(Math.random() * phrases.length);
  app.innerHTML = parentTop() + `<div class="hero"><button class="pmascot" data-poke aria-label="Напарник">${me('talk', 112, 'quiet')}</button><div class="grow"><h1>Здравствуйте, ${esc(firstName(m.user.name))}!</h1><div class="say" data-say></div></div></div>
    ${sectionTitle('👨‍👩‍👧', 'Мои дети', `<button class="link" data-kids>${ic('pen-2', 'sm')}${m.children.length ? 'Изменить' : 'Выбрать'}</button>`)}
    ${m.children.length ? `<div class="stack">${m.children.map((c) => kidCard(c, false)).join('')}</div>`
      : `<div class="card center stack">${me('think', 90)}<p class="muted">Выберите своего ребёнка — и я буду показывать его успехи прямо здесь.</p><button class="btn" data-kids>${ic('user-plus-rounded')}Выбрать ребёнка</button></div>`}
    <div data-kiddiary></div>
    <div class="tiles" style="margin-top:16px">
      <button class="tile tap" data-go="league">${emo(E.trophy, { anim: true })}<div><b>Лига</b><span>общая и групп</span></div></button>
      <button class="tile tap" data-go="kids">${emo(E.student)}<div><b>${m.totalStudents}</b><span>учеников курса</span></div></button>
    </div>`;
  const say = () => speak($('[data-say]'), phrases[k++ % phrases.length], $('.hero .mascot'));
  say();
  $('[data-poke]').onclick = () => { haptic('light'); say(); };
  $$('[data-kids]').forEach((b) => (b.onclick = () => childrenSheet()));
  $$('[data-go]').forEach((b) => (b.onclick = () => go(b.dataset.go)));
  $('[data-look]').onclick = () => appearanceSheet(false);
  bindLeagueStudents();
  mountKidDiaries($('[data-kiddiary]'), m.children).catch(() => {});
}

// Родителю на главной: календарь каждого ребёнка — был / не был на уроке, оценки, итоги
const KD = { y: null, m: null };
async function mountKidDiaries(root, kids) {
  if (!root || !kids.length) return;
  const list = await Promise.all(kids.map((c) => api(`/parent/students/${c.id}/diary`).catch(() => null)));
  if (!root.isConnected) return;
  const today = list.find(Boolean)?.today;
  if (!today) return;
  if (KD.y == null) { const [y, mo] = today.split('-').map(Number); KD.y = y; KD.m = mo - 1; }
  const draw = () => {
    root.innerHTML = kids.map((c, i) => {
      const d = list[i];
      if (!d) return '';
      const byDay = {};
      d.days.forEach((x) => (byDay[x.date] ||= { lessons: [], grades: [] }).lessons.push(x));
      d.grades.forEach((g) => (byDay[g.date] ||= { lessons: [], grades: [] }).grades.push(g));
      const t = byDay[d.today];
      const todayLine = t?.lessons.length ? (t.lessons.some((l) => !l.present) ? '<span class="pill bad">Сегодня не был на уроке</span>' : '<span class="pill good">Сегодня был на уроке</span>') : '<span class="pill">Сегодня урока не было</span>';
      const st = d.stats;
      const cal = monthCal(KD.y, KD.m, (ds) => {
        const x = byDay[ds];
        if (!x) return null;
        const miss = x.lessons.some((l) => !l.present), was = x.lessons.some((l) => l.present);
        return { cls: miss ? 'bad' : was ? 'good' : '', html: x.grades.length ? gradeChip(x.grades[x.grades.length - 1].value, 'mini') : '' };
      }, { today: d.today });
      const last = d.grades.slice(-3).reverse();
      return `<div class="card kid-diary" data-kid="${i}" style="margin-top:14px"><div class="row between" style="gap:8px"><h3>${emo('📒')} <span data-noi18n>${esc(c.name)}</span></h3>${todayLine}</div>
        <div class="kd-stats"><div><b>${st.attendance != null ? st.attendance + '%' : '—'}</b><span>посещаемость</span></div><div><b data-noi18n>${st.present}/${st.lessons}</b><span>был на уроках</span></div><div><b>${st.missed}</b><span>пропусков</span></div><div><b>${st.avgGrade ?? '—'}</b><span>средний балл</span></div></div>
        ${calNav(KD.y, KD.m)}${cal}
        <div class="cal-legend"><span><i class="good"></i>был</span><span><i class="bad"></i>не был</span><span>${gradeChip(8, 'mini')} оценка</span></div>
        ${last.length ? `<div class="grades-list" style="padding:0;margin-top:8px">${last.map(gradeRow).join('')}</div>` : ''}</div>`;
    }).join('');
    $$('[data-cm]', root).forEach((b) => (b.onclick = () => { KD.m += Number(b.dataset.cm); if (KD.m < 0) { KD.m = 11; KD.y--; } if (KD.m > 11) { KD.m = 0; KD.y++; } haptic('light'); draw(); }));
    $$('[data-kid]', root).forEach((card) => {
      const d = list[Number(card.dataset.kid)];
      $$('[data-day]', card).forEach((b) => (b.onclick = () => {
        const x = { lessons: d.days.filter((l) => l.date === b.dataset.day), grades: d.grades.filter((g) => g.date === b.dataset.day) };
        if (x.lessons.length || x.grades.length) { haptic('light'); daySheet(b.dataset.day, x); }
      }));
    });
  };
  draw();
}

async function tabKids() {
  const [list] = await Promise.all([api('/parent/students'), refreshMe()]);
  const mine = new Set(S.me.childIds);
  const render = (q) => list.filter((u) => !q || u.name.toLowerCase().includes(q)).map((u) => kidCard(u, mine.has(u.id))).join('') || '<p class="muted center small">Никого не нашли</p>';
  app.innerHTML = parentTop() + `<div class="center" style="margin-top:10px">${emo(E.student, { cls: 'big' })}<h1>Ученики курса</h1><p class="muted">${plural(list.length, 'ученик', 'ученика', 'учеников')} · нажмите, чтобы увидеть прогресс</p></div>
    ${list.length > 5 ? '<input class="input" data-q placeholder="Поиск по имени" style="margin-top:14px">' : ''}
    <div class="stack" data-list style="margin-top:14px">${render('')}</div>`;
  const q = $('[data-q]');
  if (q) q.oninput = () => { $('[data-list]').innerHTML = render(q.value.trim().toLowerCase()); bindLeagueStudents(); };
  $('[data-look]').onclick = () => appearanceSheet(false);
  bindLeagueStudents();
}

async function tabParentProfile() {
  const m = await refreshMe();
  const acc = accOf(LOOK.accent);
  const row = (attr, icon, title, sub, right = '') => `<button class="mrow" ${attr}>${emo(icon)}<div class="grow"><b>${title}</b>${sub ? `<span>${sub}</span>` : ''}</div>${right}<span class="faint">${ic('alt-arrow-right')}</span></button>`;
  app.innerHTML = parentTop() + `<div class="pcard"><div class="pcard-top"><button class="pmascot" data-poke aria-label="Напарник">${me('peace', 104)}</button>
      <div class="grow"><h1 class="ellipsis">${esc(m.user.name)}</h1><p class="muted small">${emo('👨‍👩‍👧')} Родитель</p>
      <div class="tags" style="margin-top:8px">${m.children.map((c) => `<span class="pill accent">${emo('💛')}${esc(firstName(c.name))}</span>`).join('') || '<span class="pill">Ребёнок не выбран</span>'}</div></div></div></div>
    <div class="menu" style="margin-top:14px">
      ${row('data-open="look"', E.palette, 'Внешний вид', `${esc(tr(MASCOTS[LOOK.mascot]?.name || ''))} · ${tr(acc.name)}`, `<span class="mrow-prev">${mascot(LOOK.mascot, 'happy', 40, 'still', true)}<i style="background:${acc.c}"></i></span>`)}
      ${row('data-open="kids"', '👨‍👩‍👧', 'Мои дети', m.children.map((c) => esc(firstName(c.name))).join(', ') || 'Выберите ребёнка')}
      ${row('data-open="league"', E.trophy, 'Лига', 'Общая лига и лига группы')}
      ${!IN_TG && SESSION ? row('data-open="logout"', '🚪', 'Выйти') : ''}
    </div>
    <p class="center faint small" style="margin-top:18px">ID: ${esc(m.user.id)}</p>`;
  const poke = $('[data-poke]');
  const reactions = ['cheer', 'wow', 'love', 'peace', 'happy'];
  let k = 0;
  poke.onclick = () => { haptic('light'); poke.innerHTML = me(reactions[k++ % reactions.length], 104); };
  $('[data-look]').onclick = () => appearanceSheet(false);
  $$('[data-open]').forEach((b) => (b.onclick = () => {
    haptic('light');
    const what = b.dataset.open;
    if (what === 'look') appearanceSheet(false);
    else if (what === 'kids') childrenSheet();
    else if (what === 'logout') { api('/auth/logout', {}).catch(() => {}); setSession(''); loginScreen(); }
    else go(what);
  }));
}

// Выбор своих детей (можно несколько)
async function childrenSheet() {
  const list = await api('/parent/students').catch(fail);
  if (!list) return;
  const picked = new Set(S.me.childIds || []);
  const render = (q) => list.filter((u) => !q || u.name.toLowerCase().includes(q)).map((u) => `<button class="list-check ${picked.has(u.id) ? 'on' : ''}" data-c="${esc(u.id)}">${avatar(u)}<div class="grow"><b>${esc(u.name)}</b><div class="small muted">${u.groups.map((g) => esc(g.name)).join(', ') || 'без группы'}</div></div></button>`).join('') || '<p class="muted center small">Никого не нашли</p>';
  openSheet(`<div class="stack"><h2>Мои дети</h2><p class="muted small">Отметьте своего ребёнка — можно несколько.</p>
      ${list.length > 6 ? '<input class="input" data-q placeholder="Поиск по имени">' : ''}
      <div data-list style="max-height:50vh;overflow:auto">${render('')}</div>
      <button class="btn block" data-save>${ic('check-circle')}Сохранить</button></div>`, (el, close) => {
    const bind = () => $$('[data-c]', el).forEach((b) => (b.onclick = () => { haptic('light'); const id = b.dataset.c; picked.has(id) ? picked.delete(id) : picked.add(id); b.classList.toggle('on', picked.has(id)); }));
    bind();
    const q = $('[data-q]', el);
    if (q) q.oninput = () => { $('[data-list]', el).innerHTML = render(q.value.trim().toLowerCase()); bind(); };
    $('[data-save]', el).onclick = async () => {
      try { await api('/parent/children', { ids: [...picked] }); haptic('success'); toast('Сохранено'); close(); route().catch(fail); } catch (e) { fail(e); }
    };
  });
}

// ═══════════════ ПРОХОЖДЕНИЕ ТЕСТА ═══════════════
// Поле ответа для любого типа вопроса (используют тест и обучалка)
function mountAnswer(area, q, P, setReady, onEnter) {
  if (q.type === 'choice') {
    area.innerHTML = `<div class="opts">${q.options.map((o, i) => `<button class="opt ${looksLikeCode(o) ? 'mono' : ''}" data-i="${i}"><span class="k">${i + 1}</span><span>${esc(o)}</span></button>`).join('')}</div>`;
    $$('.opt', area).forEach((b) => (b.onclick = () => { if (P.answered) return; haptic('light'); $$('.opt', area).forEach((x) => x.classList.remove('on')); b.classList.add('on'); P.value = Number(b.dataset.i); setReady(true); }));
  } else if (q.type === 'truefalse') {
    area.innerHTML = `<div class="tf"><button class="opt yes" data-v="1">${ic('check-circle')}Верно</button><button class="opt no" data-v="0">${ic('close-circle')}Неверно</button></div>`;
    $$('.opt', area).forEach((b) => (b.onclick = () => { if (P.answered) return; haptic('light'); $$('.opt', area).forEach((x) => x.classList.remove('on')); b.classList.add('on'); P.value = b.dataset.v === '1'; setReady(true); }));
  } else if (q.type === 'input') {
    area.innerHTML = `<input class="input" style="font-size:18px;padding:16px" placeholder="${esc(q.placeholder)}" autocomplete="off" autocapitalize="off" spellcheck="false">`;
    const inp = $('input', area);
    inp.oninput = () => { P.value = inp.value; setReady(inp.value.trim().length > 0); };
    inp.onkeydown = (e) => { if (e.key === 'Enter' && P.ready) { inp.blur(); onEnter?.(); } };
    setTimeout(() => inp.focus(), 250);
  } else if (q.type === 'order') {
    const picked = [];
    const draw = () => {
      area.innerHTML = `<div class="answer-line">${picked.map((bi, k) => `<button class="chip-w" data-k="${k}">${esc(q.bank[bi])}</button>`).join('')}</div>
        <div class="bank">${q.bank.map((t, bi) => `<button class="chip-w ${picked.includes(bi) ? 'ghost' : ''}" data-b="${bi}">${esc(t)}</button>`).join('')}</div>`;
      $$('[data-b]', area).forEach((b) => (b.onclick = () => { const bi = Number(b.dataset.b); if (P.answered || picked.includes(bi)) return; haptic('light'); picked.push(bi); draw(); }));
      $$('[data-k]', area).forEach((b) => (b.onclick = () => { if (P.answered) return; picked.splice(Number(b.dataset.k), 1); draw(); }));
      P.value = picked.map((bi) => q.bank[bi]);
      setReady(picked.length > 0);
    };
    draw();
  } else if (q.type === 'fill') {
    // текст с пропусками ___: нажимаешь плитку — она встаёт в первый пустой пропуск, нажимаешь на пропуск — плитка возвращается
    const parts = String(q.text).split('___');
    const slots = Array(parts.length - 1).fill(null);
    const mono = looksLikeCode(q.text) || /[{};<>()=]/.test(q.text);
    const draw = () => {
      const used = new Set(slots.filter((x) => x != null));
      area.innerHTML = `<div class="fill-text ${mono ? 'mono' : ''}">${parts.map((p, k) => esc(p) + (k < slots.length ? (slots[k] != null ? `<button class="chip-w gap-on" data-g="${k}">${esc(q.bank[slots[k]])}</button>` : `<span class="gap ${slots.indexOf(null) === k ? 'next' : ''}"></span>`) : '')).join('')}</div>
        <div class="bank">${q.bank.map((t, bi) => `<button class="chip-w ${used.has(bi) ? 'ghost' : ''}" data-b="${bi}">${esc(t)}</button>`).join('')}</div>`;
      $$('[data-b]', area).forEach((b) => (b.onclick = () => { const bi = Number(b.dataset.b); const k = slots.indexOf(null); if (P.answered || used.has(bi) || k < 0) return; haptic('light'); slots[k] = bi; draw(); }));
      $$('[data-g]', area).forEach((b) => (b.onclick = () => { if (P.answered) return; slots[Number(b.dataset.g)] = null; draw(); }));
      P.value = slots.map((bi) => (bi == null ? '' : q.bank[bi]));
      setReady(slots.every((x) => x != null));
    };
    draw();
  } else if (q.type === 'match') {
    const pairs = {};
    let selL = 0;
    const pc = ['#2fa8ff', '#9b6bff', '#ff8a3d', '#14c8a8', '#ff6fae', '#e8a10f', '#58cc02', '#ff5a6e'];
    const draw = () => {
      const rightOwner = Object.fromEntries(Object.entries(pairs).map(([l, r]) => [r, Number(l)]));
      const style = (k) => (k == null ? '' : `style="border-color:${pc[k % pc.length]};box-shadow:0 4px 0 ${pc[k % pc.length]};color:${pc[k % pc.length]}"`);
      area.innerHTML = `<div class="match"><div class="col">${q.left.map((t, i) => `<button class="opt ${selL === i ? 'on' : ''}" data-l="${i}" ${style(pairs[i] != null ? i : null)}>${esc(t)}</button>`).join('')}</div>
        <div class="col">${q.right.map((t, j) => `<button class="opt" data-r="${j}" ${style(rightOwner[j] ?? null)}>${esc(t)}</button>`).join('')}</div></div>`;
      $$('[data-l]', area).forEach((b) => (b.onclick = () => { if (P.answered) return; const i = Number(b.dataset.l); haptic('light'); if (pairs[i] != null) delete pairs[i]; selL = i; draw(); }));
      $$('[data-r]', area).forEach((b) => (b.onclick = () => {
        if (P.answered) return;
        const j = Number(b.dataset.r);
        const owner = rightOwner[j];
        if (owner != null) { delete pairs[owner]; draw(); return; }
        if (selL == null) return;
        haptic('light');
        pairs[selL] = j;
        selL = q.left.findIndex((_, i) => pairs[i] == null);
        if (selL < 0) selL = null;
        draw();
      }));
      P.value = Object.fromEntries(Object.entries(pairs).map(([l, r]) => [l, q.right[r]]));
      setReady(Object.keys(pairs).length === q.left.length);
    };
    draw();
  }
}

const KIND = { choice: 'Выбери ответ', truefalse: 'Верно или нет?', input: 'Напиши ответ', order: 'Собери ответ', match: 'Найди пары', fill: 'Вставь пропущенное' };

async function startLesson(target) {
  let data;
  try { data = await api('/attempts', target); } catch (e) { return fail(e); }
  const P = { ...data, i: 0, queue: data.questions.map((_, i) => i), review: [], phase: 'main', combo: 0, xp: 0, value: null, ready: false, answered: false, magUsed: false, potUsed: false };
  const tools = testTools(data, P);
  const el = document.createElement('div');
  el.className = 'player';
  layer.appendChild(el);
  tg?.BackButton?.hide();
  try { tg?.enableClosingConfirmation?.(); } catch { /* */ }

  const total = () => data.questions.length + P.review.length;
  const doneCount = () => (P.phase === 'main' ? P.i : data.questions.length + P.i);
  const comboHtml = () => (P.combo >= 2 ? `${emo(E.fire, { anim: true })}${P.combo}` : '');

  async function close() {
    if (await confirmSheet('Выйти из теста?', 'Прогресс этой попытки не сохранится.', 'Выйти', true)) {
      el.remove();
      try { tg?.disableClosingConfirmation?.(); } catch { /* */ }
      if (S.view) tg?.BackButton?.show();
    }
  }

  function render() {
    const qi = P.queue[P.i];
    const q = data.questions[qi];
    P.value = null; P.ready = false; P.answered = false;
    el.innerHTML = `
      <div class="ptop"><button class="pclose" data-close aria-label="Закрыть">${ic('close-circle')}</button><div class="pbar"><i style="width:${(doneCount() / total()) * 100}%"></i></div>
        <span class="combo" data-combo>${comboHtml()}</span>${P.phase === 'main' && !S.me?.isAdmin ? tools.html() : ''}</div>
      <div class="pbody">
        <div class="qkind ${P.phase === 'review' ? 'review' : ''}">${P.phase === 'review' ? `${emo(E.repeat)} Работа над ошибками` : data.preview ? `${ic('eye', 'sm')} Превью учителя ·` : ''} ${KIND[q.type]}${q.topic ? ` <span class="t">· ${esc(q.topic)}</span>` : ''}${q.from ? ` <span class="t">· ${esc(q.from)}</span>` : ''}</div>
        <div class="qhead">${me('think', 84)}<div class="qprompt">${esc(q.prompt)}</div></div>
        ${q.code ? `<pre class="code">${highlight(q.code)}</pre>` : ''}
        <div data-area></div>
        ${q.hint ? `<p class="small muted" style="margin-top:16px">${emo(E.bulb)} <span class="link" data-hint>Подсказка</span></p>` : ''}
      </div>
      <div class="pfoot"><div class="in"><div data-fb></div><button class="btn block" data-check disabled>Проверить</button></div></div>`;
    $('[data-close]', el).onclick = close;
    tools.bind(el, q, qi);
    const hint = $('[data-hint]', el);
    if (hint) hint.onclick = () => { hint.parentElement.innerHTML = emo(E.bulb) + ' ' + esc(q.hint); };
    mountAnswer($('[data-area]', el), q, P, setReady, () => $('[data-check]', el).click());
    $('[data-check]', el).onclick = () => (P.answered ? next() : check(qi));
  }

  const setReady = (v) => { P.ready = v; $('[data-check]', el).disabled = !v; };


  async function check(qi) {
    if (!P.ready || P.answered) return;
    const btn = $('[data-check]', el);
    btn.disabled = true;
    let r;
    try {
      r = P.phase === 'main'
        ? await api(`/attempts/${data.attemptId}/answer`, { index: qi, answer: P.value })
        : await api(`/attempts/${data.attemptId}/retry`, { index: qi, answer: P.value });
    } catch (e) { btn.disabled = false; return fail(e); }
    P.answered = true;
    const foot = $('.pfoot', el);
    if (P.phase === 'main') {
      P.combo = r.combo;
      if (!r.correct) P.review.push(qi);
      if (r.xpGained) {
        P.xp += r.xpGained;
        const f = document.createElement('div');
        f.className = 'xp-float';
        f.innerHTML = `${emo(E.bolt)}+${r.xpGained}${r.mult > 1 ? ` ×${r.mult}` : ''}`;
        document.body.appendChild(f);
        setTimeout(() => f.remove(), 950);
      }
      const c = $('[data-combo]', el);
      c.innerHTML = comboHtml();
      c.className = 'combo' + (P.combo >= 2 ? ' pop' : '');
    }
    // напарник реагирует
    const qm = $('.qhead .mascot', el);
    if (qm) qm.outerHTML = me(r.correct ? 'cheer' : 'oops', 84);
    const praise = ['Отлично!', 'Супер!', 'Так держать!', 'В точку!', 'Молодец!', 'Блестяще!', 'Огонь!'];
    if (r.correct) { sfx.ok(); haptic('success'); foot.className = 'pfoot ok'; }
    else { sfx.bad(); haptic('error'); foot.className = 'pfoot bad'; $('.pbody', el).classList.add('shake'); }
    $('[data-fb]', el).innerHTML = `<div class="fb">${me(r.correct ? (P.combo >= 3 ? 'wow' : 'cheer') : 'oops', 76)}<div>
      <h3>${r.correct ? praise[Math.floor(Math.random() * praise.length)] + (P.phase === 'main' && P.combo >= 3 ? ` Комбо ×${P.combo}!` : '') : 'Не совсем…'}</h3>
      ${r.correct ? '' : `<p>Правильно: <b>${esc(r.correctText)}</b></p>`}
      ${r.explain ? `<p class="expl">${esc(r.explain)}</p>` : ''}</div></div>`;
    btn.className = 'btn block ' + (r.correct ? 'good' : 'bad');
    btn.textContent = 'Далее';
    btn.disabled = false;
  }

  async function next() {
    P.i++;
    if (P.i < P.queue.length) return render();
    if (P.phase === 'main' && P.review.length) {
      P.phase = 'review';
      P.queue = P.review.slice();
      P.i = 0;
      el.innerHTML = `<div class="pbody center" style="display:grid;place-items:center;align-content:center;gap:14px">${me('think', 160)}
        <h1>Работа над ошибками</h1><p class="muted">Повторим вопросы, где ты ошибся. На оценку это уже не влияет — просто закрепим.</p></div>
        <div class="pfoot"><div class="in"><button class="btn block" data-go>${ic('play')}Поехали</button></div></div>`;
      $('[data-go]', el).onclick = render;
      return;
    }
    finish();
  }

  async function finish() {
    let r;
    try { r = await api(`/attempts/${data.attemptId}/finish`, {}); } catch (e) { return fail(e); }
    try { tg?.disableClosingConfirmation?.(); } catch { /* */ }
    const lost = !data.mistakes && r.pct < 60;
    if (lost) await loseShow(el);
    const won = !data.mistakes && r.pct >= 80;
    if (won) await winShow(el, r.pct);
    const look = data.mistakes ? (r.correct === r.total ? { emo: 'love', icon: E.muscle, title: 'Все ошибки исправлены!' } : { emo: r.correct ? 'cheer' : 'sad', icon: E.muscle, title: `Исправлено ${r.correct} из ${r.total}` })
      : r.pct === 100 ? { emo: 'love', icon: E.hundred, title: 'Идеально!' }
      : r.pct >= 80 ? { emo: 'cheer', icon: E.party, title: 'Урок пройден!' }
        : r.pct >= 50 ? { emo: 'peace', icon: E.clap, title: 'Неплохо!' }
          : { emo: 'sad', icon: E.muscle, title: 'В следующий раз получится' };
    if (won) setTimeout(confetti, 200);
    else if (r.pct >= 80) { sfx.win(); setTimeout(confetti, 250); }
    if (!lost) haptic(r.pct >= 50 ? 'success' : 'warning');
    const mins = Math.floor(r.durationSec / 60), secs = r.durationSec % 60;
    el.innerHTML = `<div class="pbody"><div class="result">
      <div style="position:relative;display:inline-block">${me(look.emo, 150)}<span style="position:absolute;right:-26px;top:4px">${emo(look.icon, { anim: true, cls: 'xl' })}</span></div>
      <h1>${look.title}</h1>
      ${data.mistakes ? `<p class="muted" style="margin-top:4px">${r.mistakesLeft ? `В копилке ошибок осталось ${plural(r.mistakesLeft, 'вопрос', 'вопроса', 'вопросов')}` : 'Копилка ошибок пуста — красота!'}</p>` : ''}
      ${!data.mistakes && !data.preview && r.correct < r.total ? `<p class="muted small" style="margin-top:4px">${emo(E.repeat)} Ошибки попали в твою «Работу над ошибками» на главной</p>` : ''}
      <p class="muted">${emo(data.lesson.emoji)} ${esc(data.lesson.title)}${r.practice ? ' · тренировка' : r.preview ? ' · превью' : ''}</p>
      <div style="margin-top:16px">${donut(r.pct, { size: 170, stroke: 20, sub: `${r.correct} из ${r.total}` })}</div>
      <div class="tiles3">
        <div class="rtile gold"><div class="h">Опыт</div><div class="v">${emo(E.bolt, { anim: true })}${r.xp}</div></div>
        <div class="rtile accent"><div class="h">Комбо</div><div class="v">${emo(E.fire, { anim: true })}${r.maxCombo}</div></div>
        <div class="rtile blue"><div class="h">Время</div><div class="v">${emo(E.timer)}${mins}:${String(secs).padStart(2, '0')}</div></div>
      </div>
      ${r.group && r.group.avg != null ? `<div class="card" style="text-align:left;margin-bottom:12px"><div class="row between" style="margin-bottom:10px"><h3>${emo(E.swords)} Ты vs группа</h3>${r.group.rank ? `<span class="pill gold">#${r.group.rank} из ${r.group.done}</span>` : ''}</div>
        ${hbars([{ label: 'Твой результат', value: r.pct, color: 'var(--accent)' }, { label: `Среднее по группе (сдали ${r.group.done} из ${r.group.size})`, value: r.group.avg, color: 'var(--faint)' }])}</div>` : ''}
      ${r.topics.length ? `<div class="card" style="text-align:left;margin-bottom:12px"><h3 style="margin-bottom:12px">${emo(E.compass)} По темам</h3>${r.topics.length >= 3 ? radar(r.topics) : hbars(r.topics.map((t) => ({ label: t.topic, value: t.pct, right: `${t.correct}/${t.total}`, color: 'var(--accent)' })))}</div>` : ''}
      ${lost ? `<div class="lose-hint" data-losehint>${emo('👇')} Посмотри на свои ошибки</div>` : ''}
      <div class="card qlist ${lost ? 'lost' : ''}" style="margin-bottom:12px"><h3 style="margin-bottom:6px">${emo(E.memo)} Ответы</h3>${r.questions.map((q) => `<div><span style="color:${q.correct ? 'var(--good)' : 'var(--bad)'}">${ic(q.correct ? 'check-circle' : 'close-circle', 'sm')}</span><span>${esc(q.prompt)}</span></div>`).join('')}</div>
      ${r.streak ? `<p class="muted">${emo(E.fire, { anim: true })} Серия: ${plural(r.streak, 'день', 'дня', 'дней')} подряд</p>` : ''}
    </div></div>
    <div class="pfoot"><div class="in"><button class="btn block" data-done>Продолжить</button></div></div>`;
    $('[data-done]', el).onclick = () => { loseSong.stop(); winSong.stop(); el.remove(); if (S.view) tg?.BackButton?.show(); route().catch(fail); };
    if (lost) {
      setTimeout(() => $('[data-losehint]', el)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 1600);
    }
  }

  render();
}

// ═══════════════ ОБУЧАЛКА ═══════════════
async function startLearn(target) {
  let data;
  try { data = await api('/learn/start', target); } catch (e) { return fail(e); }
  const steps = [];
  if (data.intro) steps.push({ t: 'say', text: data.intro, emo: 'teach' });
  data.sections.forEach((sec, si) => {
    steps.push({ t: 'say', text: `**${tr('Раздел')} ${si + 1}. ${sec.title}**\n${tr(si === 0 ? 'Начнём!' : 'Идём дальше!')}`, emo: 'talk', section: si });
    sec.slides.forEach((sl) => steps.push({ t: 'say', text: sl.quote ? `**${tr('Учитель')} ${data.teacher} ${tr('говорил:')}**\n«${sl.text}»` : sl.text, code: sl.code, emoji: sl.emoji, emo: sl.quote ? 'peace' : 'teach', section: si }));
    if (sec.check?.length) {
      steps.push({ t: 'say', text: 'Теперь проверим, чему ты научился за эту секцию!', emo: 'talk', section: si, checkIntro: true });
      sec.check.forEach((q, i) => steps.push({ t: 'q', q, si, i }));
    }
  });
  steps.push({ t: 'end' });

  const el = document.createElement('div');
  el.className = 'player learn';
  layer.appendChild(el);
  tg?.BackButton?.hide();
  let i = 0;
  let talk = null;
  let right = 0, asked = 0;

  async function close() {
    if (await confirmSheet('Выйти из обучалки?', 'Начнёшь заново в следующий раз.', 'Выйти', true)) { el.remove(); if (S.view) tg?.BackButton?.show(); }
  }
  const top = () => `<div class="ptop"><button class="pclose" data-close aria-label="Закрыть">${ic('close-circle')}</button><div class="pbar"><i style="width:${(i / (steps.length - 1)) * 100}%"></i></div><span class="pill accent">${emo('📖')}${(steps[i].section ?? steps[i].si ?? 0) + 1}/${data.sections.length}</span></div>`;

  function render() {
    const st = steps[i];
    if (st.t === 'q') return renderQ(st);
    if (st.t === 'end') return renderEnd();
    el.innerHTML = `${top()}<div class="pbody learn-body">
        ${st.emoji ? `<div class="center">${emo(st.emoji, { cls: 'big' })}</div>` : ''}
        <div class="teach-row">${me(st.emo, 120)}<div class="speech" data-say></div></div>
        ${st.code ? `<pre class="code">${highlight(st.code)}</pre>` : ''}
      </div>
      <div class="pfoot"><div class="in"><button class="btn block" data-next>${st.checkIntro ? 'Проверить себя' : 'Дальше'}</button></div></div>`;
    $('[data-close]', el).onclick = close;
    talk = speak($('[data-say]', el), st.text, $('.teach-row .mascot', el));
    $('[data-next]', el).onclick = () => { if (talk.typing()) return talk.skip(); haptic('light'); i++; render(); };
  }

  function renderQ(st) {
    const q = st.q;
    const Q = { value: null, ready: false, answered: false };
    el.innerHTML = `${top()}<div class="pbody">
        <div class="qkind">${emo('📖')} Проверка раздела · ${KIND[q.type]}</div>
        <div class="qhead">${me('think', 84)}<div class="qprompt">${esc(q.prompt)}</div></div>
        ${q.code ? `<pre class="code">${highlight(q.code)}</pre>` : ''}<div data-area></div></div>
      <div class="pfoot"><div class="in"><div data-fb></div><button class="btn block" data-check disabled>Проверить</button></div></div>`;
    $('[data-close]', el).onclick = close;
    const btn = $('[data-check]', el);
    const setReady = (v) => { Q.ready = v; btn.disabled = !v; };
    mountAnswer($('[data-area]', el), q, Q, setReady, () => btn.click());
    btn.onclick = async () => {
      if (Q.answered) { i++; return render(); }
      if (!Q.ready) return;
      btn.disabled = true;
      let r;
      try { r = await api('/learn/check', { ...target, section: st.si, index: st.i, answer: Q.value }); } catch (e) { btn.disabled = false; return fail(e); }
      Q.answered = true;
      asked++;
      if (r.correct) right++;
      const qm = $('.qhead .mascot', el);
      if (qm) qm.outerHTML = me(r.correct ? 'cheer' : 'oops', 84);
      if (r.correct) { sfx.ok(); haptic('success'); } else { sfx.bad(); haptic('error'); $('.pbody', el).classList.add('shake'); }
      $('.pfoot', el).className = 'pfoot ' + (r.correct ? 'ok' : 'bad');
      $('[data-fb]', el).innerHTML = `<div class="fb">${me(r.correct ? 'cheer' : 'oops', 76)}<div><h3>${r.correct ? 'Верно!' : 'Не совсем…'}</h3>${r.correct ? '' : `<p>Правильно: <b>${esc(r.correctText)}</b></p>`}${r.explain ? `<p class="expl">${esc(r.explain)}</p>` : ''}</div></div>`;
      btn.className = 'btn block ' + (r.correct ? 'good' : 'bad');
      btn.textContent = 'Дальше';
      btn.disabled = false;
    };
  }

  async function renderEnd() {
    let r = {};
    try { r = await api('/learn/finish', target); } catch (e) { return fail(e); }
    sfx.win();
    setTimeout(confetti, 200);
    const text = `Обучалка пройдена! ${asked ? `В проверках ${right} из ${asked}. ` : ''}Учитель ${data.teacher} будет доволен. ${target.pubId ? 'Теперь — тест. Ты готов!' : ''}`;
    el.innerHTML = `<div class="pbody learn-body center"><div class="teach-row col">${me('cheer', 150)}<div class="speech" data-say></div></div>
        ${r.xp && !r.preview ? `<div style="margin-top:14px"><span class="pill gold">${emo(E.bolt)}+${r.xp} XP</span></div>` : ''}</div>
      <div class="pfoot"><div class="in stack">${target.pubId ? `<button class="btn block" data-test>${ic('play')}К тесту</button>` : ''}<button class="btn ghost dim block" data-done>${target.pubId ? 'Позже' : 'Готово'}</button></div></div>`;
    speak($('[data-say]', el), text, $('.teach-row .mascot', el));
    const finish = () => { el.remove(); if (S.view) tg?.BackButton?.show(); route().catch(fail); };
    $('[data-done]', el).onclick = finish;
    const t = $('[data-test]', el);
    if (t) t.onclick = () => { el.remove(); startLesson({ pubId: target.pubId }); };
  }

  render();
}

// ═══════════════ УЧИТЕЛЬ ═══════════════
const GROUP_EMOJI = ['📘', '📗', '📕', '📙', '🧪', '💻', '🧮', '🌍', '🎨', '🎵', '⚽', '🚀', '🧠', '🔬', '✍️', '🦉'];

async function loadOverview() {
  S.overview = await api('/admin/overview');
  return S.overview;
}
function adminTop(title) {
  return `<div class="topbar"><h2>${title}</h2><div class="row" style="gap:8px"><span class="pill gold">${emo(E.crown)}Учитель</span><button class="iconbtn" data-look aria-label="Внешний вид">${ic('pallete-2')}</button></div></div>`;
}
function bindAdminTop() {
  const b = $('[data-look]');
  if (b) b.onclick = () => appearanceSheet(false);
}

async function tabDash() {
  const [o] = await Promise.all([loadOverview(), refreshMe()]);
  const t = o.totals;
  app.innerHTML = adminTop('Панель') + `
    <div class="hero">${me('peace', 104)}<div class="grow"><h1>Привет, ${esc(firstName(S.me.user.name))}!</h1><div class="say">${o.unassigned.length ? `${plural(o.unassigned.length, 'новый ученик ждёт', 'новых ученика ждут', 'новых учеников ждут')} группу` : t.sent ? `Средний балл по курсу — ${pctText(t.avg)}` : 'Создай группу и отправь первый тест'}</div></div></div>
    <div class="tiles" style="margin-top:14px">
      <div class="tile">${emo(E.student)}<div><b>${t.students}</b><span>учеников</span></div></div>
      <div class="tile">${emo(E.people)}<div><b>${t.groups}</b><span>групп</span></div></div>
      <div class="tile">${emo(E.outbox)}<div><b>${t.sent}</b><span>тестов отправлено</span></div></div>
      <div class="tile">${emo(E.target)}<div><b>${pctText(t.avg)}</b><span>средний балл</span></div></div>
    </div>
    <button class="card tap row league-banner" data-globalleague style="margin-top:12px;gap:12px;width:100%">${emo(E.trophy, { anim: true, cls: 'lg' })}<div class="grow" style="text-align:left"><b>Общая лига</b><div class="small muted">Топ всех учеников по очкам</div></div><span class="faint">${ic('alt-arrow-right')}</span></button>
    ${o.unassigned.length ? sectionTitle(E.newb, 'Новые ученики', `<span class="pill bad">${o.unassigned.length}</span>`) + `<div class="card" style="padding:6px 8px">${o.unassigned.map((u) => `<div class="item">${avatar(u)}<div class="grow"><b class="ellipsis" style="display:block">${esc(u.name)}</b><div class="small muted">${u.username ? '@' + esc(u.username) + ' · ' : ''}${ago(u.joinedAt)}</div></div><button class="btn sm" data-assign="${u.id}">В группу</button></div>`).join('')}</div>` : ''}
    ${sectionTitle(E.people, 'Группы', `<button class="link" data-newgroup>${ic('add-circle', 'sm')}Создать</button>`)}
    ${o.groups.length ? `<div class="stack">${o.groups.map(groupCardHtml).join('')}</div>` : `<div class="card center stack"><p class="muted">Групп пока нет</p><button class="btn" data-newgroup>${ic('add-circle')}Создать первую группу</button></div>`}
    ${o.feed.length ? sectionTitle(E.bolt, 'Последние результаты') + `<div class="card" style="padding:6px 8px">${o.feed.map(feedItem).join('')}</div>` : ''}`;
  bindAdminTop();
  bindGroupCards();
  $$('[data-newgroup]').forEach((b) => (b.onclick = () => groupForm()));
  $$('[data-assign]').forEach((b) => (b.onclick = () => assignSheet(b.dataset.assign)));
  $('[data-globalleague]').onclick = () => openView({ type: 'league', parent: null });
}

function groupCardHtml(g) {
  return `<div class="card tap row" data-group="${g.id}" style="gap:14px">${donut(g.avg, { size: 66, stroke: 8, label: g.avg == null ? '—' : g.avg + '' })}
    <div class="grow"><h3 class="row" style="gap:6px">${emo(g.emoji)}${esc(g.name)}</h3><div class="small muted">${plural(g.members.length, 'ученик', 'ученика', 'учеников')} · ${plural(g.tests, 'тест', 'теста', 'тестов')}</div>
    <div class="small" style="margin-top:6px">${g.linked ? `<span class="pill good">${ic('link-round', 'sm')}${esc(g.chatTitle || 'чат привязан')}</span>` : '<span class="pill">чат не привязан</span>'}</div></div><span class="faint">${ic('alt-arrow-right')}</span></div>`;
}
function bindGroupCards() {
  $$('[data-group]').forEach((b) => (b.onclick = () => openView({ type: 'group', id: b.dataset.group })));
}

function assignSheet(uid) {
  const o = S.overview;
  const u = o.students.find((s) => s.id === uid) || o.unassigned.find((s) => s.id === uid);
  if (!o.groups.length) return groupForm(() => assignSheet(uid));
  openSheet(
    `<div class="stack"><h2>Добавить в группу</h2><div class="row">${avatar(u)}<b>${esc(u?.name)}</b></div>
      <div>${o.groups.map((g) => `<button class="list-check" data-g="${g.id}">${emo(g.emoji)}<b class="grow">${esc(g.name)}</b><span class="muted small">${g.members.length}</span></button>`).join('')}</div>
      <button class="btn ghost block" data-new>${ic('add-circle')}Новая группа</button></div>`,
    (el, close) => {
      $$('[data-g]', el).forEach((b) => (b.onclick = async () => {
        try { await api(`/admin/groups/${b.dataset.g}/members`, { userId: uid }); haptic('success'); toast('Добавлен в группу'); close(); route().catch(fail); } catch (e) { fail(e); }
      }));
      $('[data-new]', el).onclick = () => { close(); groupForm(() => assignSheet(uid)); };
    },
  );
}

function groupForm(after, existing) {
  let gemo = existing?.emoji || GROUP_EMOJI[0];
  openSheet(
    `<div class="stack"><h2>${existing ? 'Изменить группу' : 'Новая группа'}</h2>
      <label class="field"><span>Название</span><input class="input" data-name maxlength="40" placeholder="Например: Вечерняя группа" value="${esc(existing?.name || '')}"></label>
      <div class="field"><span>Иконка</span><div class="emoji-pick">${GROUP_EMOJI.map((e) => `<button data-e="${e}" class="${e === gemo ? 'on' : ''}">${emo(e)}</button>`).join('')}</div></div>
      <button class="btn block" data-save>${existing ? 'Сохранить' : 'Создать группу'}</button></div>`,
    (el, close) => {
      $$('[data-e]', el).forEach((b) => (b.onclick = () => { gemo = b.dataset.e; $$('[data-e]', el).forEach((x) => x.classList.toggle('on', x === b)); }));
      const inp = $('[data-name]', el);
      setTimeout(() => inp.focus(), 250);
      $('[data-save]', el).onclick = async () => {
        if (!inp.value.trim()) return inp.focus();
        try {
          if (existing) await patch('/admin/groups/' + existing.id, { name: inp.value, emoji: gemo });
          else await api('/admin/groups', { name: inp.value, emoji: gemo });
          haptic('success');
          close();
          await loadOverview();
          if (after) after(); else route().catch(fail);
        } catch (e) { fail(e); }
      };
    },
  );
}

async function tabGroups() {
  const o = await loadOverview();
  app.innerHTML = adminTop('Группы') + `<div style="margin-top:10px"><button class="btn block" data-newgroup>${ic('add-circle')}Создать группу</button></div>
    <div class="stack" style="margin-top:16px">${o.groups.map(groupCardHtml).join('') || emptyState('think', 'Групп пока нет', 'Создай группу и добавь туда учеников. Ученики сначала запускают бота командой /start.')}</div>
    ${sectionTitle(E.student, 'Все ученики', `<span class="pill">${o.students.length}</span>`)}
    <div class="card" style="padding:6px 8px">${o.students.length ? o.students.map((u) => `<div class="item tap" data-student="${u.id}">${avatar(u)}<div class="grow"><b class="ellipsis" style="display:block">${esc(u.name)}</b><div class="small muted">${u.groups.map((gid) => o.groups.find((g) => g.id === gid)).filter(Boolean).map((g) => esc(g.name)).join(', ') || '<span style="color:var(--bad-d)">без группы</span>'}</div></div><span class="faint">${ic('alt-arrow-right')}</span></div>`).join('') : '<p class="muted center small" style="padding:14px">Пока никто не запускал бота. Отправь ученикам ссылку на бота — после /start они появятся здесь.</p>'}</div>`;
  bindAdminTop();
  bindGroupCards();
  $$('[data-newgroup]').forEach((b) => (b.onclick = () => groupForm()));
  $$('[data-student]').forEach((b) => (b.onclick = () => openView({ type: 'student', id: b.dataset.student, parent: S.view })));
}

async function viewGroup(gid) {
  const [st] = await Promise.all([api(`/admin/groups/${gid}/stats`), S.overview ? null : loadOverview()]);
  const g = st.group;
  const tabs = [['members', 'Ученики'], ['tests', 'Тесты'], ['stats', 'Статистика'], ['league', 'Лига']];
  let body = '';
  if (S.groupTab === 'members') {
    const rows = st.leaderboard.rows;
    const mis = Object.fromEntries(st.heat.map((h) => [h.userId, h.mistakes]));
    body = `<div class="row" style="gap:8px;margin-top:14px"><button class="btn grow" data-add>${ic('user-plus-rounded')}Добавить учеников</button><button class="btn ghost grow" data-gtime>${ic('clock-circle')}Время для журнала</button></div>
      <div class="card" style="padding:6px 8px;margin-top:14px">${rows.length ? rows.map((r) => `<div class="item" data-student="${r.userId}">${avatar(r)}<div class="grow"><b class="ellipsis" style="display:block">${esc(r.name)}</b>
        <div class="small muted">${r.done}/${st.tests.length} тестов · ср. ${pctText(r.avg)} · ${r.xp} XP</div></div>
        ${mis[r.userId] ? `<span class="pill bad" title="Ошибок в копилке">${ic('refresh', 'sm')}${mis[r.userId]}</span>` : ''}
        <button class="iconbtn" data-rm="${r.userId}" aria-label="Убрать">${ic('trash-bin-trash', 'sm')}</button></div>`).join('') : '<p class="muted center small" style="padding:14px">В группе пока нет учеников</p>'}</div>`;
  } else if (S.groupTab === 'tests') {
    body = !st.tests.length
      ? emptyState('sleepy', 'Тестов ещё не было', 'Отправь группе тест во вкладке «Тесты».')
      : `<p class="muted small" style="margin-top:14px">Нажми на тест, чтобы увидеть, кто и сколько раз его решал.</p>
        <div class="stack" style="margin-top:10px">${st.tests.map((t) => `<button class="card tap row" data-gtest="${esc(t.key)}" style="gap:12px;width:100%;text-align:left;font:inherit;color:inherit">${emo(t.emoji, { cls: 'lg' })}<div class="grow"><b>${esc(t.title)}</b>
          <div class="small muted">решили ${t.done}/${t.size} · ${ago(t.publishedAt)}</div></div>${pctPill(t.avg)}<span class="faint">${ic('alt-arrow-right')}</span></button>`).join('')}</div>`;
  } else if (S.groupTab === 'stats') {
    body = !st.tests.length
      ? emptyState('sleepy', 'Тестов ещё не было', 'Отправь группе тест во вкладке «Тесты».')
      : `${sectionTitle(E.chart, 'Средний балл по тестам')}
        <div class="card">${hbars(st.tests.map((t) => ({ label: t.title, labelHtml: `${emo(t.emoji)} ${esc(t.title)}`, value: t.avg, right: `${pctText(t.avg)} · ${t.done}/${t.size}` })))}</div>
        ${sectionTitle(E.map, 'Карта группы')}
        <div class="card scroll-x">${st.heat.length ? `<table class="heat"><tr><th></th>${st.tests.map((t, i) => `<th title="${esc(t.title)}">${emo(t.emoji)}<br>${i + 1}</th>`).join('')}<th>Ср.</th></tr>
          ${st.heat.map((r) => `<tr><td class="nm">${esc(r.name)}</td>${r.cells.map((c, i) => (c == null ? `<td class="na" title="${esc(r.name)} — ${esc(st.tests[i].title)}: не сдал">—</td>` : `<td style="background:${pctColor(c)}" title="${esc(r.name)} — ${esc(st.tests[i].title)}: ${c}%">${c}</td>`)).join('')}<td style="background:${pctColor(r.avg)}">${r.avg ?? '—'}</td></tr>`).join('')}</table>
          <div class="legend"><span><i style="background:var(--good)"></i>80%+</span><span><i style="background:var(--gold)"></i>50–79%</span><span><i style="background:var(--bad)"></i>ниже 50%</span><span><i style="background:var(--track)"></i>не сдал</span></div>` : '<p class="muted small center">Нет учеников</p>'}</div>
        ${st.hardest.length ? sectionTitle(E.bricks, 'Самые сложные вопросы') + `<div class="card">${hbars(st.hardest.map((q) => ({ label: q.prompt, value: q.pct, right: `${q.pct}% верно` })))}</div>` : ''}
        ${sectionTitle(E.hourglass, 'Кто ещё не сдал')}
        <div class="card stack">${st.tests.map((t) => `<div><b>${emo(t.emoji)} ${esc(t.title)}</b><div class="small" style="color:${t.notDone.length ? 'var(--bad-d)' : 'var(--good-d)'}">${t.notDone.length ? esc(t.notDone.join(', ')) : 'Все сдали'}</div></div>`).join('')}</div>`;
  } else {
    body = leagueHtml(st.leaderboard, null);
  }
  app.innerHTML = `<div class="topbar"><button class="back" data-back>${ic('alt-arrow-left')}Назад</button><div class="row" style="gap:8px"><button class="iconbtn" data-edit aria-label="Изменить">${ic('pen-2')}</button><button class="iconbtn" data-delg aria-label="Удалить">${ic('trash-bin-trash')}</button></div></div>
    <div class="row" style="margin-top:8px;gap:14px">${donut(g.avg, { size: 88, stroke: 10, sub: 'ср.' })}<div class="grow"><h1 class="row" style="gap:8px">${emo(g.emoji)}${esc(g.name)}</h1>
      <p class="muted small">${plural(g.members.length, 'ученик', 'ученика', 'учеников')} · ${plural(g.tests, 'тест', 'теста', 'тестов')}</p></div></div>
    <div class="card ${g.linked ? '' : 'tint'} small row" style="margin-top:14px;align-items:flex-start">${emo(E.speech)}<div>${g.linked ? `Чат «<b>${esc(g.chatTitle)}</b>» привязан — бот пишет туда о тестах и напоминания.` : '<b>Чат не привязан.</b> Добавь бота в Telegram-группу и напиши там <code>/link</code>. Пока бот пишет ученикам в личку.'}</div></div>
    <div class="seg" style="margin-top:14px">${tabs.map(([id, t]) => `<button data-gt="${id}" class="${S.groupTab === id ? 'on' : ''}">${t}</button>`).join('')}</div>
    ${body}`;
  $('[data-back]').onclick = back;
  $$('[data-gt]').forEach((b) => (b.onclick = () => { S.groupTab = b.dataset.gt; viewGroup(gid).catch(fail); }));
  $('[data-edit]').onclick = () => groupForm(null, g);
  $('[data-delg]').onclick = async () => {
    if (!(await confirmSheet(`Удалить «${g.name}»?`, 'Ученики останутся, но отправленные этой группе тесты и их результаты пропадут из статистики.', 'Удалить', true))) return;
    try { await del('/admin/groups/' + gid); toast('Группа удалена'); back(); } catch (e) { fail(e); }
  };
  $$('[data-student]').forEach((b) => (b.onclick = (e) => { if (e.target.closest('[data-rm]')) return; openView({ type: 'student', id: b.dataset.student, parent: S.view }); }));
  $$('[data-rm]').forEach((b) => (b.onclick = async () => {
    if (!(await confirmSheet('Убрать из группы?', '', 'Убрать', true))) return;
    try { await del(`/admin/groups/${gid}/members/${b.dataset.rm}`); viewGroup(gid).catch(fail); } catch (e) { fail(e); }
  }));
  const add = $('[data-add]');
  if (add) add.onclick = () => addMembersSheet(g);
  const gt = $('[data-gtime]');
  if (gt) gt.onclick = () => scheduleSheet(gid);
  $$('[data-gtest]').forEach((b) => (b.onclick = () => testAttemptsSheet(b.dataset.gtest)));
}

// Кто из учеников решал тест, сколько раз и сколько процентов набрал каждый раз
async function testAttemptsSheet(pubId) {
  // ключ «группа|урок» — все доступы группы к уроку; иначе одна публикация
  const [gid, lid] = String(pubId).split('|');
  const d = await api(lid ? `/admin/groups/${gid}/lessons/${lid}/attempts` : `/admin/pubs/${pubId}/attempts`).catch(fail);
  if (!d) return;
  const pill = (p) => `<span class="pill ${p >= 80 ? 'good' : p >= 50 ? 'gold' : 'bad'}">${p}%</span>`;
  const row = (r) => `<div class="att-row"><div class="row" style="gap:10px">${avatar(r)}<div class="grow" style="min-width:0"><b class="ellipsis" style="display:block">${esc(r.name)}</b>
      <div class="small muted">${r.attempts.length ? `${esc(tr('Решал'))} ${esc(tr(plural(r.attempts.length, 'раз', 'раза', 'раз')))}${r.learnDone === false ? ' · ' + esc(tr('обучалка не пройдена')) : ''}` : `${esc(tr('Не решал'))}${r.learnDone ? ' · ' + esc(tr('обучалка ✓')) : r.learnDone === false ? ' · ' + esc(tr('обучалка не пройдена')) : ''}`}</div></div>${r.best != null ? pill(r.best) : '<span class="pill">—</span>'}</div>
      ${r.attempts.length ? `<div class="att-list">${r.attempts.map((a) => `<div><span class="att-n">${a.n}</span><span class="grow">${esc(tr('попытка'))}${a.practice ? ' · ' + esc(tr('тренировка')) : ''} <span class="faint small">· ${a.correct}/${a.total} · ${esc(ago(a.at))}</span></span>${pill(a.pct)}</div>`).join('')}</div>` : ''}</div>`;
  openSheet(`<div class="stack" data-noi18n><h2>${emo(d.emoji)} ${esc(d.title)}</h2>
    <p class="muted small">${esc(tr(d.groupName || ''))} · ${esc(tr('решили'))} ${d.started}/${d.size}${d.avg != null ? ` · ${esc(tr('среднее'))} ${d.avg}%` : ''}</p>
    <div class="att">${d.rows.map(row).join('') || `<p class="muted center small">${esc(tr('Нет учеников'))}</p>`}</div></div>`);
}

function addMembersSheet(g) {
  const o = S.overview;
  const inGroup = new Set(g.members.map((m) => m.id));
  const cand = o.students.filter((s) => !inGroup.has(s.id)).sort((a, b) => a.groups.length - b.groups.length);
  const picked = new Set();
  openSheet(
    `<div class="stack"><h2>Добавить в «${esc(g.name)}»</h2>
      ${cand.length ? `<p class="muted small">Ученики, которые уже запускали бота:</p><div>${cand.map((u) => `<button class="list-check" data-u="${u.id}">${avatar(u)}<div class="grow"><b>${esc(u.name)}</b><div class="small muted">${u.groups.length ? 'уже в другой группе' : 'без группы'}</div></div><span data-mark class="faint">${ic('add-circle')}</span></button>`).join('')}</div>` : '<p class="muted small">Все, кто запускал бота, уже в этой группе.</p>'}
      <label class="field"><span>…или по @username / Telegram ID</span><input class="input" data-manual placeholder="@username или 123456789"></label>
      <button class="btn block" data-save>Добавить</button></div>`,
    (el, close) => {
      $$('[data-u]', el).forEach((b) => (b.onclick = () => {
        const id = b.dataset.u;
        picked.has(id) ? picked.delete(id) : picked.add(id);
        b.classList.toggle('on', picked.has(id));
        $('[data-mark]', b).innerHTML = picked.has(id) ? `<span class="accent">${ic('check-circle')}</span>` : ic('add-circle');
      }));
      $('[data-save]', el).onclick = async () => {
        const manual = $('[data-manual]', el).value.trim();
        try {
          if (!picked.size && !manual) return;
          for (const id of picked) await api(`/admin/groups/${g.id}/members`, { userId: id });
          if (manual) await api(`/admin/groups/${g.id}/members`, /^\d+$/.test(manual) ? { userId: manual } : { username: manual });
          haptic('success');
          toast('Добавлено');
          close();
          await loadOverview();
          route().catch(fail);
        } catch (e) { fail(e); }
      };
    },
  );
}

async function viewStudent(uid) {
  const st = await api((S.me.isParent ? '/parent/students/' : '/admin/students/') + uid);
  const u = st.user;
  app.innerHTML = `<div class="topbar"><button class="back" data-back>${ic('alt-arrow-left')}Назад</button><span class="pill">ID ${esc(u?.id || uid)}</span></div>
    <div class="row" style="margin-top:8px;gap:14px">${avatar(u, 'lg')}<div class="grow"><h1>${esc(u?.name || 'Ученик')}</h1>
      <p class="muted small">${u?.username ? '@' + esc(u.username) + ' · ' : ''}${st.groups.map((g) => esc(g.name)).join(', ') || 'без группы'}</p>
      <div class="tags" style="margin-top:6px">${st.achievements.filter((a) => a.got).map((a) => `<span title="${esc(a.title)}">${emo(a.icon)}</span>`).join('')}</div></div></div>
    ${statsHtml(st, { self: false })}
    <div class="row" style="gap:8px;margin-top:14px"><button class="btn ghost grow" data-diary>${ic('calendar')}Дневник</button>${S.me.isParent ? '' : `<button class="btn grow" data-givegrade>${ic('star')}Оценка</button>`}</div>
    ${S.me.isParent ? '' : `<div class="card stack small" style="margin-top:16px"><b>${emo(E.laptop)} Вход на сайт</b><p class="muted">${st.siteLogin ? `Логин: <code data-noi18n>${esc(st.siteLogin)}</code>` : 'Входа пока нет'}</p>
      ${String(uid).startsWith('w') ? '' : `<button class="btn ghost block" data-relogin>${ic('lock-keyhole')}${st.siteLogin ? 'Новый пароль' : 'Создать вход'}</button>`}</div>
      <div style="margin-top:12px"><button class="btn ghost block" data-bonus>${emo('🎁')}Начислить баллы</button></div>
      <div style="margin-top:12px"><button class="btn ghost block" data-assign="${esc(uid)}">${ic('user-plus-rounded')}Добавить в группу</button></div>`}`;
  $('[data-back]').onclick = back;
  $('[data-diary]').onclick = async () => {
    try {
      const d = await api((S.me.isParent ? '/parent/students/' : '/admin/students/') + uid + '/diary');
      DIARY.y = null;
      renderDiary(d, { who: u?.name || '', onBack: () => viewStudent(uid).catch(fail) });
      window.scrollTo(0, 0);
    } catch (e) { fail(e); }
  };
  const gg = $('[data-givegrade]');
  if (gg) gg.onclick = () => gradeSheet({ userId: uid, after: () => viewStudent(uid) });
  const bb = $('[data-bonus]');
  if (bb) bb.onclick = () => openSheet(`<div class="stack"><h2>${emo('🎁')} Начислить баллы</h2><p class="muted small">${esc(u?.name || '')} получит XP в общую лигу и лигу группы. Чтобы снять баллы, введи число с минусом.</p>
      <input class="input" data-xp type="number" inputmode="numeric" placeholder="Например, 50">
      <input class="input" data-reason maxlength="200" placeholder="За что (необязательно)">
      <button class="btn block" data-ok>${ic('check-circle')}Начислить</button></div>`, (el, close) => {
    $('[data-ok]', el).onclick = async () => {
      try {
        const r = await api(`/admin/students/${uid}/bonus`, { xp: Number($('[data-xp]', el).value), reason: $('[data-reason]', el).value });
        haptic('success'); toast(`Готово: теперь ${r.total} XP`); close(); viewStudent(uid).catch(fail);
      } catch (e) { fail(e); }
    };
  });
  const rl = $('[data-relogin]');
  if (rl) rl.onclick = async () => {
    if (!(await confirmSheet('Выдать новый пароль?', 'Старый пароль перестанет работать. Бот пришлёт новый ученику в личку.', 'Выдать'))) return;
    try { loginsSheet([await api(`/admin/students/${uid}/login`, {})]); viewStudent(uid).catch(fail); } catch (e) { fail(e); }
  };
  const asg = $('[data-assign]');
  if (asg) asg.onclick = async () => { if (!S.overview) await loadOverview(); assignSheet(uid); };
}

// ═══════════════ ЖУРНАЛ И ДНЕВНИК ═══════════════
// Календарь месяца: cell(dateStr) → { cls, html } для каждого дня. Дни недели с понедельника.
const WEEKDAYS = { ru: ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'], uz: ['Du', 'Se', 'Ch', 'Pa', 'Ju', 'Sh', 'Ya'], en: ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'] };
const DOW_FULL = { ru: ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота', 'Воскресенье'], uz: ['Dushanba', 'Seshanba', 'Chorshanba', 'Payshanba', 'Juma', 'Shanba', 'Yakshanba'], en: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] };
const curLang = () => (['uz', 'en'].includes(LOOK.lang) ? LOOK.lang : 'ru');
const ymd = (y, m, d) => `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
const dmy = (s) => { const [y, m, d] = s.split('-'); return `${d}.${m}.${y}`; };
const gradeColor = (v) => (v >= 9 ? 'var(--good)' : v >= 7 ? '#2fa8ff' : v >= 5 ? 'var(--gold)' : 'var(--bad)');
const gradeChip = (v, cls = '') => `<span class="gchip ${cls}" style="background:${gradeColor(v)}">${v}</span>`;
function monthName(y, m) {
  const loc = { ru: 'ru-RU', uz: 'uz-Latn-UZ', en: 'en-US' }[curLang()];
  try { const s = new Intl.DateTimeFormat(loc, { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(Date.UTC(y, m, 1))); return s[0].toUpperCase() + s.slice(1); } catch { return `${m + 1}.${y}`; }
}
function monthCal(y, m, cell, { today, selected } = {}) {
  const first = (new Date(Date.UTC(y, m, 1)).getUTCDay() + 6) % 7;
  const days = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  let html = `<div class="cal" data-noi18n><div class="cal-h">${WEEKDAYS[curLang()].map((w) => `<b>${w}</b>`).join('')}</div><div class="cal-g">`;
  for (let i = 0; i < first; i++) html += '<i></i>';
  for (let d = 1; d <= days; d++) {
    const ds = ymd(y, m, d);
    const c = cell(ds) || {};
    html += `<button class="cal-d ${c.cls || ''} ${ds === today ? 'today' : ''} ${ds === selected ? 'sel' : ''}" data-day="${ds}"><span>${d}</span>${c.html || ''}</button>`;
  }
  return html + '</div></div>';
}
const calNav = (y, m) => `<div class="cal-nav"><button class="iconbtn" data-cm="-1" aria-label="Назад">${ic('alt-arrow-left')}</button><b data-noi18n>${esc(monthName(y, m))}</b><button class="iconbtn" data-cm="1" aria-label="Вперёд">${ic('alt-arrow-right')}</button></div>`;

// ───────── ДНЕВНИК (ученик, а ещё учитель и родитель на странице ученика) ─────────
const DIARY = { y: null, m: null };
async function tabDiary() {
  const [d, m] = await Promise.all([api('/me/diary'), S.me?.path ? S.me : refreshMe()]);
  renderDiary(d, { path: m.path || [], self: true });
}
function diaryMood(d, path) {
  const last = d.grades[d.grades.length - 1];
  const recent = last && Date.now() - last.at < 14 * 86400_000;
  const lastDay = d.days[d.days.length - 1];
  if (recent && last.value <= 5) {
    const t = last.lesson?.title;
    return { pose: 'sad', low: last, say: t ? `Оценка ${last.value} — это не приговор! Давай вместе повторим тему «${t}», и в следующий раз будет выше 💪` : `Оценка ${last.value} — это не приговор! Давай разберём, что не получилось, и в следующий раз будет выше 💪` };
  }
  if (recent && last.value >= 9) return { pose: 'love', say: `${last.value} из 10! Я тобой горжусь — так держать! 🏆` };
  if (lastDay && !lastDay.present && Date.now() - Date.parse(lastDay.date) < 7 * 86400_000) return { pose: 'oops', say: 'Ты пропустил урок… Ничего, догоним! Загляни в «Путь» — там все темы.' };
  if (recent && last.value <= 7) return { pose: 'think', say: `Неплохо — ${last.value} из 10. Ещё чуть-чуть, и будет отлично!` };
  if (!d.days.length && !d.grades.length) return { pose: 'happy', say: 'Здесь будет твой дневник: дни уроков, посещаемость и оценки учителя.' };
  return { pose: 'happy', say: 'Вот твой дневник: зелёные дни — ты был на уроке, красные — пропустил.' };
}
function renderDiary(d, { path = [], self = false, who = null, root = app, onBack = null } = {}) {
  const [ty, tm] = d.today.split('-').map(Number);
  if (DIARY.y == null) { DIARY.y = ty; DIARY.m = tm - 1; }
  const byDay = {};
  d.days.forEach((x) => (byDay[x.date] ||= { lessons: [], grades: [] }).lessons.push(x));
  d.grades.forEach((g) => (byDay[g.date] ||= { lessons: [], grades: [] }).grades.push(g));
  const mood = diaryMood(d, path);
  const lowPub = mood.low?.lesson ? path.find((p) => p.lessonId === mood.low.lesson.id) : null;
  const st = d.stats;
  const next = nextLesson(d.schedule, d.tzMin);
  const draw = () => {
    const cal = monthCal(DIARY.y, DIARY.m, (ds) => {
      const x = byDay[ds];
      if (!x) return null;
      const miss = x.lessons.some((l) => !l.present), was = x.lessons.some((l) => l.present);
      return { cls: miss ? 'bad' : was ? 'good' : '', html: x.grades.length ? gradeChip(x.grades[x.grades.length - 1].value, 'mini') : '' };
    }, { today: d.today });
    const recent = d.grades.slice(-8).reverse();
    root.innerHTML = (onBack ? `<div class="topbar"><button class="back" data-back>${ic('alt-arrow-left')}Назад</button></div>` : self ? topbar() : '') + `
      ${who ? `<h1 style="margin-top:8px">${emo('📒')} Дневник: ${esc(who)}</h1>` : ''}
      <div class="hero diary-hero">${self ? me(mood.pose === 'happy' ? 'talk' : mood.pose, 104, mood.pose === 'happy' ? 'quiet' : '') : me('teach', 96, 'quiet')}<div class="grow">${self ? `<h1>${emo('📒')} Дневник</h1>` : ''}
        <div class="say" data-say>${esc(self ? mood.say : 'Посещаемость и оценки ученика')}</div>
        ${self && mood.low ? (lowPub ? `<button class="btn" data-retry>${ic('refresh')}Повторить тему</button>` : `<button class="btn" data-gopath>${ic('play')}На «Путь»</button>`) : ''}</div></div>
      <div class="tiles diary-tiles">
        <div class="tile">${emo('✅')}<div><b>${st.attendance != null ? st.attendance + '%' : '—'}</b><span>посещаемость</span></div></div>
        <div class="tile">${emo('⭐')}<div><b>${st.avgGrade ?? '—'}</b><span>средний балл</span></div></div>
        <div class="tile">${emo('❌')}<div><b>${st.missed}</b><span>${plural(st.missed, 'пропуск', 'пропуска', 'пропусков').replace(/^\d+ /, '')}</span></div></div>
        <div class="tile">${emo(E.bolt)}<div><b>${st.gradeXp}</b><span>XP за оценки</span></div></div>
      </div>
      ${next ? `<div class="card next-lesson">${ic('clock-circle')}<div class="grow"><small>Следующий урок</small><b data-noi18n>${esc(next.text)}</b></div>${emo(next.group.emoji || '📚')}</div>` : ''}
      <div class="card" style="margin-top:12px">${calNav(DIARY.y, DIARY.m)}${cal}
        <div class="cal-legend"><span><i class="good"></i>был</span><span><i class="bad"></i>не был</span><span>${gradeChip(8, 'mini')} оценка</span></div></div>
      ${recent.length ? sectionTitle('⭐', 'Оценки') + `<div class="card grades-list">${recent.map(gradeRow).join('')}</div>` : ''}`;
    if (self) speak($('[data-say]', root), mood.say, $('.hero .mascot', root));
    $$('[data-cm]', root).forEach((b) => (b.onclick = () => { DIARY.m += Number(b.dataset.cm); if (DIARY.m < 0) { DIARY.m = 11; DIARY.y--; } if (DIARY.m > 11) { DIARY.m = 0; DIARY.y++; } haptic('light'); draw(); }));
    $$('[data-day]', root).forEach((b) => (b.onclick = () => { const x = byDay[b.dataset.day]; if (x) { haptic('light'); daySheet(b.dataset.day, x); } }));
    const rt = $('[data-retry]', root);
    if (rt) rt.onclick = () => { haptic('medium'); lowPub.hasLearn ? learnSheet(lowPub) : lessonSheet(lowPub); };
    const gp = $('[data-gopath]', root);
    if (gp) gp.onclick = () => go('home');
    const bk = $('[data-back]', root);
    if (bk) bk.onclick = onBack;
  };
  draw();
}
const gradeRow = (g) => `<div class="grow-row">${gradeChip(g.value)}<div class="grow"><b>${g.lesson ? `${emo(g.lesson.emoji)} ${esc(g.lesson.title)}` : esc(tr('Оценка учителя'))}</b>
  <div class="small muted">${dmy(g.date)} · +${g.xp} XP${g.comment ? ' · ' + esc(g.comment) : ''}</div></div></div>`;
function daySheet(ds, x) {
  openSheet(`<div class="stack"><h2>${emo('📅')} <span data-noi18n>${dmy(ds)}</span></h2>
    ${x.lessons.map((l) => `<div class="card day-lesson ${l.present ? 'good' : 'bad'}"><div class="row" style="gap:10px">${emo(l.group?.emoji || '📚')}<div class="grow"><b>${esc(l.group?.name || '')}</b><div class="small muted" data-noi18n>${l.start}${l.end && l.end !== l.start ? '–' + l.end : ''}</div></div>
      <span class="pill ${l.present ? 'good' : 'bad'}">${l.present ? 'был' : 'не был'}</span></div>${l.reason ? `<p class="small" style="margin-top:8px">💬 ${esc(l.reason)}</p>` : ''}</div>`).join('')}
    ${x.grades.length ? `<div class="card grades-list">${x.grades.map(gradeRow).join('')}</div>` : ''}</div>`);
}
function nextLesson(schedule, tzMin = 300) {
  if (!schedule?.length) return null;
  const now = new Date(Date.now() + (tzMin ?? 300) * 60_000); // часовой пояс ученика (по умолчанию Ташкент)
  const dow = ((now.getUTCDay() + 6) % 7) + 1, cur = now.getUTCHours() * 60 + now.getUTCMinutes();
  const toMin = (hm) => { const [h, m] = hm.split(':').map(Number); return h * 60 + m; };
  let best = null;
  for (const s of schedule) {
    let delta = (s.dow - dow + 7) % 7;
    if (delta === 0 && toMin(s.start) <= cur) delta = 7;
    const key = delta * 1440 + toMin(s.start);
    if (!best || key < best.key) best = { key, s, delta };
  }
  const L = curLang();
  const day = best.delta === 0 ? tr('Сегодня') : best.delta === 1 ? tr('Завтра') : DOW_FULL[L][best.s.dow - 1];
  return { group: best.s.group, text: `${day}, ${best.s.start}–${best.s.end} · ${best.s.group.name}` };
}

// ───────── ЖУРНАЛ (учитель) ─────────
const JR = { group: null, y: null, m: null, day: null };
async function tabJournal() {
  const j = await api('/admin/journal');
  S.journal = j;
  if (JR.y == null) { const [y, m] = j.today.split('-').map(Number); JR.y = y; JR.m = m - 1; JR.day = j.today; }
  if (!j.groups.some((g) => g.id === JR.group)) JR.group = j.groups[0]?.id || null;
  const g = j.groups.find((x) => x.id === JR.group);
  const chips = `<div class="chips jr-groups" style="margin-top:12px">${j.groups.map((x) => `<button class="choice ${x.id === JR.group ? 'on' : ''}" data-jg="${x.id}">${emo(x.emoji)} ${esc(x.name)}</button>`).join('')}</div>`;
  if (!g) {
    app.innerHTML = adminTop('Журнал') + emptyState('sleepy', 'Групп пока нет', 'Создай группу во вкладке «Группы».');
    bindAdminTop();
    return;
  }
  const L = curLang();
  const slotsTxt = (sl) => sl.map((s) => `${WEEKDAYS[L][s.dow - 1]} ${s.start}–${s.end}`).join(' · ');
  const sched = [g.schedule.length ? slotsTxt(g.schedule) : '', ...(g.personal || []).map((p) => `${p.name}: ${slotsTxt(p.schedule)}`)].filter(Boolean).join('\n');
  const sessions = j.sessions.filter((s) => s.groupId === g.id);
  const grades = j.grades.filter((x) => g.students.some((u) => u.id === x.userId));
  const byDay = {};
  sessions.forEach((s) => (byDay[s.date] ||= { s: [], g: [] }).s.push(s));
  grades.forEach((x) => (byDay[x.date] ||= { s: [], g: [] }).g.push(x));
  const cal = monthCal(JR.y, JR.m, (ds) => {
    const x = byDay[ds];
    if (!x) return null;
    const abs = x.s.reduce((n, s) => n + s.members.filter((m) => m.absent).length, 0);
    const pend = x.s.some((s) => s.status !== 'done');
    return { cls: pend ? 'mark' : abs ? 'bad' : x.s.length ? 'good' : '', html: `${abs ? `<em class="abs">${abs}</em>` : ''}${x.g.length ? `<em class="gr">★${x.g.length}</em>` : ''}` };
  }, { today: j.today, selected: JR.day });
  const day = byDay[JR.day] || { s: [], g: [] };
  const roster = g.students.map((u) => `<div class="jr-row" data-st="${esc(u.id)}">${avatar(u)}<div class="grow" style="min-width:0"><b class="ellipsis" style="display:block">${esc(u.name)}</b>
      <div class="jr-marks"><span class="plus">＋${u.plus}</span><span class="minus">−${u.minus}</span>${u.grades.map((v) => gradeChip(v, 'mini')).join('')}</div></div>
      <div class="jr-avg">${u.avg != null ? gradeChip(Math.round(u.avg)) + `<small>${u.avg}</small>` : '<span class="faint small">—</span>'}</div>
      <button class="iconbtn" data-gr="${esc(u.id)}" aria-label="Оценка">${ic('star', 'sm')}</button></div>`).join('');
  app.innerHTML = adminTop('Журнал') + chips + `
    <div class="card jr-head" style="margin-top:12px"><div class="row" style="gap:10px">${emo(g.emoji, { cls: 'lg' })}<div class="grow"><h2>${esc(g.name)}</h2>
      <div class="small muted" style="white-space:pre-line">${sched ? `<span data-noi18n>${esc(sched)}</span>` : 'Время уроков не задано'}</div></div>
      <button class="btn ghost sm" data-time>${ic('clock-circle', 'sm')}Время</button></div>
      <div class="jr-sum"><span>${plural(g.lessons, 'урок', 'урока', 'уроков')}</span><span>${plural(g.students.length, 'ученик', 'ученика', 'учеников')}</span></div></div>
    <div class="card" style="margin-top:12px;padding:4px 10px"><div class="jr-legend"><span class="plus">＋ был</span><span class="minus">− не был</span><span>⭐ оценки</span></div>${roster || '<p class="muted center small" style="padding:12px">В группе пока нет учеников</p>'}</div>
    <div class="row" style="gap:8px;margin-top:12px"><button class="btn grow" data-grade>${ic('star')}Поставить оценку</button><button class="btn ghost grow" data-startnow>${ic('add-circle')}Отметить урок</button></div>
    <div class="card" style="margin-top:12px">${calNav(JR.y, JR.m)}${cal}
      <div class="cal-legend"><span><i class="good"></i>все были</span><span><i class="bad"></i>есть пропуски</span><span><i class="mark"></i>ждёт отметки</span></div></div>
    <div class="section-title"><h2>${emo('📅')} <span data-noi18n>${dmy(JR.day)}</span></h2></div>
    ${day.s.map(sessionCard).join('') || `<p class="muted small center" style="margin:6px 0 10px">${JR.day === j.today ? 'Сегодня уроков по расписанию нет — или ещё не начались.' : 'В этот день уроков не было.'}</p>`}
    ${day.g.length ? `<div class="card grades-list" style="margin-top:10px">${day.g.map((x) => `<div class="grow-row">${gradeChip(x.value)}<div class="grow"><b>${esc(x.name)}</b><div class="small muted">${x.lesson ? `${emo(x.lesson.emoji)} ${esc(x.lesson.title)} · ` : ''}+${x.xp} XP${x.comment ? ' · ' + esc(x.comment) : ''}</div></div><button class="iconbtn" data-delgrade="${x.id}" aria-label="Удалить">${ic('trash-bin-trash', 'sm')}</button></div>`).join('')}</div>` : ''}
    ${g.schedule.length || g.personal?.length ? '' : `<div class="card hint-card" style="margin-top:12px">${me('think', 70, 'still')}<div class="grow small">Нажми <b>«Время»</b> и задай дни и часы уроков — и в начале каждого урока бот спросит тебя, кого нет.</div></div>`}`;
  bindAdminTop();
  $$('[data-jg]').forEach((b) => (b.onclick = () => { JR.group = b.dataset.jg; haptic('light'); tabJournal().catch(fail); }));
  $('[data-time]').onclick = () => scheduleSheet(g.id, () => tabJournal());
  $$('[data-st]').forEach((r) => (r.onclick = (e) => { if (e.target.closest('[data-gr]')) return; openStudent(r.dataset.st); }));
  $$('[data-gr]').forEach((b) => (b.onclick = () => gradeSheet({ userId: b.dataset.gr, date: JR.day })));
  $$('[data-cm]').forEach((b) => (b.onclick = () => { JR.m += Number(b.dataset.cm); if (JR.m < 0) { JR.m = 11; JR.y--; } if (JR.m > 11) { JR.m = 0; JR.y++; } tabJournal().catch(fail); }));
  $$('[data-day]').forEach((b) => (b.onclick = () => { JR.day = b.dataset.day; haptic('light'); tabJournal().catch(fail); }));
  $('[data-grade]').onclick = () => gradeSheet({ date: JR.day, only: g.students.map((u) => u.id) });
  $('[data-startnow]').onclick = () => markGroupLesson(g);
  $$('[data-att]').forEach((b) => (b.onclick = () => toggleAttendance(b.dataset.att, b.dataset.u)));
  $$('[data-delsess]').forEach((b) => (b.onclick = async () => { if (!(await confirmSheet('Удалить урок из журнала?', '', 'Удалить', true))) return; try { await del('/admin/sessions/' + b.dataset.delsess); tabJournal().catch(fail); } catch (e) { fail(e); } }));
  $$('[data-delgrade]').forEach((b) => (b.onclick = async () => { if (!(await confirmSheet('Удалить оценку?', 'XP за неё тоже снимутся.', 'Удалить', true))) return; try { await del('/admin/grades/' + b.dataset.delgrade); tabJournal().catch(fail); } catch (e) { fail(e); } }));
}
function openStudent(uid) { openView({ type: 'student', id: uid, parent: S.view }); }
// Урок группы на выбранный день (время берём из расписания, если есть)
async function markGroupLesson(g) {
  const dow = ((new Date(JR.day + 'T12:00:00Z').getUTCDay() + 6) % 7) + 1;
  const slot = g.schedule.find((s) => s.dow === dow);
  try { await api(`/admin/groups/${g.id}/sessions`, { date: JR.day, start: slot?.start, end: slot?.end }); haptic('success'); tabJournal().catch(fail); } catch (e) { fail(e); }
}
function sessionCard(s) {
  const abs = s.members.filter((m) => m.absent);
  return `<div class="card sess ${s.status === 'done' ? (abs.length ? 'bad' : 'good') : 'mark'}">
    <div class="row" style="gap:10px">${emo(s.group?.emoji || '📚')}<div class="grow"><b>${s.personal ? '👤 ' + esc(s.personal) + ' · ' : ''}${esc(s.group?.name || '')}</b><div class="small muted"><span data-noi18n>${s.start}${s.end && s.end !== s.start ? '–' + s.end : ''}</span> · <span>${s.status === 'done' ? (abs.length ? `не было: ${abs.length} из ${s.members.length}` : 'все на месте') : 'ждёт отметки'}</span></div></div>
      <button class="iconbtn" data-delsess="${s.id}" aria-label="Удалить">${ic('trash-bin-trash', 'sm')}</button></div>
    <div class="att-chips">${s.members.map((m) => `<button class="achip ${s.status !== 'done' ? '' : m.absent ? 'bad' : 'good'}" data-att="${s.id}" data-u="${esc(m.id)}">${m.absent ? '❌' : s.status === 'done' ? '✅' : '•'} ${esc(m.name)}</button>`).join('')}</div>
    ${abs.filter((m) => m.reason).map((m) => `<p class="small reason">💬 <b>${esc(m.name)}:</b> ${esc(m.reason)}</p>`).join('')}
    ${s.status !== 'done' ? `<p class="small muted" style="margin-top:6px">Нажми на тех, кого нет, или сразу «Сохранить», если все пришли.</p><button class="btn sm block" data-att="${s.id}" data-u="">${ic('check-circle', 'sm')}Сохранить</button>` : ''}</div>`;
}
// Нажатие на ученика: переключить «был / не был». Для неотмеченного урока сначала копим, «Сохранить» отправляет
const ATT_DRAFT = {};
async function toggleAttendance(sid, uid) {
  const s = S.journal.sessions.find((x) => x.id === sid);
  if (!s) return;
  haptic('light');
  if (s.status !== 'done' && uid) {
    const d = (ATT_DRAFT[sid] ||= new Set());
    d.has(uid) ? d.delete(uid) : d.add(uid);
    const b = $(`[data-att="${sid}"][data-u="${CSS.escape(uid)}"]`);
    if (b) { b.classList.toggle('bad', d.has(uid)); b.firstChild.textContent = d.has(uid) ? '❌ ' : '• '; }
    return;
  }
  let absent = s.members.filter((m) => m.absent).map((m) => m.id);
  if (s.status !== 'done') absent = [...(ATT_DRAFT[sid] || [])];
  else absent = absent.includes(uid) ? absent.filter((x) => x !== uid) : [...absent, uid];
  try { await api('/admin/sessions/' + sid, { absent }); delete ATT_DRAFT[sid]; haptic('success'); tabJournal().catch(fail); } catch (e) { fail(e); }
}
// Оценка: ученик → балл 1–10 (XP = балл × 20) → тема (необязательно) → комментарий
async function gradeSheet({ userId = null, date = null, after = null, only = null } = {}) {
  const o0 = S.overview || (await loadOverview());
  const o = only ? { ...o0, students: o0.students.filter((u) => only.includes(u.id)) } : o0;
  let picked = userId;
  let value = null;
  const per = S.journal?.xpPerPoint || 20;
  const lessons = o.lessons.filter((l) => !l.exam).sort((a, b) => (a.order ?? 999) - (b.order ?? 999));
  const list = (q) => o.students.filter((u) => !q || u.name.toLowerCase().includes(q)).map((u) => `<button class="list-check ${picked === u.id ? 'on' : ''}" data-u="${esc(u.id)}">${avatar(u)}<div class="grow"><b>${esc(u.name)}</b></div></button>`).join('') || `<p class="muted center small">${esc(tr('Никого не нашли'))}</p>`;
  openSheet(`<div class="stack" data-noi18n><h2>${emo('⭐')} ${esc(tr('Поставить оценку'))}</h2>
    ${userId ? `<p class="muted">${esc(o0.students.find((u) => u.id === userId)?.name || '')}</p>` : `${o.students.length > 6 ? `<input class="input" data-q placeholder="${esc(tr('Поиск по имени'))}">` : ''}<div data-list style="max-height:30vh;overflow:auto">${list('')}</div>`}
    <div class="grade-pick">${Array.from({ length: 10 }, (_, i) => i + 1).map((v) => `<button data-v="${v}" style="--gc:${gradeColor(v)}">${v}</button>`).join('')}</div>
    <p class="center small muted" data-xpprev>${esc(tr('Выбери балл: 10 = 200 XP'))}</p>
    <select class="input" data-lesson><option value="">${esc(tr('Тема (необязательно)'))}</option>${lessons.map((l) => `<option value="${esc(l.id)}">${esc(l.title)}</option>`).join('')}</select>
    <input class="input" data-comment maxlength="300" placeholder="${esc(tr('Комментарий (необязательно)'))}">
    <button class="btn block" data-ok disabled>${ic('star')}<span>${esc(tr('Поставить'))}</span></button></div>`, (el, close) => {
    const ready = () => { $('[data-ok]', el).disabled = !(picked && value); };
    const bind = () => $$('[data-u]', el).forEach((b) => (b.onclick = () => { picked = b.dataset.u; $$('[data-u]', el).forEach((x) => x.classList.toggle('on', x === b)); haptic('light'); ready(); }));
    bind();
    const q = $('[data-q]', el);
    if (q) q.oninput = () => { $('[data-list]', el).innerHTML = list(q.value.trim().toLowerCase()); bind(); };
    $$('[data-v]', el).forEach((b) => (b.onclick = () => {
      value = Number(b.dataset.v);
      $$('[data-v]', el).forEach((x) => x.classList.toggle('on', x === b));
      $('[data-xpprev]', el).innerHTML = `${gradeChip(value)} → <b>+${value * per} XP</b>`;
      haptic(value >= 9 ? 'success' : 'light');
      ready();
    }));
    $('[data-ok]', el).onclick = async () => {
      $('[data-ok]', el).disabled = true;
      try {
        await api('/admin/grades', { userId: picked, value, lessonId: $('[data-lesson]', el).value || null, comment: $('[data-comment]', el).value, date });
        haptic('success');
        if (value >= 9) sfx.win();
        toast(`${tr('Оценка поставлена')}: ${value} (+${value * per} XP)`);
        close();
        (after || (() => tabJournal()))().catch?.(fail);
      } catch (e) { ready(); fail(e); }
    };
  });
}
// «Время для журнала»: дни недели и часы уроков одной группы
async function scheduleSheet(gid, after) {
  const j = S.journal?.groups?.some((g) => g.id === gid) ? S.journal : (S.journal = await api('/admin/journal'));
  const g = j.groups.find((x) => x.id === gid);
  if (!g) return;
  const L = curLang();
  openSheet(`<div class="stack"><h2>${ic('clock-circle')} Время для журнала</h2><p class="muted small">${emo(g.emoji)} ${esc(g.name)} · через 10 минут после начала урока бот спросит тебя, кого нет. Время — Ташкент.</p>
    <div class="slots">${g.schedule.map((s) => slotRow(s, L)).join('')}</div>
    <button class="btn ghost block" data-addslot>${ic('add-circle')}Добавить день</button>
    <button class="btn block" data-savesched>${ic('check-circle')}Сохранить</button></div>`, (el, close) => {
    const bindRm = () => $$('[data-rmslot]', el).forEach((b) => (b.onclick = () => b.closest('.slot').remove()));
    bindRm();
    $('[data-addslot]', el).onclick = () => {
      const last = $$('.slot', el).pop();
      const st = last ? $('[data-start]', last).value : '14:00';
      const en = last ? $('[data-end]', last).value : '15:30';
      $('.slots', el).insertAdjacentHTML('beforeend', slotRow({ dow: last ? Math.min(7, Number($('[data-dow]', last).value) + 2) : 1, start: st, end: en }, L));
      bindRm();
    };
    $('[data-savesched]', el).onclick = async () => {
      const slots = $$('.slot', el).map((r) => ({ dow: Number($('[data-dow]', r).value), start: $('[data-start]', r).value, end: $('[data-end]', r).value }));
      try { await api(`/admin/groups/${gid}/schedule`, { slots }); haptic('success'); toast(tr('Расписание сохранено')); close(); S.journal = null; after?.()?.catch?.(fail); } catch (e) { fail(e); }
    };
  });
}
const slotRow = (s, L) => `<div class="slot" data-noi18n><select class="input" data-dow>${DOW_FULL[L].map((d, i) => `<option value="${i + 1}" ${s.dow === i + 1 ? 'selected' : ''}>${d}</option>`).join('')}</select>
  <input class="input" type="time" data-start value="${s.start}"><span>–</span><input class="input" type="time" data-end value="${s.end}"><button class="iconbtn" data-rmslot aria-label="Удалить">${ic('trash-bin-trash', 'sm')}</button></div>`;

// ═══════════════ МАГАЗИН (за XP) ═══════════════
// Состояние маскота ученика (голодный / толстенький / силач) — рисуется везде, где появляется его напарник
let PET_COND = null;
function syncShop(m) {
  const sh = m?.shop;
  if (!sh) { PET_COND = null; return; }
  PET_COND = sh.pet && sh.pet.state !== 'normal' ? sh.pet.state : null;
  if (sh.pet?.mascot && sh.pet.mascot !== LOOK.mascot) applyLook({ mascot: sh.pet.mascot });
}
const PET_SAY = {
  hungry: 'Я голодный… 😢 Реши тест или покорми меня — еда ниже.',
  fat: 'Ох, я объелся… 🍔 Давай лучше порешаем тесты!',
  strong: 'Смотри, какие мышцы! 💪 Это всё твои тесты.',
  normal: 'Здесь всё покупается за XP. Решай тесты — и XP будет больше!',
};
const PET_LABEL = { hungry: '😢 голодный', fat: '🍔 толстенький', strong: '💪 силач', normal: '🙂 в форме' };

async function tabShop() {
  const c = await api('/shop');
  const L = curLang();
  const mine = c.pet.mascot;
  const myFood = c.foods.find((f) => f.mascot === mine);
  const otherFoods = c.foods.filter((f) => f.mascot !== mine);
  const name = (id) => tr(MASCOTS[id]?.name || id);
  app.innerHTML = topbar() + `
    <div class="hero shop-hero">${me('talk', 108, 'quiet')}<div class="grow"><h1>${ic('shop')} Магазин</h1><div class="say" data-say>${esc(PET_SAY[c.pet.state])}</div></div></div>
    <div class="card wallet"><div class="row" style="gap:12px">${emo(E.bolt, { cls: 'lg', anim: true })}<div class="grow"><small>Можно потратить</small><b data-noi18n>${c.balance} XP</b></div>
      <span class="pill">${PET_LABEL[c.pet.state]}</span></div>
      <p class="small muted" style="margin-top:8px">Лига считает весь заработанный XP — покупки её не уменьшают.</p></div>

    ${sectionTitle('🍽️', `Еда для ${name(mine)}`)}
    ${myFood ? `<button class="card shop-food mine" data-food="${myFood.id}">${emo(myFood.emoji, { cls: 'lg' })}<div class="grow"><b data-noi18n>${esc(myFood.name)}</b><span>Любимая еда твоего напарника. Покормишь — он скажет спасибо и не будет голодным.</span></div><span class="price">${myFood.price} XP</span></button>` : ''}
    <details class="other-food"><summary>Еда других маскотов</summary><div class="food-grid">${otherFoods.map((f) => `<button class="food-tile" data-food="${f.id}">${emo(f.emoji)}<b data-noi18n>${esc(f.name)}</b><small>${esc(name(f.mascot))} · ${f.price} XP</small></button>`).join('')}</div></details>

    ${sectionTitle('🧪', 'Помощь в тестах')}
    <div class="card shop-row">${ic('flask', 'lg')}<div class="grow"><b>Зелье подсказки</b><span>Выпей в тесте — маскот даст маленькую подсказку к вопросу. Одно зелье за тест.</span><small>У тебя: <b data-pot>${c.potion.have}</b></small></div><button class="btn sm" data-potion>${c.potion.price} XP</button></div>
    <div class="card shop-row">${ic('magnifer', 'lg')}<div class="grow"><b>Лупа</b><span>Не понял вопрос? Нажми лупу в тесте — маскот на ${c.magnifier.seconds} секунд покажет нужный кусочек обучалки. Один раз за тест.</span></div><span class="price">${c.magnifier.price} XP</span></div>

    ${sectionTitle('🐾', 'Маскоты')}
    <div class="shop-mascots">${c.mascots.map((x) => `<button class="mcard ${x.owned ? 'owned' : 'locked'} ${x.id === mine ? 'on' : ''}" data-m="${x.id}" style="--c:${MASCOTS[x.id]?.color || '#ccc'}">
      <div class="mart">${mascot(x.id, 'happy', 96, 'still')}${x.owned ? '' : `<span class="mlock">${ic('lock-keyhole')}</span>`}</div>
      <b>${esc(name(x.id))}</b><small>${x.id === mine ? '✓ твой' : x.owned ? 'выбрать' : x.free ? 'бесплатно' : `<span data-noi18n>${x.price} XP</span>`}</small></button>`).join('')}</div>`;
  speak($('[data-say]'), PET_SAY[c.pet.state], $('.hero .mascot'));
  $$('[data-food]').forEach((b) => (b.onclick = () => buyFood(b.dataset.food, c)));
  $('[data-potion]').onclick = () => buyItem('potion', `${tr('Купить зелье')} — ${c.potion.price} XP?`);
  $$('[data-m]').forEach((b) => (b.onclick = () => {
    const x = c.mascots.find((m) => m.id === b.dataset.m);
    if (x.owned) { if (x.id !== mine) { haptic('light'); savePrefs({ mascot: x.id }); setTimeout(() => refreshMe().then(syncShop).then(() => tabShop()).catch(fail), 500); } return; }
    mascotBuySheet(x, c.balance);
  }));
}
function mascotBuySheet(x, balance) {
  const nm = tr(MASCOTS[x.id].name);
  openSheet(`<div class="stack center">${mascot(x.id, 'cheer', 150)}<h2>${esc(nm)}</h2><p class="muted">${esc(tr(MASCOTS[x.id].about))}</p>
    <div class="price big" data-noi18n>${x.price} XP</div>
    <button class="btn block" data-buy ${balance < x.price ? 'disabled' : ''}>${ic('shop')}${balance < x.price ? `Не хватает ${x.price - balance} XP` : 'Купить и выбрать'}</button>
    <p class="small muted">У тебя: <span data-noi18n>${balance} XP</span></p></div>`, (el, close) => {
    $('[data-buy]', el).onclick = async () => {
      try {
        const r = await api('/shop/buy', { item: 'mascot:' + x.id });
        haptic('success'); sfx.win(); confetti();
        applyLook({ mascot: x.id });
        close();
        toast(`${nm} — ${tr('теперь твой напарник!')}`);
        await refreshMe().then(syncShop);
        tabShop().catch(fail);
        return r;
      } catch (e) { fail(e); }
    };
  });
}
async function buyItem(item, question) {
  if (!(await confirmSheet(question, '', tr('Купить')))) return null;
  try {
    const r = await api('/shop/buy', { item });
    haptic('success'); sfx.ok();
    toast(item === 'potion' ? `🧪 ${tr('Зелий')}: ${r.potions}` : tr('Куплено!'));
    if (S.tab === 'shop') tabShop().catch(fail);
    return r;
  } catch (e) { fail(e); return null; }
}
async function buyFood(id, c) {
  const f = c.foods.find((x) => x.id === id);
  try {
    await api('/shop/buy', { item: 'food:' + id });
    haptic('success'); sfx.win();
    openSheet(`<div class="stack center"><div class="eat">${me('love', 150)}<span class="bite">${emo(f.emoji, { cls: 'lg' })}</span></div><h2>Ням-ням! 😋</h2><div class="say-box" data-say></div><button class="btn block" data-ok>Пожалуйста!</button></div>`, (el, close) => {
      speak($('[data-say]', el), 'Спасибо! Я сытый и довольный. А теперь давай решим тест — так я стану сильнее 💪', $('.eat .mascot', el));
      $('[data-ok]', el).onclick = close;
    });
    await refreshMe().then(syncShop);
    tabShop().catch(fail);
  } catch (e) {
    if (e.code !== 'wrong-food') return fail(e);
    haptic('error');
    const right = e.data?.food;
    openSheet(`<div class="stack center">${me('oops', 140)}<div class="say-box" data-say></div>${right ? `<p class="muted small">Я ем только: ${emo(right.emoji)} <b data-noi18n>${esc(right.name)}</b></p>` : ''}<button class="btn block" data-ok>${ic('play')}Решать тест</button></div>`, (el, close) => {
      speak($('[data-say]', el), 'Ты что? Лучше реши тест, а? Дурачок 😜', $('.mascot', el));
      $('[data-ok]', el).onclick = () => { close(); go('home'); };
    });
  }
}

// ───────── в тесте: лупа и зелье ─────────
function testTools(data, P) {
  return {
    html: () => `<button class="tool" data-mag ${P.magUsed ? 'disabled' : ''} aria-label="Лупа">${ic('magnifer')}</button>
      <button class="tool" data-pot ${P.potUsed ? 'disabled' : ''} aria-label="Зелье">${ic('flask')}<em data-noi18n>${S.me?.shop?.potions ?? 0}</em></button>`,
    bind(el, q, qi) {
      const mag = $('[data-mag]', el);
      if (mag) mag.onclick = () => magnifierSheet(el, data, P, q, qi);
      const pot = $('[data-pot]', el);
      if (pot) pot.onclick = () => potionSheet(el, data, P, q, qi);
    },
  };
}
function magnifierSheet(el, data, P, q, qi) {
  if (P.magUsed) return toast(tr('Лупа уже использована в этом тесте'));
  const bal = S.me?.shop?.balance ?? 0;
  openSheet(`<div class="stack center">${ic('magnifer', 'xl')}<h2>Лупа</h2>
    <p class="muted">Не понял вопрос? Маскот на 30 секунд покажет кусочек обучалки, который поможет его решить.</p>
    <div class="tags" style="justify-content:center"><span class="pill gold" data-noi18n>−100 XP</span><span class="pill">один раз за тест</span></div>
    <button class="btn block" data-use ${!data.preview && bal < 100 ? 'disabled' : ''}>${ic('magnifer')}${!data.preview && bal < 100 ? 'Не хватает XP' : 'Использовать'}</button>
    <p class="small muted">У тебя: <span data-noi18n>${bal} XP</span></p></div>`, (sh, close) => {
    $('[data-use]', sh).onclick = async () => {
      try {
        const r = await api(`/attempts/${data.attemptId}/magnifier`, { index: qi });
        close();
        P.magUsed = true;
        if (S.me?.shop) S.me.shop.balance = r.balance;
        $('[data-mag]', el)?.setAttribute('disabled', '');
        showMagnifier(el, r);
      } catch (e) { if (e.code === 'used') { P.magUsed = true; $('[data-mag]', el)?.setAttribute('disabled', ''); } fail(e); }
    };
  });
}
function showMagnifier(el, r) {
  haptic('medium');
  const box = document.createElement('div');
  box.className = 'mag-pop';
  box.dataset.noi18n = '1';
  box.innerHTML = `<div class="mag-card"><div class="row" style="gap:10px;align-items:flex-start">${me('teach', 74)}<div class="grow"><small>${ic('magnifer', 'sm')} ${esc(r.help.title)}</small>
    ${r.help.slides.map((s) => `<div class="mag-slide ${s.quote ? 'quote' : ''}">${s.emoji ? emo(s.emoji) : ''}${s.quote ? `<b>${esc(tr('Учитель говорил:'))}</b> ` : ''}${rich(s.text)}${s.code ? `<pre class="code">${highlight(s.code)}</pre>` : ''}</div>`).join('')}</div></div>
    <div class="mag-timer"><i style="animation-duration:${r.seconds}s"></i></div><button class="link small" data-x>Закрыть</button></div>`;
  el.appendChild(box);
  const done = () => { box.classList.add('out'); setTimeout(() => box.remove(), 250); };
  const t = setTimeout(done, r.seconds * 1000);
  $('[data-x]', box).onclick = () => { clearTimeout(t); done(); };
}
function potionSheet(el, data, P, q, qi) {
  if (P.potUsed) return toast(tr('Зелье уже выпито в этом тесте'));
  const have = S.me?.shop?.potions ?? 0;
  const use = async (close) => {
    try {
      const r = await api(`/attempts/${data.attemptId}/potion`, { index: qi, options: q.options || null });
      close?.();
      P.potUsed = true;
      if (S.me?.shop) S.me.shop.potions = r.potions;
      const b = $('[data-pot]', el);
      if (b) { b.setAttribute('disabled', ''); $('em', b).textContent = r.potions; }
      haptic('success');
      const area = $('[data-area]', el);
      if (r.remove != null) { const o = $(`.opt[data-i="${r.remove}"]`, area); if (o) { o.classList.add('gone'); o.disabled = true; } }
      area.insertAdjacentHTML('beforebegin', `<div class="potion-hint" data-noi18n>${me('wow', 56, 'still')}<div class="grow"><small>🧪 ${esc(tr('Подсказка'))}</small><p>${rich(r.hint || tr('Подумай ещё раз — ответ ближе, чем кажется!'))}${r.remove != null ? `<br><span class="small muted">${esc(tr('Один неверный вариант я убрал.'))}</span>` : ''}</p></div></div>`);
    } catch (e) { fail(e); }
  };
  if (data.preview) return use();
  if (have > 0) {
    openSheet(`<div class="stack center">${ic('flask', 'xl')}<h2>Зелье подсказки</h2><p class="muted">Маскот даст маленькую подсказку к этому вопросу. Одно зелье за тест.</p>
      <p class="small muted">Осталось зелий: <b data-noi18n>${have}</b></p><button class="btn block" data-use>${ic('flask')}Выпить</button></div>`, (sh, close) => { $('[data-use]', sh).onclick = () => use(close); });
  } else {
    const bal = S.me?.shop?.balance ?? 0;
    openSheet(`<div class="stack center">${ic('flask', 'xl')}<h2>Зелий нет</h2><p class="muted">Купи зелье за 150 XP — и сразу выпей. Маскот подскажет к этому вопросу.</p>
      <button class="btn block" data-buyuse ${bal < 150 ? 'disabled' : ''}>${ic('shop')}${bal < 150 ? 'Не хватает XP' : 'Купить и выпить'}</button><p class="small muted">У тебя: <span data-noi18n>${bal} XP</span></p></div>`, (sh, close) => {
      $('[data-buyuse]', sh).onclick = async () => {
        try { const r = await api('/shop/buy', { item: 'potion' }); if (S.me?.shop) { S.me.shop.potions = r.potions; S.me.shop.balance = r.balance; } await use(close); } catch (e) { fail(e); }
      };
    });
  }
}

const TYPE_LABEL = { choice: 'выбор', truefalse: 'верно/неверно', input: 'ввод', order: 'порядок', match: 'пары', fill: 'пропуски' };

async function tabTests() {
  const o = await loadOverview();
  app.innerHTML = adminTop('Тесты') + `
    <div class="hero" style="margin-top:8px">${me('wow', 96)}<div class="grow"><div class="say"><b>Как появляются тесты:</b> пришли конспект урока Claude — он сделает тест в стиле Duolingo. Тест появится здесь черновиком. Ученики его не видят, пока ты не нажмёшь «Отправить».</div></div></div>
    <button class="btn block" data-grantmany style="margin-top:14px">${ic('users-group-rounded')}Выдать доступ ученикам</button>
    <div class="stack" style="margin-top:16px">${o.lessons.filter((l) => !l.course).map(lessonCardHtml).join('') || emptyState('sleepy', 'Тестов пока нет', 'Жду конспект — пришли его Claude.')}</div>
    ${o.hiddenLessons?.length ? `<button class="link small" data-hidden style="display:block;margin:18px auto 0">${ic('eye', 'sm')}Скрытые тесты (${o.hiddenLessons.length})</button>` : ''}`;
  bindAdminTop();
  $$('[data-preview]').forEach((b) => (b.onclick = () => startLesson({ lessonId: b.dataset.preview })));
  $$('[data-learnprev]').forEach((b) => (b.onclick = () => startLearn({ lessonId: b.dataset.learnprev })));
  $$('[data-send]').forEach((b) => (b.onclick = () => sendSheet(o.lessons.find((l) => l.id === b.dataset.send))));
  $$('[data-sendone]').forEach((b) => (b.onclick = () => sendOneSheet(o.lessons.find((l) => l.id === b.dataset.sendone))));
  $$('[data-access]').forEach((b) => (b.onclick = () => accessSheet(o.lessons.find((l) => l.id === b.dataset.access))));
  const hid = $('[data-hidden]');
  if (hid) hid.onclick = () => hiddenSheet(o.hiddenLessons);
  $('[data-grantmany]').onclick = () => grantStudentsSheet();
  $$('[data-pubinfo]').forEach((b) => (b.onclick = () => pubSheet(b.dataset.pubinfo)));
  $$('[data-dell]').forEach((b) => (b.onclick = async () => {
    if (!(await confirmSheet('Удалить черновик?', '', 'Удалить', true))) return;
    try { await del('/admin/lessons/' + b.dataset.dell); tabTests().catch(fail); } catch (e) { fail(e); }
  }));
}

function lessonCardHtml(l) {
  return `<div class="card">
    <div class="row" style="align-items:flex-start;gap:12px"><div style="font-size:40px;line-height:1">${emo(l.emoji, { cls: 'lg' })}</div><div class="grow"><h3>${esc(l.title)}</h3>
      ${l.description ? `<p class="small muted" style="margin-top:2px">${esc(l.description)}</p>` : ''}
      <div class="tags" style="margin-top:8px">${l.exam ? `<span class="pill gold">${emo('📝')}тест без обучалки</span>` : ''}${l.hasLearn ? `<span class="pill accent">${emo('📖')}обучалка · ${l.learnSections}</span>` : ''}<span class="pill accent">${emo(E.puzzle)}${l.questions}</span>${l.types.map((t) => `<span class="pill">${TYPE_LABEL[t] || t}</span>`).join('')}</div></div>
      ${l.sentTo.length || l.personalFor.length ? '' : '<span class="pill gold">черновик</span>'}</div>
    ${l.topics.length ? `<p class="small muted" style="margin-top:10px">Темы: ${l.topics.map(esc).join(' · ')}</p>` : ''}
    ${l.sentTo.length ? `<div style="margin-top:12px">${l.sentTo.map((s) => `<button class="list-check" data-pubinfo="${s.pubId}">${ic('plain-2', 'sm')}<div class="grow"><b>${esc(s.groupName)}</b><div class="small muted">${s.learned != null ? `обучалку ${s.learned}/${s.size} · ` : ''}тест ${s.done}/${s.size} · ${ago(s.publishedAt)}</div></div>${pctPill(s.avg)}</button>`).join('')}</div>` : ''}
    ${l.personalFor.length ? `<button class="list-check" data-access="${l.id}" style="margin-top:12px">${emo('🎯')}<div class="grow"><b>Доступ: ${l.personalFor.length}</b><div class="small muted">сдали ${l.personalFor.filter((x) => x.best != null).length}/${l.personalFor.length}</div></div>${pctPill(Math.round(l.personalFor.filter((x) => x.best != null).reduce((a, x) => a + x.best, 0) / Math.max(1, l.personalFor.filter((x) => x.best != null).length)) || null)}</button>` : ''}
    <div class="row" style="margin-top:14px">${l.hasLearn ? `<button class="btn ghost sm" data-learnprev="${l.id}">${emo('📖')}Обучалка</button>` : ''}<button class="btn ghost sm" data-preview="${l.id}">${ic('eye', 'sm')}Превью</button></div>
    <div class="row" style="margin-top:8px"><button class="btn ghost sm grow" data-sendone="${l.id}">${ic('users-group-rounded', 'sm')}Ученики</button><button class="btn sm grow" data-send="${l.id}">${ic('plain-2', 'sm')}Отправить</button>${l.sentTo.length ? '' : `<button class="iconbtn" data-dell="${l.id}" aria-label="Удалить">${ic('trash-bin-trash', 'sm')}</button>`}</div>
  </div>`;
}

function sendSheet(l) {
  const o = S.overview;
  if (!o.groups.length) {
    openSheet(`<div class="stack center">${me('think', 110)}<h2>Сначала создай группу</h2><p class="muted">Тест отправляется группе. Групп пока нет.</p><button class="btn block" data-new>${ic('add-circle')}Создать группу</button></div>`,
      (el, close) => { $('[data-new]', el).onclick = () => { close(); groupForm(() => sendSheet(l)); }; });
    return;
  }
  const sent = new Set(l.sentTo.map((s) => s.groupId));
  let gid = o.groups.find((g) => !sent.has(g.id))?.id || null;
  let interval = 0;
  openSheet(
    `<div class="stack"><h2>Отправить тест</h2><p class="muted">${emo(l.emoji)} ${esc(l.title)}</p>
      <p class="small muted">Какой группе?</p>
      <div>${o.groups.map((g) => `<button class="list-check ${g.id === gid ? 'on' : ''}" data-g="${g.id}" ${sent.has(g.id) ? 'disabled' : ''}>${emo(g.emoji)}<div class="grow"><b>${esc(g.name)}</b><div class="small muted">${sent.has(g.id) ? 'уже отправлен' : plural(g.members.length, 'ученик', 'ученика', 'учеников') + (g.linked ? ' · в чат группы' : ' · в личку')}</div></div></button>`).join('')}</div>
      <button class="link small" data-new>${ic('add-circle', 'sm')}Новая группа</button>
      <div class="field"><span>${emo(E.bell)} Напоминать, пока все не сдадут</span><div class="choices">${[[0, 'Нет'], [30, '30 мин'], [60, '1 ч'], [180, '3 ч'], [1440, '1 день']].map(([v, t]) => `<button class="choice ${v === interval ? 'on' : ''}" data-int="${v}">${t}</button>`).join('')}</div></div>
      <label class="field" data-remtext hidden><span>Текст напоминания</span><input class="input" maxlength="300" value="Не забудьте решить тест «${esc(l.title)}»! 💪"></label>
      <button class="btn block" data-go ${gid ? '' : 'disabled'}>${ic('plain-2')}Отправить</button></div>`,
    (el, close) => {
      $$('[data-g]', el).forEach((b) => (b.onclick = () => { if (b.disabled) return; gid = b.dataset.g; $$('[data-g]', el).forEach((x) => x.classList.toggle('on', x === b)); $('[data-go]', el).disabled = false; }));
      $$('[data-int]', el).forEach((b) => (b.onclick = () => { interval = Number(b.dataset.int); $$('[data-int]', el).forEach((x) => x.classList.toggle('on', x === b)); $('[data-remtext]', el).hidden = !interval; }));
      $('[data-new]', el).onclick = () => { close(); groupForm(() => sendSheet(S.overview.lessons.find((x) => x.id === l.id))); };
      $('[data-go]', el).onclick = async () => {
        $('[data-go]', el).disabled = true;
        try {
          await api('/admin/publish', { lessonId: l.id, groupId: gid, reminder: interval ? { intervalMin: interval, text: $('[data-remtext] input', el).value } : null });
          haptic('success');
          sfx.win();
          toast('Тест отправлен');
          close();
          tabTests().catch(fail);
        } catch (e) { $('[data-go]', el).disabled = false; fail(e); }
      };
    },
  );
}

// Дать доступ к тесту выбранным ученикам: один, несколько или все
function sendOneSheet(l) {
  const o = S.overview;
  const has = new Set(l.personalFor.map((s) => s.userId));
  const gname = (u) => u.groups.map((gid) => o.groups.find((g) => g.id === gid)?.name).filter(Boolean).join(', ') || tr('без группы');
  const picked = new Set();
  let noLearn = false; // по умолчанию с обучалкой
  const free = o.students.filter((u) => !has.has(u.id));
  const list = (q) => o.students.filter((u) => !q || u.name.toLowerCase().includes(q) || (u.username || '').toLowerCase().includes(q))
    .map((u) => `<button class="list-check ${picked.has(u.id) ? 'on' : ''}" data-u="${esc(u.id)}" ${has.has(u.id) ? 'disabled' : ''}>${avatar(u)}<div class="grow"><b>${esc(u.name)}</b><div class="small muted">${has.has(u.id) ? esc(tr('доступ уже есть')) : esc(gname(u))}</div></div></button>`).join('') || `<p class="muted center small">${esc(tr('Никого не нашли'))}</p>`;
  openSheet(
    `<div class="stack" data-noi18n><h2>${esc(tr('Дать доступ к тесту'))}</h2><p class="muted">${emo(l.emoji)} ${esc(l.title)}</p>
      ${o.groups.length ? `<div class="chips" data-chips>${o.groups.map((g) => `<button class="choice" data-grp="${g.id}">${emo(g.emoji)} ${esc(g.name)}</button>`).join('')}</div>` : ''}
      <div class="row" style="gap:8px">${o.students.length > 6 ? `<input class="input grow" data-q placeholder="${esc(tr('Поиск по имени'))}">` : '<div class="grow"></div>'}<button class="link small" data-all>${esc(tr('Выбрать всех'))}</button></div>
      <div data-list style="max-height:42vh;overflow:auto">${list('')}</div>
      ${l.hasLearn ? `<div class="field"><span>${emo('📖')} ${esc(tr('Обучалка'))}</span><div class="choices"><button class="choice ${noLearn ? 'on' : ''}" data-nl="1">${esc(tr('Сразу тест'))}</button><button class="choice ${noLearn ? '' : 'on'}" data-nl="0">${esc(tr('С обучалкой'))}</button></div></div>` : ''}
      <button class="btn block" data-go disabled>${ic('plain-2')}<span></span></button></div>`,
    (el, close) => {
      const label = () => { const n = picked.size; const b = $('[data-go]', el); b.disabled = !n; $('span', b).textContent = `${tr('Дать доступ')}${n ? ` (${n})` : ''}`; $$('[data-grp]', el).forEach((g) => { const m = free.filter((u) => u.groups.includes(g.dataset.grp)); g.classList.toggle('on', m.length > 0 && m.every((u) => picked.has(u.id))); }); };
      const bind = () => $$('[data-u]', el).forEach((b) => (b.onclick = () => { if (b.disabled) return; haptic('light'); const id = b.dataset.u; picked.has(id) ? picked.delete(id) : picked.add(id); b.classList.toggle('on', picked.has(id)); label(); }));
      bind(); label();
      const q = $('[data-q]', el);
      const redraw = () => { $('[data-list]', el).innerHTML = list(q ? q.value.trim().toLowerCase() : ''); bind(); };
      if (q) q.oninput = redraw;
      $$('[data-grp]', el).forEach((g) => (g.onclick = () => { haptic('light'); const m = free.filter((u) => u.groups.includes(g.dataset.grp)); const all = m.every((u) => picked.has(u.id)); m.forEach((u) => (all ? picked.delete(u.id) : picked.add(u.id))); redraw(); label(); }));
      $('[data-all]', el).onclick = () => { haptic('light'); const all = free.length && free.every((u) => picked.has(u.id)); free.forEach((u) => (all ? picked.delete(u.id) : picked.add(u.id))); redraw(); label(); };
      $$('[data-nl]', el).forEach((b) => (b.onclick = () => { noLearn = b.dataset.nl === '1'; $$('[data-nl]', el).forEach((x) => x.classList.toggle('on', x === b)); }));
      $('[data-go]', el).onclick = async () => {
        $('[data-go]', el).disabled = true;
        try {
          const r = await api('/admin/grant', { lessonId: l.id, userIds: [...picked], noLearn });
          haptic('success');
          sfx.win();
          toast(`${tr('Доступ дан')}: ${r.given}`);
          close();
          tabTests().catch(fail);
        } catch (e) { label(); fail(e); }
      };
    },
  );
}

// Шаг 1: выбрать учеников (одного, нескольких, группу, всех). Шаг 2: выбрать тесты.
function grantStudentsSheet() {
  const o = S.overview;
  const picked = new Set();
  const gname = (u) => u.groups.map((gid) => o.groups.find((g) => g.id === gid)?.name).filter(Boolean).join(', ') || tr('без группы');
  const list = (q) => o.students.filter((u) => !q || u.name.toLowerCase().includes(q) || (u.username || '').toLowerCase().includes(q))
    .map((u) => `<button class="list-check ${picked.has(u.id) ? 'on' : ''}" data-u="${esc(u.id)}">${avatar(u)}<div class="grow"><b>${esc(u.name)}</b><div class="small muted">${esc(gname(u))}</div></div></button>`).join('') || `<p class="muted center small">${esc(tr('Никого не нашли'))}</p>`;
  openSheet(
    `<div class="stack" data-noi18n><h2>${esc(tr('Кому дать доступ?'))}</h2>
      ${o.groups.length ? `<div class="chips">${o.groups.map((g) => `<button class="choice" data-grp="${g.id}">${emo(g.emoji)} ${esc(g.name)}</button>`).join('')}</div>` : ''}
      <div class="row" style="gap:8px">${o.students.length > 6 ? `<input class="input grow" data-q placeholder="${esc(tr('Поиск по имени'))}">` : '<div class="grow"></div>'}<button class="link small" data-all>${esc(tr('Выбрать всех'))}</button></div>
      <div data-list style="max-height:46vh;overflow:auto">${list('')}</div>
      <button class="btn block" data-next disabled><span></span></button></div>`,
    (el, close) => {
      const all = o.students;
      const label = () => { const n = picked.size; const b = $('[data-next]', el); b.disabled = !n; $('span', b).textContent = `${tr('Дальше: выбрать тесты')}${n ? ` (${n})` : ''}`; $$('[data-grp]', el).forEach((g) => { const m = all.filter((u) => u.groups.includes(g.dataset.grp)); g.classList.toggle('on', m.length > 0 && m.every((u) => picked.has(u.id))); }); };
      const bind = () => $$('[data-u]', el).forEach((b) => (b.onclick = () => { haptic('light'); const id = b.dataset.u; picked.has(id) ? picked.delete(id) : picked.add(id); b.classList.toggle('on', picked.has(id)); label(); }));
      bind(); label();
      const q = $('[data-q]', el);
      const redraw = () => { $('[data-list]', el).innerHTML = list(q ? q.value.trim().toLowerCase() : ''); bind(); };
      if (q) q.oninput = redraw;
      $$('[data-grp]', el).forEach((g) => (g.onclick = () => { haptic('light'); const m = all.filter((u) => u.groups.includes(g.dataset.grp)); const every = m.every((u) => picked.has(u.id)); m.forEach((u) => (every ? picked.delete(u.id) : picked.add(u.id))); redraw(); label(); }));
      $('[data-all]', el).onclick = () => { haptic('light'); const every = all.length && all.every((u) => picked.has(u.id)); all.forEach((u) => (every ? picked.delete(u.id) : picked.add(u.id))); redraw(); label(); };
      $('[data-next]', el).onclick = () => { const ids = [...picked]; close(); grantTestsSheet(ids); };
    },
  );
}

function grantTestsSheet(userIds) {
  const o = S.overview;
  const users = o.students.filter((u) => userIds.includes(u.id));
  // у кого уже есть доступ к тесту (лично или через группу)
  const haveCount = (l) => users.filter((u) => l.personalFor.some((s) => s.userId === u.id) || l.sentTo.some((s) => u.groups.includes(s.groupId))).length;
  const lessons = o.lessons.filter((l) => !l.exam || true);
  const picked = new Set();
  let noLearn = false;
  const row = (l) => {
    const n = haveCount(l);
    const full = n === users.length;
    const note = full ? tr('уже открыт') : n ? `${tr('уже у')} ${n} ${tr('из')} ${users.length}` : tr('закрыт');
    return `<button class="list-check ${picked.has(l.id) ? 'on' : ''}" data-l="${esc(l.id)}" ${full ? 'disabled' : ''}>${emo(l.emoji)}<div class="grow"><b>${l.order != null && l.order < 100 && !new RegExp('(^|\\D)' + l.order + '(\\D|$)').test(l.title) ? l.order + '. ' : ''}${esc(l.title)}</b><div class="small muted">${esc(note)}</div></div></button>`;
  };
  const maxOrder = Math.max(0, ...lessons.map((l) => (l.order != null && l.order < 100 ? l.order : 0)));
  openSheet(
    `<div class="stack" data-noi18n><h2>${esc(tr('Какие тесты открыть?'))}</h2><p class="muted small">${esc(tr('Выбрано учеников'))}: ${users.length}</p>
      <div class="row" style="gap:8px"><select class="input grow" data-upto><option value="">${esc(tr('Открыть уроки с 1 по…'))}</option>${Array.from({ length: maxOrder }, (_, i) => `<option value="${i + 1}">1 – ${i + 1}</option>`).join('')}</select><button class="link small" data-all>${esc(tr('Выбрать все'))}</button></div>
      <div data-list style="max-height:44vh;overflow:auto">${lessons.map(row).join('')}</div>
      <div class="field"><span>${emo('📖')} ${esc(tr('Обучалка'))}</span><div class="choices"><button class="choice" data-nl="1">${esc(tr('Сразу тест'))}</button><button class="choice on" data-nl="0">${esc(tr('С обучалкой'))}</button></div></div>
      <button class="btn block" data-go disabled>${ic('plain-2')}<span></span></button></div>`,
    (el, close) => {
      const label = () => { const n = picked.size; const b = $('[data-go]', el); b.disabled = !n; $('span', b).textContent = `${tr('Дать доступ')}${n ? ` (${n})` : ''}`; };
      const paint = () => { $$('[data-l]', el).forEach((b) => b.classList.toggle('on', picked.has(b.dataset.l))); label(); };
      const free = () => lessons.filter((l) => haveCount(l) < users.length);
      $$('[data-l]', el).forEach((b) => (b.onclick = () => { if (b.disabled) return; haptic('light'); const id = b.dataset.l; picked.has(id) ? picked.delete(id) : picked.add(id); paint(); }));
      $('[data-upto]', el).onchange = (e) => { const n = Number(e.target.value); if (!n) return; picked.clear(); free().filter((l) => l.order != null && l.order <= n).forEach((l) => picked.add(l.id)); paint(); };
      $('[data-all]', el).onclick = () => { haptic('light'); const every = free().every((l) => picked.has(l.id)); free().forEach((l) => (every ? picked.delete(l.id) : picked.add(l.id))); paint(); };
      $$('[data-nl]', el).forEach((b) => (b.onclick = () => { noLearn = b.dataset.nl === '1'; $$('[data-nl]', el).forEach((x) => x.classList.toggle('on', x === b)); }));
      label();
      $('[data-go]', el).onclick = async () => {
        $('[data-go]', el).disabled = true;
        try {
          const r = await api('/admin/grant-many', { userIds, lessonIds: [...picked], noLearn });
          haptic('success');
          sfx.win();
          toast(`${tr('Доступ дан')}: ${r.given}`);
          close();
          tabTests().catch(fail);
        } catch (e) { label(); fail(e); }
      };
    },
  );
}

// У кого есть личный доступ к тесту, их результаты и отзыв доступа
function accessSheet(l) {
  openSheet(`<div class="stack" data-noi18n><h2>${emo(l.emoji)} ${esc(l.title)}</h2><p class="muted small">${esc(tr('Доступ'))}: ${l.personalFor.length}</p>
    <div style="max-height:56vh;overflow:auto">${l.personalFor.map((s) => `<div class="item"><div class="grow"><b class="ellipsis" style="display:block">${esc(s.name)}</b><div class="small muted">${l.hasLearn ? (s.noLearn ? tr('без обучалки') + ' · ' : s.learnDone ? tr('обучалка ✓') + ' · ' : tr('обучалка не пройдена') + ' · ') : ''}${s.best != null ? tr('тест') + ' ' + s.best + '%' : tr('тест не сдан')}</div></div>${pctPill(s.best)}<button class="iconbtn" data-rev="${s.pubId}" aria-label="${esc(tr('Отозвать'))}">${ic('trash-bin-trash', 'sm')}</button></div>`).join('')}</div></div>`, (el, close) => {
    $$('[data-rev]', el).forEach((b) => (b.onclick = async () => {
      if (!(await confirmSheet('Отозвать доступ?', 'Ученик перестанет видеть этот тест, его результаты по нему удалятся.', 'Отозвать', true))) return;
      try { await del('/admin/pubs/' + b.dataset.rev); close(); tabTests().catch(fail); } catch (e) { fail(e); }
    }));
  });
}

// Скрытые тесты: можно вернуть в список
function hiddenSheet(list) {
  openSheet(`<div class="stack"><h2>Скрытые тесты</h2><p class="muted small">Их нет в списке, но у учеников они остаются, а результаты сохранены.</p>
    <div>${list.map((l) => `<div class="item">${emo(l.emoji)}<b class="grow">${esc(l.title)}</b><button class="btn ghost sm" data-back="${l.id}">Вернуть</button></div>`).join('')}</div></div>`, (el, close) => {
    $$('[data-back]', el).forEach((b) => (b.onclick = async () => { try { await api(`/admin/lessons/${b.dataset.back}/archive`, { archived: false }); close(); tabTests().catch(fail); } catch (e) { fail(e); } }));
  });
}

async function pubSheet(pid) {
  const s = await api('/admin/pubs/' + pid).catch(fail);
  if (!s) return;
  const names = (ids) => ids.map((id) => S.overview.students.find((x) => x.id === id)?.name || id);
  openSheet(
    `<div class="stack"><h2>${emo(s.emoji)} ${esc(s.title)}</h2><p class="muted">${esc(s.groupName)} · ${ago(s.publishedAt)}</p>
      <div class="row" style="gap:16px">${donut(s.avg, { size: 96, stroke: 12, sub: 'среднее' })}<div class="stack small"><div>Сдали: <b>${s.done.length}</b> из ${s.size}</div><div style="color:var(--bad-d)">${s.notDone.length ? 'Не сдали: ' + esc(names(s.notDone).join(', ')) : 'Все сдали'}</div></div></div>
      ${s.ranking.length ? `<h3>${emo(E.trophy)} Рейтинг</h3><div>${s.ranking.map((r, i) => `<div class="item"><div class="rk">${i < 3 ? emo([E.m1, E.m2, E.m3][i]) : i + 1}</div><b class="grow">${esc(r.name)}</b>${pctPill(r.pct)}</div>`).join('')}</div>` : ''}
      ${s.questions.some((q) => q.total) ? `<h3>${emo(E.puzzle)} По вопросам (1-я попытка)</h3>${hbars(s.questions.map((q, i) => ({ label: `${i + 1}. ${q.prompt}`, value: q.pct })))}` : ''}
      <button class="btn ghost dim block" data-unpub>Отозвать тест у группы</button></div>`,
    (el, close) => {
      $('[data-unpub]', el).onclick = async () => {
        if (!(await confirmSheet('Отозвать тест?', 'Ученики перестанут его видеть, результаты по нему удалятся из статистики группы.', 'Отозвать', true))) return;
        try { await del('/admin/pubs/' + pid); close(); tabTests().catch(fail); } catch (e) { fail(e); }
      };
    },
  );
}

// Список выданных логинов: показываем учителю один раз (пароли хранятся только в виде хеша)
function loginsSheet(list) {
  const text = list.map((l) => `${l.name}: ${l.login} / ${l.password}`).join('\n');
  openSheet(`<div class="stack"><h2>Входы на сайт</h2>
      ${list.length ? `<p class="muted small">Создано: ${list.length}. ${list.every((l) => l.sent) ? 'Бот отправил каждому в личку.' : 'Кому бот не смог написать — отмечены, передай им сам.'} Сохрани список: пароли больше нигде не показываются.</p>
      <div class="qlist" data-noi18n style="max-height:46vh;overflow:auto">${list.map((l) => `<div><span>${l.sent ? '✅' : '⚠️'}</span><span class="grow"><b>${esc(l.name)}</b><br><code>${esc(l.login)}</code> / <code>${esc(l.password)}</code></span></div>`).join('')}</div>
      <button class="btn block" data-copy>${ic('copy')}Скопировать список</button>` : '<p class="muted">У всех учеников уже есть вход. Новый пароль одному ученику — на его странице.</p>'}</div>`, (el) => {
    const c = $('[data-copy]', el);
    if (c) c.onclick = async () => { try { await navigator.clipboard.writeText(text); toast('Скопировано'); } catch { toast('Не удалось скопировать', true); } };
  });
}

async function tabBot() {
  const [o, rems] = await Promise.all([loadOverview(), api('/admin/reminders')]);
  const groupOpts = o.groups.map((g) => `<option value="${g.id}">${esc(g.name)}</option>`).join('');
  app.innerHTML = adminTop('Бот') + `
    ${sectionTitle(E.robot, 'Отчёт для Claude')}
    <div class="card stack small"><p class="muted">Отправляет Claude результаты всех учеников: оценки, ошибки, что ответили и что было правильно. По ним Claude сделает каждому личную обучалку и тест по его ошибкам.</p>
      <button class="btn block" data-report>${ic('plain-2')}Отправить отчёт Claude</button></div>
    ${sectionTitle(E.laptop, 'Входы на сайт')}
    <div class="card stack small"><p class="muted">Каждому ученику из Telegram — свой логин и пароль для сайта. Это его же аккаунт: те же очки, тесты и лига. Бот пришлёт данные каждому в личку, а тебе покажет список.</p>
      <button class="btn block" data-logins>${ic('lock-keyhole')}Создать входы ученикам</button></div>
    ${sectionTitle(E.link, 'Подключить чат группы')}
    <div class="card"><ol class="steps small">
      <li>Создай Telegram-группу (или открой существующую) и добавь туда бота.</li>
      <li>Напиши в этой группе <code>/link</code> и выбери группу курса.</li>
      <li>Готово: бот будет писать туда о новых тестах и напоминания. Без чата бот пишет ученикам в личку.</li>
    </ol></div>
    ${o.groups.length ? `
    ${sectionTitle(E.mega, 'Написать сейчас')}
    <div class="card stack">
      <select class="input" data-ag>${groupOpts}</select>
      <textarea class="input" data-at placeholder="Например: Ребята, завтра урок в 18:00! Не забудьте решить тест"></textarea>
      <button class="btn block" data-send>${ic('plain-2')}Отправить от бота</button>
    </div>
    ${sectionTitle(E.alarm, 'Новое напоминание')}
    <div class="card stack">
      <label class="field"><span>Группа</span><select class="input" data-rg>${groupOpts}</select></label>
      <label class="field"><span>Про какой тест (бот покажет, кто ещё не сдал, и сам остановится, когда сдадут все)</span><select class="input" data-rp></select></label>
      <label class="field"><span>Что писать</span><textarea class="input" data-rt placeholder="Заходите и решайте тест!"></textarea></label>
      <div class="field"><span>Как часто</span><div class="choices" data-ri>${[[15, '15 мин'], [30, '30 мин'], [60, '1 ч'], [180, '3 ч'], [720, '12 ч'], [1440, '1 день']].map(([v, t]) => `<button class="choice ${v === 60 ? 'on' : ''}" data-v="${v}">${t}</button>`).join('')}</div></div>
      <label class="field"><span>Сколько раз максимум</span><input class="input" type="number" min="1" max="100" value="5" data-rm></label>
      <button class="btn block" data-rcreate>${ic('bell-bing')}Запустить напоминание</button>
    </div>` : `<div class="card center" style="margin-top:16px"><p class="muted">Сначала создай группу во вкладке «Группы».</p></div>`}
    ${sectionTitle(E.memo, 'Напоминания')}
    <div class="stack">${rems.length ? rems.map((r) => `<div class="card"><div class="row between"><b>${esc(r.groupName)}</b>${r.active ? '<span class="pill good">активно</span>' : '<span class="pill">пауза</span>'}</div>
      <p style="margin:8px 0">${esc(r.text)}</p>
      <p class="small muted">каждые ${r.intervalMin >= 60 ? r.intervalMin / 60 + ' ч' : r.intervalMin + ' мин'} · отправлено ${r.sent}/${r.maxCount}${r.testTitle ? ` · ${esc(r.testTitle)}` : ''}${r.active ? ` · следующее в ${new Date(r.nextAt).toLocaleTimeString(LOCALE(), { hour: '2-digit', minute: '2-digit' })}` : ''}</p>
      <div class="row" style="margin-top:10px"><button class="btn ghost sm grow" data-toggle="${r.id}" data-on="${r.active ? 0 : 1}">${ic(r.active ? 'pause' : 'play', 'sm')}${r.active ? 'Пауза' : 'Возобновить'}</button><button class="iconbtn" data-rdel="${r.id}" aria-label="Удалить">${ic('trash-bin-trash', 'sm')}</button></div></div>`).join('') : '<p class="muted center small">Напоминаний нет</p>'}</div>`;
  bindAdminTop();
  $('[data-logins]').onclick = async () => {
    if (!(await confirmSheet('Создать входы на сайт?', 'Ученики, у которых ещё нет входа, получат от бота логин и пароль в личку.', 'Создать'))) return;
    try { loginsSheet(await api('/admin/logins', {})); } catch (e) { fail(e); }
  };
  $('[data-report]').onclick = async () => {
    try {
      const r = await api('/admin/report', {});
      haptic('success');
      openSheet(`<div class="stack center">${me('cheer', 110)}<h2>Отчёт отправлен</h2><p class="muted">Учеников в отчёте: ${r.students}. Теперь напиши Claude: <b>«посмотри отчёт и сделай личные задания»</b>.</p></div>`);
    } catch (e) { fail(e); }
  };
  const send = $('[data-send]');
  if (send) send.onclick = async () => {
    const text = $('[data-at]').value.trim();
    if (!text) return $('[data-at]').focus();
    try { const r = await api('/admin/announce', { groupId: $('[data-ag]').value, text }); toast(r.ok ? 'Отправлено' : 'Не удалось: привяжи чат или попроси учеников запустить бота', !r.ok); if (r.ok) $('[data-at]').value = ''; } catch (e) { fail(e); }
  };
  const rg = $('[data-rg]');
  if (rg) {
    const fillTests = () => {
      const pubs = o.lessons.flatMap((l) => l.sentTo.filter((s) => s.groupId === rg.value).map((s) => ({ ...s, title: l.title })));
      $('[data-rp]').innerHTML = '<option value="">— просто сообщение, без теста —</option>' + pubs.map((p) => `<option value="${p.pubId}">${esc(p.title)} (сдали ${p.done}/${p.size})</option>`).join('');
    };
    rg.onchange = fillTests;
    fillTests();
    let interval = 60;
    $$('[data-ri] [data-v]').forEach((b) => (b.onclick = () => { interval = Number(b.dataset.v); $$('[data-ri] [data-v]').forEach((x) => x.classList.toggle('on', x === b)); }));
    $('[data-rcreate]').onclick = async () => {
      try {
        await api('/admin/reminders', { groupId: rg.value, pubId: $('[data-rp]').value || null, text: $('[data-rt]').value, intervalMin: interval, maxCount: Number($('[data-rm]').value) });
        haptic('success');
        toast('Напоминание запущено — первое уйдёт в течение минуты');
        tabBot().catch(fail);
      } catch (e) { fail(e); }
    };
  }
  $$('[data-toggle]').forEach((b) => (b.onclick = async () => { try { await patch('/admin/reminders/' + b.dataset.toggle, { active: b.dataset.on === '1' }); tabBot().catch(fail); } catch (e) { fail(e); } }));
  $$('[data-rdel]').forEach((b) => (b.onclick = async () => { try { await del('/admin/reminders/' + b.dataset.rdel); tabBot().catch(fail); } catch (e) { fail(e); } }));
}

// ───────── вход на сайте ─────────
function setSession(t) {
  SESSION = t;
  try { t ? localStorage.setItem('session', t) : localStorage.removeItem('session'); } catch { /* */ }
}
function loginScreen() {
  nav.hidden = true;
  layer.innerHTML = '';
  app.innerHTML = `<div class="login">
    <div class="login-mascots">${['mimi', 'zip', 'dino'].map((m, i) => mascot(m, i === 1 ? 'peace' : 'happy', i === 1 ? 120 : 88)).join('')}</div>
    <div class="brand"><img src="/brand/logo.svg" alt="" width="56" height="56"><h1>Зубрик</h1></div><p class="muted">Учись в стиле игры: обучалки, тесты, лига группы</p>
    <form class="card stack" data-login>
      <label class="field"><span>Логин или почта</span><input class="input" name="email" type="text" autocomplete="username" autocapitalize="off" spellcheck="false" placeholder="login" required></label>
      <label class="field"><span>Пароль</span><input class="input" name="password" type="password" autocomplete="current-password" required></label>
      <button class="btn block" type="submit">${ic('play')}Войти</button>
    </form>
    <p class="small muted center">Есть Telegram? Открой бота <a class="link" href="https://t.me/itduobot">@itduobot</a> — там всё то же самое. Логин и пароль для сайта бот пришлёт по команде /site.</p>
    <div class="seg login-lang" data-noi18n>${LANGS.map(([id, t]) => `<button data-lang="${id}" class="${LOOK.lang === id ? 'on' : ''}">${t}</button>`).join('')}</div>
  </div>`;
  $$('[data-lang]', app).forEach((b) => (b.onclick = () => { applyLook({ lang: b.dataset.lang }); loginScreen(); }));
  const form = $('[data-login]');
  form.onsubmit = async (e) => {
    e.preventDefault();
    const btn = $('button[type=submit]', form);
    btn.disabled = true;
    try {
      const r = await api('/auth/login', { email: form.email.value, password: form.password.value });
      setSession(r.token);
      haptic('success');
      await start();
    } catch (err) {
      btn.disabled = false;
      form.classList.remove('shake'); void form.offsetWidth; form.classList.add('shake');
      fail(err);
    }
  };
}

// ───────── старт ─────────
(async function boot() {
  tg?.ready();
  tg?.expand();
  applyLook();
  tg?.onEvent?.('themeChanged', () => applyLook());
  matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change', () => applyLook());
  await loadEmoji();
  if (!IN_TG && !DEV_USER && !SESSION) return loginScreen();
  await start();
})();

async function start() {
  try {
    await refreshMe();
    const p = S.me.user.prefs;
    if (p) applyLook(p);
    if (!p?.lang) savePrefs({ lang: LOOK.lang });
    if (S.me.needRole) return roleScreen();
    S.tab = S.me.isAdmin ? 'dash' : S.me.isParent ? 'phome' : 'home';
    renderNav();
    await route();
    if (!S.me.isAdmin && !p?.mascot) setTimeout(() => appearanceSheet(true), 400);
  } catch (e) {
    if (!IN_TG && !DEV_USER) return loginScreen();
    app.innerHTML = emptyState('sad', 'Не получилось войти', esc(e.message) + (tg?.initData ? '' : '<br><br>Открой приложение через бота в Telegram.'));
  }
}
