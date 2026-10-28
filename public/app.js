// Mini App «Зубрик»: путь уроков в стиле Duolingo, лига группы, статистика с диаграммами и панель учителя.
const tg = window.Telegram?.WebApp;
const params = new URLSearchParams(location.search);
const DEV_USER = params.get('dev');

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const app = $('#app');
const nav = $('#nav');
const layer = $('#layer');

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
  t.textContent = msg;
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
    let done = false;
    const close = openSheet(
      `<div class="stack center"><h2>${esc(title)}</h2>${text ? `<p class="muted">${esc(text)}</p>` : ''}
       <button class="btn block ${danger ? 'red' : ''}" data-ok>${esc(okLabel)}</button>
       <button class="btn ghost dark block" data-no>Отмена</button></div>`,
      (el, c) => {
        $('[data-ok]', el).onclick = () => { done = true; c(); resolve(true); };
        $('[data-no]', el).onclick = () => { c(); resolve(false); };
      },
    );
    layer.lastChild.addEventListener('click', (e) => { if (e.target === layer.lastChild && !done) resolve(false); });
    return close;
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
      g.gain.exponentialRampToValueAtTime(0.18, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g).connect(actx.destination);
      o.start(t);
      o.stop(t + dur + 0.02);
    });
  } catch { /* без звука */ }
}
const sfx = {
  ok: () => tone([660, 880], 0.14, 'triangle'),
  bad: () => tone([220, 180], 0.18, 'square', 0.12),
  win: () => tone([523, 659, 784, 1047], 0.18, 'triangle', 0.11),
};

// ───────── маскот Зубрик ─────────
function mascot(mood = 'happy', size = 110, extra = '') {
  const mouth = {
    happy: '<path d="M44 74 Q60 90 76 74" stroke="#1f3b0a" stroke-width="5" fill="#ff7a7a" stroke-linecap="round"/>',
    wow: '<ellipse cx="60" cy="78" rx="9" ry="11" fill="#1f3b0a"/>',
    sad: '<path d="M46 84 Q60 72 74 84" stroke="#1f3b0a" stroke-width="5" fill="none" stroke-linecap="round"/>',
    think: '<path d="M48 80 L72 78" stroke="#1f3b0a" stroke-width="5" stroke-linecap="round"/>',
  }[mood];
  const pupils = mood === 'think' ? 'translate(4,-4)' : mood === 'sad' ? 'translate(0,3)' : '';
  return `<svg class="mascot ${extra}" width="${size}" height="${size}" viewBox="0 0 120 120" aria-hidden="true">
    <ellipse cx="60" cy="112" rx="34" ry="5" fill="rgba(0,0,0,.12)"/>
    <path d="M18 66 C18 34 36 18 60 18 C84 18 102 34 102 66 C102 92 84 106 60 106 C36 106 18 92 18 66Z" fill="#58cc02"/>
    <path d="M24 74 C30 96 46 104 60 104 C74 104 90 96 96 74 C88 88 74 94 60 94 C46 94 32 88 24 74Z" fill="#58a700"/>
    <ellipse cx="60" cy="80" rx="26" ry="18" fill="#a5ed6e" opacity=".55"/>
    <path d="M28 26 L60 12 L92 26 L60 40Z" fill="#3c3c3c"/><rect x="58" y="24" width="4" height="4" fill="#3c3c3c"/>
    <path d="M86 28 L88 46" stroke="#ffc800" stroke-width="3"/><circle cx="88" cy="48" r="4" fill="#ffc800"/>
    <circle cx="44" cy="56" r="13" fill="#fff"/><circle cx="76" cy="56" r="13" fill="#fff"/>
    <g transform="${pupils}"><circle cx="46" cy="57" r="6.5" fill="#1f3b0a"/><circle cx="74" cy="57" r="6.5" fill="#1f3b0a"/>
    <circle cx="48" cy="55" r="2.2" fill="#fff"/><circle cx="76" cy="55" r="2.2" fill="#fff"/></g>
    ${mood === 'sad' ? '<path d="M34 42 L52 46 M86 42 L68 46" stroke="#1f3b0a" stroke-width="4" stroke-linecap="round"/>' : ''}
    ${mouth}
    <path d="M22 64 Q8 66 10 52" stroke="#58cc02" stroke-width="9" fill="none" stroke-linecap="round"/>
    <path d="M98 64 Q112 60 110 48" stroke="#58cc02" stroke-width="9" fill="none" stroke-linecap="round"/>
  </svg>`;
}

// ───────── мелкие помощники UI ─────────
const COLORS = ['#1cb0f6', '#ce82ff', '#ff9600', '#58cc02', '#ff4b4b', '#2b70c9', '#ffc800', '#00cd9c'];
function avatar(u, cls = '') {
  if (u?.photoUrl) return `<img class="ava ${cls}" src="${esc(u.photoUrl)}" alt="">`;
  const n = (u?.name || '?').replace('@', '');
  let h = 0;
  for (const ch of String(u?.id || u?.userId || n)) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return `<div class="ava ${cls}" style="background:${COLORS[h % COLORS.length]}">${esc(n[0]?.toUpperCase() || '?')}</div>`;
}
const pctClass = (p) => (p == null ? 'faint' : p >= 80 ? 'c-good' : p >= 50 ? 'c-mid' : 'c-bad');
const pctColor = (p) => (p == null ? 'var(--track)' : p >= 80 ? 'var(--green)' : p >= 50 ? 'var(--gold)' : 'var(--red)');
const pctText = (p) => (p == null ? '—' : p + '%');
const plural = (n, a, b, c) => { const m = n % 10, mm = n % 100; return `${n} ${m === 1 && mm !== 11 ? a : m >= 2 && m <= 4 && (mm < 10 || mm >= 20) ? b : c}`; };
function ago(ts) {
  const s = (Date.now() - ts) / 1000;
  if (s < 60) return 'только что';
  if (s < 3600) return `${Math.floor(s / 60)} мин назад`;
  if (s < 86400) return `${Math.floor(s / 3600)} ч назад`;
  return new Date(ts).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
}
const emptyState = (mood, title, text, extra = '') => `<div class="empty">${mascot(mood, 120)}<h2>${esc(title)}</h2><p>${text}</p>${extra}</div>`;

// ───────── диаграммы (SVG) ─────────
function donut(p, { size = 130, stroke = 16, color, label = '', sub = '' } = {}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const val = Math.max(0, Math.min(100, p ?? 0));
  const col = color || pctColor(p);
  const id = 'd' + Math.random().toString(36).slice(2, 7);
  setTimeout(() => { const el = document.getElementById(id); if (el) el.style.strokeDashoffset = c * (1 - val / 100); }, 60);
  return `<div class="donut-wrap"><svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    <circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="var(--track)" stroke-width="${stroke}"/>
    <circle id="${id}" cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="${col}" stroke-width="${stroke}" stroke-linecap="round"
      stroke-dasharray="${c}" stroke-dashoffset="${c}" transform="rotate(-90 ${size / 2} ${size / 2})" style="transition:stroke-dashoffset 1.1s cubic-bezier(.2,.8,.2,1)"/>
  </svg><div class="lbl"><b style="color:${col}">${label || pctText(p)}</b><span>${esc(sub)}</span></div></div>`;
}

