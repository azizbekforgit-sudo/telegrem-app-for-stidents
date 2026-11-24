// Общение учеников и «свой путь»: страницы учеников, вопросы друг другу, оценки друг другу (XP, до 150 в неделю),
// звания недели, одежда для питомцев, просьбы об одежде, «Дом для питомца» (испытания с кодом),
// вопрос «зачем мне это» после испытания и опрос интересов (включает учитель через content/interest.json).
import { checkAnswer } from './grading.js';

const DAY = 864e5;
const WEEK = 7 * DAY;
const TZ_MS = 5 * 3600e3; // Ташкент
const clean = (t, n) => String(t ?? '').replace(/[\u0000-\u001f]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, n);
const reEsc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Имена питомцев на всех языках — для проверки таблички «Дом для …»
const PET_NAMES = {
  mimi: ['Мими', 'Mimi'], kapi: ['Капи', 'Kapi'], dino: ['Дино', 'Dino'], axi: ['Акси', 'Axi', 'Aksi'], boo: ['Бу', 'Boo', 'Bu'],
  ano: ['Ано', 'Ano'], zip: ['Зип', 'Zip'], ugo: ['Уголёк', 'Уголек', 'Ember', "Ko'mir", 'Komir'], fox: ['Рыжик', 'Rusty', 'Rizhik'],
  bot: ['Бит', 'Bit'], plu: ['Шарки', 'Sharky', 'Sharki'],
};
const PET_SHOW = { ru: 0, en: 1, uz: 2 };
export const petName = (id, lang = 'ru') => { const n = PET_NAMES[id] || PET_NAMES.kapi; return n[Math.min(PET_SHOW[lang] ?? 0, n.length - 1)]; };

// Одежда для питомцев. how — как получить (показываем на замочке)
export const ITEMS = {
  bow: { slot: 'head', emoji: '🎀', name: { ru: 'Бантик', uz: 'Bantik', en: 'Bow' }, how: { ru: '«Дом для питомца»: табличка', uz: '«Uy hayvoni uchun uy»: lavha', en: '«Pet house»: door sign' } },
  glasses: { slot: 'face', emoji: '🕶️', name: { ru: 'Очки', uz: 'Ko\'zoynak', en: 'Sunglasses' }, how: { ru: '«Дом для питомца»: обои', uz: '«Uy hayvoni uchun uy»: devor qog\'ozi', en: '«Pet house»: wallpaper' } },
  scarf: { slot: 'neck', emoji: '🧣', name: { ru: 'Шарф', uz: 'Sharf', en: 'Scarf' }, how: { ru: '«Дом для питомца»: мебель', uz: '«Uy hayvoni uchun uy»: mebel', en: '«Pet house»: furniture' } },
  crown: { slot: 'head', emoji: '👑', name: { ru: 'Корона', uz: 'Toj', en: 'Crown' }, how: { ru: '«Дом для питомца»: питомец заговорил', uz: '«Uy hayvoni uchun uy»: hayvon gapirdi', en: '«Pet house»: the pet talks' } },
  tophat: { slot: 'head', emoji: '🎩', name: { ru: 'Цилиндр', uz: 'Silindr', en: 'Top hat' }, how: { ru: 'Звание «Самый активный»', uz: '«Eng faol» unvoni', en: '«Most active» title' } },
  cap: { slot: 'head', emoji: '🧢', name: { ru: 'Кепка', uz: 'Kepka', en: 'Cap' }, how: { ru: 'Звание «Мастер кода»', uz: '«Kod ustasi» unvoni', en: '«Code master» title' } },
  medal: { slot: 'neck', emoji: '🏅', name: { ru: 'Медаль', uz: 'Medal', en: 'Medal' }, how: { ru: 'Звание «Звезда класса»', uz: '«Sinf yulduzi» unvoni', en: '«Class star» title' } },
  flower: { slot: 'head', emoji: '🌸', name: { ru: 'Цветок', uz: 'Gul', en: 'Flower' }, how: { ru: 'Звание «Душа компании»', uz: '«Davra joni» unvoni', en: '«Life of the party» title' } },
  heart: { slot: 'neck', emoji: '💖', name: { ru: 'Сердечко', uz: 'Yurakcha', en: 'Heart' }, how: { ru: 'Ответь «зачем мне это» после испытания', uz: 'Sinovdan keyin «bu menga nima uchun» ga javob ber', en: 'Answer «why do I need this» after a challenge' } },
};

