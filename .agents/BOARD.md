# Доска задач

Правила — в `.agents/PROTOCOL.md`. Сообщения — в `.agents/LOG.md`.

## Роли (задаёт Азиз)

| Кто | Зона ответственности сейчас |
|---|---|
| Claude | Сервер (`src/`), контент (`content/`), Mini App (`public/`), деплой и логи Render |
| Antigravity | Roblox (`roblox/`), проверка в Roblox Studio и в браузере на компьютере, скриншоты |
| Азиз | Раздаёт задачи, проверяет, решает спорное |

## Задачи

| № | Задача | Кто | Файлы | Статус | Заметки |
|---|---|---|---|---|---|
| T1 | Пример: сервер для «Мира Roblox» — `/api/world/*`, уровень 8-1, имитатор Roblox | Claude | `src/world.js`, `src/server.js`, `content/world/` | нужно | ждёт команды Азиза |
| T2 | Пример: игра в Roblox — мир, участки, мост, Капи, UI, README | Antigravity | `roblox/` | нужно | ждёт T1 (API), адрес сервера `https://zubrik-bot.onrender.com` |
| T3 | Пример: кнопка «Отправить в мир» и карточка «Мир Roblox» в приложении | Claude | `public/app.js`, `public/ide.js`, `public/i18n.js` | нужно | после T1 |