function lineChart(items, { h = 170 } = {}) {
  if (!items.length) return '<p class="muted center small">Пока нет данных</p>';
  const w = 320, pl = 30, pr = 12, pt = 14, pb = 26;
  const n = items.length;
  const x = (i) => (n === 1 ? (pl + w - pr) / 2 : pl + (i * (w - pl - pr)) / (n - 1));
  const y = (v) => pt + (1 - v / 100) * (h - pt - pb);
  const grid = [0, 50, 100].map((v) => `<line x1="${pl}" x2="${w - pr}" y1="${y(v)}" y2="${y(v)}" stroke="var(--border)" stroke-width="2" stroke-dasharray="${v ? '4 5' : ''}"/><text x="${pl - 6}" y="${y(v) + 4}" text-anchor="end">${v}</text>`).join('');
  const line = (key, color, dashed) => {
    const pts = items.map((it, i) => (it[key] == null ? null : [x(i), y(it[key])])).filter(Boolean);
    if (!pts.length) return '';
    const d = pts.map((p, i) => (i ? 'L' : 'M') + p.join(',')).join(' ');
    const area = !dashed && pts.length > 1 ? `<path d="${d} L${pts.at(-1)[0]},${y(0)} L${pts[0][0]},${y(0)} Z" fill="${color}" opacity=".12"/>` : '';
    return `${area}<path d="${d}" fill="none" stroke="${color}" stroke-width="${dashed ? 2.5 : 4}" stroke-linecap="round" stroke-linejoin="round" ${dashed ? 'stroke-dasharray="6 6"' : ''}/>` +
      (dashed ? '' : pts.map((p) => `<circle cx="${p[0]}" cy="${p[1]}" r="5.5" fill="var(--bg)" stroke="${color}" stroke-width="3.5"/>`).join(''));
  };
  const labels = items.map((it, i) => (n <= 8 || i % Math.ceil(n / 8) === 0 ? `<text x="${x(i)}" y="${h - 6}" text-anchor="middle">${esc(it.short ?? i + 1)}</text>` : '')).join('');
  return `<svg class="chart" viewBox="0 0 ${w} ${h}">${grid}${line('groupAvg', 'var(--faint)', true)}${line('pct', 'var(--green)')}${labels}</svg>`;
}

function radar(items, { size = 280 } = {}) {
  const n = items.length;
  const cx = size / 2, cy = size / 2 + 4, R = size / 2 - 66;
  const pt = (i, v) => { const a = -Math.PI / 2 + (i * 2 * Math.PI) / n; return [cx + Math.cos(a) * R * v, cy + Math.sin(a) * R * v]; };
  const ring = (v) => `<polygon points="${items.map((_, i) => pt(i, v).join(',')).join(' ')}" fill="none" stroke="var(--border)" stroke-width="2"/>`;
  const axes = items.map((_, i) => `<line x1="${cx}" y1="${cy}" x2="${pt(i, 1)[0]}" y2="${pt(i, 1)[1]}" stroke="var(--border)" stroke-width="1.5"/>`).join('');
  const shape = items.map((it, i) => pt(i, Math.max(0.04, it.pct / 100)).join(',')).join(' ');
  const labels = items.map((it, i) => {
    const [lx, ly] = pt(i, 1.2);
    const anchor = Math.abs(lx - cx) < 8 ? 'middle' : lx > cx ? 'start' : 'end';
    const t = it.topic.length > 16 ? it.topic.slice(0, 15) + '…' : it.topic;
    return `<text x="${lx}" y="${ly}" text-anchor="${anchor}" dominant-baseline="middle">${esc(t)}</text><text x="${lx}" y="${ly + 13}" text-anchor="${anchor}" dominant-baseline="middle" style="fill:${pctColor(it.pct)};font-weight:900">${it.pct}%</text>`;
  }).join('');
  return `<svg class="chart" viewBox="0 0 ${size} ${size}">${[0.33, 0.66, 1].map(ring).join('')}${axes}
    <polygon points="${shape}" fill="var(--purple)" fill-opacity=".28" stroke="var(--purple)" stroke-width="3" stroke-linejoin="round"/>
    ${items.map((it, i) => { const [px, py] = pt(i, Math.max(0.04, it.pct / 100)); return `<circle cx="${px}" cy="${py}" r="4.5" fill="var(--purple)"/>`; }).join('')}
    ${labels}</svg>`;
}

function hbars(items) {
  // items: [{ label, value, compare?, right? }]
  return items.map((it) => `<div class="hbar"><div class="t"><span class="ellipsis">${esc(it.label)}</span><b class="${pctClass(it.value)}">${it.right ?? pctText(it.value)}</b></div>
    <div class="track"><div class="fill" style="width:${it.value ?? 0}%;background:${it.color || pctColor(it.value)}"></div></div>
    ${it.compare !== undefined ? `<div class="track"><div class="fill" style="width:${it.compare ?? 0}%;background:var(--faint)"></div></div>` : ''}</div>`).join('');
}

function topicsChart(topics) {
  if (!topics.length) return '<p class="muted center small">Реши тест — здесь появится карта твоих тем</p>';
  return topics.length >= 3 ? radar(topics.slice(0, 8)) : hbars(topics.map((t) => ({ label: t.topic, value: t.pct, color: 'var(--purple)' })));
}

function confetti() {
  const c = document.createElement('canvas');
  c.className = 'confetti';
  c.width = innerWidth * devicePixelRatio;
  c.height = innerHeight * devicePixelRatio;
  document.body.appendChild(c);
  const ctx = c.getContext('2d');
  const cols = ['#58cc02', '#1cb0f6', '#ffc800', '#ff4b4b', '#ce82ff', '#ff9600'];
  const parts = Array.from({ length: 140 }, () => ({ x: c.width / 2, y: c.height * 0.35, vx: (Math.random() - 0.5) * 26, vy: -Math.random() * 26 - 6, s: 6 + Math.random() * 8, r: Math.random() * 6, vr: (Math.random() - 0.5) * 0.4, c: cols[(Math.random() * cols.length) | 0] }));
  let t = 0;
  (function frame() {
    ctx.clearRect(0, 0, c.width, c.height);
    for (const p of parts) {
      p.vy += 0.7; p.vx *= 0.99; p.x += p.vx; p.y += p.vy; p.r += p.vr;
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r); ctx.fillStyle = p.c; ctx.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2); ctx.restore();
    }
    if (++t < 160) requestAnimationFrame(frame); else c.remove();
  })();
}

// ───────── состояние и навигация ─────────
const S = { me: null, tab: null, view: null, overview: null, leagueGroup: null, groupTab: 'members' };
const STUDENT_TABS = [['home', '🗺️', 'Путь'], ['league', '🏆', 'Лига'], ['stats', '📊', 'Статистика'], ['profile', '👤', 'Профиль']];
const ADMIN_TABS = [['dash', '🏠', 'Панель'], ['groups', '👥', 'Группы'], ['tests', '📝', 'Тесты'], ['bot', '🤖', 'Бот']];

function renderNav() {
  const tabs = S.me.isAdmin ? ADMIN_TABS : STUDENT_TABS;
  nav.hidden = false;
  nav.innerHTML = `<div class="in">${tabs.map(([id, e, t]) => `<button data-tab="${id}" class="${S.tab === id ? 'on' : ''}"><span class="e">${e}</span>${t}</button>`).join('')}</div>`;
  $$('[data-tab]', nav).forEach((b) => (b.onclick = () => { haptic('light'); go(b.dataset.tab); }));
}