// Звания недели (кто первый среди учеников; при равенстве — все)
export const BADGES = {
  active: { emoji: '🔥', name: { ru: 'Самый активный', uz: 'Eng faol', en: 'Most active' }, about: { ru: 'Больше всех решил тестов за неделю', uz: 'Hafta davomida eng ko\'p test yechdi', en: 'Solved the most tests this week' }, item: 'tophat' },
  sniper: { emoji: '🎯', name: { ru: 'Снайпер', uz: 'Merganchi', en: 'Sharpshooter' }, about: { ru: 'Больше всех результатов на 100% за неделю', uz: 'Hafta davomida eng ko\'p 100% natija', en: 'Most 100% results this week' } },
  coder: { emoji: '💻', name: { ru: 'Мастер кода', uz: 'Kod ustasi', en: 'Code master' }, about: { ru: 'Больше всех заданий с кодом за неделю', uz: 'Hafta davomida eng ko\'p kod topshirig\'i', en: 'Most code tasks this week' }, item: 'cap' },
  social: { emoji: '💬', name: { ru: 'Душа компании', uz: 'Davra joni', en: 'Life of the party' }, about: { ru: 'Больше всех ответил одноклассникам за неделю', uz: 'Hafta davomida sinfdoshlarga eng ko\'p javob berdi', en: 'Answered classmates the most this week' }, item: 'flower' },
  curious: { emoji: '🙋', name: { ru: 'Самый любознательный', uz: 'Eng qiziquvchan', en: 'Most curious' }, about: { ru: 'Больше всех задал вопросов за неделю', uz: 'Hafta davomida eng ko\'p savol berdi', en: 'Asked the most questions this week' } },
  star: { emoji: '⭐', name: { ru: 'Звезда класса', uz: 'Sinf yulduzi', en: 'Class star' }, about: { ru: 'Лучшая оценка от одноклассников за месяц', uz: 'Oy davomida sinfdoshlardan eng yaxshi baho', en: 'Best rating from classmates this month' }, item: 'medal' },
  streak: { emoji: '📅', name: { ru: 'Железная серия', uz: 'Temir seriya', en: 'Iron streak' }, about: { ru: '5 дней подряд с тестами', uz: 'Ketma-ket 5 kun test', en: '5 days in a row with tests' } },
  designer: { emoji: '🏠', name: { ru: 'Дизайнер', uz: 'Dizayner', en: 'Designer' }, about: { ru: 'Построил весь «Дом для питомца»', uz: '«Uy hayvoni uchun uy»ni to\'liq qurdi', en: 'Built the whole «Pet house»' } },
  newbie: { emoji: '🌱', name: { ru: 'Новичок недели', uz: 'Hafta yangisi', en: 'Newcomer of the week' }, about: { ru: 'Пришёл на этой неделе и уже решил тест', uz: 'Shu hafta keldi va test yechdi', en: 'Joined this week and already solved a test' } },
};

// подставляем имя питомца и ученика в тексты, файлы и регэкспы ({PET} в регэкспе — любое имя питомца)
export function personalize(v, ctx, inRe = false) {
  if (typeof v === 'string') {
    return v.replace(/\{(pet|name|petId|PET)\}/g, (_, k) => (k === 'PET' ? `(${(PET_NAMES[ctx.petId] || PET_NAMES.kapi).map(reEsc).join('|')})` : inRe ? reEsc(ctx[k]) : ctx[k]));
  }
  if (Array.isArray(v)) return v.map((x) => personalize(x, ctx, inRe));
  if (v && typeof v === 'object') {
    if (typeof v.ru === 'string' && Object.keys(v).every((k) => ['ru', 'uz', 'en'].includes(k))) return personalize(v[ctx.lang] || v.ru, ctx, inRe);
    return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, personalize(x, ctx, inRe || k === 're')]));
  }
  return v;
}


// ───────── Комната питомца: мебель и украшения (мини-игра «Дом питомца») ─────────
// Вещи открываются за учёбу: тесты, ДЗ, классную работу, испытания с кодом, серию дней, ответы одноклассникам.
// layer: wall — висит на стене, floor — стоит на полу (влияет только на подсказку, ставить можно куда угодно)
const T3 = (ru, uz, en) => ({ ru, uz, en });
export const DECOR = {
  plant: { emoji: '🪴', layer: 'floor', name: T3('Цветок в горшке', 'Tuvakdagi gul', 'Potted plant'), rule: null },
  teddy: { emoji: '🧸', layer: 'floor', name: T3('Плюшевый мишка', 'Ayiqcha', 'Teddy bear'), rule: null },
  picture: { emoji: '🖼️', layer: 'wall', name: T3('Картина', 'Rasm', 'Picture'), rule: ['tests', 1] },
  lamp: { emoji: '💡', layer: 'wall', name: T3('Лампа', 'Chiroq', 'Lamp'), rule: ['tests', 3] },
  sofa: { emoji: '🛋️', layer: 'floor', name: T3('Диван', 'Divan', 'Sofa'), rule: ['tests', 5] },
  tv: { emoji: '📺', layer: 'floor', name: T3('Телевизор', 'Televizor', 'TV'), rule: ['tests', 8] },
  bed: { emoji: '🛏️', layer: 'floor', name: T3('Кровать', 'Karavot', 'Bed'), rule: ['tests', 12] },
  piano: { emoji: '🎹', layer: 'floor', name: T3('Пианино', 'Pianino', 'Piano'), rule: ['tests', 20] },
  books: { emoji: '📚', layer: 'floor', name: T3('Стопка книг', 'Kitoblar', 'Books'), rule: ['hw', 1] },
  globe: { emoji: '🌍', layer: 'floor', name: T3('Глобус', 'Globus', 'Globe'), rule: ['hw', 3] },
  laptop: { emoji: '💻', layer: 'floor', name: T3('Ноутбук', 'Noutbuk', 'Laptop'), rule: ['hw', 6] },
  trophy: { emoji: '🏆', layer: 'floor', name: T3('Кубок', 'Kubok', 'Trophy'), rule: ['hw', 10] },
  clock: { emoji: '⏰', layer: 'wall', name: T3('Часы', 'Soat', 'Clock'), rule: ['class', 3] },
  guitar: { emoji: '🎸', layer: 'floor', name: T3('Гитара', 'Gitara', 'Guitar'), rule: ['class', 8] },
  window: { emoji: '🪟', layer: 'wall', name: T3('Окно', 'Deraza', 'Window'), rule: ['house', 1] },
  candle: { emoji: '🕯️', layer: 'floor', name: T3('Свеча', 'Sham', 'Candle'), rule: ['house', 2] },
  fish: { emoji: '🐠', layer: 'floor', name: T3('Аквариум', 'Akvarium', 'Aquarium'), rule: ['house', 3] },
  balloons: { emoji: '🎈', layer: 'wall', name: T3('Шарики', 'Sharlar', 'Balloons'), rule: ['house', 4] },
  rainbow: { emoji: '🌈', layer: 'wall', name: T3('Радуга', 'Kamalak', 'Rainbow'), rule: ['streak', 3] },
  star: { emoji: '⭐', layer: 'wall', name: T3('Звезда', 'Yulduz', 'Star'), rule: ['streak', 7] },
  cup: { emoji: '☕', layer: 'floor', name: T3('Кружка какао', 'Kakao krujkasi', 'Cocoa mug'), rule: ['answers', 3] },
  bouquet: { emoji: '💐', layer: 'floor', name: T3('Букет', 'Guldasta', 'Bouquet'), rule: ['rated', 3] },
};
const RULE_TXT = {
  tests: T3('Реши тестов: {n}', 'Testlar yech: {n}', 'Solve tests: {n}'),
  hw: T3('Сделай ДЗ: {n}', 'Uy vazifasi: {n}', 'Do homework: {n}'),
  class: T3('Классная работа: {n}', 'Sinf ishi: {n}', 'Classwork: {n}'),
  house: T3('Испытаний с кодом: {n}', 'Kodli sinovlar: {n}', 'Code challenges: {n}'),
  streak: T3('Серия дней: {n}', 'Kunlar seriyasi: {n}', 'Day streak: {n}'),
  answers: T3('Ответь одноклассникам: {n}', 'Sinfdoshlarga javob: {n}', 'Answer classmates: {n}'),
  rated: T3('Звёзды от одноклассников: {n}', 'Sinfdoshlardan yulduz: {n}', 'Stars from classmates: {n}'),
};
export const WALLS = ['mint', 'peach', 'sky', 'lilac', 'lemon', 'night'];
export const FLOORS = ['wood', 'tiles', 'carpet', 'grass'];

