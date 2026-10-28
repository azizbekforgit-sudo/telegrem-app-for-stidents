// Telegram-бот: регистрация учеников, привязка чатов-групп, уведомления о тестах и напоминания.
import { Bot, InlineKeyboard, GrammyError } from 'grammy';

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const mention = (u, name) => `<a href="tg://user?id=${u}">${esc(name)}</a>`;

export function createBot({ token, logic, store, appUrl, adminIds }) {
  const bot = new Bot(token);
  const S = logic.S;

  const appLink = () => process.env.APP_LINK || `https://t.me/${bot.botInfo.username}?start=play`;
  // В личке можно открыть Mini App прямо кнопкой; в группах Telegram это запрещает — там ссылка.
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
    const groups = logic.userGroups(user.id);
    await ctx.reply(
      groups.length
        ? `👋 <b>${esc(logic.name(user))}</b>, ты в группе ${groups.map((g) => `${g.emoji} ${esc(g.name)}`).join(', ')}.\nЗаходи — тебя ждут тесты!`
        : `👋 Привет, <b>${esc(logic.name(user))}</b>!\n\nТы зарегистрирован. Учитель скоро добавит тебя в группу — тогда здесь появятся тесты. 🚀`,
      { parse_mode: 'HTML', reply_markup: privateKb() },
    );
    if (isNew) {
      const kb = Object.keys(S.groups).length ? groupsKeyboard('add', `${user.id}:`) : undefined;
      await notifyAdmins(
        `🆕 Новый ученик: ${mention(user.id, logic.name(user))}${user.username ? ' (@' + esc(user.username) + ')' : ''}\nID: <code>${user.id}</code>\n\n` +
          (kb ? 'В какую группу добавить?' : 'Групп пока нет — создай группу в приложении.'),
        { reply_markup: kb },
      );
    }
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
    await safeSend(uid, `🎉 Тебя добавили в группу ${g.emoji} <b>${esc(g.name)}</b>! Когда учитель отправит тест — я напишу.`, { reply_markup: privateKb() });
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
    for (const uid of g.memberIds) if (!logic.isAdmin(uid)) await safeSend(uid, text, { reply_markup: privateKb('🎮 Играть') });
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
    else for (const uid of targets) await safeSend(uid, body, { reply_markup: privateKb('🎮 Играть') });
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

  return { bot, setup, notifyPublish, announce, tickReminders };
}