function go(tab, view = null) {
  S.tab = tab;
  S.view = view;
  renderNav();
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
  const v = S.view;
  S.view = v?.parent || null;
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

function topbar(extraLeft = '') {
  const m = S.me;
  return `<div class="topbar"><div class="row">${extraLeft || (m.groups[0] ? `<span class="pill blue">${esc(m.groups[0].emoji)} ${esc(m.groups[0].name)}</span>` : '<span class="pill">Без группы</span>')}</div>
    <div class="row"><span class="stat-chip fire ${m.streak ? '' : 'off'}">🔥 ${m.streak}</span><span class="stat-chip xp">⚡ ${m.xp}</span></div></div>`;
}

// ═══════════════ УЧЕНИК ═══════════════
async function tabHome() {
  const m = await refreshMe();
  if (!m.groups.length) {
    app.innerHTML = topbar() + emptyState('think', 'Почти готово!', `Учитель скоро добавит тебя в группу.<br>Твой ID: <code>${esc(m.user.id)}</code>`, '<br><button class="btn ghost" data-reload>Обновить</button>');
    $('[data-reload]').onclick = () => tabHome().catch(fail);
    return;
  }
  const byGroup = m.groups.map((g, gi) => ({ g, gi, items: m.path.filter((p) => p.groupId === g.id) }));
  const firstTodo = m.path.find((p) => p.best == null);
  const offs = [0, 46, 72, 46, 0, -46, -72, -46];
  let html = topbar();
  if (!m.path.length) {
    html += emptyState('happy', 'Тестов пока нет', 'Как только учитель отправит тест — он появится здесь, а бот пришлёт уведомление 🔔');
  }
  for (const { g, gi, items } of byGroup) {
    if (!items.length) continue;
    const done = items.filter((p) => p.best != null).length;
    html += `<div class="unit c${gi % 4}"><div><small>Группа · ${done} из ${items.length}</small><h2>${esc(g.emoji)} ${esc(g.name)}</h2></div><div style="font-size:34px">${done === items.length ? '🏅' : '📚'}</div></div><div class="path">`;
    items.forEach((p, i) => {
      const cur = firstTodo && p.pubId === firstTodo.pubId;
      const cls = p.best == null ? (cur ? 'cur' : '') : p.best < 50 ? 'done weak' : 'done';
      const icon = p.best == null ? (cur ? '⭐' : p.emoji) : p.best === 100 ? '👑' : p.emoji;
      const stars = p.stars != null ? `<div class="stars">${'⭐'.repeat(p.stars)}${'<span style="filter:grayscale(1);opacity:.4">⭐</span>'.repeat(3 - p.stars)}</div>` : '';
      html += `<div class="pnode" style="transform:translateX(${offs[i % offs.length]}px)">${cur ? '<div class="bubble">СТАРТ</div>' : ''}
        <button class="node ${cls}" data-pub="${p.pubId}">${icon}</button>${stars}<div class="lbl">${esc(p.title)}${p.best != null ? ` · <span class="${pctClass(p.best)}">${p.best}%</span>` : ''}</div></div>`;
    });
    html += '</div>';
  }
  if (m.feed.length) {
    html += `<div class="section-title"><h2>Лента группы</h2></div><div class="card">${m.feed.map(feedItem).join('')}</div>`;
  }
  app.innerHTML = html;
  $$('[data-pub]').forEach((b) => (b.onclick = () => { haptic('medium'); lessonSheet(m.path.find((p) => p.pubId === b.dataset.pub)); }));
}

function feedItem(f) {
  const icon = f.pct === 100 ? '💎' : f.pct >= 80 ? '🎉' : f.pct >= 50 ? '👍' : '💪';
  return `<div class="feed-item">${avatar({ name: f.name, id: f.userId })}<div class="grow"><b>${esc(f.name)}</b> ${f.practice ? 'потренировался в' : 'прошёл'} «${esc(f.title)}»
    <div class="small muted">${ago(f.at)}${f.combo >= 3 ? ` · комбо ×${f.combo}` : ''}</div></div><div class="score ${pctClass(f.pct)}">${icon} ${f.pct}%</div></div>`;
}

function lessonSheet(p) {
  const again = p.best != null;
  openSheet(
    `<div class="stack center">${mascot(again ? 'happy' : 'wow', 96)}
      <h2>${esc(p.emoji)} ${esc(p.title)}</h2>
      ${p.description ? `<p class="muted">${esc(p.description)}</p>` : ''}
      <div class="tags" style="justify-content:center"><span class="pill blue">🧩 ${plural(p.questions, 'вопрос', 'вопроса', 'вопросов')}</span>${p.topics.slice(0, 4).map((t) => `<span class="pill">${esc(t)}</span>`).join('')}</div>
      ${again ? `<div>${donut(p.best, { size: 110, stroke: 13, sub: 'лучший' })}</div><p class="muted small">Повторное прохождение — тренировка: XP не начисляется, но лучший результат обновится.</p>` : '<p class="muted small">Правильные ответы подряд дают комбо: ×2 и ×3 XP 🔥</p>'}
      <button class="btn block ${again ? 'blue' : ''}" data-go>${again ? 'Пройти ещё раз' : 'Начать'}</button></div>`,
    (el, close) => { $('[data-go]', el).onclick = () => { close(); startLesson({ pubId: p.pubId }); }; },
  );
}

async function tabLeague() {
  const m = S.me || (await refreshMe());
  if (!m.groups.length) { app.innerHTML = topbar() + emptyState('think', 'Лига недоступна', 'Сначала учитель добавит тебя в группу.'); return; }
  S.leagueGroup ||= m.groups[0].id;
  const lb = await api('/leaderboard/' + S.leagueGroup);
  const switcher = m.groups.length > 1 ? `<div class="seg" style="margin-top:14px">${m.groups.map((g) => `<button data-g="${g.id}" class="${g.id === S.leagueGroup ? 'on' : ''}">${esc(g.emoji)} ${esc(g.name)}</button>`).join('')}</div>` : '';
  app.innerHTML = topbar() + switcher + leagueHtml(lb, m.user.id);
  $$('[data-g]').forEach((b) => (b.onclick = () => { S.leagueGroup = b.dataset.g; tabLeague().catch(fail); }));
}

function leagueHtml(lb, meId) {
  const rows = lb.rows;
  const pod = [rows[1], rows[0], rows[2]];
  const podium = rows.length
    ? `<div class="podium">${pod.map((r, i) => (r ? `<div class="p p${[2, 1, 3][i]}">${i === 1 ? '<div style="font-size:26px">👑</div>' : ''}${avatar(r)}<b class="nm ellipsis">${esc(r.name.split(' ')[0])}</b><span class="small" style="color:var(--gold-d)">⚡ ${r.xp}</span><div class="stand">${[2, 1, 3][i]}</div></div>` : '<div></div>')).join('')}</div>`
    : '';
  return `<div class="center" style="margin-top:18px"><h1>🏆 Лига группы</h1><p class="muted">${esc(lb.group.emoji)} ${esc(lb.group.name)} · ${plural(lb.tests, 'тест', 'теста', 'тестов')}</p></div>
    ${podium}
    <div class="card" style="padding:8px">
      <div class="lb-row teacher">${avatar(lb.teacher)}<div class="grow"><b>${esc(lb.teacher.name)}</b><div class="small" style="color:var(--gold-d)">👑 Учитель · ведёт группу</div></div><span style="font-size:22px">🎓</span></div>
      ${rows.length ? '' : '<p class="muted center" style="padding:16px">Пока никто не решал тесты</p>'}
      ${rows.map((r, i) => `${i === 3 ? '<div class="zone">▲ зона лидеров ▲</div>' : ''}<div class="lb-row ${r.userId === meId ? 'me' : ''}" ${S.me.isAdmin ? `data-student="${r.userId}"` : ''}>
        <div class="rk">${r.rank <= 3 ? ['🥇', '🥈', '🥉'][r.rank - 1] : r.rank}</div>${avatar(r)}
        <div class="grow"><b class="ellipsis" style="display:block">${esc(r.name)}${r.userId === meId ? ' (ты)' : ''}</b><div class="small muted">${r.done} ${r.done === 1 ? 'тест' : 'тестов'} · ср. <span class="${pctClass(r.avg)}">${pctText(r.avg)}</span>${r.streak ? ` · 🔥${r.streak}` : ''}</div></div>
        <b style="color:var(--gold-d)">${r.xp} XP</b></div>`).join('')}
    </div>`;
}

function statsHtml(st, { self }) {
  const progress = st.progress.map((p, i) => ({ ...p, short: i + 1 }));
  return `
    <div class="card center" style="margin-top:16px">
      <div class="row" style="justify-content:center;gap:22px;flex-wrap:wrap">
        ${donut(st.overall, { size: 150, stroke: 18, sub: 'успеваемость' })}
        <div style="text-align:left" class="stack">
          <div><b style="font-size:22px">${st.done}</b><span class="muted"> / ${st.total} тестов</span></div>
          <div class="muted small">${st.overall == null ? 'Реши первый тест!' : st.overall >= 80 ? 'Отличный уровень! 🚀' : st.overall >= 50 ? 'Хорошо, есть куда расти 💪' : 'Нужно подтянуть темы 📚'}</div>
        </div>
      </div>
    </div>
    <div class="tiles" style="margin-top:12px">
      <div class="tile"><span class="ic">⚡</span><div><b>${st.xp}</b><span>опыта (XP)</span></div></div>
      <div class="tile"><span class="ic">🔥</span><div><b>${st.streak}</b><span>дней подряд</span></div></div>
      <div class="tile"><span class="ic">🎯</span><div><b>×${st.maxCombo}</b><span>лучшее комбо</span></div></div>
      <div class="tile"><span class="ic">✅</span><div><b>${st.done}</b><span>тестов сдано</span></div></div>
    </div>
    <div class="section-title"><h2>📈 Прогресс</h2></div>
    <div class="card">${lineChart(progress)}<div class="legend"><span><i style="background:var(--green)"></i>${self ? 'Ты' : 'Ученик'}</span><span><i style="background:var(--faint)"></i>Среднее по группе</span></div></div>
    <div class="section-title"><h2>🧭 Карта тем</h2></div>
    <div class="card">${topicsChart(st.topics)}</div>
    <div class="section-title"><h2>⚔️ ${self ? 'Ты' : 'Ученик'} vs группа</h2></div>
    <div class="card">${st.progress.length ? hbars(st.progress.map((p) => ({ label: `${p.emoji} ${p.title}`, value: p.pct, compare: p.groupAvg }))) + `<div class="legend"><span><i style="background:var(--green)"></i>${self ? 'Твой' : 'Его'} результат</span><span><i style="background:var(--faint)"></i>Группа</span></div>` : '<p class="muted center small">Пока нет решённых тестов</p>'}</div>`;
}

async function tabStats() {
  const st = await api('/stats/me');
  app.innerHTML = topbar() + statsHtml(st, { self: true });
}

async function tabProfile() {
  const st = await api('/stats/me');
  const u = st.user;
  app.innerHTML = topbar() + `
    <div class="center" style="margin-top:22px">${avatar(u, 'lg')}<h1 style="margin-top:10px">${esc(u.name)}</h1>
      <p class="muted">${u.username ? '@' + esc(u.username) + ' · ' : ''}с ${new Date(u.joinedAt).toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' })}</p>
      <div class="tags" style="justify-content:center;margin-top:10px">${st.groups.map((g) => `<span class="pill blue">${esc(g.emoji)} ${esc(g.name)}</span>`).join('') || '<span class="pill">Без группы</span>'}</div></div>
    <div class="section-title"><h2>🏅 Достижения</h2><span class="muted small">${st.achievements.filter((a) => a.got).length}/${st.achievements.length}</span></div>
    <div class="ach">${st.achievements.map((a) => `<div class="a ${a.got ? '' : 'off'}"><div class="i">${a.icon}</div><b>${esc(a.title)}</b><span>${esc(a.desc)}</span></div>`).join('')}</div>
    <div class="section-title"><h2>ℹ️ Как это работает</h2></div>
    <div class="card small stack muted">
      <p>⚡ <b>XP</b> — 10 за правильный ответ. 3 подряд — ×2, 5 подряд — ×3. За 100% — бонус +20.</p>
      <p>🔥 <b>Серия</b> — решай хотя бы один тест в день.</p>
      <p>⭐ <b>Звёзды</b> — 50% = 1, 80% = 2, 100% = 3.</p>
      <p>🔁 Ошибки повторяются в конце теста — «работа над ошибками».</p>
    </div>
    <p class="center faint small" style="margin-top:18px">ID: ${esc(u.id)}</p>`;
}

// ═══════════════ ПРОХОЖДЕНИЕ ТЕСТА ═══════════════
const KIND = { choice: 'Выбери правильный ответ', truefalse: 'Верно или нет?', input: 'Напиши ответ', order: 'Составь ответ', match: 'Найди пары' };

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
      <div class="ptop"><button class="pclose" data-close>✕</button><div class="pbar"><i style="width:${(doneCount() / total()) * 100}%"></i></div>
        <span class="combo ${P.combo >= 2 ? '' : 'faint'}" data-combo>${P.combo >= 2 ? `🔥 ${P.combo}` : ''}</span></div>
      <div class="pbody">
        ${P.phase === 'review' ? '<div class="qkind review">🔁 Работа над ошибками</div>' : data.preview ? '<div class="qkind">👁 Превью учителя</div>' : ''}
        <div class="qkind">${KIND[q.type]}${q.topic ? ` · <span class="faint">${esc(q.topic)}</span>` : ''}</div>
        ${q.type === 'choice' || q.type === 'input' ? `<div class="qhead">${mascot('think', 74)}<div class="qprompt">${esc(q.prompt)}</div></div>` : `<div class="qprompt">${esc(q.prompt)}</div>`}
        ${q.code ? `<pre class="code">${esc(q.code)}</pre>` : ''}
        <div data-area></div>
        ${q.hint ? `<p class="small muted" style="margin-top:16px">💡 <span class="link" data-hint>Подсказка</span></p>` : ''}
      </div>
      <div class="pfoot"><div class="in"><div data-fb></div><button class="btn block" data-check disabled>Проверить</button></div></div>`;
    $('[data-close]', el).onclick = close;
    const hint = $('[data-hint]', el);
    if (hint) hint.onclick = () => { hint.parentElement.innerHTML = '💡 ' + esc(q.hint); };
    renderArea(q);
    $('[data-check]', el).onclick = () => (P.answered ? next() : check(qi));
  }

  const setReady = (v) => { P.ready = v; $('[data-check]', el).disabled = !v; };

  function renderArea(q) {
    const area = $('[data-area]', el);
    if (q.type === 'choice') {
      area.innerHTML = `<div class="opts">${q.options.map((o, i) => `<button class="opt" data-i="${i}"><span class="k">${i + 1}</span><span>${esc(o)}</span></button>`).join('')}</div>`;
      $$('.opt', area).forEach((b) => (b.onclick = () => { if (P.answered) return; haptic('light'); $$('.opt', area).forEach((x) => x.classList.remove('on')); b.classList.add('on'); P.value = Number(b.dataset.i); setReady(true); }));
    } else if (q.type === 'truefalse') {
      area.innerHTML = `<div class="tf"><button class="opt" data-v="1"><span class="big">✅</span>Верно</button><button class="opt" data-v="0"><span class="big">❌</span>Неверно</button></div>`;
      $$('.opt', area).forEach((b) => (b.onclick = () => { if (P.answered) return; haptic('light'); $$('.opt', area).forEach((x) => x.classList.remove('on')); b.classList.add('on'); P.value = b.dataset.v === '1'; setReady(true); }));
    } else if (q.type === 'input') {
      area.innerHTML = `<input class="input" style="font-size:18px;padding:16px" placeholder="${esc(q.placeholder)}" autocomplete="off" autocapitalize="off" spellcheck="false">`;
      const inp = $('input', area);
      inp.oninput = () => { P.value = inp.value; setReady(inp.value.trim().length > 0); };
      inp.onkeydown = (e) => { if (e.key === 'Enter' && P.ready) { inp.blur(); $('[data-check]', el).click(); } };
      setTimeout(() => inp.focus(), 200);
    } else if (q.type === 'order') {
      const picked = [];
      const draw = () => {
        area.innerHTML = `<div class="answer-line">${picked.map((bi, k) => `<button class="chip" data-k="${k}">${esc(q.bank[bi])}</button>`).join('')}</div>
          <div class="bank">${q.bank.map((t, bi) => `<button class="chip ${picked.includes(bi) ? 'ghost' : ''}" data-b="${bi}">${esc(t)}</button>`).join('')}</div>`;
        $$('[data-b]', area).forEach((b) => (b.onclick = () => { const bi = Number(b.dataset.b); if (P.answered || picked.includes(bi)) return; haptic('light'); picked.push(bi); draw(); }));
        $$('[data-k]', area).forEach((b) => (b.onclick = () => { if (P.answered) return; picked.splice(Number(b.dataset.k), 1); draw(); }));
        P.value = picked.map((bi) => q.bank[bi]);
        setReady(picked.length > 0);
      };
      draw();
    } else if (q.type === 'match') {
      const pairs = {}; // левый индекс -> правый индекс
      let selL = null;
      const pc = ['var(--blue)', 'var(--purple)', 'var(--orange)', 'var(--green)', 'var(--red)', '#2b70c9', 'var(--gold-d)', '#00cd9c'];
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
      selL = 0;
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
        f.textContent = `+${r.xpGained} XP${r.mult > 1 ? ` ×${r.mult}` : ''}`;
        document.body.appendChild(f);
        setTimeout(() => f.remove(), 900);
      }
      const c = $('[data-combo]', el);
      c.textContent = P.combo >= 2 ? `🔥 ${P.combo}` : '';
      c.className = 'combo' + (P.combo >= 2 ? ' pop' : '');
    }
    const praise = ['Отлично!', 'Супер!', 'Так держать!', 'В точку!', 'Молодец!', 'Блестяще!'];
    if (r.correct) { sfx.ok(); haptic('success'); foot.className = 'pfoot ok'; }
    else { sfx.bad(); haptic('error'); foot.className = 'pfoot bad'; $('.pbody', el).classList.add('shake'); }
    $('[data-fb]', el).innerHTML = `<div class="fb"><div class="ic">${r.correct ? '🎉' : '😬'}</div><div>
      <h3>${r.correct ? praise[Math.floor(Math.random() * praise.length)] + (P.phase === 'main' && P.combo >= 3 ? ` Комбо ×${P.combo}!` : '') : 'Неправильно'}</h3>
      ${r.correct ? '' : `<p>Правильно: <b>${esc(r.correctText)}</b></p>`}
      ${r.explain ? `<p class="expl">${esc(r.explain)}</p>` : ''}</div></div>`;
    btn.className = 'btn block ' + (r.correct ? '' : 'red');
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
      el.innerHTML = `<div class="pbody center" style="display:grid;place-items:center;align-content:center;gap:14px">${mascot('think', 140, 'jump')}
        <h1>Работа над ошибками 💪</h1><p class="muted">Повторим вопросы, где ты ошибся. На оценку это уже не влияет.</p></div>
        <div class="pfoot"><div class="in"><button class="btn block" data-go>Поехали</button></div></div>`;
      $('[data-go]', el).onclick = render;
      return;
    }
    finish();
  }

  async function finish() {
    let r;
    try { r = await api(`/attempts/${data.attemptId}/finish`, {}); } catch (e) { return fail(e); }
    try { tg?.disableClosingConfirmation?.(); } catch { /* */ }
    const mood = r.pct >= 80 ? 'happy' : r.pct >= 50 ? 'wow' : 'sad';
    const title = r.pct === 100 ? 'Идеально! 💎' : r.pct >= 80 ? 'Урок пройден!' : r.pct >= 50 ? 'Неплохо!' : 'Есть над чем поработать';
    if (r.pct >= 80) { sfx.win(); setTimeout(confetti, 250); }
    haptic(r.pct >= 50 ? 'success' : 'warning');
    const mins = Math.floor(r.durationSec / 60), secs = r.durationSec % 60;
    el.innerHTML = `<div class="pbody"><div class="result">
      ${mascot(mood, 130, 'jump')}
      <h1>${title}</h1>
      <p class="muted">${esc(data.lesson.emoji)} ${esc(data.lesson.title)}${r.practice ? ' · тренировка' : r.preview ? ' · превью' : ''}</p>
      <div style="margin-top:16px">${donut(r.pct, { size: 170, stroke: 20, sub: `${r.correct} из ${r.total}` })}</div>
      <div class="tiles3">
        <div class="rtile gold"><div class="h">Опыт</div><div class="v">⚡ ${r.xp}</div></div>
        <div class="rtile green"><div class="h">Комбо</div><div class="v">🔥 ${r.maxCombo}</div></div>
        <div class="rtile blue"><div class="h">Время</div><div class="v">⏱ ${mins}:${String(secs).padStart(2, '0')}</div></div>
      </div>
      ${r.group && r.group.avg != null ? `<div class="card" style="text-align:left;margin-bottom:12px"><div class="row between" style="margin-bottom:10px"><h3>⚔️ Ты vs группа</h3>${r.group.rank ? `<span class="pill gold">#${r.group.rank} из ${r.group.done}</span>` : ''}</div>
        ${hbars([{ label: 'Твой результат', value: r.pct }, { label: `Среднее по группе (сдали ${r.group.done} из ${r.group.size})`, value: r.group.avg, color: 'var(--faint)' }])}</div>` : ''}
      ${r.topics.length ? `<div class="card" style="text-align:left;margin-bottom:12px"><h3 style="margin-bottom:12px">🧭 По темам</h3>${r.topics.length >= 3 ? radar(r.topics) : hbars(r.topics.map((t) => ({ label: t.topic, value: t.pct, right: `${t.correct}/${t.total}` })))}</div>` : ''}
      <div class="card qlist" style="margin-bottom:12px"><h3 style="margin-bottom:6px">📝 Ответы</h3>${r.questions.map((q) => `<div><span>${q.correct ? '✅' : '❌'}</span><span>${esc(q.prompt)}</span></div>`).join('')}</div>
      ${r.streak ? `<p class="muted">🔥 Серия: ${plural(r.streak, 'день', 'дня', 'дней')} подряд</p>` : ''}
    </div></div>
    <div class="pfoot"><div class="in"><button class="btn block" data-done>Продолжить</button></div></div>`;
    $('[data-done]', el).onclick = () => { el.remove(); if (S.view) tg?.BackButton?.show(); route().catch(fail); };
  }

  render();
}

