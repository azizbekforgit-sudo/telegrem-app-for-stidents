-- Общие настройки «Мира Зубрика»: адрес сервера, уровни Урока 8, звуки, цвета и тексты интерфейса (ru/uz/en)
local Config = {}

Config.SERVER_URL = "https://zubrik-bot.onrender.com"
-- Только в Studio: атрибут ZubrikServer у Workspace (например http://localhost:3000) — тестовый сервер.
-- Код сначала проверяется на нём, а если не подошёл — на настоящем (SERVER_URL).
Config.TEST_URL = nil
local testUrl = workspace:GetAttribute("ZubrikServer")
if game:GetService("RunService"):IsStudio() and type(testUrl) == "string" and #testUrl > 0 then
	Config.TEST_URL = testUrl
end

Config.SCALE = 10 -- 10 px из предпросмотра = 1 stud
Config.POLL_INTERVAL = 2

-- До 8 учеников в одном сервере; цепочки островов уходят от центра лучами и не пересекаются
Config.PLOT_COUNT = 8
Config.PLOT_RADIUS = 700
Config.LEVEL_STEP = 100 -- расстояние между началами уровней
Config.GAP = 20 -- пропасть между островами уровня: не перепрыгнуть, нужен предмет из кода

Config.REMOTES = {
	Pair = "WorldPair",
	State = "WorldState",
	Effect = "WorldEffect",
	Teleport = "WorldTeleport",
	Drop = "WorldDrop",
}

Config.ACCENTS = {
	lime = Color3.fromRGB(132, 204, 22),
	sakura = Color3.fromRGB(244, 114, 182),
	lavender = Color3.fromRGB(167, 139, 250),
	ocean = Color3.fromRGB(56, 189, 248),
	peach = Color3.fromRGB(251, 146, 60),
	mint = Color3.fromRGB(52, 211, 153),
}

-- Звуки из Creator Store (Pro Sound Effects, APM Music и др., бесплатные)
Config.SOUNDS = {
	Music = "rbxassetid://1835290380", -- Welcome Sunshine (APM)
	Ambient = "rbxassetid://9112811947", -- птицы, петля
	Print = "rbxassetid://117011707307950", -- волшебные искорки
	Plank = "rbxassetid://9116400132", -- свист появления доски
	Place = "rbxassetid://9120860099", -- деревянный стук
	Pickup = "rbxassetid://4612374393", -- взял предмет
	Coin = "rbxassetid://4612374807",
	Linked = "rbxassetid://99465753537158", -- подключено
	Fall = "rbxassetid://9120734010", -- свист падения
	Break = "rbxassetid://9120860399", -- мост развалился
	Win = "rbxassetid://9067124098", -- фанфары
}

-- kind: span — предмет кладётся через пропасть; socket — ставится в механизм, и тот открывает световой мост
-- look: как выглядят фигуры из CSS
Config.LEVELS = {
	{ id = "8-1", kind = "span", look = "wood", icon = "🌉",
		name = { ru = "Мост через пропасть", uz = "Jarlik ustidagi ko'prik", en = "Bridge over the chasm" },
		goal = { ru = "Положи мост через пропасть", uz = "Ko'prikni jarlik ustiga qo'y", en = "Lay the bridge over the chasm" },
		item = { ru = "Мост", uz = "Ko'prik", en = "Bridge" } },
	{ id = "8-2", kind = "span", look = "stairs", icon = "🏛", rise = 5,
		name = { ru = "Лестница к Храму", uz = "Ibodatxonaga zinapoya", en = "Stairs to the Temple" },
		goal = { ru = "Поставь лестницу к Храму", uz = "Zinapoyani Ibodatxonaga qo'y", en = "Put the stairs up to the Temple" },
		item = { ru = "Лестница", uz = "Zinapoya", en = "Stairs" } },
	{ id = "8-3", kind = "span", look = "raft", icon = "🛶",
		name = { ru = "Плот через лаву", uz = "Lava ustidan sol", en = "Raft over lava" },
		goal = { ru = "Положи плот на огненную реку", uz = "Solni olovli daryoga qo'y", en = "Put the raft on the lava river" },
		item = { ru = "Плот", uz = "Sol", en = "Raft" } },
	{ id = "8-4", kind = "socket", look = "crystal", icon = "💎",
		name = { ru = "Хрустальные ворота", uz = "Billur darvoza", en = "Crystal gate" },
		goal = { ru = "Вставь ключ-решётку в ворота", uz = "Kalit-panjarani darvozaga qo'y", en = "Put the key grid into the gate" },
		item = { ru = "Ключ", uz = "Kalit", en = "Key" } },
	{ id = "8-5", kind = "span", look = "cloud", icon = "☁️",
		name = { ru = "Прыгучие облака", uz = "Sakraydigan bulutlar", en = "Bouncy clouds" },
		goal = { ru = "Положи облака через пропасть", uz = "Bulutlarni jarlik ustiga qo'y", en = "Lay the clouds over the chasm" },
		item = { ru = "Облака", uz = "Bulutlar", en = "Clouds" } },
	{ id = "8-6", kind = "socket", look = "lamp", icon = "🚦",
		name = { ru = "Семафор станции", uz = "Stansiya svetofori", en = "Station signal" },
		goal = { ru = "Поставь семафор на станцию", uz = "Svetoforni stansiyaga qo'y", en = "Put the signal on the station" },
		item = { ru = "Семафор", uz = "Svetofor", en = "Signal" } },
	{ id = "8-7", kind = "socket", look = "roof", icon = "🏠",
		name = { ru = "Крыша для домика", uz = "Uycha uchun tom", en = "Roof for the cottage" },
		goal = { ru = "Поставь крышу на домик", uz = "Tomni uychaga qo'y", en = "Put the roof on the cottage" },
		item = { ru = "Крыша", uz = "Tom", en = "Roof" } },
	{ id = "8-8", kind = "socket", look = "rune", icon = "🔮",
		name = { ru = "Руны портала", uz = "Portal runalari", en = "Portal runes" },
		goal = { ru = "Вставь руны в портал", uz = "Runalarni portalga qo'y", en = "Put the runes into the portal" },
		item = { ru = "Руны", uz = "Runalar", en = "Runes" } },
	{ id = "8-9", kind = "span", look = "stone", icon = "🏰",
		name = { ru = "Замковый мост", uz = "Qal'a ko'prigi", en = "Castle bridge" },
		goal = { ru = "Положи каменный мост к замку", uz = "Tosh ko'prikni qal'aga qo'y", en = "Lay the stone bridge to the castle" },
		item = { ru = "Мост", uz = "Ko'prik", en = "Bridge" } },
	{ id = "8-10", kind = "span", look = "solar", icon = "☀️",
		name = { ru = "Солнечные крылья", uz = "Quyosh qanotlari", en = "Solar wings" },
		goal = { ru = "Положи солнечную платформу", uz = "Quyosh platformasini qo'y", en = "Lay the solar platform" },
		item = { ru = "Платформа", uz = "Platforma", en = "Platform" } },
	{ id = "8-11", kind = "span", look = "rainbow", icon = "🌈",
		name = { ru = "Радужная дорога", uz = "Kamalak yo'li", en = "Rainbow road" },
		goal = { ru = "Проложи радугу к Короне", uz = "Kamalakni Tojga yotqiz", en = "Lay the rainbow to the Crown" },
		item = { ru = "Радуга", uz = "Kamalak", en = "Rainbow" } },
}
Config.LEVEL_INDEX = {}
for i, lv in ipairs(Config.LEVELS) do
	Config.LEVEL_INDEX[lv.id] = i
end

-- Тексты (ru/uz/en). {x} подставляется через Config.T(lang, key, {x = ...})
Config.TEXT = {
	ru = {
		lesson = "Урок 8 · CSS Grid",
		level = "Уровень {n} из 11",
		step1 = "Введи код из Зубрика",
		step2 = "Напиши CSS и нажми «Отправить в мир»",
		step3 = "Отнеси к сияющей рамке",
		step4 = "Дойди до флага",
		pairTitle = "Привет! Подключи свой Зубрик",
		pairHow = "Открой Зубрик → «Задачи» → «Мир Roblox» → «Получить код»\nили напиши боту /world",
		pairBtn = "Подключить",
		pairWait = "Подключаемся…",
		pairNeed = "Введи 6 цифр",
		pairOk = "Готово! Привет, {name}!",
		pairFail = "Не получилось",
		connect = "Подключить",
		levels = "Уровни",
		take = "Взять",
		drop = "Положить",
		carryHint = "Неси к сияющей рамке и нажми [E]",
		nearHint = "Подойди и нажми [E], чтобы взять",
		winTitle = "Ура! Уровень пройден!",
		winXp = "+{xp} XP в Зубрике",
		winNext = "Открыт следующий: {title}",
		winAll = "Все 11 уровней пройдены! Ты мастер CSS Grid!",
		winBtn = "Дальше →",
		winBtnEnd = "Ура!",
		locked = "Сначала пройди предыдущий уровень",
		coins = "Монеты",
		mapTitle = "Острова Урока 8",
		printed = "Принтер напечатал твой код!",
		broken = "Развалилось — в CSS ошибка",
		toFlag = "Путь открыт — беги к флагу!",
		putHere = "{item} сюда",
	},
	uz = {
		lesson = "8-dars · CSS Grid",
		level = "{n}-daraja / 11",
		step1 = "Zubrikdan kodni kirit",
		step2 = "CSS yoz va «Dunyoga yuborish» ni bos",
		step3 = "Yorqin ramkaga olib bor",
		step4 = "Bayroqqacha bor",
		pairTitle = "Salom! Zubrikni ulang",
		pairHow = "Zubrik → «Vazifalar» → «Roblox dunyosi» → «Kod olish»\nyoki botga /world yoz",
		pairBtn = "Ulash",
		pairWait = "Ulanmoqda…",
		pairNeed = "6 ta raqam kirit",
		pairOk = "Tayyor! Salom, {name}!",
		pairFail = "Bo'lmadi",
		connect = "Ulash",
		levels = "Darajalar",
		take = "Olish",
		drop = "Qo'yish",
		carryHint = "Yorqin ramkaga olib bor va [E] ni bos",
		nearHint = "Yaqinlash va olish uchun [E] ni bos",
		winTitle = "Ura! Daraja o'tildi!",
		winXp = "Zubrikda +{xp} XP",
		winNext = "Keyingisi ochildi: {title}",
		winAll = "11 ta daraja o'tildi! Sen CSS Grid ustasisan!",
		winBtn = "Davom →",
		winBtnEnd = "Ura!",
		locked = "Avval oldingi darajani o't",
		coins = "Tangalar",
		mapTitle = "8-dars orollari",
		printed = "Printer kodingni chop etdi!",
		broken = "Buzildi — CSSda xato",
		toFlag = "Yo'l ochiq — bayroqqa yugur!",
		putHere = "{item} shu yerga",
	},
	en = {
		lesson = "Lesson 8 · CSS Grid",
		level = "Level {n} of 11",
		step1 = "Enter the code from Zubrik",
		step2 = "Write CSS and press «Send to world»",
		step3 = "Carry it to the glowing frame",
		step4 = "Reach the flag",
		pairTitle = "Hi! Connect your Zubrik",
		pairHow = "Open Zubrik → «Tasks» → «Roblox World» → «Get code»\nor send /world to the bot",
		pairBtn = "Connect",
		pairWait = "Connecting…",
		pairNeed = "Enter 6 digits",
		pairOk = "Done! Hi, {name}!",
		pairFail = "Didn't work",
		connect = "Connect",
		levels = "Levels",
		take = "Take",
		drop = "Drop",
		carryHint = "Carry it to the glowing frame and press [E]",
		nearHint = "Come closer and press [E] to take it",
		winTitle = "Hooray! Level complete!",
		winXp = "+{xp} XP in Zubrik",
		winNext = "Unlocked: {title}",
		winAll = "All 11 levels done! You are a CSS Grid master!",
		winBtn = "Next →",
		winBtnEnd = "Hooray!",
		locked = "Finish the previous level first",
		coins = "Coins",
		mapTitle = "Lesson 8 islands",
		printed = "The printer printed your code!",
		broken = "It fell apart — there is a CSS mistake",
		toFlag = "The way is open — run to the flag!",
		putHere = "{item} here",
	},
}

-- Реплики питомца в самой игре (то, чего нет в levels.json)
Config.SAY = {
	ru = {
		hello = "Привет! Введи код из Зубрика — и я появлюсь рядом!",
		linked = "Ура, это я, {pet}! Привет, {name}! Напиши CSS Grid и нажми «Отправить в мир».",
		printed = "Смотри, принтер печатает твой код! Подойди и нажми [E].",
		near = "Точно сюда! Нажми [E].",
		placed = "Идеально! Путь открыт — беги к флагу!",
		lost = "Здесь не ставится — я вернул предмет на принтер. Неси к сияющей рамке!",
		noItem = "Сначала построй предмет из кода!",
		broken = "Развалилось! {tip}",
		socketOpen = "Механизм ожил! Световой мост готов — вперёд!",
	},
	uz = {
		hello = "Salom! Zubrikdan kodni kirit — men yoningda paydo bo'laman!",
		linked = "Ura, bu men, {pet}! Salom, {name}! CSS Grid yoz va «Dunyoga yuborish» ni bos.",
		printed = "Qara, printer kodingni chop etyapti! Yaqinlash va [E] ni bos.",
		near = "Aynan shu yerga! [E] ni bos.",
		placed = "Zo'r! Yo'l ochiq — bayroqqa yugur!",
		lost = "Bu yerga qo'yib bo'lmaydi — printerga qaytardim. Yorqin ramkaga olib bor!",
		noItem = "Avval koddan buyum yasa!",
		broken = "Buzilib ketdi! {tip}",
		socketOpen = "Mexanizm ishladi! Yorug' ko'prik tayyor — oldinga!",
	},
	en = {
		hello = "Hi! Enter the code from Zubrik and I'll appear next to you!",
		linked = "Yay, it's me, {pet}! Hi, {name}! Write CSS Grid and press «Send to world».",
		printed = "Look, the printer is printing your code! Come closer and press [E].",
		near = "Right here! Press [E].",
		placed = "Perfect! The way is open — run to the flag!",
		lost = "Can't put it here — it's back on the printer. Carry it to the glowing frame!",
		noItem = "Build the item from code first!",
		broken = "It fell apart! {tip}",
		socketOpen = "The machine is alive! The light bridge is ready — go!",
	},
}

local function fill(s, vars)
	if not vars then return s end
	return (s:gsub("{(%w+)}", function(k)
		local v = vars[k]
		return v ~= nil and tostring(v) or ("{" .. k .. "}")
	end))
end

function Config.T(lang, key, vars)
	local t = Config.TEXT[lang] or Config.TEXT.ru
	return fill(t[key] or Config.TEXT.ru[key] or key, vars)
end

function Config.Say(lang, key, vars)
	local t = Config.SAY[lang] or Config.SAY.ru
	return fill(t[key] or Config.SAY.ru[key] or key, vars)
end

function Config.Pick(tbl, lang)
	if type(tbl) ~= "table" then return tostring(tbl or "") end
	return tbl[lang] or tbl.ru or ""
end

return Config
