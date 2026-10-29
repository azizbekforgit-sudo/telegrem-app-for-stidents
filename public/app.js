// Mini App «Зубрик»: путь уроков в стиле Duolingo, напарник-маскот, лига группы,
// статистика с диаграммами и панель учителя.
import { ICONS } from './icons.js';
import { mascot, MASCOTS } from './mascots.js';

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
let LOOK = { accent: 'lime', mode: 'auto', mascot: 'mimi' };
try { LOOK = { ...LOOK, ...JSON.parse(localStorage.getItem('look') || '{}') }; } catch { /* приватный режим */ }

function applyLook(p = {}) {
  LOOK = { ...LOOK, ...Object.fromEntries(Object.entries(p).filter(([, v]) => v)) };
  const root = document.documentElement;
  root.dataset.accent = ACC[LOOK.accent] ? LOOK.accent : 'lime';
  const sysDark = tg?.colorScheme ? tg.colorScheme === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
  const dark = LOOK.mode === 'dark' || (LOOK.mode === 'auto' && sysDark);
  root.dataset.theme = dark ? 'dark' : 'light';
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
  prefsTimer = setTimeout(() => api('/me/prefs', { accent: LOOK.accent, mode: LOOK.mode, mascot: LOOK.mascot }).catch(() => {}), 400);
}
const me = (emotion, size, cls = '') => mascot(LOOK.mascot, emotion, size, cls);

