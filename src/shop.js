// Магазин за XP: маскоты, еда для маскота, зелья (подсказка) и лупа (кусочек обучалки).
//
// Баланс = заработанный XP − потраченный. Лига считает заработанный XP, покупки её не уменьшают.
// Покупки: S.purchases[id] = { id, userId, item, price, at }.
// Маскоты: kapi и dino бесплатные, остальные покупаются (user.owned = [id]).
// Маскот, которого ученик выбрал до магазина, остаётся у него бесплатно (миграция shop-v1).
//
// Состояние маскота (user.pet) считается по последним 7 дням:
//   hungry — ни теста, ни еды сегодня (к вечеру) или вчера весь день; fat — кормили ≥3 раз и больше, чем решали;
//   strong — решил ≥3 тестов и почти не кормил; иначе normal.

const DAY = 86400_000;
const TZ_MIN = Number(process.env.TZ_OFFSET_MIN ?? 300);
export const FREE_MASCOTS = ['kapi', 'dino'];
export const MASCOT_PRICES = { plu: 600, zip: 500, boo: 450, ano: 450, bot: 400, fox: 350, ugo: 350, mimi: 300, axi: 300, kapi: 0, dino: 0 };
export const POTION_PRICE = 150;
export const MAGNIFIER_PRICE = 100;
export const MAGNIFIER_SECONDS = 30;

// Своя еда у каждого маскота
export const FOODS = {
  kapi: { emoji: '🍊', price: 50, name: { ru: 'Мандарин', uz: 'Mandarin', en: 'Tangerine' } },
  dino: { emoji: '🍖', price: 60, name: { ru: 'Мясо', uz: "Go'sht", en: 'Meat' } },
  mimi: { emoji: '🐟', price: 50, name: { ru: 'Рыбка', uz: 'Baliqcha', en: 'Fish' } },
  axi: { emoji: '🦐', price: 50, name: { ru: 'Креветки', uz: 'Krevetka', en: 'Shrimp' } },
  boo: { emoji: '👻', price: 70, name: { ru: 'Душа', uz: 'Ruh', en: 'Soul' } },
  ano: { emoji: '🍕', price: 60, name: { ru: 'Пицца хакера', uz: 'Xaker pitsasi', en: "Hacker's pizza" } },
  zip: { emoji: '🌶️', price: 60, name: { ru: 'Острый перец', uz: 'Achchiq qalampir', en: 'Hot pepper' } },
  fox: { emoji: '🍇', price: 55, name: { ru: 'Виноград', uz: 'Uzum', en: 'Grapes' } },
  bot: { emoji: '🔋', price: 60, name: { ru: 'Батарейка', uz: 'Batareya', en: 'Battery' } },
  ugo: { emoji: '🥛', price: 50, name: { ru: 'Молоко', uz: 'Sut', en: 'Milk' } },
  plu: { emoji: '🦑', price: 70, name: { ru: 'Кальмар', uz: 'Kalmar', en: 'Squid' } },
};

