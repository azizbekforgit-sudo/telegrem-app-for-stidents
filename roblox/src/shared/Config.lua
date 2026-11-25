-- Общие настройки «Мира Зубрика»
local Config = {}

-- Адрес вашего сервера Express (без слэша на конце).
-- Для локального теста: "http://localhost:3000"
-- Для продакшена (Render): "https://ваш-сервис.onrender.com"
Config.SERVER_URL = "http://localhost:3000"

-- Масштаб: 10 пикселей CSS = 1 stud в Roblox
Config.SCALE = 10

-- Интервал опроса сервера (в секундах)
Config.POLL_INTERVAL = 2

-- Острова-участки: до 8 учеников одновременно в одном сервере
Config.PLOT_COUNT = 8
Config.PLOT_RADIUS = 380
Config.CHASM_WIDTH = 30

-- Имена RemoteEvent / RemoteFunction в ReplicatedStorage.Remotes
Config.REMOTES = {
	Pair = "WorldPair",
	State = "WorldState",
	Effect = "WorldEffect",
}

-- Цвета акцента из приложения ученицы
Config.ACCENTS = {
	lime = Color3.fromRGB(132, 204, 22),
	sakura = Color3.fromRGB(244, 114, 182),
	lavender = Color3.fromRGB(167, 139, 250),
	ocean = Color3.fromRGB(56, 189, 248),
	peach = Color3.fromRGB(251, 146, 60),
	mint = Color3.fromRGB(52, 211, 153),
}

-- ID звуков (rbxassetid://...). Можно оставить пустыми — игра работает и без них.
Config.SOUNDS = {
	Ambient = "",
	Campfire = "",
	Waterfall = "",
	Wind = "",
	Printer = "",
	Footstep = "",
	Fall = "",
	Win = "",
}

return Config
