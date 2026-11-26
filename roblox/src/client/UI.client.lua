-- Интерфейс ученика: статус, монеты, карточка активного задания Урока 8, подсказка управления
-- [E] взять / [R] повернуть / мышь — тащить, телепорт между 11 уровнями, ввод 6-значного кода и экран победы.
local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local UserInputService = game:GetService("UserInputService")
local Workspace = game:GetService("Workspace")

local Config = require(ReplicatedStorage.Shared.Config)
local remotes = ReplicatedStorage:WaitForChild("Remotes")
local pairFn = remotes:WaitForChild(Config.REMOTES.Pair)
local stateEv = remotes:WaitForChild(Config.REMOTES.State)
local effectEv = remotes:WaitForChild(Config.REMOTES.Effect)
local tpEv = remotes:WaitForChild(Config.REMOTES.Teleport)
local rotEv = remotes:WaitForChild(Config.REMOTES.Rotate)

local player = Players.LocalPlayer
local playerGui = player:WaitForChild("PlayerGui")

local LEVELS = {
	{ "8-1", "Мост (3×2)", "grid-template-columns: repeat(3, 1fr)" },
	{ "8-2", "Лестница", "margin-left: 50 / 100 / 150px" },
	{ "8-3", "Плот (4×1)", "repeat(4, 1fr), gap <= 10px" },
	{ "8-4", "Ворота (2×3)", "repeat(2, 1fr), 6 кристаллов" },
	{ "8-5", "Облака (5×1)", "repeat(5, 1fr), 5 батутов" },
	{ "8-6", "Семафор (1×3)", "repeat(1, 1fr), 3 фонаря" },
	{ "8-7", "Крыша (3 яруса)", "justify-items: center, 3 яруса" },
	{ "8-8", "Портал (2×2)", "repeat(2, 1fr), 4 руны" },
	{ "8-9", "Замок (4×2)", "repeat(4, 1fr), 8 плит" },
	{ "8-10", "Солнце (3×3)", "repeat(3, 1fr), 9 ячеек" },
	{ "8-11", "Корона (6×1)", "repeat(6, 1fr), 6 колонн" },
}

local LEVEL_MAP = {}
for i, item in ipairs(LEVELS) do
	LEVEL_MAP[item[1]] = { index = i, label = item[2], hint = item[3] }
end

local gui = Instance.new("ScreenGui")
gui.Name = "ZubrikUI"
gui.ResetOnSpawn = false
gui.Parent = playerGui

-- Левая верхняя карточка активного задания Урока 8 + подсказка управления
local questBox = Instance.new("Frame", gui)
questBox.Size = UDim2.fromOffset(310, 74)
questBox.Position = UDim2.new(0, 14, 0, 12)
questBox.BackgroundColor3 = Color3.fromRGB(17, 24, 39)
questBox.BackgroundTransparency = 0.08
Instance.new("UICorner", questBox).CornerRadius = UDim.new(0, 14)
local qs = Instance.new("UIStroke", questBox); qs.Color = Color3.fromRGB(56, 189, 248); qs.Thickness = 2

local questTitle = Instance.new("TextLabel", questBox)
questTitle.Size = UDim2.new(1, -20, 0, 24); questTitle.Position = UDim2.fromOffset(10, 6); questTitle.BackgroundTransparency = 1
questTitle.Text = "Урок 8 · 8-1: Мост (3×2)"; questTitle.TextColor3 = Color3.fromRGB(132, 204, 22)
questTitle.Font = Enum.Font.GothamBold; questTitle.TextSize = 14; questTitle.TextXAlignment = Enum.TextXAlignment.Left

local questHint = Instance.new("TextLabel", questBox)
questHint.Size = UDim2.new(1, -20, 0, 38); questHint.Position = UDim2.fromOffset(10, 30); questHint.BackgroundTransparency = 1
questHint.Text = "Нажми «Решить» → «Отправить в мир»\n[E] взять/поставить · [R] повернуть · мышь тащит"
questHint.TextColor3 = Color3.fromRGB(226, 232, 240); questHint.Font = Enum.Font.Gotham; questHint.TextSize = 11
questHint.TextWrapped = true; questHint.TextXAlignment = Enum.TextXAlignment.Left; questHint.TextYAlignment = Enum.TextYAlignment.Top

-- Верхняя панель статуса
local bar = Instance.new("Frame", gui)
bar.Size = UDim2.fromOffset(400, 44)
bar.Position = UDim2.new(1, -416, 0, 12)
bar.BackgroundColor3 = Color3.fromRGB(17, 24, 39)
Instance.new("UICorner", bar).CornerRadius = UDim.new(0, 14)
local bs = Instance.new("UIStroke", bar)
bs.Color = Color3.fromRGB(132, 204, 22)
bs.Thickness = 2

