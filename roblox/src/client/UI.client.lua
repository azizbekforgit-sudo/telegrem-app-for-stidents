-- Аккуратный интерфейс ученицы: статус, монеты, телепорт между 11 уровнями, ввод кода и экран победы.
local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local Workspace = game:GetService("Workspace")

local Config = require(ReplicatedStorage.Shared.Config)
local remotes = ReplicatedStorage:WaitForChild("Remotes")
local pairFn = remotes:WaitForChild(Config.REMOTES.Pair)
local stateEv = remotes:WaitForChild(Config.REMOTES.State)
local effectEv = remotes:WaitForChild(Config.REMOTES.Effect)
local tpEv = remotes:WaitForChild(Config.REMOTES.Teleport)

local player = Players.LocalPlayer
local playerGui = player:WaitForChild("PlayerGui")

local LEVELS = {
	{ "8-1", "Мост" }, { "8-2", "Лестница" }, { "8-3", "Плот" }, { "8-4", "Ворота" },
	{ "8-5", "Облака" }, { "8-6", "Семафор" }, { "8-7", "Крыша" }, { "8-8", "Портал" },
	{ "8-9", "Замок" }, { "8-10", "Солнце" }, { "8-11", "Корона" },
}

local gui = Instance.new("ScreenGui")
gui.Name = "ZubrikUI"
gui.ResetOnSpawn = false
gui.Parent = playerGui

-- Верхняя панель статуса
local bar = Instance.new("Frame")
bar.Size = UDim2.fromOffset(390, 44)
bar.Position = UDim2.new(1, -406, 0, 12)
bar.BackgroundColor3 = Color3.fromRGB(17, 24, 39)
bar.Parent = gui
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

-- Меню быстрого перехода к любому из 11 уровней
local mapFrame = Instance.new("Frame")
mapFrame.Size = UDim2.fromOffset(360, 250)
mapFrame.Position = UDim2.new(1, -376, 0, 64)
mapFrame.BackgroundColor3 = Color3.fromRGB(17, 24, 39)
mapFrame.Visible = false
mapFrame.Parent = gui
Instance.new("UICorner", mapFrame).CornerRadius = UDim.new(0, 16)
local mfs = Instance.new("UIStroke", mapFrame)
mfs.Color = Color3.fromRGB(56, 189, 248)
mfs.Thickness = 2

local grid = Instance.new("UIGridLayout", mapFrame)
grid.CellSize = UDim2.fromOffset(106, 46)
grid.CellPadding = UDim2.fromOffset(8, 8)
local pad = Instance.new("UIPadding", mapFrame)
pad.PaddingTop = UDim.new(0, 12)
pad.PaddingLeft = UDim.new(0, 12)

local levelButtons = {}
for _, item in ipairs(LEVELS) do
	local id, label = item[1], item[2]
	local b = Instance.new("TextButton", mapFrame)
	b.BackgroundColor3 = Color3.fromRGB(30, 41, 59)
	b.TextColor3 = Color3.new(1, 1, 1)
	b.Font = Enum.Font.GothamBold
	b.TextSize = 12
	b.TextWrapped = true
	b.Text = id .. "\n" .. label
	Instance.new("UICorner", b).CornerRadius = UDim.new(0, 10)
	b.MouseButton1Click:Connect(function()
		tpEv:FireServer(id)
		mapFrame.Visible = false
	end)
	levelButtons[id] = b
end

-- Окно ввода 6-значного кода
local modal = Instance.new("Frame")
modal.Name = "PairModal"
modal.Size = UDim2.fromOffset(340, 210)
modal.Position = UDim2.fromScale(0.5, 0.5)
modal.AnchorPoint = Vector2.new(0.5, 0.5)
modal.BackgroundColor3 = Color3.fromRGB(17, 24, 39)
modal.Visible = true
modal.Parent = gui
Instance.new("UICorner", modal).CornerRadius = UDim.new(0, 18)
local ms = Instance.new("UIStroke", modal)
ms.Color = Color3.fromRGB(132, 204, 22)
ms.Thickness = 2

local title = Instance.new("TextLabel", modal)
title.Size = UDim2.new(1, -24, 0, 34); title.Position = UDim2.fromOffset(12, 12); title.BackgroundTransparency = 1
title.Text = "Введи код из приложения Зубрик"; title.TextColor3 = Color3.new(1, 1, 1); title.Font = Enum.Font.GothamBold; title.TextSize = 16

local input = Instance.new("TextBox", modal)
input.Size = UDim2.new(1, -40, 0, 46); input.Position = UDim2.fromOffset(20, 56)
input.BackgroundColor3 = Color3.fromRGB(30, 41, 59); input.TextColor3 = Color3.new(1, 1, 1)
input.PlaceholderText = "6 цифр"; input.Text = ""; input.Font = Enum.Font.Code; input.TextSize = 22; input.ClearTextOnFocus = false
Instance.new("UICorner", input).CornerRadius = UDim.new(0, 10)