// ═══════════════ УЧИТЕЛЬ ═══════════════
const EMOJIS = ['📘', '📗', '📕', '📙', '🧪', '💻', '🧮', '🌍', '🎨', '🎵', '⚽', '🚀', '🧠', '🔬', '✍️', '🦉'];

async function loadOverview() {
  S.overview = await api('/admin/overview');
  return S.overview;
}

function adminTop(title) {
  return `<div class="topbar"><h2>${title}</h2><span class="pill gold">👑 Учитель</span></div>`;
}

async function tabDash() {
  const [o] = await Promise.all([loadOverview(), refreshMe()]);
  const t = o.totals;
  app.innerHTML = adminTop('Панель') + `
    <div class="row" style="margin-top:18px;gap:14px">${mascot('happy', 80)}<div><h1>Привет, ${esc(S.me.user.name.split(' ')[0])}!</h1><p class="muted">Вот что происходит на курсе</p></div></div>
    <div class="tiles" style="margin-top:16px">
      <div class="tile"><span class="ic">🧑‍🎓</span><div><b>${t.students}</b><span>учеников</span></div></div>
      <div class="tile"><span class="ic">👥</span><div><b>${t.groups}</b><span>групп</span></div></div>
      <div class="tile"><span class="ic">📤</span><div><b>${t.sent}</b><span>тестов отправлено</span></div></div>
      <div class="tile"><span class="ic">🎯</span><div><b class="${pctClass(t.avg)}">${pctText(t.avg)}</b><span>средний балл</span></div></div>
    </div>
    ${o.unassigned.length ? `<div class="section-title"><h2>🆕 Новые ученики</h2><span class="pill red">${o.unassigned.length}</span></div>
      <div class="card" style="padding:8px">${o.unassigned.map((u) => `<div class="lb-row">${avatar(u)}<div class="grow"><b class="ellipsis" style="display:block">${esc(u.name)}</b><div class="small muted">${u.username ? '@' + esc(u.username) + ' · ' : ''}${ago(u.joinedAt)}</div></div><button class="btn sm" data-assign="${u.id}">В группу</button></div>`).join('')}</div>` : ''}
    <div class="section-title"><h2>👥 Группы</h2><button class="link" data-newgroup>+ Создать</button></div>
    ${o.groups.length ? o.groups.map(groupCardHtml).join('<div style="height:10px"></div>') : `<div class="card center stack"><p class="muted">Групп пока нет</p><button class="btn" data-newgroup>Создать первую группу</button></div>`}
    ${o.feed.length ? `<div class="section-title"><h2>⚡ Последние результаты</h2></div><div class="card">${o.feed.map(feedItem).join('')}</div>` : ''}`;
  bindGroupCards();
  $$('[data-newgroup]').forEach((b) => (b.onclick = () => groupForm()));
  $$('[data-assign]').forEach((b) => (b.onclick = () => assignSheet(b.dataset.assign)));
}