local statusBtn = Instance.new("TextButton", bar)
statusBtn.Size = UDim2.new(1, -136, 1, 0)
statusBtn.BackgroundTransparency = 1
statusBtn.TextColor3 = Color3.fromRGB(248, 250, 252)
statusBtn.Font = Enum.Font.GothamBold
statusBtn.TextSize = 14
statusBtn.Text = "🔗 Код   ★ 0/33   🪙 0"

local mapBtn = Instance.new("TextButton", bar)
mapBtn.Size = UDim2.fromOffset(122, 32)
mapBtn.Position = UDim2.new(1, -128, 0, 6)
mapBtn.BackgroundColor3 = Color3.fromRGB(56, 189, 248)
mapBtn.TextColor3 = Color3.fromRGB(15, 23, 42)
mapBtn.Font = Enum.Font.GothamBold
mapBtn.TextSize = 13
mapBtn.Text = "🗺️ Уровни (11)"
Instance.new("UICorner", mapBtn).CornerRadius = UDim.new(0, 10)

-- Меню быстрого перехода к открытым уровням
local mapFrame = Instance.new("Frame", gui)
mapFrame.Size = UDim2.fromOffset(368, 260)
mapFrame.Position = UDim2.new(1, -384, 0, 64)
mapFrame.BackgroundColor3 = Color3.fromRGB(17, 24, 39)
mapFrame.Visible = false
Instance.new("UICorner", mapFrame).CornerRadius = UDim.new(0, 16)
local mfs = Instance.new("UIStroke", mapFrame)
mfs.Color = Color3.fromRGB(56, 189, 248)
mfs.Thickness = 2

local grid = Instance.new("UIGridLayout", mapFrame)
grid.CellSize = UDim2.fromOffset(108, 48)
grid.CellPadding = UDim2.fromOffset(8, 8)
local pad = Instance.new("UIPadding", mapFrame)
pad.PaddingTop = UDim.new(0, 12)
pad.PaddingLeft = UDim.new(0, 12)

local curName, curLinked, curStars, curCoins = "Код", false, 0, 0
local activeLevelId = "8-1"
local wonSet = {}
local levelButtons = {}

local function isLevelUnlocked(id)
	local info = LEVEL_MAP[id]
	if not info or info.index <= 1 then return true end
	local prev = LEVELS[info.index - 1]
	return prev ~= nil and wonSet[prev[1]] == true
end

local function refreshLevelButtons()
	for _, item in ipairs(LEVELS) do
		local id, label = item[1], item[2]
		local b = levelButtons[id]
		if b then
			local won = wonSet[id] == true
			local unlocked = isLevelUnlocked(id)
			if won then
				b.BackgroundColor3 = Color3.fromRGB(22, 101, 52)
				b.Text = "✓ " .. id .. "\n" .. label
			elseif unlocked then
				b.BackgroundColor3 = id == activeLevelId and Color3.fromRGB(37, 99, 235) or Color3.fromRGB(30, 41, 59)
				b.Text = id .. "\n" .. label
			else
				b.BackgroundColor3 = Color3.fromRGB(24, 24, 32)
				b.Text = "🔒 " .. id .. "\n" .. label
			end
		end
	end
end

for _, item in ipairs(LEVELS) do
	local id, label = item[1], item[2]
	local b = Instance.new("TextButton", mapFrame)
	b.BackgroundColor3 = Color3.fromRGB(30, 41, 59)
	b.TextColor3 = Color3.new(1, 1, 1)
	b.Font = Enum.Font.GothamBold
	b.TextSize = 11
	b.TextWrapped = true
	b.Text = id .. "\n" .. label
	Instance.new("UICorner", b).CornerRadius = UDim.new(0, 10)
	b.MouseButton1Click:Connect(function()
		if not isLevelUnlocked(id) then return end
		activeLevelId = id
		refreshLevelButtons()
		tpEv:FireServer(id)
		mapFrame.Visible = false
	end)
	levelButtons[id] = b
end
refreshLevelButtons()

-- Окно ввода 6-значного кода
local modal = Instance.new("Frame", gui)
modal.Name = "PairModal"
modal.Size = UDim2.fromOffset(350, 215)
modal.Position = UDim2.fromScale(0.5, 0.5)
modal.AnchorPoint = Vector2.new(0.5, 0.5)
modal.BackgroundColor3 = Color3.fromRGB(17, 24, 39)
modal.Visible = true
Instance.new("UICorner", modal).CornerRadius = UDim.new(0, 18)
local ms = Instance.new("UIStroke", modal)
ms.Color = Color3.fromRGB(132, 204, 22)
ms.Thickness = 2

