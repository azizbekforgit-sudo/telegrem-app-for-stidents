// Напоминалки три раза в день (по умолчанию 06:30, 13:00, 20:00 — NUDGE_TIMES) ученикам и родителям.
//
// Ученик:  есть нерешённые тесты → «Пора решать тест N, но ты ещё не решил …» (каждый раз, пока не решит).
//          решил тест, о котором уже напоминали → сутки приходит «Тему не забыл? Брось себе вызов — пройди ещё раз».
// Родитель: первый раз — «учитель дал тест, проверьте, решён ли»; дальше — «всё ещё не решил»; когда решён — «✅ решил, N%».
//          Вечером добавляется, был ли ребёнок сегодня на уроке и какую оценку получил.
//
// К каждому сообщению бот прикладывает картинку маскота ученика (public/m/tg/<маскот>-<поза>.jpg).
// Время — Ташкент (TZ_OFFSET_MIN); у ученика с user.showTzMin — его часовой пояс. Выключить всё: NUDGES=0.
// Состояние: user.nudge = { last: 'дата#слот', reminded: { lessonId: сколько раз напомнили } },
//            у родителя ещё kids: { childId: { told: [lessonId] } }.

const TZ_MIN = Number(process.env.TZ_OFFSET_MIN ?? 300);
const TIMES = (process.env.NUDGE_TIMES || '06:30,13:00,20:00').split(',').map((t) => t.trim()).filter((t) => /^\d\d:\d\d$/.test(t));
const WINDOW_MIN = 60; // если сервер проснулся позже — в течение часа ещё отправим
const DAY = 86400_000;
const toMin = (hm) => { const [h, m] = hm.split(':').map(Number); return h * 60 + m; };
const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const T = {
  greet: {
    ru: ['☀️ Доброе утро', '👋 Добрый день', '🌙 Добрый вечер'],
    uz: ['☀️ Xayrli tong', '👋 Xayrli kun', '🌙 Xayrli kech'],
    en: ['☀️ Good morning', '👋 Good afternoon', '🌙 Good evening'],
  },
  one: {
    ru: (t) => `⏰ Пора решать тест:\n📌 <b>${t}</b>\n\nЗаходи — я помогу 💪`,
    uz: (t) => `⏰ Testni yechish vaqti keldi:\n📌 <b>${t}</b>\n\nKir — men yordam beraman 💪`,
    en: (t) => `⏰ Time to take the test:\n📌 <b>${t}</b>\n\nCome in — I'll help 💪`,
  },
  many: {
    ru: (t, list) => `⏰ Пора решать тест:\n📌 <b>${t}</b>\n\nНо ты ещё не решил:\n${list}\n\nНачни с первого — и пойдём по порядку 💪`,
    uz: (t, list) => `⏰ Testni yechish vaqti keldi:\n📌 <b>${t}</b>\n\nLekin sen hali bularni yechmading:\n${list}\n\nBirinchisidan boshla — tartib bilan boramiz 💪`,
    en: (t, list) => `⏰ Time to take the test:\n📌 <b>${t}</b>\n\nBut you still haven't done:\n${list}\n\nStart with the first one — we'll go in order 💪`,
  },
  review: {
    ru: (t, p) => `🔁 Тему «${t}» не забыл? Ты решил тест на ${p}%.\n\nБрось себе вызов — пройди ещё раз и побей свой результат! 🔥`,
    uz: (t, p) => `🔁 «${t}» mavzusini unutmadingmi? Sen testni ${p}% ga yechding.\n\nO'zingni sinab ko'r — yana bir marta yechib, natijangni yaxshila! 🔥`,
    en: (t, p) => `🔁 Still remember «${t}»? You scored ${p}% on the test.\n\nChallenge yourself — take it again and beat your result! 🔥`,
  },
  review100: {
    ru: (t) => `🏆 Ты решил «${t}» на 100%! А тему не забыл?\n\nБрось себе вызов — пройди ещё раз без единой ошибки 🔥`,
    uz: (t) => `🏆 Sen «${t}» testini 100% ga yechding! Mavzuni unutmadingmi?\n\nO'zingni sinab ko'r — yana bir marta xatosiz yech 🔥`,
    en: (t) => `🏆 You got 100% on «${t}»! Still remember it?\n\nChallenge yourself — do it again without a single mistake 🔥`,
  },
  hungry: {
    ru: '🍽 И я проголодался… Реши тест или покорми меня — еда в магазине!',
    uz: "🍽 Men esa och qoldim… Testni yech yoki meni boqib qo'y — ovqat do'konda!",
    en: "🍽 And I'm hungry… Take a test or feed me — food is in the shop!",
  },
  starving: {
    ru: '😢 Я совсем ослаб от голода… Реши тест или покорми меня, пожалуйста!',
    uz: "😢 Ochlikdan butunlay holsizlandim… Iltimos, testni yech yoki meni boqib qo'y!",
    en: "😢 I'm so weak from hunger… Please take a test or feed me!",
  },
  more: { ru: (n) => `• … и ещё ${n}`, uz: (n) => `• … va yana ${n} ta`, en: (n) => `• … and ${n} more` },
  open: { ru: '🎮 Открыть приложение', uz: '🎮 Ilovani ochish', en: '🎮 Open the app' },
  // родителям
  pFirst: {
    ru: (k, t) => `👀 Учитель дал <b>${k}</b> тест:\n📌 <b>${t}</b>\nПроверьте, пожалуйста, решён ли он.`,
    uz: (k, t) => `👀 Ustoz <b>${k}</b>ga test berdi:\n📌 <b>${t}</b>\nIltimos, yechilganini tekshirib ko'ring.`,
    en: (k, t) => `👀 The teacher gave <b>${k}</b> a test:\n📌 <b>${t}</b>\nPlease check whether it's done.`,
  },
  pAlso: { ru: 'Ещё не решены:', uz: 'Hali yechilmagan:', en: 'Still not done:' },
  pAgain: {
    ru: (k) => `⏰ <b>${k}</b> всё ещё не решил(а):`,
    uz: (k) => `⏰ <b>${k}</b> hali yechmadi:`,
    en: (k) => `⏰ <b>${k}</b> still hasn't done:`,
  },
  pDone: {
    ru: (k, t, p) => `✅ <b>${k}</b> решил(а) тест «${t}» — ${p}%`,
    uz: (k, t, p) => `✅ <b>${k}</b> «${t}» testini yechdi — ${p}%`,
    en: (k, t, p) => `✅ <b>${k}</b> finished «${t}» — ${p}%`,
  },
  pWas: { ru: (k) => `📅 Сегодня <b>${k}</b> был(а) на уроке ✅`, uz: (k) => `📅 Bugun <b>${k}</b> darsda bo'ldi ✅`, en: (k) => `📅 <b>${k}</b> was in class today ✅` },
  pMiss: { ru: (k) => `📅 Сегодня <b>${k}</b> не был(а) на уроке ❌`, uz: (k) => `📅 Bugun <b>${k}</b> darsda bo'lmadi ❌`, en: (k) => `📅 <b>${k}</b> missed class today ❌` },
  pGrade: { ru: (k, v) => `⭐ Оценка <b>${k}</b> сегодня: ${v}/10`, uz: (k, v) => `⭐ <b>${k}</b>ning bugungi bahosi: ${v}/10`, en: (k, v) => `⭐ <b>${k}</b>'s grade today: ${v}/10` },
  pFoot: {
    ru: 'Календарь посещаемости и оценок — в приложении, на главной.',
    uz: 'Davomat va baholar kalendari — ilovada, bosh sahifada.',
    en: 'The attendance and grades calendar is in the app, on the home screen.',
  },
};

