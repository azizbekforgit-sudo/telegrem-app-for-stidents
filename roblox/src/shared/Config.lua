-- Общие настройки «Мира Зубрика»
local Config = {}

Config.SERVER_URL = "https://zubrik-bot.onrender.com"
Config.SCALE = 10
Config.POLL_INTERVAL = 2

-- До 8 учеников в одном сервере; острова строятся по радиусу наружу, чтобы не пересекались
Config.PLOT_COUNT = 8
Config.PLOT_RADIUS = 700
Config.CHASM_WIDTH = 30

Config.REMOTES = {
	Pair = "WorldPair",
	State = "WorldState",
	Effect = "WorldEffect",
	Teleport = "WorldTeleport",
}

Config.ACCENTS = {
	lime = Color3.fromRGB(132, 204, 22),
	sakura = Color3.fromRGB(244, 114, 182),
	lavender = Color3.fromRGB(167, 139, 250),
	ocean = Color3.fromRGB(56, 189, 248),
	peach = Color3.fromRGB(251, 146, 60),
	mint = Color3.fromRGB(52, 211, 153),
}

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