local title = Instance.new("TextLabel", modal)
title.Size = UDim2.new(1, -24, 0, 34); title.Position = UDim2.fromOffset(12, 12); title.BackgroundTransparency = 1
title.Text = "Введи 6-значный код из Зубрика"; title.TextColor3 = Color3.new(1, 1, 1); title.Font = Enum.Font.GothamBold; title.TextSize = 16

local input = Instance.new("TextBox", modal)
input.Size = UDim2.new(1, -40, 0, 46); input.Position = UDim2.fromOffset(20, 56)
input.BackgroundColor3 = Color3.fromRGB(30, 41, 59); input.TextColor3 = Color3.new(1, 1, 1)
input.PlaceholderText = "6 цифр"; input.Text = ""; input.Font = Enum.Font.Code; input.TextSize = 22; input.ClearTextOnFocus = false
Instance.new("UICorner", input).CornerRadius = UDim.new(0, 10)

local msg = Instance.new("TextLabel", modal)
msg.Size = UDim2.new(1, -24, 0, 24); msg.Position = UDim2.fromOffset(12, 108); msg.BackgroundTransparency = 1
msg.Text = ""; msg.TextColor3 = Color3.fromRGB(250, 204, 21); msg.Font = Enum.Font.Gotham; msg.TextSize = 13

local btnOk = Instance.new("TextButton", modal)
btnOk.Size = UDim2.fromOffset(175, 40); btnOk.Position = UDim2.fromOffset(20, 152)
btnOk.BackgroundColor3 = Color3.fromRGB(132, 204, 22); btnOk.TextColor3 = Color3.fromRGB(15, 23, 42)
btnOk.Font = Enum.Font.GothamBold; btnOk.TextSize = 15; btnOk.Text = "Подключить"
Instance.new("UICorner", btnOk).CornerRadius = UDim.new(0, 10)

local btnClose = Instance.new("TextButton", modal)
btnClose.Size = UDim2.fromOffset(115, 40); btnClose.Position = UDim2.fromOffset(215, 152)
btnClose.BackgroundColor3 = Color3.fromRGB(51, 65, 85); btnClose.TextColor3 = Color3.new(1, 1, 1)
btnClose.Font = Enum.Font.Gotham; btnClose.TextSize = 14; btnClose.Text = "Скрыть"
Instance.new("UICorner", btnClose).CornerRadius = UDim.new(0, 10)

-- Экран победы с кнопкой перехода на следующий уровень
local winBox = Instance.new("Frame", gui)
winBox.Size = UDim2.fromOffset(390, 230); winBox.Position = UDim2.fromScale(0.5, 0.45); winBox.AnchorPoint = Vector2.new(0.5, 0.5)
winBox.BackgroundColor3 = Color3.fromRGB(17, 24, 39); winBox.Visible = false
Instance.new("UICorner", winBox).CornerRadius = UDim.new(0, 20)
local ws = Instance.new("UIStroke", winBox); ws.Color = Color3.fromRGB(250, 204, 21); ws.Thickness = 3

local winTitle = Instance.new("TextLabel", winBox)
winTitle.Size = UDim2.new(1, -24, 0, 42); winTitle.Position = UDim2.fromOffset(12, 16); winTitle.BackgroundTransparency = 1
winTitle.Text = "🎉 Уровень пройден!"; winTitle.TextColor3 = Color3.fromRGB(250, 204, 21); winTitle.Font = Enum.Font.GothamBold; winTitle.TextSize = 22

local winSub = Instance.new("TextLabel", winBox)
winSub.Size = UDim2.new(1, -24, 0, 92); winSub.Position = UDim2.fromOffset(12, 62); winSub.BackgroundTransparency = 1
winSub.Text = "★★★\n+240 XP!"; winSub.TextColor3 = Color3.new(1, 1, 1); winSub.Font = Enum.Font.GothamMedium; winSub.TextSize = 16; winSub.TextWrapped = true

local pendingNextId = nil
local winBtn = Instance.new("TextButton", winBox)
winBtn.Size = UDim2.fromOffset(230, 42); winBtn.Position = UDim2.fromOffset(80, 168)
winBtn.BackgroundColor3 = Color3.fromRGB(132, 204, 22); winBtn.TextColor3 = Color3.fromRGB(15, 23, 42)
winBtn.Font = Enum.Font.GothamBold; winBtn.TextSize = 15; winBtn.Text = "Дальше!"
Instance.new("UICorner", winBtn).CornerRadius = UDim.new(0, 10)
winBtn.MouseButton1Click:Connect(function()
	winBox.Visible = false
	if pendingNextId then
		activeLevelId = pendingNextId
		refreshLevelButtons()
		tpEv:FireServer(pendingNextId)
		pendingNextId = nil
	end
end)