local msg = Instance.new("TextLabel", modal)
msg.Size = UDim2.new(1, -24, 0, 24); msg.Position = UDim2.fromOffset(12, 108); msg.BackgroundTransparency = 1
msg.Text = ""; msg.TextColor3 = Color3.fromRGB(250, 204, 21); msg.Font = Enum.Font.Gotham; msg.TextSize = 13

local btnOk = Instance.new("TextButton", modal)
btnOk.Size = UDim2.fromOffset(170, 40); btnOk.Position = UDim2.fromOffset(20, 148)
btnOk.BackgroundColor3 = Color3.fromRGB(132, 204, 22); btnOk.TextColor3 = Color3.fromRGB(15, 23, 42)
btnOk.Font = Enum.Font.GothamBold; btnOk.TextSize = 15; btnOk.Text = "Подключить"
Instance.new("UICorner", btnOk).CornerRadius = UDim.new(0, 10)

local btnClose = Instance.new("TextButton", modal)
btnClose.Size = UDim2.fromOffset(110, 40); btnClose.Position = UDim2.fromOffset(210, 148)
btnClose.BackgroundColor3 = Color3.fromRGB(51, 65, 85); btnClose.TextColor3 = Color3.new(1, 1, 1)
btnClose.Font = Enum.Font.Gotham; btnClose.TextSize = 14; btnClose.Text = "Скрыть"
Instance.new("UICorner", btnClose).CornerRadius = UDim.new(0, 10)

-- Экран победы
local winBox = Instance.new("Frame", gui)
winBox.Size = UDim2.fromOffset(360, 210); winBox.Position = UDim2.fromScale(0.5, 0.45); winBox.AnchorPoint = Vector2.new(0.5, 0.5)
winBox.BackgroundColor3 = Color3.fromRGB(17, 24, 39); winBox.Visible = false
Instance.new("UICorner", winBox).CornerRadius = UDim.new(0, 20)
local ws = Instance.new("UIStroke", winBox); ws.Color = Color3.fromRGB(250, 204, 21); ws.Thickness = 3

local winTitle = Instance.new("TextLabel", winBox)
winTitle.Size = UDim2.new(1, -20, 0, 44); winTitle.Position = UDim2.fromOffset(10, 18); winTitle.BackgroundTransparency = 1
winTitle.Text = "🎉 Уровень пройден!"; winTitle.TextColor3 = Color3.fromRGB(250, 204, 21); winTitle.Font = Enum.Font.GothamBold; winTitle.TextSize = 24

local winSub = Instance.new("TextLabel", winBox)
winSub.Size = UDim2.new(1, -20, 0, 72); winSub.Position = UDim2.fromOffset(10, 68); winSub.BackgroundTransparency = 1
winSub.Text = "★★★\n+240 XP!"; winSub.TextColor3 = Color3.new(1, 1, 1); winSub.Font = Enum.Font.GothamMedium; winSub.TextSize = 18; winSub.TextWrapped = true

local winBtn = Instance.new("TextButton", winBox)
winBtn.Size = UDim2.fromOffset(150, 40); winBtn.Position = UDim2.fromOffset(105, 152)
winBtn.BackgroundColor3 = Color3.fromRGB(132, 204, 22); winBtn.TextColor3 = Color3.fromRGB(15, 23, 42)
winBtn.Font = Enum.Font.GothamBold; winBtn.TextSize = 16; winBtn.Text = "Дальше!"
Instance.new("UICorner", winBtn).CornerRadius = UDim.new(0, 10)
winBtn.MouseButton1Click:Connect(function() winBox.Visible = false end)

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

local curName, curLinked, curStars, curCoins = "Код", false, 0, 0
local function refreshBar()
	statusBtn.Text = (curLinked and "✓ " or "🔗 ") .. curName .. "   ★ " .. tostring(curStars) .. "/33   🪙 " .. tostring(curCoins)
end

stateEv.OnClientEvent:Connect(function(st)
	if not st then return end
	if st.linked ~= nil then curLinked = st.linked end
	if st.name then curName = st.name end
	if st.stars ~= nil then curStars = tonumber(st.stars) or 0 end
	if st.coins ~= nil then curCoins = tonumber(st.coins) or 0 end
	if type(st.progress) == "table" then
		for id, won in pairs(st.progress) do
			if won and levelButtons[id] then
				levelButtons[id].BackgroundColor3 = Color3.fromRGB(22, 101, 52)
			end
		end
	end
	refreshBar()
end)

effectEv.OnClientEvent:Connect(function(kind, data)
	if kind == "win" then
		local s = data and data.stars or 1
		local xp = data and data.xp or 80
		winTitle.Text = "🎉 " .. tostring(data and data.levelId or "Уровень") .. " пройден!"
		winSub.Text = string.rep("★", s) .. string.rep("☆", 3 - s) .. "\n+" .. tostring(xp) .. " XP начислено!"
		winBox.Visible = true
	end
end)

-- Скрываем облачка чужих питомцев на клиенте, чтобы никогда не перекрывали экран
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
