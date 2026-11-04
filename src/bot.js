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
  remindTest: { ru: (t) => `\n\n🧩 Тест: <b>${t}</b>\nТы его ещё не сдал — заходи! ⏳`, uz: (t) => `\n\n🧩 Test: <b>${t}</b>\nSen uni hali topshirmading — kir! ⏳`, en: (t) => `\n\n🧩 Test: <b>${t}</b>\nYou haven't taken it yet — come in! ⏳` },
};

export function createBot({ token, logic, store, appUrl, adminIds }) {
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

  return { bot, setup, notifyPublish, notifyPersonal, announce, tickReminders, onRoleChosen, sendLogin, notifyBonus };
}
