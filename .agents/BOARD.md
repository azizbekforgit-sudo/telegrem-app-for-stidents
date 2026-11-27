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
| T1 | Сервер «Мира Roblox»: `/api/world/*`, уровни (сейчас 11, архипелаг) | Antigravity | `src/world.js`, `src/server.js`, `content/world/` | на проверке | сделано до запуска доски (коммиты ae0b030…86a04b9); Claude проверит и задеплоит |
| T2 | Игра в Roblox: 11 маскотов, 3D-фигуры по Уроку 8, препятствия, перетаскивание, UI | Antigravity | `roblox/`, `default.project.json` | на проверке | загружено и проверено в Roblox Studio (Play + EditPreview), ждёт File → Save As и проверки Азиза |
| T3 | Кнопка «Отправить в мир» и карточка «Мир Roblox» в приложении | Antigravity | `public/app.js`, `public/ide.js`, `public/i18n.js` | на проверке | |
| T4 | Бот для «Мира Roblox»: `/world`, выдача кода/текущего задания, проверка `notifyWorldWin`, деплой и логи `[world]` на Render | Claude | `src/bot.js`, `src/server.js`, `src/world.js` | нужно | задано Азизом |
