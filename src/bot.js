// Telegram-бот: регистрация учеников, привязка чатов-групп, уведомления о тестах и напоминания.
import { Bot, InlineKeyboard, GrammyError } from 'grammy';

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const mention = (u, name) => `<a href="tg://user?id=${u}">${esc(name)}</a>`;

// Сообщения ученикам в личку — на их языке (ru / uz / en). В чатах групп бот пишет по-русски.
const T = {
  open: { ru: '🎮 Открыть приложение', uz: '🎮 Ilovani ochish', en: '🎮 Open the app' },
  play: { ru: '🎮 Играть', uz: "🎮 O'ynash", en: '🎮 Play' },
  openTask: { ru: '🎯 Открыть', uz: '🎯 Ochish', en: '🎯 Open' },
  inGroup: { ru: (n, g) => `👋 <b>${n}</b>, ты в группе ${g}.\nЗаходи — тебя ждут тесты!`, uz: (n, g) => `👋 <b>${n}</b>, sen ${g} guruhidasan.\nKir — seni testlar kutmoqda!`, en: (n, g) => `👋 <b>${n}</b>, you're in ${g}.\nCome in — tests are waiting!` },
  hello: { ru: (n) => `👋 Привет, <b>${n}</b>!\n\nТы зарегистрирован. Учитель скоро добавит тебя в группу — тогда здесь появятся тесты. 🚀`, uz: (n) => `👋 Salom, <b>${n}</b>!\n\nSen ro'yxatdan o'tding. Ustoz tez orada seni guruhga qo'shadi — shunda testlar paydo bo'ladi. 🚀`, en: (n) => `👋 Hi, <b>${n}</b>!\n\nYou're registered. Your teacher will add you to a group soon — then tests will appear here. 🚀` },
  added: { ru: (g) => `🎉 Тебя добавили в группу ${g}! Когда учитель отправит тест — я напишу.`, uz: (g) => `🎉 Seni ${g} guruhiga qo'shishdi! Ustoz test yuborganda yozaman.`, en: (g) => `🎉 You've been added to ${g}! I'll message you when the teacher sends a test.` },
  newTest: { ru: (t, d, n) => `🆕 <b>Новый тест!</b>\n\n${t}\n${d}🧩 Вопросов: ${n}\n\nЗаходите и играйте! 🎮`, uz: (t, d, n) => `🆕 <b>Yangi test!</b>\n\n${t}\n${d}🧩 Savollar: ${n}\n\nKiring va o'ynang! 🎮`, en: (t, d, n) => `🆕 <b>New test!</b>\n\n${t}\n${d}🧩 Questions: ${n}\n\nCome in and play! 🎮` },
  direct: { ru: (t, d) => `📝 <b>Учитель отправил тебе тест!</b>\n\n${t}\n${d}\nЗаходи и решай 💪`, uz: (t, d) => `📝 <b>Ustoz senga test yubordi!</b>\n\n${t}\n${d}\nKir va yech 💪`, en: (t, d) => `📝 <b>Your teacher sent you a test!</b>\n\n${t}\n${d}\nCome in and solve it 💪` },
  personal: { ru: (t, d) => `🎯 <b>Личное задание от учителя!</b>\n\n${t}\n${d}\nЕго сделали специально для тебя — по твоим ошибкам. Заходи! 💪`, uz: (t, d) => `🎯 <b>Ustozdan shaxsiy topshiriq!</b>\n\n${t}\n${d}\nU aynan sen uchun — xatolaring asosida tayyorlandi. Kir! 💪`, en: (t, d) => `🎯 <b>A personal task from your teacher!</b>\n\n${t}\n${d}\nIt was made just for you — based on your mistakes. Come in! 💪` },
  askRole: { ru: (n) => `👋 Привет, <b>${n}</b>!\n\nЭто Зубрик — тесты и обучалки курса.\nСкажи, кто ты?`, uz: (n) => `👋 Salom, <b>${n}</b>!\n\nBu Zubrik — kurs testlari va darsliklari.\nAyt-chi, sen kimsan?`, en: (n) => `👋 Hi, <b>${n}</b>!\n\nThis is Zubrik — course tests and lessons.\nTell me, who are you?` },
  iStudent: { ru: '🎒 Я ученик', uz: "🎒 Men o'quvchiman", en: '🎒 I am a student' },
  iParent: { ru: '👨‍👩‍👧 Я родитель', uz: '👨‍👩‍👧 Men ota-onaman', en: '👨‍👩‍👧 I am a parent' },
  parentHello: { ru: (n) => `👨‍👩‍👧 Здравствуйте, <b>${n}</b>!\n\nВ приложении вы увидите прогресс своего ребёнка и всех учеников курса, общую лигу и лигу группы. Откройте приложение и выберите своего ребёнка.`, uz: (n) => `👨‍👩‍👧 Assalomu alaykum, <b>${n}</b>!\n\nIlovada farzandingiz va kursning barcha o'quvchilari natijalarini, umumiy liga va guruh ligasini ko'rasiz. Ilovani oching va farzandingizni tanlang.`, en: (n) => `👨‍👩‍👧 Hello, <b>${n}</b>!\n\nIn the app you'll see your child's progress and that of every student in the course, the global league and the group league. Open the app and choose your child.` },
  siteLogin: { ru: (u, l, p) => `🌐 <b>Вход в Зубрик на сайте</b>\n\nТам твой же аккаунт: те же очки, тесты и лига.\n\n🔗 ${u}\n👤 Логин: <code>${l}</code>\n🔑 Пароль: <code>${p}</code>\n\nНикому не показывай пароль. Новый пароль — команда /site.`, uz: (u, l, p) => `🌐 <b>Zubrikka saytda kirish</b>\n\nU yerda sening o'sha akkaunting: o'sha ochkolar, testlar va liga.\n\n🔗 ${u}\n👤 Login: <code>${l}</code>\n🔑 Parol: <code>${p}</code>\n\nParolni hech kimga ko'rsatma. Yangi parol — /site buyrug'i.`, en: (u, l, p) => `🌐 <b>Sign in to Zubrik on the website</b>\n\nIt's your same account: the same points, tests and league.\n\n🔗 ${u}\n👤 Login: <code>${l}</code>\n🔑 Password: <code>${p}</code>\n\nDon't show your password to anyone. New password — the /site command.` },
  bonus: { ru: (x, r) => `🎁 <b>Учитель начислил тебе ${x} XP!</b>${r ? '\n' + r : ''}\n\nТак держать! 💪`, uz: (x, r) => `🎁 <b>Ustoz senga ${x} XP berdi!</b>${r ? '\n' + r : ''}\n\nShunday davom et! 💪`, en: (x, r) => `🎁 <b>Your teacher gave you ${x} XP!</b>${r ? '\n' + r : ''}\n\nKeep it up! 💪` },
  access: { ru: (n, list, more) => `🔓 <b>Тебе открыли ${n} ${n === 1 ? 'урок' : 'урока(ов)'}!</b>\n\n${list}${more}\n\nЗаходи на «Путь» и учись 💪`, uz: (n, list, more) => `🔓 <b>Senga ${n} ta dars ochildi!</b>\n\n${list}${more}\n\n«Yo'l» bo'limiga kir va o'qi 💪`, en: (n, list, more) => `🔓 <b>${n} lesson${n === 1 ? '' : 's'} unlocked for you!</b>\n\n${list}${more}\n\nOpen your Path and learn 💪` },
  absent: {
    ru: (g, d) => `👋 Привет! Сегодня (${d}) тебя не было на уроке ${g}.\n\nПочему не пришёл? Напиши ответ одним сообщением — я передам учителю.`,
    uz: (g, d) => `👋 Salom! Bugun (${d}) sen ${g} darsida bo'lmading.\n\nNega kelmading? Javobni bitta xabar bilan yoz — men ustozga yetkazaman.`,
    en: (g, d) => `👋 Hi! Today (${d}) you missed the ${g} lesson.\n\nWhy didn't you come? Reply in one message and I'll pass it to the teacher.`,
  },
  absentParent: {
    ru: (n, g, d) => `📋 ${n} сегодня (${d}) не был(а) на уроке ${g}.`,
    uz: (n, g, d) => `📋 ${n} bugun (${d}) ${g} darsida bo'lmadi.`,
    en: (n, g, d) => `📋 ${n} missed the ${g} lesson today (${d}).`,
  },
  reasonThanks: { ru: '🙏 Спасибо, я передал учителю.', uz: '🙏 Rahmat, ustozga yetkazdim.', en: '🙏 Thanks, I passed it to the teacher.' },
  grade: {
    ru: (v, x, c, low) => `${v >= 9 ? '🏆' : v >= 7 ? '⭐' : '📘'} <b>Учитель поставил тебе ${v}/10</b> (+${x} XP)${c}${low ? `\n\nНе вешай нос! ${low}` : v >= 9 ? '\n\nОтлично, так держать! 💪' : ''}\n\nВсё видно в «Дневнике».`,
    uz: (v, x, c, low) => `${v >= 9 ? '🏆' : v >= 7 ? '⭐' : '📘'} <b>Ustoz senga ${v}/10 baho qo'ydi</b> (+${x} XP)${c}${low ? `\n\nTushkunlikka tushma! ${low}` : v >= 9 ? "\n\nZo'r, shunday davom et! 💪" : ''}\n\nHammasi «Kundalik»da.`,
    en: (v, x, c, low) => `${v >= 9 ? '🏆' : v >= 7 ? '⭐' : '📘'} <b>Your teacher gave you ${v}/10</b> (+${x} XP)${c}${low ? `\n\nChin up! ${low}` : v >= 9 ? '\n\nGreat job, keep it up! 💪' : ''}\n\nSee it all in your «Diary».`,
  },
  lowTopic: {
    ru: (t) => `Давай вместе повторим тему «${t}» — открой Дневник, там кнопка «Повторить тему».`,
    uz: (t) => `Keling, «${t}» mavzusini birga takrorlaymiz — Kundalikni och, u yerda «Mavzuni takrorlash» tugmasi bor.`,
    en: (t) => `Let's go over «${t}» together — open your Diary and tap «Review the topic».`,
  },
  lowAny: { ru: 'Давай разберём, что не получилось, — в следующий раз будет выше!', uz: "Keling, nima chiqmaganini ko'rib chiqamiz — keyingi safar balandroq bo'ladi!", en: "Let's figure out what went wrong — next time it'll be higher!" },
  gradeParent: {
    ru: (n, v, t) => `📘 ${n} получил(а) оценку ${v}/10${t ? ` по теме «${t}»` : ''}.`,
    uz: (n, v, t) => `📘 ${n} ${v}/10 baho oldi${t ? ` («${t}» mavzusi)` : ''}.`,
    en: (n, v, t) => `📘 ${n} got ${v}/10${t ? ` on «${t}»` : ''}.`,
  },
  remindTest: { ru: (t) => `\n\n🧩 Тест: <b>${t}</b>\nТы его ещё не сдал — заходи! ⏳`, uz: (t) => `\n\n🧩 Test: <b>${t}</b>\nSen uni hali topshirmading — kir! ⏳`, en: (t) => `\n\n🧩 Test: <b>${t}</b>\nYou haven't taken it yet — come in! ⏳` },
};