function groupCardHtml(g) {
  return `<div class="card tap row" data-group="${g.id}" style="gap:14px">${donut(g.avg, { size: 64, stroke: 8, label: g.avg == null ? '—' : g.avg + '' })}
    <div class="grow"><h3>${esc(g.emoji)} ${esc(g.name)}</h3><div class="small muted">${plural(g.members.length, 'ученик', 'ученика', 'учеников')} · ${plural(g.tests, 'тест', 'теста', 'тестов')}</div>
    <div class="small" style="margin-top:4px">${g.linked ? `<span class="pill green">💬 ${esc(g.chatTitle || 'чат привязан')}</span>` : '<span class="pill">чат не привязан</span>'}</div></div><span class="faint" style="font-size:22px">›</span></div>`;
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
      ${o.groups.map((g) => `<button class="list-check" style="width:100%" data-g="${g.id}"><span style="font-size:24px">${esc(g.emoji)}</span><b class="grow" style="text-align:left">${esc(g.name)}</b><span class="muted small">${g.members.length}</span></button>`).join('')}
      <button class="btn ghost block" data-new>+ Новая группа</button></div>`,
    (el, close) => {
      $$('[data-g]', el).forEach((b) => (b.onclick = async () => {
        try { await api(`/admin/groups/${b.dataset.g}/members`, { userId: uid }); haptic('success'); toast('Добавлен ✅'); close(); route().catch(fail); } catch (e) { fail(e); }
      }));
      $('[data-new]', el).onclick = () => { close(); groupForm(() => assignSheet(uid)); };
    },
  );
}

function groupForm(after, existing) {
  let emoji = existing?.emoji || EMOJIS[0];
  openSheet(
    `<div class="stack"><h2>${existing ? 'Изменить группу' : 'Новая группа'}</h2>
      <label class="field"><span>Название</span><input class="input" data-name maxlength="40" placeholder="Например: Вечерняя группа" value="${esc(existing?.name || '')}"></label>
      <div class="field"><span>Иконка</span><div class="emoji-pick">${EMOJIS.map((e) => `<button data-e="${e}" class="${e === emoji ? 'on' : ''}">${e}</button>`).join('')}</div></div>
      <button class="btn block" data-save>${existing ? 'Сохранить' : 'Создать группу'}</button></div>`,
    (el, close) => {
      $$('[data-e]', el).forEach((b) => (b.onclick = () => { emoji = b.dataset.e; $$('[data-e]', el).forEach((x) => x.classList.toggle('on', x === b)); }));
      const inp = $('[data-name]', el);
      setTimeout(() => inp.focus(), 250);
      $('[data-save]', el).onclick = async () => {
        if (!inp.value.trim()) return inp.focus();
        try {
          if (existing) await patch('/admin/groups/' + existing.id, { name: inp.value, emoji });
          else await api('/admin/groups', { name: inp.value, emoji });
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
  app.innerHTML = adminTop('Группы') + `<div style="margin-top:16px"><button class="btn block" data-newgroup>+ Создать группу</button></div>
    <div class="stack" style="margin-top:16px">${o.groups.map(groupCardHtml).join('') || emptyState('think', 'Групп пока нет', 'Создай группу и добавь туда учеников. Ученики сначала запускают бота командой /start.')}</div>
    <div class="section-title"><h2>🧑‍🎓 Все ученики</h2><span class="muted small">${o.students.length}</span></div>
    <div class="card" style="padding:8px">${o.students.length ? o.students.map((u) => `<div class="lb-row" data-student="${u.id}">${avatar(u)}<div class="grow"><b class="ellipsis" style="display:block">${esc(u.name)}</b><div class="small muted">${u.groups.map((gid) => o.groups.find((g) => g.id === gid)).filter(Boolean).map((g) => esc(g.emoji + ' ' + g.name)).join(', ') || '<span class="c-bad">без группы</span>'}</div></div><span class="faint">›</span></div>`).join('') : '<p class="muted center small" style="padding:14px">Пока никто не запускал бота. Отправь ученикам ссылку на бота — после /start они появятся здесь.</p>'}</div>`;
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
    body = `<button class="btn block" data-add style="margin-top:14px">+ Добавить учеников</button>
      <div class="card" style="padding:8px;margin-top:14px">${rows.length ? rows.map((r) => `<div class="lb-row" data-student="${r.userId}">${avatar(r)}<div class="grow"><b class="ellipsis" style="display:block">${esc(r.name)}</b>
        <div class="small muted">${r.done}/${st.tests.length} тестов · ср. <span class="${pctClass(r.avg)}">${pctText(r.avg)}</span> · ⚡${r.xp}</div></div>
        <button class="btn ghost dark sm icon" data-rm="${r.userId}" title="Убрать">✕</button></div>`).join('') : '<p class="muted center small" style="padding:14px">В группе пока нет учеников</p>'}</div>`;
  } else if (S.groupTab === 'stats') {
    body = !st.tests.length
      ? emptyState('think', 'Тестов ещё не было', 'Отправь группе тест во вкладке «Тесты».')
      : `<div class="section-title"><h2>📊 Средний балл по тестам</h2></div>
        <div class="card">${hbars(st.tests.map((t) => ({ label: `${t.emoji} ${t.title}`, value: t.avg, right: `${pctText(t.avg)} · ${t.done}/${t.size}` })))}</div>
        <div class="section-title"><h2>🗺️ Карта группы</h2></div>
        <div class="card scroll-x">${st.heat.length ? `<table class="heat"><tr><th></th>${st.tests.map((t, i) => `<th title="${esc(t.title)}">${t.emoji}<br>${i + 1}</th>`).join('')}<th>Ср.</th></tr>
          ${st.heat.map((r) => `<tr><td class="nm">${esc(r.name)}</td>${r.cells.map((c) => (c == null ? '<td class="na">—</td>' : `<td style="background:${pctColor(c)}">${c}</td>`)).join('')}<td style="background:${pctColor(r.avg)}">${r.avg ?? '—'}</td></tr>`).join('')}</table>` : '<p class="muted small center">Нет учеников</p>'}</div>
        ${st.hardest.length ? `<div class="section-title"><h2>🧱 Самые сложные вопросы</h2></div><div class="card">${hbars(st.hardest.map((q) => ({ label: q.prompt, value: q.pct, right: `${q.pct}% верно` })))}</div>` : ''}
        <div class="section-title"><h2>⏳ Кто ещё не сдал</h2></div>
        <div class="card stack">${st.tests.map((t) => `<div><b>${esc(t.emoji)} ${esc(t.title)}</b><div class="small ${t.notDone.length ? 'c-bad' : 'c-good'}">${t.notDone.length ? esc(t.notDone.join(', ')) : 'Все сдали 🎉'}</div></div>`).join('')}</div>`;
  } else {
    body = leagueHtml(st.leaderboard, null);
  }
  app.innerHTML = `<div class="topbar"><button class="back" data-back>‹ Назад</button><div class="row"><button class="btn ghost dark sm" data-edit>✏️</button><button class="btn ghost dark sm" data-delg>🗑</button></div></div>
    <div class="row" style="margin-top:16px;gap:14px">${donut(g.avg, { size: 84, stroke: 10, sub: 'ср.' })}<div class="grow"><h1>${esc(g.emoji)} ${esc(g.name)}</h1>
      <p class="muted small">${plural(g.members.length, 'ученик', 'ученика', 'учеников')} · ${plural(g.tests, 'тест', 'теста', 'тестов')}</p></div></div>
    <div class="card ${g.linked ? '' : 'hl'} small" style="margin-top:14px">${g.linked ? `💬 Чат «<b>${esc(g.chatTitle)}</b>» привязан — бот пишет туда о тестах и напоминания.` : '💬 <b>Чат не привязан.</b> Добавь бота в Telegram-группу и напиши там <code>/link</code>. Пока бот пишет ученикам в личку.'}</div>
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
      ${cand.length ? `<p class="muted small">Ученики, которые уже запускали бота:</p><div>${cand.map((u) => `<button class="list-check" style="width:100%" data-u="${u.id}">${avatar(u)}<div class="grow" style="text-align:left"><b>${esc(u.name)}</b><div class="small muted">${u.groups.length ? 'уже в другой группе' : 'без группы'}</div></div><span data-mark>⬜</span></button>`).join('')}</div>` : '<p class="muted small">Все, кто запускал бота, уже в этой группе.</p>'}
      <label class="field"><span>…или по @username / Telegram ID</span><input class="input" data-manual placeholder="@username или 123456789"></label>
      <button class="btn block" data-save>Добавить</button></div>`,
    (el, close) => {
      $$('[data-u]', el).forEach((b) => (b.onclick = () => {
        const id = b.dataset.u;
        picked.has(id) ? picked.delete(id) : picked.add(id);
        b.classList.toggle('on', picked.has(id));
        $('[data-mark]', b).textContent = picked.has(id) ? '✅' : '⬜';
      }));
      $('[data-save]', el).onclick = async () => {
        const manual = $('[data-manual]', el).value.trim();
        try {
          for (const id of picked) await api(`/admin/groups/${g.id}/members`, { userId: id });
          if (manual) await api(`/admin/groups/${g.id}/members`, /^\d+$/.test(manual) ? { userId: manual } : { username: manual });
          if (!picked.size && !manual) return;
          haptic('success');
          toast('Добавлено ✅');
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
  app.innerHTML = `<div class="topbar"><button class="back" data-back>‹ Назад</button><span class="pill">ID ${esc(u?.id || uid)}</span></div>
    <div class="row" style="margin-top:16px;gap:14px">${avatar(u, 'lg')}<div class="grow"><h1>${esc(u?.name || 'Ученик')}</h1>
      <p class="muted small">${u?.username ? '@' + esc(u.username) + ' · ' : ''}${st.groups.map((g) => esc(g.emoji + ' ' + g.name)).join(', ') || 'без группы'}</p>
      <div class="tags" style="margin-top:6px">${st.achievements.filter((a) => a.got).map((a) => `<span title="${esc(a.title)}">${a.icon}</span>`).join(' ')}</div></div></div>
    ${statsHtml(st, { self: false })}
    <div style="margin-top:16px"><button class="btn ghost block" data-assign="${esc(uid)}">+ Добавить в группу</button></div>`;
  $('[data-back]').onclick = back;
  $('[data-assign]').onclick = async () => { if (!S.overview) await loadOverview(); assignSheet(uid); };
}

async function tabTests() {
  const o = await loadOverview();
  app.innerHTML = adminTop('Тесты') + `
    <div class="card hl" style="margin-top:16px"><div class="row" style="align-items:flex-start">${mascot('wow', 64)}<div class="grow small">
      <b style="font-size:15px">Как появляются тесты</b><p class="muted" style="margin-top:4px">Пришли конспект урока Claude — он сделает из него тест в стиле Duolingo. Тест появится здесь как черновик. Ученики его не видят, пока ты не нажмёшь «Отправить».</p></div></div></div>
    <div class="stack" style="margin-top:16px">${o.lessons.map(lessonCardHtml).join('') || emptyState('think', 'Тестов пока нет', 'Жду конспект — пришли его Claude.')}</div>`;
  $$('[data-preview]').forEach((b) => (b.onclick = () => startLesson({ lessonId: b.dataset.preview })));
  $$('[data-send]').forEach((b) => (b.onclick = () => sendSheet(o.lessons.find((l) => l.id === b.dataset.send))));
  $$('[data-pubinfo]').forEach((b) => (b.onclick = () => pubSheet(b.dataset.pubinfo)));
  $$('[data-dell]').forEach((b) => (b.onclick = async () => {
    if (!(await confirmSheet('Удалить черновик?', '', 'Удалить', true))) return;
    try { await del('/admin/lessons/' + b.dataset.dell); tabTests().catch(fail); } catch (e) { fail(e); }
  }));
}

const TYPE_LABEL = { choice: 'выбор', truefalse: 'верно/неверно', input: 'ввод', order: 'порядок', match: 'пары' };
function lessonCardHtml(l) {
  return `<div class="card">
    <div class="row" style="align-items:flex-start"><div style="font-size:36px;line-height:1">${esc(l.emoji)}</div><div class="grow"><h3>${esc(l.title)}</h3>
      ${l.description ? `<p class="small muted">${esc(l.description)}</p>` : ''}
      <div class="tags" style="margin-top:8px"><span class="pill blue">🧩 ${l.questions}</span>${l.types.map((t) => `<span class="pill">${TYPE_LABEL[t] || t}</span>`).join('')}</div></div>
      ${l.sentTo.length ? '' : `<span class="pill gold">черновик</span>`}</div>
    ${l.topics.length ? `<p class="small muted" style="margin-top:10px">Темы: ${l.topics.map(esc).join(' · ')}</p>` : ''}
    ${l.sentTo.length ? `<div style="margin-top:12px">${l.sentTo.map((s) => `<button class="list-check" style="width:100%" data-pubinfo="${s.pubId}"><div class="grow" style="text-align:left"><b>📤 ${esc(s.groupName)}</b><div class="small muted">сдали ${s.done}/${s.size} · ${ago(s.publishedAt)}</div></div><b class="${pctClass(s.avg)}">${pctText(s.avg)}</b></button>`).join('')}</div>` : ''}
    <div class="row" style="margin-top:12px"><button class="btn ghost sm" data-preview="${l.id}">👁 Превью</button><button class="btn sm grow" data-send="${l.id}">📤 Отправить</button>${l.sentTo.length ? '' : `<button class="btn ghost dark sm icon" data-dell="${l.id}">🗑</button>`}</div>
  </div>`;
}

function sendSheet(l) {
  const o = S.overview;
  if (!o.groups.length) {
    openSheet(`<div class="stack center">${mascot('think', 90)}<h2>Сначала создай группу</h2><p class="muted">Тест отправляется группе. Групп пока нет.</p><button class="btn block" data-new>Создать группу</button></div>`,
      (el, close) => { $('[data-new]', el).onclick = () => { close(); groupForm(() => sendSheet(l)); }; });
    return;
  }
  const sent = new Set(l.sentTo.map((s) => s.groupId));
  let gid = o.groups.find((g) => !sent.has(g.id))?.id || null;
  let interval = 0;
  openSheet(
    `<div class="stack"><h2>📤 Отправить тест</h2><p class="muted">${esc(l.emoji)} ${esc(l.title)}</p>
      <p class="small muted">Какой группе?</p>
      <div>${o.groups.map((g) => `<button class="list-check ${g.id === gid ? 'on' : ''}" style="width:100%" data-g="${g.id}" ${sent.has(g.id) ? 'disabled' : ''}><span style="font-size:24px">${esc(g.emoji)}</span><div class="grow" style="text-align:left"><b>${esc(g.name)}</b><div class="small muted">${sent.has(g.id) ? 'уже отправлен' : plural(g.members.length, 'ученик', 'ученика', 'учеников') + (g.linked ? ' · 💬 чат' : ' · в личку')}</div></div></button>`).join('')}</div>
      <button class="link small" data-new style="text-align:left">+ Новая группа</button>
      <div class="field"><span>🔔 Напоминать, пока все не сдадут</span><div class="choices">${[[0, 'Нет'], [30, '30 мин'], [60, '1 ч'], [180, '3 ч'], [1440, '1 день']].map(([v, t]) => `<button class="choice ${v === interval ? 'on' : ''}" data-int="${v}">${t}</button>`).join('')}</div></div>
      <label class="field" data-remtext hidden><span>Текст напоминания</span><input class="input" maxlength="300" value="Не забудьте решить тест «${esc(l.title)}»! 💪"></label>
      <button class="btn block" data-go ${gid ? '' : 'disabled'}>Отправить</button></div>`,
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
          toast('Тест отправлен 🚀');
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
    `<div class="stack"><h2>${esc(s.emoji)} ${esc(s.title)}</h2><p class="muted">📤 ${esc(s.groupName)} · ${ago(s.publishedAt)}</p>
      <div class="row" style="gap:16px">${donut(s.avg, { size: 96, stroke: 12, sub: 'среднее' })}<div class="stack small"><div>✅ Сдали: <b>${s.done.length}</b> из ${s.size}</div><div class="c-bad">⏳ ${s.notDone.length ? esc(names(s.notDone).join(', ')) : 'Все сдали 🎉'}</div></div></div>
      ${s.ranking.length ? `<h3>🏁 Рейтинг</h3><div>${s.ranking.map((r, i) => `<div class="lb-row"><div class="rk">${i < 3 ? ['🥇', '🥈', '🥉'][i] : i + 1}</div><b class="grow">${esc(r.name)}</b><b class="${pctClass(r.pct)}">${r.pct}%</b></div>`).join('')}</div>` : ''}
      ${s.questions.some((q) => q.total) ? `<h3>🧩 По вопросам (1-я попытка)</h3>${hbars(s.questions.map((q, i) => ({ label: `${i + 1}. ${q.prompt}`, value: q.pct })))}` : ''}
      <button class="btn ghost dark block" data-unpub>Отозвать тест у группы</button></div>`,
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
  const groupOpts = o.groups.map((g) => `<option value="${g.id}">${esc(g.emoji)} ${esc(g.name)}</option>`).join('');
  app.innerHTML = adminTop('Бот') + `
    <div class="section-title"><h2>💬 Подключить чат группы</h2></div>
    <div class="card"><ol class="steps small">
      <li>Создай Telegram-группу (или открой существующую) и добавь туда бота.</li>
      <li>Напиши в этой группе <code>/link</code> и выбери группу курса.</li>
      <li>Готово: бот будет писать туда о новых тестах и напоминания и звать играть. Без чата бот пишет ученикам в личку.</li>
    </ol></div>
    ${o.groups.length ? `
    <div class="section-title"><h2>📣 Написать сейчас</h2></div>
    <div class="card stack">
      <select class="input" data-ag>${groupOpts}</select>
      <textarea class="input" data-at placeholder="Например: Ребята, завтра урок в 18:00! Не забудьте решить тест 😉"></textarea>
      <button class="btn blue block" data-send>Отправить от бота</button>
    </div>
    <div class="section-title"><h2>⏰ Новое напоминание</h2></div>
    <div class="card stack">
      <label class="field"><span>Группа</span><select class="input" data-rg>${groupOpts}</select></label>
      <label class="field"><span>Про какой тест (бот покажет, кто ещё не сдал, и сам остановится, когда сдадут все)</span><select class="input" data-rp></select></label>
      <label class="field"><span>Что писать</span><textarea class="input" data-rt placeholder="Заходите и решайте тест! 💪"></textarea></label>
      <div class="field"><span>Как часто</span><div class="choices" data-ri>${[[15, '15 мин'], [30, '30 мин'], [60, '1 ч'], [180, '3 ч'], [720, '12 ч'], [1440, '1 день']].map(([v, t]) => `<button class="choice ${v === 60 ? 'on' : ''}" data-v="${v}">${t}</button>`).join('')}</div></div>
      <label class="field"><span>Сколько раз максимум</span><input class="input" type="number" min="1" max="100" value="5" data-rm></label>
      <button class="btn block" data-rcreate>Запустить напоминание</button>
    </div>` : `<div class="card center" style="margin-top:16px"><p class="muted">Сначала создай группу во вкладке «Группы».</p></div>`}
    <div class="section-title"><h2>📋 Напоминания</h2></div>
    <div class="stack">${rems.length ? rems.map((r) => `<div class="card"><div class="row between"><b>${esc(r.groupName)}</b>${r.active ? '<span class="pill green">● активно</span>' : '<span class="pill">пауза</span>'}</div>
      <p style="margin:8px 0">${esc(r.text)}</p>
      <p class="small muted">каждые ${r.intervalMin >= 60 ? r.intervalMin / 60 + ' ч' : r.intervalMin + ' мин'} · отправлено ${r.sent}/${r.maxCount}${r.testTitle ? ` · 🧩 ${esc(r.testTitle)}` : ''}${r.active ? ` · следующее ${new Date(r.nextAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}` : ''}</p>
      <div class="row" style="margin-top:10px"><button class="btn ghost sm grow" data-toggle="${r.id}" data-on="${r.active ? 0 : 1}">${r.active ? '⏸ Пауза' : '▶️ Возобновить'}</button><button class="btn ghost dark sm icon" data-rdel="${r.id}">🗑</button></div></div>`).join('') : '<p class="muted center small">Напоминаний нет</p>'}</div>`;

  const send = $('[data-send]');
  if (send) send.onclick = async () => {
    const text = $('[data-at]').value.trim();
    if (!text) return $('[data-at]').focus();
    try { const r = await api('/admin/announce', { groupId: $('[data-ag]').value, text }); toast(r.ok ? 'Отправлено ✅' : 'Не удалось отправить: привяжи чат или попроси учеников запустить бота', !r.ok); if (r.ok) $('[data-at]').value = ''; } catch (e) { fail(e); }
  };
  const rg = $('[data-rg]');
  if (rg) {
    const fillTests = () => {
      const pubs = o.lessons.flatMap((l) => l.sentTo.filter((s) => s.groupId === rg.value).map((s) => ({ ...s, title: l.title, emoji: l.emoji })));
      $('[data-rp]').innerHTML = `<option value="">— просто сообщение, без теста —</option>` + pubs.map((p) => `<option value="${p.pubId}">${esc(p.emoji)} ${esc(p.title)} (сдали ${p.done}/${p.size})</option>`).join('');
    };
    rg.onchange = fillTests;
    fillTests();
    let interval = 60;
    $$('[data-ri] [data-v]').forEach((b) => (b.onclick = () => { interval = Number(b.dataset.v); $$('[data-ri] [data-v]').forEach((x) => x.classList.toggle('on', x === b)); }));
    $('[data-rcreate]').onclick = async () => {
      try {
        await api('/admin/reminders', { groupId: rg.value, pubId: $('[data-rp]').value || null, text: $('[data-rt]').value, intervalMin: interval, maxCount: Number($('[data-rm]').value) });
        haptic('success');
        toast('Напоминание запущено ⏰ Первое уйдёт в течение минуты');
        tabBot().catch(fail);
      } catch (e) { fail(e); }
    };
  }
  $$('[data-toggle]').forEach((b) => (b.onclick = async () => { try { await patch('/admin/reminders/' + b.dataset.toggle, { active: b.dataset.on === '1' }); tabBot().catch(fail); } catch (e) { fail(e); } }));
  $$('[data-rdel]').forEach((b) => (b.onclick = async () => { try { await del('/admin/reminders/' + b.dataset.rdel); tabBot().catch(fail); } catch (e) { fail(e); } }));
}

// ───────── старт ─────────
function applyTheme() {
  const dark = tg?.colorScheme ? tg.colorScheme === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  try {
    const bg = getComputedStyle(document.documentElement).getPropertyValue('--bg').trim();
    tg?.setHeaderColor?.(bg);
    tg?.setBackgroundColor?.(bg);
    tg?.setBottomBarColor?.(bg);
  } catch { /* старые клиенты */ }
}

(async function boot() {
  tg?.ready();
  tg?.expand();
  applyTheme();
  tg?.onEvent?.('themeChanged', applyTheme);
  try {
    await refreshMe();
    S.tab = S.me.isAdmin ? 'dash' : 'home';
    renderNav();
    await route();
  } catch (e) {
    app.innerHTML = emptyState('sad', 'Не получилось войти', esc(e.message) + (tg?.initData ? '' : '<br><br>Открой приложение через бота в Telegram.'));
  }
})();