statusBtn.MouseButton1Click:Connect(function() modal.Visible = not modal.Visible end)
mapBtn.MouseButton1Click:Connect(function() mapFrame.Visible = not mapFrame.Visible end)
btnClose.MouseButton1Click:Connect(function() modal.Visible = false end)

btnOk.MouseButton1Click:Connect(function()
	msg.Text = "Подключаемся…"
	local res = pairFn:InvokeServer(input.Text)
	if res and res.ok then
		msg.TextColor3 = Color3.fromRGB(74, 222, 128)
		msg.Text = "Готово! Привет, " .. tostring(res.name or "")
		task.delay(0.9, function() modal.Visible = false end)
	else
		msg.TextColor3 = Color3.fromRGB(248, 113, 113)
		msg.Text = (res and res.error) or "Ошибка подключения"
	end
end)

-- Поворот сборки клавишей [R]
UserInputService.InputBegan:Connect(function(inp, processed)
	if processed then return end
	if inp.KeyCode == Enum.KeyCode.R then
		rotEv:FireServer()
	end
end)

local carryingNow = false
local function refreshBar()
	statusBtn.Text = (curLinked and "✓ " or "🔗 ") .. curName .. "   ★ " .. tostring(curStars) .. "/33   🪙 " .. tostring(curCoins)
	local info = LEVEL_MAP[activeLevelId] or LEVEL_MAP["8-1"]
	questTitle.Text = "Урок 8 · " .. activeLevelId .. ": " .. info.label
	if carryingNow then
		questHint.Text = "Несёшь сборку! [E] поставить · [R] повернуть · мышь тащит"
		qs.Color = Color3.fromRGB(74, 222, 128)
	else
		questHint.Text = info.hint .. "\n[E] взять/поставить · [R] повернуть · мышь тащит"
		qs.Color = Color3.fromRGB(56, 189, 248)
	end
end
refreshBar()

stateEv.OnClientEvent:Connect(function(st)
	if not st then return end
	if st.linked ~= nil then curLinked = st.linked end
	if st.name then curName = st.name end
	if st.stars ~= nil then curStars = tonumber(st.stars) or 0 end
	if st.coins ~= nil then curCoins = tonumber(st.coins) or 0 end
	if st.levelId then activeLevelId = st.levelId end
	if st.carrying ~= nil then carryingNow = st.carrying == true end
	if type(st.progress) == "table" then
		for id, won in pairs(st.progress) do
			if won then wonSet[id] = true end
		end
	end
	refreshLevelButtons()
	refreshBar()
end)

effectEv.OnClientEvent:Connect(function(kind, data)
	if kind == "win" then
		local s = data and data.stars or 1
		local xp = data and data.xp or 80
		local lvId = data and data.levelId or "8-1"
		wonSet[lvId] = true
		pendingNextId = data and data.nextLevelId or nil
		if pendingNextId then activeLevelId = pendingNextId end
		refreshLevelButtons()
		refreshBar()

		winTitle.Text = "🎉 " .. tostring(lvId) .. " пройден!"
		local nextLine = (data and data.nextTitle)
			and ("\n🔓 Открыт: " .. tostring(data.nextTitle))
			or "\n🏆 Все 11 уровней пройдены!"
		winSub.Text = string.rep("★", s) .. string.rep("☆", 3 - s) .. "\n+" .. tostring(xp) .. " XP начислено!" .. nextLine
		winBtn.Text = pendingNextId and ("➡️ Перейти на " .. pendingNextId) or "Ура!"
		winBox.Visible = true
	end
end)

-- Скрываем облачка чужих питомцев на клиенте, чтобы не перекрывали экран
task.spawn(function()
	while true do
		local char = player.Character
		local hrp = char and char:FindFirstChild("HumanoidRootPart")
		if hrp then
			for _, obj in ipairs(Workspace:GetDescendants()) do
				if obj.Name == "PetGuide" and obj:IsA("Model") then
					local bbg = obj:FindFirstChild("Bubble")
					if bbg and bbg:IsA("BillboardGui") and obj.PrimaryPart then
						local d = (obj.PrimaryPart.Position - hrp.Position).Magnitude
						if d > 38 then
							bbg.Enabled = false
						end
					end
				end
			end
		end
		task.wait(1)
	end
end)