export function createNudges({ logic, journal, shop, store }) {
  const S = logic.S;
  const tt = (key, lang, ...a) => { const v = T[key][lang] || T[key].ru; return typeof v === 'function' ? v(...a) : v; };
  const langOf = (u) => (['uz', 'en'].includes(u?.prefs?.lang) ? u.prefs.lang : 'ru');
  const first = (u) => u.firstName || logic.name(u);

  // Какой сейчас слот у пользователя с таким часовым поясом (или null)
  function slotNow(tzMin, now) {
    const d = new Date(now + tzMin * 60_000);
    const cur = d.getUTCHours() * 60 + d.getUTCMinutes();
    const i = TIMES.findIndex((t) => cur >= toMin(t) && cur < toMin(t) + WINDOW_MIN);
    return i < 0 ? null : { i, part: Math.min(2, Math.floor((i * 3) / TIMES.length)), key: `${d.toISOString().slice(0, 10)}#${i}` };
  }
  const bullets = (items, lang) => items.slice(0, 5).map((x) => `• ${esc(x.title(lang))}`).join('\n') + (items.length > 5 ? '\n' + tt('more', lang, items.length - 5) : '');

  function studentMsg(u, slot, now) {
    const n = u.nudge;
    n.reminded ||= {};
    const lang = langOf(u);
    const st = logic.testStatus(u.id);
    const hello = `${T.greet[lang][slot.part]}, ${esc(first(u))}!\n\n`;
    const base = { chatId: u.id, mascot: u.prefs?.mascot || 'mimi', lang, button: tt('open', lang) };
    const pending = st.filter((x) => x.pct == null);
    const pet = shop?.pet(u.id, now);
    if (pet?.lastFed && pet.lastFed > (n.lastAt || 0) && n.lastAt) return null; // покормил — маскот напишет в другой раз
    // забываем про тесты, которые решены больше суток назад или которых уже нет
    for (const id of Object.keys(n.reminded)) {
      const x = st.find((y) => y.lessonId === id);
      if (!x || (x.pct != null && now - x.doneAt > DAY)) delete n.reminded[id];
    }
    if (pending.length) {
      const cur = pending[pending.length - 1];
      const debts = pending.slice(0, -1);
      pending.forEach((x) => (n.reminded[x.lessonId] = (n.reminded[x.lessonId] || 0) + 1));
      const hunger = pet?.state === 'hungry' ? tt('starving', lang) : tt('hungry', lang);
      return { ...base, kind: 'debt', count: pending.length, pose: pet?.state === 'hungry' ? 'hungry' : debts.length >= 3 ? 'sad' : debts.length ? 'think' : 'talk', mascot: pet?.mascot || base.mascot,
        text: hello + (debts.length ? tt('many', lang, esc(cur.title(lang)), bullets(debts, lang)) : tt('one', lang, esc(cur.title(lang)))) + '\n\n' + hunger };
    }
    // всё решено: сутки после теста, о котором напоминали, зовём повторить
    const done = st.filter((x) => x.pct != null && n.reminded[x.lessonId] && now - x.doneAt <= DAY).sort((a, b) => b.doneAt - a.doneAt || (b.order ?? 0) - (a.order ?? 0))[0];
    if (!done) return null;
    return { ...base, kind: 'review', count: 0, mascot: pet?.mascot || base.mascot, pose: pet?.state === 'strong' ? 'strong' : done.pct === 100 ? 'love' : 'peace',
      text: hello + (done.pct === 100 ? tt('review100', lang, esc(done.title(lang))) : tt('review', lang, esc(done.title(lang)), done.pct)) };
  }

  function parentMsg(p, slot) {
    const n = p.nudge;
    n.kids ||= {};
    const lang = langOf(p);
    const blocks = [];
    let mascot = null;
    for (const kidId of p.children || []) {
      const k = S.users[kidId];
      if (!k) continue;
      mascot ||= shop?.currentMascot(kidId) || k.prefs?.mascot || 'kapi';
      const kn = esc(first(k));
      const st = logic.testStatus(kidId);
      const kd = (n.kids[kidId] ||= { told: [] });
      const pending = st.filter((x) => x.pct == null);
      // решил то, о чём мы писали родителю
      for (const x of st.filter((y) => y.pct != null && kd.told.includes(y.lessonId))) blocks.push(tt('pDone', lang, kn, esc(x.title(lang)), x.pct));
      const fed = shop?.pet(kidId).fedToday;
      const fresh = pending.filter((x) => !kd.told.includes(x.lessonId));
      if (fed) { /* покормил маскота — сегодня родителям про долги не пишем */ } else if (fresh.length) {
        const cur = fresh[fresh.length - 1];
        const rest = pending.filter((x) => x !== cur);
        blocks.push(tt('pFirst', lang, kn, esc(cur.title(lang))) + (rest.length ? `\n${tt('pAlso', lang)}\n${bullets(rest, lang)}` : ''));
      } else if (pending.length) {
        blocks.push(`${tt('pAgain', lang, kn)}\n${bullets(pending, lang)}`);
      }
      if (!fed) kd.told = pending.map((x) => x.lessonId);
      // вечером — посещаемость и оценки за сегодня
      if (slot.part === 2) {
        const d = journal.diary(kidId);
        const today = d.days.filter((x) => x.date === d.today);
        if (today.length) blocks.push(tt(today.some((x) => !x.present) ? 'pMiss' : 'pWas', lang, kn));
        for (const g of d.grades.filter((x) => x.date === d.today)) blocks.push(tt('pGrade', lang, kn, g.value));
      }
    }
    if (!blocks.length) return null;
    return { chatId: p.id, mascot: mascot || 'mimi', pose: 'teach', lang, kind: 'parent', count: blocks.length, button: tt('open', lang),
      text: `${T.greet[lang][slot.part]}!\n\n${blocks.join('\n\n')}\n\n${tt('pFoot', lang)}` };
  }

  // Сообщения, которые пора отправить прямо сейчас (каждому — не чаще одного на слот)
  function due(now = Date.now()) {
    if (process.env.NUDGES === '0' || !TIMES.length) return [];
    const out = [];
    let touched = false;
    for (const u of Object.values(S.users)) {
      if (logic.isAdmin(u.id) || u.needRole || !/^\d+$/.test(String(u.id))) continue; // только Telegram-пользователи
      const parent = u.role === 'parent';
      if (parent && !(u.children || []).length) continue;
      const slot = slotNow(parent ? TZ_MIN : u.showTzMin ?? TZ_MIN, now);
      if (!slot) continue;
      u.nudge ||= { last: null };
      if (u.nudge.last === slot.key) continue;
      u.nudge.last = slot.key;
      touched = true;
      const m = parent ? parentMsg(u, slot) : studentMsg(u, slot, now);
      u.nudge.lastAt = now;
      if (m) out.push(m);
    }
    if (touched) store.save();
    return out;
  }

  return { due, slotNow, times: TIMES };
}