export function createBot({ token, logic, journal, store, appUrl, adminIds }) {
  const bot = new Bot(token);
  const S = logic.S;

  const appLink = () => process.env.APP_LINK || `https://t.me/${bot.botInfo.username}?start=play`;
  // В личке можно открыть Mini App прямо кнопкой; в группах Telegram это запрещает — там ссылка.
  const langOf = (uid, fallback) => S.users[String(uid)]?.prefs?.lang || (['uz', 'en'].includes(String(fallback || '').slice(0, 2)) ? String(fallback).slice(0, 2) : 'ru');
  const tt = (key, lang, ...args) => { const v = T[key][lang] || T[key].ru; return typeof v === 'function' ? v(...args) : v; };
  const privateKb = (text = '🎮 Открыть приложение') => (appUrl.startsWith('https://') ? new InlineKeyboard().webApp(text, appUrl) : undefined);
  const groupKb = (text = '🎮 Играть') => new InlineKeyboard().url(text, appLink());

  async function safeSend(chatId, text, extra = {}) {
    try {
      return await bot.api.sendMessage(chatId, text, { parse_mode: 'HTML', link_preview_options: { is_disabled: true }, ...extra });
    } catch (e) {
      if (!(e instanceof GrammyError)) console.error('[bot] send failed', e);
      return null;
    }
  }
  const notifyAdmins = (text, extra) => Promise.all(adminIds.map((id) => safeSend(id, text, extra)));

  function groupsKeyboard(prefix, extraArg = '') {
    const kb = new InlineKeyboard();
    Object.values(S.groups).forEach((g, i) => {
      kb.text(`${g.emoji} ${g.name}`, `${prefix}:${extraArg}${g.id}`);
      if (i % 2 === 1) kb.row();
    });
    return kb;
  }

  // ───────── команды ─────────
  bot.command('start', async (ctx) => {
    if (ctx.chat.type !== 'private') return;
    const { user, isNew } = logic.upsertUser(ctx.from);
    if (logic.isAdmin(user.id)) {
      return ctx.reply(
        '👑 <b>Привет, учитель!</b>\n\nВ приложении ты создаёшь группы, добавляешь учеников и отправляешь тесты.\n\n' +
          'Чтобы бот писал в чат группы: добавь меня в Telegram-группу и напиши там /link.',
        { parse_mode: 'HTML', reply_markup: privateKb('👑 Панель учителя') },
      );
    }
    const lang = langOf(user.id, ctx.from.language_code);
    if (user.needRole) {
      return ctx.reply(tt('askRole', lang, esc(logic.name(user))), { parse_mode: 'HTML', reply_markup: new InlineKeyboard().text(tt('iStudent', lang), 'role:student').row().text(tt('iParent', lang), 'role:parent') });
    }
    if (user.role === 'parent') return ctx.reply(tt('parentHello', lang, esc(logic.name(user))), { parse_mode: 'HTML', reply_markup: privateKb(tt('open', lang)) });
    const groups = logic.userGroups(user.id);
    await ctx.reply(
      groups.length
        ? tt('inGroup', lang, esc(logic.name(user)), groups.map((g) => `${g.emoji} ${esc(g.name)}`).join(', '))
        : tt('hello', lang, esc(logic.name(user))),
      { parse_mode: 'HTML', reply_markup: privateKb(tt('open', lang)) },
    );
  });

  // Новый пользователь выбрал роль (в боте или в приложении)
  async function onRoleChosen(user) {
    const who = `${mention(user.id, logic.name(user))}${user.username ? ' (@' + esc(user.username) + ')' : ''}\nID: <code>${user.id}</code>`;
    if (user.role === 'parent') return notifyAdmins(`👨‍👩‍👧 Новый родитель: ${who}`);
    const kb = Object.keys(S.groups).length ? groupsKeyboard('add', `${user.id}:`) : undefined;
    return notifyAdmins(`🆕 Новый ученик: ${who}\n\n` + (kb ? 'В какую группу добавить?' : 'Групп пока нет — создай группу в приложении.'), { reply_markup: kb });
  }
  bot.callbackQuery(/^role:(student|parent)$/, async (ctx) => {
    const uid = String(ctx.from.id);
    const lang = langOf(uid, ctx.from.language_code);
    let user;
    try { user = logic.setRole(uid, ctx.match[1]); } catch { return ctx.answerCallbackQuery(); }
    await ctx.answerCallbackQuery();
    await ctx.editMessageReplyMarkup().catch(() => {});
    await ctx.reply(user.role === 'parent' ? tt('parentHello', lang, esc(logic.name(user))) : tt('hello', lang, esc(logic.name(user))), { parse_mode: 'HTML', reply_markup: privateKb(tt('open', lang)) });
    await onRoleChosen(user);
  });

  // Логин и пароль для сайта — в личку ученику
  const siteUrl = () => (process.env.SITE_URL || appUrl).replace(/\/$/, '');
  async function notifyBonus(b) {
    if (!b || b.xp <= 0 || String(b.userId).startsWith('w')) return null;
    return safeSend(b.userId, tt('bonus', langOf(b.userId), b.xp, esc(b.reason)), { reply_markup: privateKb(tt('open', langOf(b.userId))) });
  }
  async function sendLogin(l) {
    if (!l?.password || String(l.userId).startsWith('w')) return null;
    return safeSend(l.userId, tt('siteLogin', langOf(l.userId), esc(siteUrl()), esc(l.login), esc(l.password)));
  }
  bot.command('site', async (ctx) => {
    if (ctx.chat.type !== 'private') return;
    const { user } = logic.upsertUser(ctx.from);
    if (logic.isAdmin(user.id) || user.needRole) return ctx.reply('Сначала нажми /start.');
    await sendLogin(logic.issueLogin(user.id, { reset: true }));
  });

  bot.command('help', (ctx) =>
    ctx.reply(
      '/start — открыть приложение\n/link — (учитель, в группе) привязать чат к группе курса\n/unlink — отвязать чат\n/stop — остановить напоминания в этом чате\n/id — показать ID',
    ),
  );

  bot.command('id', (ctx) => ctx.reply(`Твой ID: <code>${ctx.from.id}</code>\nID чата: <code>${ctx.chat.id}</code>`, { parse_mode: 'HTML' }));

  bot.command('link', async (ctx) => {
    if (ctx.chat.type === 'private') return ctx.reply('Эту команду пиши в Telegram-группе, куда ты добавил бота.');
    if (!logic.isAdmin(ctx.from.id)) return ctx.reply('Только учитель может привязать чат.');
    if (!Object.keys(S.groups).length) return ctx.reply('Сначала создай группу в приложении, потом снова напиши /link.');
    await ctx.reply('К какой группе курса привязать этот чат?', { reply_markup: groupsKeyboard('link') });
  });

  bot.command('unlink', async (ctx) => {
    if (!logic.isAdmin(ctx.from.id)) return;
    const g = Object.values(S.groups).find((x) => String(x.chatId) === String(ctx.chat.id));
    if (!g) return ctx.reply('Этот чат ни к чему не привязан.');
    g.chatId = null;
    g.chatTitle = null;
    store.save();
    await ctx.reply(`Чат отвязан от группы «${g.name}».`);
  });

  bot.command('stop', async (ctx) => {
    if (!logic.isAdmin(ctx.from.id)) return;
    const g = Object.values(S.groups).find((x) => String(x.chatId) === String(ctx.chat.id));
    const targets = Object.values(S.reminders).filter((r) => r.active && (!g || r.groupId === g.id));
    targets.forEach((r) => logic.setReminder(r.id, { active: false }));
    await ctx.reply(targets.length ? `⏹ Остановил напоминаний: ${targets.length}` : 'Активных напоминаний нет.');
  });

  // ───────── кнопки ─────────
  bot.callbackQuery(/^add:(\w+):(\w+)$/, async (ctx) => {
    if (!logic.isAdmin(ctx.from.id)) return ctx.answerCallbackQuery({ text: 'Только для учителя' });
    const [, uid, gid] = ctx.match;
    const g = S.groups[gid];
    if (!g) return ctx.answerCallbackQuery({ text: 'Группа не найдена' });
    logic.addMember(gid, uid);
    await ctx.answerCallbackQuery({ text: 'Добавлен!' });
    await ctx.editMessageText(`✅ ${mention(uid, logic.name(S.users[uid]))} добавлен в группу ${g.emoji} <b>${esc(g.name)}</b>`, { parse_mode: 'HTML' }).catch(() => {});
    await safeSend(uid, tt('added', langOf(uid), `${g.emoji} <b>${esc(g.name)}</b>`), { reply_markup: privateKb(tt('open', langOf(uid))) });
  });

  bot.callbackQuery(/^link:(\w+)$/, async (ctx) => {
    if (!logic.isAdmin(ctx.from.id)) return ctx.answerCallbackQuery({ text: 'Только для учителя' });
    const g = S.groups[ctx.match[1]];
    if (!g) return ctx.answerCallbackQuery({ text: 'Группа не найдена' });
    for (const other of Object.values(S.groups)) if (String(other.chatId) === String(ctx.chat.id)) other.chatId = null;
    g.chatId = ctx.chat.id;
    g.chatTitle = ctx.chat.title || '';
    store.save();
    await ctx.answerCallbackQuery({ text: 'Привязано!' });
    await ctx.editMessageText(
      `✅ Этот чат привязан к группе ${g.emoji} <b>${esc(g.name)}</b>.\nСюда будут приходить новые тесты и напоминания.\n\n` +
        'Ученики: нажмите кнопку ниже и запустите бота, чтобы попасть в список 👇',
      { parse_mode: 'HTML', reply_markup: groupKb('🚀 Запустить бота') },
    ).catch(() => {});
  });

  // Бота добавили в группу — подсказываем, что делать

  // ───────── журнал: посещаемость ─────────
  const fmtDate = (d) => d.split('-').reverse().slice(0, 2).join('.');
  const sessTitle = (s) => { const g = S.groups[s.groupId]; return `${g?.emoji || '📚'} <b>${esc(g?.name || 'Группа')}</b> · ${fmtDate(s.date)} · ${s.start}${s.end && s.end !== s.start ? '–' + s.end : ''}`; };
  // Клавиатура: каждый ученик — кнопка (✅ был / ❌ нет), внизу «Все пришли» и «Готово»
  function attendanceKb(s) {
    const kb = new InlineKeyboard();
    const draft = new Set(s.draft || s.absent || []);
    s.members.forEach((id, i) => {
      kb.text(`${draft.has(id) ? '❌' : '✅'} ${logic.name(S.users[id])}`.slice(0, 60), `at:${s.id}:${i}`);
      if (i % 2 === 1) kb.row();
    });
    if (s.members.length % 2) kb.row();
    kb.text('👍 Все пришли', `at:${s.id}:all`).text('💾 Готово', `at:${s.id}:ok`);
    return kb;
  }
  async function askAttendance(s) {
    s.draft = [];
    s.msgs = [];
    const text = `📋 ${sessTitle(s)}\n\nУрок начался. <b>Кого нет?</b>\nНапиши имена через запятую (например: <i>Бегзод, Наргиза</i>) или нажми на учеников ниже. Если все на месте — «Все пришли».`;
    for (const id of adminIds) {
      const m = await safeSend(id, text, { reply_markup: attendanceKb(s) });
      if (m) s.msgs.push({ chat: id, msg: m.message_id });
    }
    store.save();
  }
  const summary = (s) => {
    const absent = s.absent.map((id) => logic.name(S.users[id]));
    return `📋 ${sessTitle(s)}\n\n${absent.length ? `❌ <b>Не было (${absent.length}):</b> ${esc(absent.join(', '))}\n✅ Были: ${s.members.length - absent.length} из ${s.members.length}` : `✅ <b>Все ${s.members.length} на месте!</b>`}\n\nЖурнал — в приложении, вкладка «Журнал».`;
  };
  // После отметки: обновить сообщения учителю и написать пропустившим (и их родителям)
  async function onAttendance(s, fresh, { fromApp = false } = {}) {
    for (const m of s.msgs || []) {
      try { await bot.api.editMessageText(m.chat, m.msg, summary(s), { parse_mode: 'HTML', reply_markup: new InlineKeyboard().text('✏️ Изменить', `at:${s.id}:edit`) }); } catch { /* сообщение уже другое */ }
    }
    const g = S.groups[s.groupId];
    const gname = `${g?.emoji || ''} <b>${esc(g?.name || '')}</b>`;
    for (const uid of fresh) {
      await safeSend(uid, tt('absent', langOf(uid), gname, fmtDate(s.date)));
      for (const p of Object.values(S.users).filter((u) => u.role === 'parent' && (u.children || []).includes(uid))) {
        await safeSend(p.id, tt('absentParent', langOf(p.id), `<b>${esc(logic.name(S.users[uid]))}</b>`, gname, fmtDate(s.date)));
      }
    }
    if (!fromApp) return;
  }
  async function finishAttendance(s, absentIds) {
    const r = journal.markAttendance(s.id, absentIds);
    delete s.draft;
    store.save();
    await onAttendance(r.session, r.fresh);
    return r;
  }
  bot.callbackQuery(/^at:(\w+):(\w+)$/, async (ctx) => {
    if (!logic.isAdmin(ctx.from.id)) return ctx.answerCallbackQuery({ text: 'Только для учителя' });
    const [, sid, act] = ctx.match;
    const s = S.sessions?.[sid];
    if (!s) return ctx.answerCallbackQuery({ text: 'Занятие не найдено' });
    if (act === 'edit') {
      s.draft = [...s.absent];
      store.save();
      await ctx.editMessageText(`📋 ${sessTitle(s)}\n\nИсправь отметки и нажми «Готово».`, { parse_mode: 'HTML', reply_markup: attendanceKb(s) }).catch(() => {});
      return ctx.answerCallbackQuery();
    }
    if (act === 'all' || act === 'ok') {
      await finishAttendance(s, act === 'all' ? [] : s.draft || []);
      return ctx.answerCallbackQuery({ text: act === 'all' ? 'Все на месте 👍' : 'Сохранил' });
    }
    const id = s.members[Number(act)];
    if (!id) return ctx.answerCallbackQuery();
    const d = new Set(s.draft || []);
    d.has(id) ? d.delete(id) : d.add(id);
    s.draft = [...d];
    store.save();
    await ctx.editMessageReplyMarkup({ reply_markup: attendanceKb(s) }).catch(() => {});
    return ctx.answerCallbackQuery({ text: d.has(id) ? `❌ ${logic.name(S.users[id])} — нет` : `✅ ${logic.name(S.users[id])} — пришёл` });
  });
  async function tickAttendance() {
    for (const s of journal.dueSessions()) {
      console.log('[attendance-ask] ' + JSON.stringify({ group: S.groups[s.groupId]?.name, date: s.date, start: s.start }));
      await askAttendance(s);
    }
  }

  // ───────── оценки ─────────
  async function notifyGrade(g) {
    const uid = g.userId;
    const lang = langOf(uid);
    const l = g.lessonId ? S.lessons[g.lessonId] : null;
    const title = l ? (l.tr?.[lang]?.title || l.title) : '';
    const low = g.value <= 5 ? (l ? tt('lowTopic', lang, esc(title)) : tt('lowAny', lang)) : '';
    const c = (l ? `\n📚 ${esc(title)}` : '') + (g.comment ? `\n💬 ${esc(g.comment)}` : '');
    await safeSend(uid, tt('grade', lang, g.value, g.xp, c, low), { reply_markup: privateKb(tt('open', lang)) });
    for (const p of Object.values(S.users).filter((u) => u.role === 'parent' && (u.children || []).includes(uid))) {
      await safeSend(p.id, tt('gradeParent', langOf(p.id), `<b>${esc(logic.name(S.users[uid]))}</b>`, g.value, esc(l ? (l.tr?.[langOf(p.id)]?.title || l.title) : '')));
    }
  }

  // ───────── текстовые сообщения в личке ─────────
  // Учитель: имена отсутствующих в ответ на «Кого нет?». Ученик: причина пропуска.
  bot.on('message:text', async (ctx, next) => {
    if (ctx.chat.type !== 'private' || ctx.message.text.startsWith('/')) return next();
    const uid = String(ctx.from.id);
    if (logic.isAdmin(uid)) {
      const s = journal.pendingSession();
      if (!s) return next();
      const r = journal.parseNames(s.id, ctx.message.text);
      if (!r.all && !r.ids.length) {
        return ctx.reply(`🤔 Не нашёл таких учеников в ${esc(S.groups[s.groupId]?.name || 'группе')}: ${esc(r.unknown.join(', '))}.\nНапиши имена ещё раз или отметь кнопками.`, { parse_mode: 'HTML', reply_markup: attendanceKb(s) });
      }
      await finishAttendance(s, r.ids);
      const miss = r.unknown.length ? `\n\n⚠️ Не узнал: ${esc(r.unknown.join(', '))} — проверь в «Журнале» или нажми «Изменить».` : '';
      return ctx.reply(summary(s) + miss, { parse_mode: 'HTML', reply_markup: new InlineKeyboard().text('✏️ Изменить', `at:${s.id}:edit`) });
    }
    const s = journal.setReason(uid, ctx.message.text);
    if (!s) return next();
    await ctx.reply(tt('reasonThanks', langOf(uid)));
    const g = S.groups[s.groupId];
    await notifyAdmins(`💬 <b>${esc(logic.name(S.users[uid]))}</b> о пропуске (${g?.emoji || ''} ${esc(g?.name || '')}, ${fmtDate(s.date)}):\n\n«${esc(ctx.message.text.slice(0, 500))}»`);
  });

  bot.on('my_chat_member', async (ctx) => {
    const st = ctx.myChatMember.new_chat_member.status;
    if (ctx.chat.type !== 'private' && (st === 'member' || st === 'administrator') && ctx.myChatMember.old_chat_member.status === 'left') {
      await safeSend(ctx.chat.id, '👋 Всем привет! Я бот курса.\n\nУчитель, напиши /link, чтобы привязать этот чат к группе курса.');
    }
  });

  bot.catch((err) => console.error('[bot] error', err.error || err));

  // ───────── рассылки ─────────
  async function notifyPublish(pub) {
    const g = S.groups[pub.groupId];
    const l = S.lessons[pub.lessonId];
    const text = `🆕 <b>Новый тест!</b>\n\n${l.emoji} <b>${esc(l.title)}</b>\n${l.description ? esc(l.description) + '\n' : ''}🧩 Вопросов: ${l.questions.length}\n\nЗаходите и играйте! 🎮`;
    if (g.chatId) await safeSend(g.chatId, text, { reply_markup: groupKb() });
    for (const uid of g.memberIds) {
      if (logic.isAdmin(uid)) continue;
      const lang = langOf(uid);
      await safeSend(uid, tt('newTest', lang, `${l.emoji} <b>${esc(l.title)}</b>`, l.description ? esc(l.description) + '\n' : '', l.questions.length), { reply_markup: privateKb(tt('play', lang)) });
    }
  }

  // Открыли сразу несколько уроков: одно сообщение со списком
  async function notifyAccess(uid, pubs) {
    if (!pubs?.length) return null;
    if (pubs.length === 1) return notifyPersonal(pubs[0]);
    const lang = langOf(uid);
    const lessons = pubs.map((p) => S.lessons[p.lessonId]).filter(Boolean).sort((a, b) => (a.order ?? 999) - (b.order ?? 999));
    const list = lessons.slice(0, 12).map((l) => `${l.emoji} ${esc(l.title)}`).join('\n');
    const more = lessons.length > 12 ? `\n… +${lessons.length - 12}` : '';
    return safeSend(uid, tt('access', lang, pubs.length, list, more), { reply_markup: privateKb(tt('openTask', lang)) });
  }
  async function notifyPersonal(pub) {
    const l = S.lessons[pub.lessonId];
    const lang = langOf(pub.userId);
    await safeSend(pub.userId, tt(l.personal ? 'personal' : 'direct', lang, `${l.emoji} <b>${esc(l.title)}</b>`, l.description ? esc(l.description) + '\n' : ''), { reply_markup: privateKb(tt('openTask', lang)) });
  }

  async function announce(groupId, text) {
    const g = S.groups[groupId];
    const body = `📣 ${esc(text)}`;
    if (g.chatId) return Boolean(await safeSend(g.chatId, body, { reply_markup: groupKb() }));
    let ok = 0;
    for (const uid of g.memberIds) if (!logic.isAdmin(uid) && (await safeSend(uid, body, { reply_markup: privateKb() }))) ok++;
    return ok > 0;
  }

  async function sendReminder(r) {
    const g = S.groups[r.groupId];
    if (!g) return;
    let body = `📣 ${esc(r.text)}`;
    let targets = g.memberIds.filter((id) => !logic.isAdmin(id));
    if (r.pubId && S.pubs[r.pubId]) {
      const ps = logic.pubStats(r.pubId);
      if (ps.notDone.length === 0 && ps.size > 0) {
        r.active = false;
        const done = `🎉 Все сдали тест «${esc(ps.title)}»!\n📊 Средний результат группы: <b>${ps.avg}%</b>\n🥇 Лучший: ${esc(ps.ranking[0]?.name)} — ${ps.ranking[0]?.pct}%`;
        if (g.chatId) await safeSend(g.chatId, done);
        else await notifyAdmins(done);
        return;
      }
      const names = (ids) => ids.map((id) => mention(id, logic.name(S.users[id]))).join(', ');
      body += `\n\n🧩 Тест: <b>${esc(ps.title)}</b>`;
      if (ps.done.length) body += `\n✅ Сдали (${ps.done.length}): ${ps.ranking.map((x) => esc(x.name)).join(', ')}`;
      body += `\n⏳ Ещё не сдали (${ps.notDone.length}): ${names(ps.notDone)}`;
      targets = ps.notDone;
    }
    if (g.chatId) await safeSend(g.chatId, body, { reply_markup: groupKb() });
    else {
      // в личку каждому — без списка одногруппников, на его языке
      const testTitle = r.pubId && S.pubs[r.pubId] ? S.lessons[S.pubs[r.pubId].lessonId]?.title : null;
      for (const uid of targets) {
        const lang = langOf(uid);
        await safeSend(uid, `📣 ${esc(r.text)}${testTitle ? tt('remindTest', lang, esc(testTitle)) : ''}`, { reply_markup: privateKb(tt('play', lang)) });
      }
    }
  }

  let ticking = false;
  async function tickReminders() {
    if (ticking) return;
    ticking = true;
    try {
      const now = Date.now();
      for (const r of Object.values(S.reminders)) {
        if (!r.active || r.nextAt > now) continue;
        r.sent++;
        r.nextAt = now + r.intervalMin * 60_000;
        if (r.sent >= r.maxCount) r.active = false;
        store.save();
        await sendReminder(r);
        store.save();
      }
    } finally {
      ticking = false;
    }
  }

  async function setup() {
    await bot.init();
    await bot.api.setMyCommands([
      { command: 'start', description: 'Открыть приложение' },
      { command: 'site', description: 'Логин и пароль для сайта' },
      { command: 'help', description: 'Помощь' },
    ]).catch(() => {});
    await bot.api.setMyCommands(
      [
        { command: 'link', description: 'Привязать чат к группе (учитель)' },
        { command: 'stop', description: 'Остановить напоминания (учитель)' },
      ],
      { scope: { type: 'all_group_chats' } },
    ).catch(() => {});
    if (appUrl.startsWith('https://')) {
      await bot.api.setChatMenuButton({ menu_button: { type: 'web_app', text: 'Открыть', web_app: { url: appUrl } } }).catch((e) => console.error('[bot] menu button', e.message));
    }
    console.log(`[bot] @${bot.botInfo.username} готов`);
  }

  return { bot, setup, notifyPublish, notifyPersonal, announce, tickReminders, onRoleChosen, sendLogin, notifyBonus, notifyAccess, notifyGrade, onAttendance, tickAttendance };
}