const PEER_XP_PER_STAR = 6; // 5★ = 30 XP
const PEER_XP_WEEK_CAP = 150;
const ASK_PER_DAY = 10;
const RATE_PER_WEEK = 5;
// осмысленный текст: хотя бы 2 слова и 6 букв, не «ъъъъъ»
const meaningful = (t, minLetters = 6) => { const letters = (t.match(/\p{L}/gu) || []); return letters.length >= minLetters && new Set(letters.map((x) => x.toLowerCase())).size >= 4 && t.trim().split(/\s+/).length >= 2; };

export function createSocial({ logic, store, code, notifyTeacher = async () => {} }) {
  const S = logic.S;
  const G = () => {
    S.social ||= {};
    for (const k of ['questions', 'ratings', 'wishes', 'reflections', 'interests']) S.social[k] ||= {};
    return S.social;
  };
  const user = (uid) => S.users[String(uid)];
  const isStudent = (u) => Boolean(u) && !logic.isAdmin(u.id) && u.role !== 'parent' && !u.needRole && !S.banned?.[u.id];
  const students = () => Object.values(S.users).filter(isStudent);
  const langOf = (uid) => user(uid)?.prefs?.lang || 'ru';
  const L = (v, lang) => (v && typeof v === 'object' ? v[lang] || v.ru : v);
  const brief = (u) => (u ? { id: u.id, name: logic.name(u), prefs: u.prefs || null, wear: u.wardrobe?.wear || {}, dress: u.room?.wear || null } : null);
  const nextId = (p) => p + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  // неделя с понедельника 00:00 по Ташкенту
  const weekStart = (t = Date.now()) => { const d = new Date(t + TZ_MS); const day = (d.getUTCDay() + 6) % 7; return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - day) - TZ_MS; };
  const httpError = (status, message) => Object.assign(new Error(message), { status });

  // ───────── вопросы друг другу ─────────
  function ask(fromId, toId, text) {
    const g = G();
    const from = user(fromId), to = user(toId);
    if (!from || !(isStudent(from) || logic.isAdmin(from.id))) throw httpError(403, 'Спрашивать могут ученики');
    if (!isStudent(to)) throw httpError(404, 'Ученик не найден');
    if (from.id === to.id) throw httpError(400, 'Себе спрашивать не нужно 🙂');
    const t = clean(text, 150);
    if (t.length < 2) throw httpError(400, 'Напиши вопрос');
    const mine = Object.values(g.questions).filter((q) => q.from === from.id);
    if (mine.filter((q) => Date.now() - q.at < DAY).length >= ASK_PER_DAY) throw httpError(429, 'На сегодня хватит вопросов — продолжим завтра');
    if (mine.filter((q) => q.to === to.id && !q.answer).length >= 3) throw httpError(429, 'Подожди, пока ответят на прошлые вопросы');
    const q = { id: nextId('q'), from: from.id, to: to.id, text: t, at: Date.now(), answer: null, answeredAt: null };
    g.questions[q.id] = q;
    store.save();
    logic.log('ask', { from: brief(from).name, to: brief(to).name, text: t });
    return { ok: true };
  }
  function answer(uid, qid, text) {
    const q = G().questions[qid];
    if (!q || q.to !== String(uid)) throw httpError(404, 'Вопрос не найден');
    const t = clean(text, 200);
    if (!((t.match(/\p{L}|\p{N}|\p{Extended_Pictographic}/gu) || []).length >= 2)) throw httpError(400, 'Напиши ответ словами');
    q.answer = t;
    q.answeredAt = Date.now();
    store.save();
    logic.log('answer', { from: logic.name(user(uid)), to: logic.name(user(q.from)), q: q.text, a: t });
    return { ok: true };
  }
  function removeQuestion(uid, qid) {
    const q = G().questions[qid];
    if (!q) return { ok: true };
    if (![q.to, q.from].includes(String(uid)) && !logic.isAdmin(uid)) throw httpError(403, 'Нельзя удалить чужой вопрос');
    delete G().questions[qid];
    store.save();
    return { ok: true };
  }
  const qOut = (q) => ({ id: q.id, text: q.text, answer: q.answer, at: q.at, answeredAt: q.answeredAt, from: brief(user(q.from)) });
  const inbox = (uid) => Object.values(G().questions).filter((q) => q.to === String(uid) && !q.answer && user(q.from)).sort((a, b) => b.at - a.at).map(qOut);

  // ───────── оценки друг другу ─────────
  function rate(fromId, toId, stars) {
    const g = G();
    const from = user(fromId), to = user(toId);
    if (!isStudent(from)) throw httpError(403, 'Оценивать могут ученики');
    if (!isStudent(to) || from.id === to.id) throw httpError(400, 'Так нельзя');
    const s = Math.round(Number(stars));
    if (!(s >= 1 && s <= 5)) throw httpError(400, 'Оценка от 1 до 5');
    const mine = new Set(logic.userGroups(from.id).map((x) => x.id));
    if (!logic.userGroups(to.id).some((x) => mine.has(x.id))) throw httpError(403, 'Звёзды можно ставить только одноклассникам из своей группы');
    const w = weekStart();
    const key = `${from.id}:${to.id}:${w}`;
    const given = Object.values(g.ratings).filter((r) => r.from === from.id && r.week === w && r.to !== to.id).length;
    if (!g.ratings[key] && given >= RATE_PER_WEEK) throw httpError(429, `За неделю можно оценить ${RATE_PER_WEEK} одноклассников — выбирай, кто правда помог`);
    g.ratings[key] = { from: from.id, to: to.id, week: w, stars: s, at: Date.now() };
    store.save();
    logic.log('rate', { from: logic.name(from), to: logic.name(to), stars: s });
    return { ok: true, mine: s };
  }
  // XP от одноклассников: 6 XP за звезду, но не больше 150 XP в неделю одному ученику
  function peerXp(uid) {
    uid = String(uid);
    const byWeek = new Map();
    for (const r of Object.values(S.social?.ratings || {})) if (r.to === uid && S.users[r.from]) byWeek.set(r.week, (byWeek.get(r.week) || 0) + r.stars * PEER_XP_PER_STAR);
    let n = 0;
    for (const v of byWeek.values()) n += Math.min(PEER_XP_WEEK_CAP, v);
    return n;
  }
  function ratingOf(uid, viewer) {
    const since = Date.now() - 30 * DAY;
    const list = Object.values(G().ratings).filter((r) => r.to === String(uid) && r.at > since && S.users[r.from]);
    const mine = Object.values(G().ratings).find((r) => r.to === String(uid) && r.from === String(viewer) && r.week === weekStart());
    const weekXp = Math.min(PEER_XP_WEEK_CAP, list.filter((r) => r.week === weekStart()).reduce((n, r) => n + r.stars * PEER_XP_PER_STAR, 0));
    return { avg: list.length ? Math.round((list.reduce((n, r) => n + r.stars, 0) / list.length) * 10) / 10 : null, n: list.length, mine: mine?.stars || null, weekXp, cap: PEER_XP_WEEK_CAP };
  }

  // ───────── звания недели ─────────
  let badgeCache = { at: 0, map: new Map() };
  function allBadges() {
    if (Date.now() - badgeCache.at < 60_000) return badgeCache.map;
    const map = new Map();
    const list = students();
    const since = Date.now() - WEEK;
    const add = (uid, b) => { if (!map.has(uid)) map.set(uid, []); map.get(uid).push(b); };
    const top = (badge, scoreOf, min) => {
      const scored = list.map((u) => [u.id, scoreOf(u.id)]).filter(([, v]) => v >= min);
      const best = Math.max(0, ...scored.map(([, v]) => v));
      if (best >= min) for (const [id, v] of scored) if (v === best) add(id, badge);
    };
    const atts = Object.values(S.attempts).filter((a) => a.finishedAt && a.finishedAt > since && !a.preview && a.kind !== 'mistakes');
    const cnt = (arr, key) => { const m = new Map(); for (const x of arr) m.set(key(x), (m.get(key(x)) || 0) + 1); return (uid) => m.get(uid) || 0; };
    top('active', cnt(atts, (a) => a.userId), 3);
    top('sniper', cnt(atts.filter((a) => a.answers.length && a.answers.every((x) => x.correct) && !a.forfeit), (a) => a.userId), 2);
    const codeDone = Object.entries(S.code || {}).filter(([, v]) => v.at > since).map(([k]) => k.split(':')[0]);
    top('coder', cnt(codeDone, (x) => x), 3);
    const qs = Object.values(G().questions);
    top('social', cnt(qs.filter((q) => q.answeredAt > since), (q) => q.to), 2);
    top('curious', cnt(qs.filter((q) => q.at > since), (q) => q.from), 3);
    const r30 = Object.values(G().ratings).filter((r) => r.at > Date.now() - 30 * DAY);
    const avgs = new Map();
    for (const r of r30) { const a = avgs.get(r.to) || { s: 0, n: 0 }; a.s += r.stars; a.n++; avgs.set(r.to, a); }
    top('star', (uid) => { const a = avgs.get(uid); return a && a.n >= 3 ? Math.round((a.s / a.n) * 100) : 0; }, 1);
    for (const u of list) {
      if ((u.streak || 0) >= 5 && logic.S.users[u.id]) add(u.id, 'streak');
      if (HOUSE(u.id).length && houseState(u.id).done.length >= HOUSE(u.id).length) add(u.id, 'designer');
      if (u.joinedAt > since && atts.some((a) => a.userId === u.id)) add(u.id, 'newbie');
    }
    badgeCache = { at: Date.now(), map };
    return map;
  }
  const badgesOf = (uid, lang = 'ru') => (allBadges().get(String(uid)) || []).map((id) => ({ id, emoji: BADGES[id].emoji, name: L(BADGES[id].name, lang), about: L(BADGES[id].about, lang) }));

  // ───────── одежда ─────────
  function grant(uid, item, why) {
    const u = user(uid);
    if (!u || !ITEMS[item]) return false;
    u.wardrobe ||= { owned: [], wear: {} };
    if (u.wardrobe.owned.includes(item)) return false;
    u.wardrobe.owned.push(item);
    store.save();
    logic.log('wardrobe', { user: logic.name(u), item, why });
    return true;
  }
  // звания недели дарят вещь навсегда
  function syncBadgeItems(uid) {
    for (const b of allBadges().get(String(uid)) || []) if (BADGES[b].item) grant(uid, BADGES[b].item, 'badge:' + b);
  }
  function wardrobe(uid) {
    syncBadgeItems(uid);
    const u = user(uid);
    const lang = langOf(uid);
    const owned = new Set(u?.wardrobe?.owned || []);
    return { wear: u?.wardrobe?.wear || {}, items: Object.entries(ITEMS).map(([id, it]) => ({ id, slot: it.slot, emoji: it.emoji, name: L(it.name, lang), how: L(it.how, lang), owned: owned.has(id) })) };
  }
  function wear(uid, slot, item) {
    const u = user(uid);
    if (!['head', 'face', 'neck'].includes(slot)) throw httpError(400, 'Нет такого места');
    u.wardrobe ||= { owned: [], wear: {} };
    if (item && (!ITEMS[item] || ITEMS[item].slot !== slot || !u.wardrobe.owned.includes(item))) throw httpError(400, 'Эту вещь ещё не получил');
    if (item) u.wardrobe.wear[slot] = item; else delete u.wardrobe.wear[slot];
    store.save();
    return { wear: u.wardrobe.wear };
  }
  async function wish(uid, text) {
    const u = user(uid);
    const t = clean(text, 200);
    if (t.length < 2) throw httpError(400, 'Напиши, что хочешь');
    const recent = Object.values(G().wishes).filter((w) => w.userId === u.id && Date.now() - w.at < DAY);
    if (recent.length >= 3) throw httpError(429, 'Сегодня уже 3 просьбы — учитель их увидит');
    const w = { id: nextId('w'), userId: u.id, text: t, pet: u.prefs?.mascot || 'kapi', at: Date.now() };
    G().wishes[w.id] = w;
    store.save();
    logic.log('wish', { user: { id: u.id, name: logic.name(u) }, pet: w.pet, text: t });
    await notifyTeacher(`🎀 <b>${escH(logic.name(u))}</b> просит одежду для питомца (${escH(petName(w.pet))}):\n«${escH(t)}»\n\nНапиши Claude, что добавить — и вещь появится в гардеробе.`);
    return { ok: true };
  }
  const escH = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  // ───────── «Дом для питомца» ─────────
  // испытания дома зависят от группы ученика: levels.{zero|junior|middle|senior}, без уровня — challenges (старшая)
  const HOUSE = (uid) => {
    const h = code()?.house?.house;
    if (!h) return [];
    const lv = uid != null ? logic.levelOf(uid) : 'senior';
    return h.levels?.[lv] || h.challenges || [];
  };
  const ctxOf = (uid) => { const u = user(uid); const lang = langOf(uid); const petId = u?.prefs?.mascot || 'kapi'; return { lang, petId, pet: petName(petId, lang), name: (logic.name(u) || '').split(' ')[0] }; };
  function houseState(uid) {
    const list = HOUSE(uid);
    const done = list.map((c, i) => (S.code?.[`${uid}:house:h${i + 1}`]?.at ? i + 1 : 0)).filter(Boolean);
    const last = done.map((k) => S.code[`${uid}:house:h${k}`]).sort((a, b) => b.at - a.at)[0] || null;
    return { done, total: list.length, files: last?.files || null };
  }
  function house(uid) {
    const ctx = ctxOf(uid);
    const st = houseState(uid);
    const list = HOUSE(uid).map((c, i) => {
      const t = personalize(c, ctx);
      return { k: i + 1, title: t.title, intro: t.intro, praise: t.praise || null, reflect: t.reflect, reward: c.reward, rewardEmoji: ITEMS[c.reward]?.emoji || '', steps: t.steps.map((s) => ({ say: s.say, show: s.show || null, file: s.file, re: s.re, flags: s.flags })), files: t.files, addFiles: t.addFiles || null, open: t.open || null, pose: c.pose || 'think' };
    });
    return { pet: ctx.pet, petId: ctx.petId, name: ctx.name, done: st.done, total: st.total, files: st.files, challenges: list, reflected: Object.values(G().reflections).filter((r) => r.userId === String(uid)).map((r) => r.k) };
  }
  function houseDone(uid, k, files, accepted = false) {
    const list = HOUSE(uid);
    k = Number(k);
    const c = list[k - 1];
    if (!c) throw httpError(404, 'Нет такого испытания');
    const st = houseState(uid);
    if (k > 1 && !st.done.includes(k - 1)) throw httpError(400, 'Сначала прошлое испытание');
    const t = personalize(c, ctxOf(uid));
    const r = checkAnswer({ type: 'code', task: t }, files);
    if (!r.correct && !accepted) throw httpError(400, 'Ещё не все шаги готовы');
    const key = `${uid}:house:h${k}`;
    const first = !S.code?.[key];
    S.code ||= {};
    S.code[key] = { at: Date.now(), files: Object.fromEntries(Object.entries(files || {}).slice(0, 6).map(([n, v]) => [String(n).slice(0, 40), String(v).slice(0, 20000)])) };
    const got = first && c.reward ? grant(uid, c.reward, 'house:' + k) : false;
    badgeCache.at = 0;
    store.save();
    logic.log('house', { user: { id: String(uid), name: logic.name(user(uid)) }, k, first });
    return { ok: true, reward: got ? c.reward : null, done: houseState(uid).done };
  }
  function reflect(uid, k, text) {
    const t = clean(text, 300);
    if (!meaningful(t)) throw httpError(400, 'Напиши хотя бы одно настоящее предложение — своими словами');
    const id = `${uid}:${k}`;
    G().reflections[id] = { userId: String(uid), k: String(k), text: t, at: Date.now() };
    const got = grant(uid, 'heart', 'reflect');
    store.save();
    logic.log('reflect', { user: { id: String(uid), name: logic.name(user(uid)) }, k, text: t });
    return { ok: true, reward: got ? 'heart' : null };
  }

  // ───────── опрос интересов (включает учитель) ─────────
  function armInterest(key, uid) {
    S.migrations ||= {};
    if (S.migrations[key]) return null;
    const u = user(uid);
    if (!u) return { error: 'нет ученика' };
    u.interestAsk = { key, since: Date.now(), doneAt: null };
    S.migrations[key] = Date.now();
    store.save();
    return { user: { id: u.id, name: logic.name(u) }, armed: true };
  }
  // опрос показываем, когда ученик решил тест после того, как учитель включил опрос
  const shouldAsk = (uid) => {
    const f = user(uid)?.interestAsk;
    if (!f || f.doneAt) return false;
    return Object.values(S.attempts).some((a) => a.userId === String(uid) && a.finishedAt > f.since && !a.preview && a.kind !== 'mistakes');
  };
  async function saveInterests(uid, answers) {
    const u = user(uid);
    const a = answers && typeof answers === 'object' ? answers : {};
    const pick = (k, n = 12) => (Array.isArray(a[k]) ? a[k].slice(0, n).map((x) => clean(x, 60)) : a[k] != null ? [clean(a[k], 60)] : []);
    const rec = { likes: pick('likes'), make: pick('make'), mood: pick('mood'), blocks: pick('blocks'), other: clean(a.other, 120), dream: clean(a.dream, 160), at: Date.now() };
    G().interests[u.id] = rec;
    if (u.interestAsk) u.interestAsk.doneAt = Date.now();
    store.save();
    logic.log('interest', { user: { id: u.id, name: logic.name(u) }, ...rec });
    await notifyTeacher(`🧠 <b>${escH(logic.name(u))}</b> рассказал(а) о себе:\n• Нравится: ${escH([...rec.likes, rec.other].filter(Boolean).join(', ') || '—')}\n• Хочет сделать: ${escH(rec.make.join(', ') || '—')}\n• Как учёба: ${escH(rec.mood.join(', ') || '—')}\n• Мешает: ${escH(rec.blocks.join(', ') || '—')}\n• Мечта: ${escH(rec.dream || '—')}\n\nПопроси Claude сделать для неё/него задания по этим интересам.`);
    return { ok: true };
  }

  // ───────── страница ученика ─────────
  function page(viewer, uid) {
    const u = user(uid);
    if (!u || (!isStudent(u) && !logic.isAdmin(viewer))) throw httpError(404, 'Ученик не найден');
    const lang = langOf(viewer);
    const meView = String(viewer) === u.id;
    syncBadgeItems(u.id);
    const st = houseState(u.id);
    const qs = Object.values(G().questions).filter((q) => q.to === u.id && (q.answer || logic.isAdmin(viewer)) && user(q.from)).sort((a, b) => (b.answeredAt || b.at) - (a.answeredAt || a.at)).slice(0, 20).map(qOut);
    return {
      user: brief(u), me: meView, admin: logic.isAdmin(viewer),
      groups: logic.userGroups(u.id).map((g) => ({ id: g.id, name: g.name, emoji: g.emoji })),
      xp: logic.totalXp(u.id), streak: u.streak || 0,
      badges: badgesOf(u.id, lang),
      house: { done: st.done.length, total: st.total, files: st.files },
      qa: qs,
      rating: ratingOf(u.id, viewer),
      canRate: isStudent(user(viewer)) && !meView && logic.userGroups(u.id).some((x) => logic.userGroups(viewer).some((y) => y.id === x.id)),
      canAsk: (isStudent(user(viewer)) || logic.isAdmin(viewer)) && !meView,
      pet: petName(u.prefs?.mascot || 'kapi', lang),
      room: roomOf(u.id),
      built: builtOf(u.id),
      stats: (() => { const pr = progressOf(u.id); return { tests: pr.tests, hw: pr.hw, house: pr.house, answers: pr.answers }; })(),
      sameGroup: (() => { const mine = new Set(logic.userGroups(viewer).map((x) => x.id)); return logic.userGroups(u.id).some((x) => mine.has(x.id)); })(),
    };
  }
  // кратко для /me
  function summary(uid) {
    const u = user(uid);
    if (!isStudent(u)) return null;
    const st = houseState(u.id);
    return { inbox: inbox(u.id).length, house: { done: st.done.length, total: st.total }, badges: badgesOf(u.id, langOf(uid)), wear: u.wardrobe?.wear || {}, dress: u.room?.wear || null, askInterest: shouldAsk(u.id), pet: petName(u.prefs?.mascot || 'kapi', langOf(uid)) };
  }



  // ───────── что построено кодом (испытания «Дом для питомца») → видно в комнате ─────────
  const safeCss = (v) => { v = String(v || '').trim().replace(/\s*!important$/i, ''); return v && v.length <= 140 && /^[#a-z0-9(),.%\s+-]+$/i.test(v) && !/url|expression|var\(/i.test(v) ? v : null; };
  const textOf = (html) => String(html || '').replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
  function builtOf(uid) {
    const st = houseState(uid);
    const f = st.files || {};
    const html = (f['index.html'] || '').replace(/<!--[\s\S]*?-->/g, '');
    const css = (f['style.css'] || '').replace(/\/\*[\s\S]*?\*\//g, '');
    const js = (f['script.js'] || '').replace(/\/\*[\s\S]*?\*\/|(^|[^:])\/\/.*$/gm, '$1');
    // как в CSS: из всех правил с этим селектором побеждает последнее значение свойства
    const rule = (sel, prop) => {
      let val = null;
      for (const m of css.matchAll(new RegExp(`(?:^|[}\\s,])${sel}\\s*(?:,[^{]*)?\\{([^}]*)\\}`, 'gi'))) {
        for (const p of m[1].matchAll(new RegExp(`(?:^|;|\\s)${prop}\\s*:\\s*([^;]+)`, 'gi'))) val = p[1];
      }
      return val;
    };
    const has = (k) => st.done.includes(k);
    const h1 = /<h1[^>]*>([\s\S]*?)<\/h1>/i.exec(html);
    const sign = has(1) && h1 ? { text: textOf(h1[1]).slice(0, 40), color: safeCss(rule('h1', 'color')) || '#5b3a1e' } : null;
    const wall = has(2) ? safeCss(rule('\\.room', 'background(?:-color)?')) || safeCss(rule('body', 'background(?:-color)?')) : null;
    // всё, что внутри блока .furniture (вложенные теги считаем по глубине)
    const fz = (() => {
      const m = /<([a-z]+)[^>]*class\s*=\s*["']?[^"'>]*\bfurniture\b[^>]*>/i.exec(html);
      if (!m) return null;
      let depth = 1, i = m.index + m[0].length;
      const tagRe = new RegExp(`<(/?)${m[1]}\\b[^>]*>`, 'gi');
      tagRe.lastIndex = i;
      for (let t; (t = tagRe.exec(html));) { depth += t[1] ? -1 : 1; if (!depth) return [null, html.slice(i, t.index)]; }
      return [null, html.slice(i, i + 800)];
    })();
    const furniture = has(3) && fz ? [...fz[1].matchAll(/<([a-z]+)[^>]*>([^<]{1,8})<\/\1>/gi)].map((m) => m[2].trim()).filter((x) => x && /\p{Extended_Pictographic}/u.test(x)).slice(0, 6) : [];
    const ph = /textContent\s*=\s*(["'`])([^"'`]{1,80})\1/.exec(js);
    const bb = /<p[^>]*class\s*=\s*["']?[^"'>]*\bbubble\b[^>]*>([^<]{2,80})<\/p>/i.exec(html);
    const phrase = has(4) ? (ph ? ph[2].trim() : bb ? bb[1].trim() : null) : null;
    return { stage: st.done.length, total: st.total, next: st.done.length < st.total ? Math.min(...Array.from({ length: st.total }, (_, i) => i + 1).filter((k) => !has(k))) : null, sign, wall, furniture, phrase };
  }

  // ───────── комната питомца ─────────
  function progressOf(uid) {
    uid = String(uid);
    const lessons = new Set(Object.values(S.attempts).filter((a) => a.userId === uid && a.finishedAt && !a.preview && a.kind !== 'mistakes').map((a) => a.lessonId));
    const code = Object.keys(S.code || {}).filter((k) => k.startsWith(uid + ':'));
    return {
      tests: lessons.size,
      hw: code.filter((k) => k.endsWith(':hw')).length,
      class: code.filter((k) => /:s\d+$/.test(k)).length,
      house: houseState(uid).done.length,
      streak: Math.max(user(uid)?.streak || 0, user(uid)?.bestStreak || 0),
      answers: Object.values(G().questions).filter((q) => q.to === uid && q.answer).length,
      rated: Object.values(G().ratings).filter((r) => r.to === uid).length,
    };
  }
  const decorOwned = (uid, prog = progressOf(uid)) => Object.entries(DECOR).filter(([, d]) => user(uid)?.unlockAll || !d.rule || prog[d.rule[0]] >= d.rule[1]).map(([id]) => id);
  const clamp = (v, a, b) => Math.min(b, Math.max(a, Number(v) || 0));
  function cleanRoom(uid, r) {
    const b = builtOf(uid);
    const owned = new Set([...decorOwned(uid), ...b.furniture.map((_, i) => 'c' + (i + 1))]);
    syncBadgeItems(uid);
    const clothes = new Set(user(uid)?.wardrobe?.owned || []);
    const seen = new Set();
    const items = (Array.isArray(r?.items) ? r.items : []).slice(0, 40).filter((x) => owned.has(x?.id) && !seen.has(x.id) && seen.add(x.id))
      .map((x, i) => ({ id: x.id, x: clamp(x.x, 0, 100), y: clamp(x.y, 0, 100), s: clamp(x.s || 1, 0.4, 3), r: clamp(x.r, -180, 180), z: clamp(x.z ?? i, 0, 99), f: Boolean(x.f) }));
    const seenW = new Set();
    const wear = (Array.isArray(r?.wear) ? r.wear : []).slice(0, 12).filter((x) => clothes.has(x?.id) && !seenW.has(x.id) && seenW.add(x.id))
      .map((x) => ({ id: x.id, x: clamp(x.x, -20, 120), y: clamp(x.y, -30, 120), s: clamp(x.s || 1, 0.3, 2.5), r: clamp(x.r, -180, 180) }));
    const p = r?.pet || {};
    return { wall: WALLS.includes(r?.wall) || (r?.wall === 'code' && b.wall) ? r.wall : 'mint', floor: FLOORS.includes(r?.floor) ? r.floor : 'wood', items, wear, pet: { x: clamp(p.x ?? 50, 5, 95), y: clamp(p.y ?? 72, 10, 98), s: clamp(p.s || 1, 0.6, 1.8) } };
  }
  function roomOf(uid) {
    const u = user(uid);
    if (u?.room) return u.room;
    // первый раз: надетое раньше (слоты) переносим на питомца примерно на свои места
    const legacy = u?.wardrobe?.wear || {};
    const pos = { head: { x: 50, y: 2 }, face: { x: 50, y: 36 }, neck: { x: 50, y: 66 } };
    return { wall: 'mint', floor: 'wood', items: [{ id: 'plant', x: 22, y: 80, s: 1, r: 0, z: 1 }], wear: Object.entries(legacy).map(([slot, id]) => ({ id, ...pos[slot], s: 1, r: 0 })), pet: { x: 50, y: 72, s: 1 } };
  }
  function room(uid) {
    syncBadgeItems(uid);
    const lang = langOf(uid);
    const prog = progressOf(uid);
    const owned = new Set(decorOwned(uid, prog));
    const clothes = new Set(user(uid)?.wardrobe?.owned || []);
    const b = builtOf(uid);
    const rm = JSON.parse(JSON.stringify(roomOf(uid)));
    // новая мебель из кода сама встаёт в комнату, обои из кода включаются один раз
    b.furniture.forEach((e, i) => { const id = 'c' + (i + 1); if (!rm.items.some((x) => x.id === id) && !(user(uid)?.roomSeen || []).includes(id)) rm.items.push({ id, x: 30 + i * 20, y: 86, s: 1, r: 0, z: 5 + i }); });
    if (b.wall && !(user(uid)?.roomSeen || []).includes('wall')) rm.wall = 'code';
    return {
      built: b,
      room: rm, progress: prog, pet: petName(user(uid)?.prefs?.mascot || 'kapi', lang), petId: user(uid)?.prefs?.mascot || 'kapi',
      decor: Object.entries(DECOR).map(([id, d]) => ({ id, emoji: d.emoji, layer: d.layer, name: L(d.name, lang), owned: owned.has(id),
        how: d.rule ? L(RULE_TXT[d.rule[0]], lang).replace('{n}', d.rule[1]) : '', have: d.rule ? Math.min(prog[d.rule[0]], d.rule[1]) : 0, need: d.rule ? d.rule[1] : 0 })),
      clothes: Object.entries(ITEMS).map(([id, it]) => ({ id, emoji: it.emoji, name: L(it.name, lang), how: L(it.how, lang), owned: clothes.has(id) })),
      walls: WALLS, floors: FLOORS,
    };
  }
  function saveRoom(uid, r) {
    const u = user(uid);
    if (!isStudent(u)) throw httpError(403, 'Комната есть только у учеников');
    const before = u.room;
    u.room = cleanRoom(uid, r);
    const b = builtOf(uid);
    u.roomSeen = [...new Set([...(u.roomSeen || []), ...b.furniture.map((_, i) => 'c' + (i + 1)), ...(b.wall ? ['wall'] : [])])];
    // для старых мест (страницы, лига) — надетое тоже в слотах
    u.wardrobe ||= { owned: [], wear: {} };
    u.wardrobe.wear = {};
    for (const w of u.room.wear) { const sl = ITEMS[w.id]?.slot; if (sl && !u.wardrobe.wear[sl]) u.wardrobe.wear[sl] = w.id; }
    store.save();
    if (!before || before.items?.length !== u.room.items.length || before.wear?.length !== u.room.wear.length) logic.log('room', { user: { id: u.id, name: logic.name(u) }, items: u.room.items.map((x) => x.id), wear: u.room.wear.map((x) => x.id) });
    return { ok: true, room: u.room };
  }

  // ───────── сводка для учителя ─────────
  function adminFeed() {
    const g = G();
    const nm = (uid) => logic.name(user(uid)) || '—';
    const ws = weekStart();
    const wishes = Object.values(g.wishes).sort((a, b) => b.at - a.at).slice(0, 30).map((w) => ({ id: w.id, userId: w.userId, name: nm(w.userId), prefs: user(w.userId)?.prefs || null, pet: petName(w.pet), text: w.text, at: w.at, done: Boolean(w.done) }));
    const interests = Object.entries(g.interests).sort((a, b) => b[1].at - a[1].at).map(([uid, r]) => ({ userId: uid, name: nm(uid), prefs: user(uid)?.prefs || null, ...r }));
    const reflections = Object.values(g.reflections).sort((a, b) => b.at - a.at).slice(0, 30).map((r) => ({ ...r, name: nm(r.userId), prefs: user(r.userId)?.prefs || null }));
    const waiting = students().filter((u) => u.interestAsk && !u.interestAsk.doneAt).map((u) => ({ userId: u.id, name: nm(u.id) }));
    const houses = students().map((u) => ({ userId: u.id, name: nm(u.id), prefs: u.prefs || null, done: houseState(u.id).done.length })).filter((x) => x.done).sort((a, b) => b.done - a.done);
    return {
      wishes, interests, reflections, waiting, houses,
      week: {
        questions: Object.values(g.questions).filter((q) => q.at >= ws).length,
        answers: Object.values(g.questions).filter((q) => q.answeredAt && q.answeredAt >= ws).length,
        ratings: Object.values(g.ratings).filter((r) => r.week === ws).length,
      },
      total: houseState("0").total,
    };
  }
  function wishDone(id, done = true) {
    const w = G().wishes[id];
    if (!w) throw httpError(404, 'Просьба не найдена');
    w.done = Boolean(done);
    store.save();
    return { ok: true };
  }

  return { ask, answer, removeQuestion, inbox, rate, peerXp, ratingOf, badgesOf, wardrobe, wear, wish, grant, house, houseDone, reflect, armInterest, shouldAsk, saveInterests, page, summary, personalize, ctxOf, HOUSE, adminFeed, wishDone, room, saveRoom, progressOf };
}