// ───────── инфраструктура ─────────
async function api(path, body, method) {
  const headers = { 'Content-Type': 'application/json' };
  if (tg?.initData) headers['X-Init-Data'] = tg.initData;
  else if (DEV_USER) { headers['X-Dev-User'] = DEV_USER; headers['X-Dev-Name'] = params.get('name') || 'Dev'; }
  const res = await fetch('/api' + path, { method: method || (body ? 'POST' : 'GET'), headers, body: body ? JSON.stringify(body) : undefined });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Ошибка сети');
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

// ───────── помощники UI ─────────
function avatar(u, cls = '') {
  const p = u?.prefs;
  if (p?.mascot && MASCOTS[p.mascot]) return `<div class="ava ${cls}" style="background:${(ACC[p.accent] || ACC.lime).l}">${mascot(p.mascot, 'happy', 100, 'still', true)}</div>`;
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
  return new Date(ts).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
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
const STUDENT_TABS = [['home', 'home-smile', 'Путь'], ['league', 'cup-star', 'Лига'], ['stats', 'chart-2', 'Прогресс'], ['profile', 'user-rounded', 'Профиль']];
const ADMIN_TABS = [['dash', 'widget-5', 'Панель'], ['groups', 'users-group-rounded', 'Группы'], ['tests', 'notebook-bookmark', 'Тесты'], ['bot', 'chat-round-dots', 'Бот']];

function renderNav() {
  const tabs = S.me.isAdmin ? ADMIN_TABS : STUDENT_TABS;
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
  const r = { home: tabHome, league: tabLeague, stats: tabStats, profile: tabProfile, dash: tabDash, groups: tabGroups, tests: tabTests, bot: tabBot }[S.tab];
  await r();
}
async function refreshMe() {
  S.me = await api('/me');
  return S.me;
}

function topbar(left = '') {
  const m = S.me;
  return `<div class="topbar"><div class="row">${left || (m.groups[0] ? `<span class="pill accent">${emo(m.groups[0].emoji)}${esc(m.groups[0].name)}</span>` : '<span class="pill">Без группы</span>')}</div>
    <div class="row" style="gap:6px"><span class="chip ${m.streak ? '' : 'off'}">${emo(E.fire)}${m.streak}</span><span class="chip">${emo(E.bolt)}${m.xp}</span></div></div>`;
}

// ═══════════════ УЧЕНИК ═══════════════
async function tabHome() {
  const m = await refreshMe();
  if (!m.groups.length) {
    app.innerHTML = topbar() + emptyState('think', 'Почти готово!', `Учитель скоро добавит тебя в группу — и тут появятся тесты.<br><br>Твой ID: <code>${esc(m.user.id)}</code>`, '<br><button class="btn ghost" data-reload>' + ic('refresh') + 'Обновить</button>');
    $('[data-reload]').onclick = () => tabHome().catch(fail);
    return;
  }
  const todo = m.path.find((p) => p.best == null);
  const allDone = m.path.length && !todo;
  const hero = !m.path.length
    ? { emo: 'sleepy', say: 'Пока тихо… Как только учитель отправит тест — я тебя позову!' }
    : allDone
      ? { emo: 'wow', say: 'Все тесты пройдены! Ты просто космос. Можешь улучшить результат в любом уроке.' }
      : { emo: m.streak >= 2 ? 'cheer' : 'happy', say: m.streak >= 2 ? `Серия ${plural(m.streak, 'день', 'дня', 'дней')}! Не останавливайся — новый тест ждёт.` : `Новый тест «${todo.title}» уже ждёт тебя. Погнали?` };
  let html = topbar() + `<div class="hero">${me(hero.emo, 112)}<div class="grow"><h1>Привет, ${esc(firstName(m.user.name))}!</h1><div class="say">${esc(hero.say)}</div>
    ${todo ? `<button class="btn" data-next>${ic('play')}Начать</button>` : ''}</div></div>`;

  const offs = [0, 48, 76, 48, 0, -48, -76, -48];
  m.groups.forEach((g) => {
    const items = m.path.filter((p) => p.groupId === g.id);
    if (!items.length) return;
    const done = items.filter((p) => p.best != null).length;
    html += `<div class="unit"><div class="grow"><small>${done} из ${items.length} пройдено</small><h2>${emo(g.emoji)}${esc(g.name)}</h2><div class="bar"><i style="width:${(done / items.length) * 100}%"></i></div></div>${emo(done === items.length ? E.trophy : E.books)}</div><div class="path">`;
    items.forEach((p, i) => {
      const cur = todo && p.pubId === todo.pubId;
      const cls = p.best == null ? (cur ? 'cur' : '') : p.best < 50 ? 'weak' : 'done';
      const stars = p.stars != null ? `<div class="stars">${[0, 1, 2].map((k) => emo(E.star, { cls: k < p.stars ? '' : 'off' })).join('')}</div>` : '';
      html += `<div class="pnode ${cur && i > 0 ? 'has-bubble' : ''}" style="transform:translateX(${offs[i % offs.length]}px)">${cur ? '<div class="bubble">СТАРТ</div>' : ''}
        <button class="node ${cls}" data-pub="${p.pubId}" aria-label="${esc(p.title)}">${emo(p.best === 100 ? E.crown : p.emoji)}</button>${stars}
        <div class="lbl"><b>${esc(p.title)}</b>${p.best != null ? `<br>${p.best}%` : ''}</div></div>`;
    });
    html += '</div>';
  });
  if (m.feed.length) html += sectionTitle(E.speech, 'Лента группы') + `<div class="card" style="padding:6px 8px">${m.feed.map(feedItem).join('')}</div>`;
  app.innerHTML = html;
  $$('[data-pub]').forEach((b) => (b.onclick = () => { haptic('medium'); lessonSheet(m.path.find((p) => p.pubId === b.dataset.pub)); }));
  const nx = $('[data-next]');
  if (nx) nx.onclick = () => lessonSheet(todo);
}

function feedItem(f) {
  return `<div class="item">${avatar({ name: f.name, id: f.userId, prefs: f.prefs })}<div class="grow"><b>${esc(f.name)}</b> <span class="muted">${f.practice ? 'потренировался в' : 'прошёл'}</span> «${esc(f.title)}»
    <div class="small muted">${ago(f.at)}${f.combo >= 3 ? ` · комбо ×${f.combo}` : ''}</div></div>${pctPill(f.pct)}</div>`;
}

function lessonSheet(p) {
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
  if (!m.groups.length) { app.innerHTML = topbar() + emptyState('think', 'Лига недоступна', 'Сначала учитель добавит тебя в группу.'); return; }
  S.leagueGroup ||= m.groups[0].id;
  const lb = await api('/leaderboard/' + S.leagueGroup);
  const switcher = m.groups.length > 1 ? `<div class="seg" style="margin-top:10px">${m.groups.map((g) => `<button data-g="${g.id}" class="${g.id === S.leagueGroup ? 'on' : ''}">${emo(g.emoji)}${esc(g.name)}</button>`).join('')}</div>` : '';
  app.innerHTML = topbar() + switcher + leagueHtml(lb, m.user.id);
  $$('[data-g]').forEach((b) => (b.onclick = () => { S.leagueGroup = b.dataset.g; tabLeague().catch(fail); }));
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
      ${rows.map((r, i) => `${i === 3 ? `<div class="zone">${emo(E.sparkles)} зона лидеров ${emo(E.sparkles)}</div>` : ''}<div class="item ${r.userId === meId ? 'me' : ''}" ${S.me.isAdmin ? `data-student="${r.userId}"` : ''}>
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
    ${sectionTitle(E.swords, self ? 'Ты vs группа' : 'Ученик vs группа')}
    <div class="card">${st.progress.length ? hbars(st.progress.map((p) => ({ label: p.title, labelHtml: `${emo(p.emoji)} ${esc(p.title)}`, value: p.pct, compare: p.groupAvg, color: 'var(--accent)' }))) + `<div class="legend"><span><i style="background:var(--accent)"></i>${self ? 'Твой' : 'Его'} результат</span><span><i style="background:var(--faint)"></i>Группа</span></div>` : '<p class="muted center small">Пока нет решённых тестов</p>'}</div>`;
}

async function tabStats() {
  const st = await api('/stats/me');
  app.innerHTML = topbar() + statsHtml(st, { self: true });
}

// Выбор напарника, цвета и темы (первый вход, профиль, настройки учителя)
function appearanceHtml() {
  return `<div class="field"><span>Напарник</span><div class="mascot-pick">${Object.entries(MASCOTS).map(([id, m]) => `<button data-mascot="${id}" class="${LOOK.mascot === id ? 'on' : ''}">${mascot(id, LOOK.mascot === id ? 'peace' : 'happy', 84, 'still')}<b>${m.name}</b></button>`).join('')}</div>
      <p class="mascot-about" data-about>${esc(MASCOTS[LOOK.mascot]?.about || '')}</p></div>
    <div class="field" style="margin-top:18px"><span>Цвет приложения</span><div class="swatches">${ACCENTS.map(([id, name, c]) => `<button class="swatch ${LOOK.accent === id ? 'on' : ''}" data-accent="${id}" title="${name}" style="background:${c};color:${c}">${ic('check-circle')}</button>`).join('')}</div></div>
    <div class="field" style="margin-top:18px"><span>Тема</span><div class="seg">${[['auto', 'monitor', 'Авто'], ['light', 'sun-2', 'Светлая'], ['dark', 'moon', 'Тёмная']].map(([id, icon, t]) => `<button data-mode="${id}" class="${LOOK.mode === id ? 'on' : ''}">${ic(icon, 'sm')}${t}</button>`).join('')}</div></div>`;
}
function bindAppearance(el, onChange) {
  $$('[data-mascot]', el).forEach((b) => (b.onclick = () => {
    haptic('medium');
    savePrefs({ mascot: b.dataset.mascot });
    $$('[data-mascot]', el).forEach((x) => {
      x.classList.toggle('on', x === b);
      x.querySelector('svg').outerHTML = mascot(x.dataset.mascot, x === b ? 'cheer' : 'happy', 84, x === b ? '' : 'still');
    });
    $('[data-about]', el).textContent = MASCOTS[b.dataset.mascot].about;
    onChange?.();
  }));
  $$('[data-accent]', el).forEach((b) => (b.onclick = () => { haptic('light'); savePrefs({ accent: b.dataset.accent }); $$('[data-accent]', el).forEach((x) => x.classList.toggle('on', x === b)); onChange?.(); }));
  $$('[data-mode]', el).forEach((b) => (b.onclick = () => { haptic('light'); savePrefs({ mode: b.dataset.mode }); $$('[data-mode]', el).forEach((x) => x.classList.toggle('on', x === b)); onChange?.(); }));
}
function appearanceSheet(first) {
  openSheet(
    `<div class="center" style="margin-bottom:14px"><h2>${first ? 'Выбери напарника!' : 'Внешний вид'}</h2><p class="muted small" style="margin-top:4px">${first ? 'Он будет болеть за тебя на каждом тесте. Поменять можно в профиле.' : 'Напарник, цвет и тема'}</p></div>
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
  const acc = ACC[LOOK.accent] || ACC.lime;
  const row = (attr, icon, title, sub, right) => `<button class="mrow" ${attr}>${emo(icon)}<div class="grow"><b>${title}</b>${sub ? `<span>${sub}</span>` : ''}</div>${right}<span class="faint">${ic('alt-arrow-right')}</span></button>`;
  app.innerHTML = topbar() + `
    <div class="pcard">
      <div class="pcard-top">
        <button class="pmascot" data-poke aria-label="Напарник">${me('peace', 104)}</button>
        <div class="grow"><h1 class="ellipsis">${esc(u.name)}</h1>
          <p class="muted small">${u.username ? '@' + esc(u.username) + ' · ' : ''}с ${new Date(u.joinedAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
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
      ${row('data-open="look"', E.palette, 'Внешний вид', `${esc(MASCOTS[LOOK.mascot]?.name || '')} · ${acc.name}`, `<span class="mrow-prev">${mascot(LOOK.mascot, 'happy', 40, 'still', true)}<i style="background:${acc.c}"></i></span>`)}
      ${row('data-open="ach"', E.medal, 'Достижения', `${got.length} из ${st.achievements.length}`, `<span class="mrow-badges">${got.slice(-3).map((a) => emo(a.icon)).join('')}</span>`)}
      ${row('data-open="stats"', E.chart, 'Моя статистика', 'Прогресс, карта тем, сравнение с группой', st.overall != null ? pctPill(st.overall) : '')}
      ${row('data-open="league"', E.trophy, 'Лига группы', 'Твоё место среди одногруппников', '')}
      ${row('data-open="how"', E.bulb, 'Как это работает', 'XP, уровни, серия и звёзды', '')}
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
    else go(what);
  }));
}

// ═══════════════ ПРОХОЖДЕНИЕ ТЕСТА ═══════════════
const KIND = { choice: 'Выбери ответ', truefalse: 'Верно или нет?', input: 'Напиши ответ', order: 'Собери ответ', match: 'Найди пары' };

async function startLesson(target) {
  let data;
  try { data = await api('/attempts', target); } catch (e) { return fail(e); }
  const P = { ...data, i: 0, queue: data.questions.map((_, i) => i), review: [], phase: 'main', combo: 0, xp: 0, value: null, ready: false, answered: false };
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
        <span class="combo" data-combo>${comboHtml()}</span></div>
      <div class="pbody">
        <div class="qkind ${P.phase === 'review' ? 'review' : ''}">${P.phase === 'review' ? `${emo(E.repeat)} Работа над ошибками` : data.preview ? `${ic('eye', 'sm')} Превью учителя ·` : ''} ${KIND[q.type]}${q.topic ? ` <span class="t">· ${esc(q.topic)}</span>` : ''}</div>
        <div class="qhead">${me('think', 84)}<div class="qprompt">${esc(q.prompt)}</div></div>
        ${q.code ? `<pre class="code">${highlight(q.code)}</pre>` : ''}
        <div data-area></div>
        ${q.hint ? `<p class="small muted" style="margin-top:16px">${emo(E.bulb)} <span class="link" data-hint>Подсказка</span></p>` : ''}
      </div>
      <div class="pfoot"><div class="in"><div data-fb></div><button class="btn block" data-check disabled>Проверить</button></div></div>`;
    $('[data-close]', el).onclick = close;
    const hint = $('[data-hint]', el);
    if (hint) hint.onclick = () => { hint.parentElement.innerHTML = emo(E.bulb) + ' ' + esc(q.hint); };
    renderArea(q);
    $('[data-check]', el).onclick = () => (P.answered ? next() : check(qi));
  }

  const setReady = (v) => { P.ready = v; $('[data-check]', el).disabled = !v; };

  function renderArea(q) {
    const area = $('[data-area]', el);
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
      inp.onkeydown = (e) => { if (e.key === 'Enter' && P.ready) { inp.blur(); $('[data-check]', el).click(); } };
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
    const look = r.pct === 100 ? { emo: 'love', icon: E.hundred, title: 'Идеально!' }
      : r.pct >= 80 ? { emo: 'cheer', icon: E.party, title: 'Урок пройден!' }
        : r.pct >= 50 ? { emo: 'peace', icon: E.clap, title: 'Неплохо!' }
          : { emo: 'sad', icon: E.muscle, title: 'В следующий раз получится' };
    if (r.pct >= 80) { sfx.win(); setTimeout(confetti, 250); }
    haptic(r.pct >= 50 ? 'success' : 'warning');
    const mins = Math.floor(r.durationSec / 60), secs = r.durationSec % 60;
    el.innerHTML = `<div class="pbody"><div class="result">
      <div style="position:relative;display:inline-block">${me(look.emo, 150)}<span style="position:absolute;right:-26px;top:4px">${emo(look.icon, { anim: true, cls: 'xl' })}</span></div>
      <h1>${look.title}</h1>
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
      <div class="card qlist" style="margin-bottom:12px"><h3 style="margin-bottom:6px">${emo(E.memo)} Ответы</h3>${r.questions.map((q) => `<div><span style="color:${q.correct ? 'var(--good)' : 'var(--bad)'}">${ic(q.correct ? 'check-circle' : 'close-circle', 'sm')}</span><span>${esc(q.prompt)}</span></div>`).join('')}</div>
      ${r.streak ? `<p class="muted">${emo(E.fire, { anim: true })} Серия: ${plural(r.streak, 'день', 'дня', 'дней')} подряд</p>` : ''}
    </div></div>
    <div class="pfoot"><div class="in"><button class="btn block" data-done>Продолжить</button></div></div>`;
    $('[data-done]', el).onclick = () => { el.remove(); if (S.view) tg?.BackButton?.show(); route().catch(fail); };
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
    ${o.unassigned.length ? sectionTitle(E.newb, 'Новые ученики', `<span class="pill bad">${o.unassigned.length}</span>`) + `<div class="card" style="padding:6px 8px">${o.unassigned.map((u) => `<div class="item">${avatar(u)}<div class="grow"><b class="ellipsis" style="display:block">${esc(u.name)}</b><div class="small muted">${u.username ? '@' + esc(u.username) + ' · ' : ''}${ago(u.joinedAt)}</div></div><button class="btn sm" data-assign="${u.id}">В группу</button></div>`).join('')}</div>` : ''}
    ${sectionTitle(E.people, 'Группы', `<button class="link" data-newgroup>${ic('add-circle', 'sm')}Создать</button>`)}
    ${o.groups.length ? `<div class="stack">${o.groups.map(groupCardHtml).join('')}</div>` : `<div class="card center stack"><p class="muted">Групп пока нет</p><button class="btn" data-newgroup>${ic('add-circle')}Создать первую группу</button></div>`}
    ${o.feed.length ? sectionTitle(E.bolt, 'Последние результаты') + `<div class="card" style="padding:6px 8px">${o.feed.map(feedItem).join('')}</div>` : ''}`;
  bindAdminTop();
  bindGroupCards();
  $$('[data-newgroup]').forEach((b) => (b.onclick = () => groupForm()));
  $$('[data-assign]').forEach((b) => (b.onclick = () => assignSheet(b.dataset.assign)));
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
  const tabs = [['members', 'Ученики'], ['stats', 'Статистика'], ['league', 'Лига']];
  let body = '';
  if (S.groupTab === 'members') {
    const rows = st.leaderboard.rows;
    body = `<button class="btn block" data-add style="margin-top:14px">${ic('user-plus-rounded')}Добавить учеников</button>
      <div class="card" style="padding:6px 8px;margin-top:14px">${rows.length ? rows.map((r) => `<div class="item" data-student="${r.userId}">${avatar(r)}<div class="grow"><b class="ellipsis" style="display:block">${esc(r.name)}</b>
        <div class="small muted">${r.done}/${st.tests.length} тестов · ср. ${pctText(r.avg)} · ${r.xp} XP</div></div>
        <button class="iconbtn" data-rm="${r.userId}" aria-label="Убрать">${ic('trash-bin-trash', 'sm')}</button></div>`).join('') : '<p class="muted center small" style="padding:14px">В группе пока нет учеников</p>'}</div>`;
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
  const st = await api('/admin/students/' + uid);
  const u = st.user;
  app.innerHTML = `<div class="topbar"><button class="back" data-back>${ic('alt-arrow-left')}Назад</button><span class="pill">ID ${esc(u?.id || uid)}</span></div>
    <div class="row" style="margin-top:8px;gap:14px">${avatar(u, 'lg')}<div class="grow"><h1>${esc(u?.name || 'Ученик')}</h1>
      <p class="muted small">${u?.username ? '@' + esc(u.username) + ' · ' : ''}${st.groups.map((g) => esc(g.name)).join(', ') || 'без группы'}</p>
      <div class="tags" style="margin-top:6px">${st.achievements.filter((a) => a.got).map((a) => `<span title="${esc(a.title)}">${emo(a.icon)}</span>`).join('')}</div></div></div>
    ${statsHtml(st, { self: false })}
    <div style="margin-top:16px"><button class="btn ghost block" data-assign="${esc(uid)}">${ic('user-plus-rounded')}Добавить в группу</button></div>`;
  $('[data-back]').onclick = back;
  $('[data-assign]').onclick = async () => { if (!S.overview) await loadOverview(); assignSheet(uid); };
}

const TYPE_LABEL = { choice: 'выбор', truefalse: 'верно/неверно', input: 'ввод', order: 'порядок', match: 'пары' };

async function tabTests() {
  const o = await loadOverview();
  app.innerHTML = adminTop('Тесты') + `
    <div class="hero" style="margin-top:8px">${me('wow', 96)}<div class="grow"><div class="say"><b>Как появляются тесты:</b> пришли конспект урока Claude — он сделает тест в стиле Duolingo. Тест появится здесь черновиком. Ученики его не видят, пока ты не нажмёшь «Отправить».</div></div></div>
    <div class="stack" style="margin-top:16px">${o.lessons.map(lessonCardHtml).join('') || emptyState('sleepy', 'Тестов пока нет', 'Жду конспект — пришли его Claude.')}</div>`;
  bindAdminTop();
  $$('[data-preview]').forEach((b) => (b.onclick = () => startLesson({ lessonId: b.dataset.preview })));
  $$('[data-send]').forEach((b) => (b.onclick = () => sendSheet(o.lessons.find((l) => l.id === b.dataset.send))));
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
      <div class="tags" style="margin-top:8px"><span class="pill accent">${emo(E.puzzle)}${l.questions}</span>${l.types.map((t) => `<span class="pill">${TYPE_LABEL[t] || t}</span>`).join('')}</div></div>
      ${l.sentTo.length ? '' : '<span class="pill gold">черновик</span>'}</div>
    ${l.topics.length ? `<p class="small muted" style="margin-top:10px">Темы: ${l.topics.map(esc).join(' · ')}</p>` : ''}
    ${l.sentTo.length ? `<div style="margin-top:12px">${l.sentTo.map((s) => `<button class="list-check" data-pubinfo="${s.pubId}">${ic('plain-2', 'sm')}<div class="grow"><b>${esc(s.groupName)}</b><div class="small muted">сдали ${s.done}/${s.size} · ${ago(s.publishedAt)}</div></div>${pctPill(s.avg)}</button>`).join('')}</div>` : ''}
    <div class="row" style="margin-top:14px"><button class="btn ghost sm" data-preview="${l.id}">${ic('eye', 'sm')}Превью</button><button class="btn sm grow" data-send="${l.id}">${ic('plain-2', 'sm')}Отправить</button>${l.sentTo.length ? '' : `<button class="iconbtn" data-dell="${l.id}" aria-label="Удалить">${ic('trash-bin-trash', 'sm')}</button>`}</div>
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

async function tabBot() {
  const [o, rems] = await Promise.all([loadOverview(), api('/admin/reminders')]);
  const groupOpts = o.groups.map((g) => `<option value="${g.id}">${esc(g.name)}</option>`).join('');
  app.innerHTML = adminTop('Бот') + `
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
      <p class="small muted">каждые ${r.intervalMin >= 60 ? r.intervalMin / 60 + ' ч' : r.intervalMin + ' мин'} · отправлено ${r.sent}/${r.maxCount}${r.testTitle ? ` · ${esc(r.testTitle)}` : ''}${r.active ? ` · следующее в ${new Date(r.nextAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}` : ''}</p>
      <div class="row" style="margin-top:10px"><button class="btn ghost sm grow" data-toggle="${r.id}" data-on="${r.active ? 0 : 1}">${ic(r.active ? 'pause' : 'play', 'sm')}${r.active ? 'Пауза' : 'Возобновить'}</button><button class="iconbtn" data-rdel="${r.id}" aria-label="Удалить">${ic('trash-bin-trash', 'sm')}</button></div></div>`).join('') : '<p class="muted center small">Напоминаний нет</p>'}</div>`;
  bindAdminTop();
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

// ───────── старт ─────────
(async function boot() {
  tg?.ready();
  tg?.expand();
  applyLook();
  tg?.onEvent?.('themeChanged', () => applyLook());
  matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change', () => applyLook());
  try {
    await Promise.all([loadEmoji(), refreshMe()]);
    const p = S.me.user.prefs;
    if (p) applyLook(p);
    S.tab = S.me.isAdmin ? 'dash' : 'home';
    renderNav();
    await route();
    if (!S.me.isAdmin && !p?.mascot) setTimeout(() => appearanceSheet(true), 400);
  } catch (e) {
    app.innerHTML = emptyState('sad', 'Не получилось войти', esc(e.message) + (tg?.initData ? '' : '<br><br>Открой приложение через бота в Telegram.'));
  }
})();