export function createShop({ logic, store }) {
  const S = logic.S;
  S.purchases ||= {};
  const httpError = (status, message, extra = {}) => Object.assign(new Error(message), { status, ...extra });
  const user = (uid) => {
    const u = S.users[String(uid)];
    if (!u) throw httpError(404, 'Пользователь не найден');
    return u;
  };
  const purchases = (uid) => Object.values(S.purchases).filter((p) => p.userId === String(uid));
  const spent = (uid) => purchases(uid).reduce((n, p) => n + p.price, 0);
  const balance = (uid) => logic.totalXp(uid); // общий XP (уже за вычетом покупок)
  const owned = (uid) => [...new Set([...FREE_MASCOTS, ...(S.users[String(uid)]?.owned || [])])];
  const currentMascot = (uid) => {
    const m = S.users[String(uid)]?.prefs?.mascot;
    return m && owned(uid).includes(m) ? m : 'kapi';
  };

  // Один раз: кто уже выбрал маскота до появления магазина — оставляем его бесплатно
  function migrate() {
    S.migrations ||= {};
    if (S.migrations['shop-v1']) return 0;
    let n = 0;
    for (const u of Object.values(S.users)) {
      const m = u.prefs?.mascot;
      if (m && !FREE_MASCOTS.includes(m) && MASCOT_PRICES[m] != null) { u.owned = [...new Set([...(u.owned || []), m])]; n++; }
    }
    S.migrations['shop-v1'] = Date.now();
    store.save();
    return n;
  }
  // Один раз (shop-v2, по просьбе учителя): подарки shop-v1 отменяются — у всех остаются только Капи, Дино
  // и реально купленные за XP маскоты. Кто был на чужом маскоте — переходит на Капи.
  function refundMascots(key, userIds) {
    S.migrations ||= {};
    if (S.migrations[key]) return null;
    const out = [];
    for (const uid of userIds) {
      const u = S.users[uid];
      if (!u) continue;
      const refunded = purchases(uid).filter((p) => p.item.startsWith('mascot:'));
      for (const p of refunded) delete S.purchases[p.id];
      const ids = refunded.map((p) => p.item.slice(7));
      u.owned = (u.owned || []).filter((m) => !ids.includes(m));
      if (ids.includes(u.prefs?.mascot)) u.prefs = { ...u.prefs, mascot: 'kapi' };
      out.push({ user: { id: uid, name: logic.name(u) }, mascots: ids, refundXp: refunded.reduce((n, p) => n + p.price, 0), xpNow: logic.totalXp(uid) });
    }
    S.migrations[key] = Date.now();
    store.save();
    return out;
  }
  function revokeGifts() {
    S.migrations ||= {};
    if (S.migrations['shop-v2']) return null;
    const out = [];
    for (const u of Object.values(S.users)) {
      if (logic.isAdmin(u.id) || u.role === 'parent') continue; // учителя и родителей магазин не касается
      const bought = purchases(u.id).filter((p) => p.item.startsWith('mascot:')).map((p) => p.item.slice(7));
      const before = u.owned || [];
      const lost = before.filter((m) => !bought.includes(m));
      u.owned = [...new Set(bought)];
      const cur = u.prefs?.mascot;
      const reset = cur && !FREE_MASCOTS.includes(cur) && !bought.includes(cur);
      if (reset) u.prefs = { ...u.prefs, mascot: 'kapi' };
      if (lost.length || reset) out.push({ user: { id: u.id, name: logic.name(u) }, lost, was: reset ? cur : null });
    }
    S.migrations['shop-v2'] = Date.now();
    store.save();
    return out;
  }

  function charge(uid, item, price) {
    if (balance(uid) < price) throw httpError(400, `Не хватает XP: нужно ${price}, у тебя ${Math.max(0, balance(uid))}`, { code: 'no-xp' });
    const p = { id: store.nextId('b'), userId: String(uid), item, price, at: Date.now() };
    S.purchases[p.id] = p;
    return p;
  }

  // ───────── состояние маскота ─────────
  const dayStart = (ts) => { const d = new Date(ts + TZ_MIN * 60_000); d.setUTCHours(0, 0, 0, 0); return d.getTime() - TZ_MIN * 60_000; };
  function pet(uid, now = Date.now()) {
    uid = String(uid);
    const feeds = purchases(uid).filter((p) => p.item.startsWith('food:')).map((p) => p.at);
    const tests = Object.values(S.attempts).filter((a) => a.userId === uid && a.finishedAt && !a.preview).map((a) => a.finishedAt);
    const week = now - 7 * DAY;
    const f7 = feeds.filter((t) => t > week).length;
    const t7 = tests.filter((t) => t > week).length;
    const today = dayStart(now);
    const care = Math.max(0, ...feeds, ...tests, S.users[uid]?.joinedAt || 0);
    const localHour = new Date(now + TZ_MIN * 60_000).getUTCHours();
    const lastFed = feeds.length ? Math.max(...feeds) : null;
    let state = 'normal';
    if (care < today - DAY || (care < today && localHour >= 18)) state = 'hungry';
    else if (f7 >= 3 && f7 > t7) state = 'fat';
    else if (t7 >= 3 && f7 <= 1) state = 'strong';
    return { mascot: currentMascot(uid), state, feeds7: f7, tests7: t7, lastFed, fedToday: Boolean(lastFed && lastFed >= today) };
  }

  // ───────── покупки ─────────
  function catalog(uid, lang = 'ru') {
    const own = owned(uid);
    const u = S.users[String(uid)];
    return {
      balance: balance(uid), earned: logic.earnedXp(uid), spent: spent(uid),
      mascots: Object.entries(MASCOT_PRICES).map(([id, price]) => ({ id, price, free: FREE_MASCOTS.includes(id), owned: own.includes(id) })).sort((a, b) => a.price - b.price),
      foods: Object.entries(FOODS).map(([mascot, f]) => ({ id: mascot, mascot, emoji: f.emoji, price: f.price, name: f.name[lang] || f.name.ru })),
      potion: { price: POTION_PRICE, have: u?.potions || 0 },
      magnifier: { price: MAGNIFIER_PRICE, seconds: MAGNIFIER_SECONDS },
      pet: pet(uid),
    };
  }
  function buy(uid, item, lang = 'ru') {
    const u = user(uid);
    const [kind, id] = String(item || '').split(':');
    let out;
    if (kind === 'mascot') {
      if (MASCOT_PRICES[id] == null) throw httpError(404, 'Нет такого маскота');
      if (owned(uid).includes(id)) throw httpError(400, 'Этот маскот уже твой');
      charge(uid, item, MASCOT_PRICES[id]);
      u.owned = [...new Set([...(u.owned || []), id])];
      u.prefs = { ...(u.prefs || {}), mascot: id };
      out = { mascot: id };
    } else if (kind === 'food') {
      const f = FOODS[id];
      if (!f) throw httpError(404, 'Нет такой еды');
      const mine = currentMascot(uid);
      // чужая еда: маскот отказывается
      if (id !== mine) throw httpError(400, 'Ты что? Лучше реши тест, а? Дурачок 😜', { code: 'wrong-food', mascot: mine, food: FOODS[mine] ? { emoji: FOODS[mine].emoji, name: FOODS[mine].name[lang] || FOODS[mine].name.ru } : null });
      charge(uid, item, f.price);
      out = { fed: id };
    } else if (kind === 'potion') {
      charge(uid, item, POTION_PRICE);
      u.potions = (u.potions || 0) + 1;
      out = { potions: u.potions };
    } else throw httpError(404, 'Нет такого товара');
    store.save();
    logic.log('shop', { user: { id: u.id, name: logic.name(u) }, item, balance: balance(uid) });
    return { ...out, ...catalog(uid, lang) };
  }

  // ───────── в тесте: лупа и зелье ─────────
  const norm = (s) => String(s || '').toLowerCase().replace(/ё/g, 'е');
  const words = (s) => norm(s).split(/[^a-zа-яa-z0-9ʼ'_-]+/i).filter((w) => w.length >= 4);
  // Подходящий раздел обучалки для вопроса: по теме вопроса, иначе по совпадению слов
  function sectionFor(lesson, q) {
    const secs = lesson?.learn?.sections || [];
    if (!secs.length) return null;
    const topic = norm(q.topic);
    let best = topic ? secs.find((s) => (s.check || []).some((c) => norm(c.topic) === topic) || norm(s.title) === topic || norm(s.title).includes(topic) || topic.includes(norm(s.title))) : null;
    if (!best) {
      const qw = new Set(words(`${q.prompt} ${q.code || ''} ${q.topic || ''}`));
      let score = -1;
      for (const s of secs) {
        const sw = words(`${s.title} ${s.slides.map((x) => `${x.text} ${x.code || ''}`).join(' ')}`);
        const n = sw.filter((w) => qw.has(w)).length;
        if (n > score) { score = n; best = s; }
      }
    }
    return best;
  }
  function useMagnifier(uid, attempt, q, lesson) {
    if (attempt.preview) return { help: help(lesson, q), seconds: MAGNIFIER_SECONDS, balance: balance(uid), free: true };
    if (attempt.magnifierUsed != null) throw httpError(400, 'Лупу можно использовать один раз за тест', { code: 'used' });
    const h = help(lesson, q);
    if (!h) throw httpError(400, 'К этому вопросу нет обучалки — лупа не поможет. XP не списаны', { code: 'no-help' });
    charge(uid, 'magnifier', MAGNIFIER_PRICE);
    attempt.magnifierUsed = Date.now();
    store.save();
    logic.log('magnifier', { user: { id: String(uid), name: logic.name(S.users[uid]) }, lesson: lesson?.id, topic: q.topic || null });
    return { help: h, seconds: MAGNIFIER_SECONDS, balance: balance(uid) };
  }
  function help(lesson, q) {
    const s = sectionFor(lesson, q);
    if (!s) return null;
    const slides = s.slides.filter((x) => !x.quote).slice(0, 3);
    const rule = s.slides.find((x) => x.quote);
    return { title: s.title, slides: [...slides, ...(rule ? [rule] : [])].slice(0, 3).map((x) => ({ text: x.text, code: x.code || null, emoji: x.emoji || null, quote: Boolean(x.quote) })) };
  }
  // Зелье: короткая подсказка. Для «выбора» ещё убирает один неверный вариант
  function usePotion(uid, attempt, q, lesson, seenOptions) {
    const u = user(uid);
    if (attempt.potionUsed != null) throw httpError(400, 'Зелье можно выпить один раз за тест', { code: 'used' });
    if (!attempt.preview) {
      if (!(u.potions > 0)) throw httpError(400, 'Зелий нет — купи в магазине', { code: 'no-potion' });
      u.potions -= 1;
    }
    attempt.potionUsed = Date.now();
    let text = q.hint || '';
    if (!text) {
      const s = sectionFor(lesson, q);
      const rule = s?.slides.find((x) => x.quote) || s?.slides[0];
      const first = String(rule?.text || '').replace(/\*\*|`/g, '').split(/(?<=[.!?])\s|\n/)[0];
      text = first ? first.slice(0, 160) : '';
    }
    let remove = null;
    if (q.type === 'choice' && Array.isArray(seenOptions)) {
      const right = q.options[q.answer];
      const wrong = seenOptions.map((o, i) => [o, i]).filter(([o]) => o !== right);
      if (wrong.length > 1) remove = wrong[Math.floor(Math.random() * wrong.length)][1];
    }
    store.save();
    logic.log('potion', { user: { id: String(uid), name: logic.name(u) }, lesson: lesson?.id, topic: q.topic || null });
    return { hint: text, remove, potions: u.potions || 0 };
  }

  return { migrate, revokeGifts, refundMascots, catalog, buy, balance, owned, currentMascot, pet, useMagnifier, usePotion, FOODS };
}
