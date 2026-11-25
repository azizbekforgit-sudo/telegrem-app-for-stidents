-- Интерфейс ученицы в Roblox: ввод 6-значного кода, звёзды, подсказка и экран победы
local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local Config = require(ReplicatedStorage.Shared.Config)
local remotes = ReplicatedStorage:WaitForChild("Remotes")
local pairFn = remotes:WaitForChild(Config.REMOTES.Pair)
local stateEv = remotes:WaitForChild(Config.REMOTES.State)
local effectEv = remotes:WaitForChild(Config.REMOTES.Effect)

local player = Players.LocalPlayer
local playerGui = player:WaitForChild("PlayerGui")

local gui = Instance.new("ScreenGui")
gui.Name = "ZubrikUI"
gui.ResetOnSpawn = false
gui.Parent = playerGui

-- Верхняя плашка статуса
local pill = Instance.new("TextButton")
pill.Name = "StatusPill"
pill.Size = UDim2.fromOffset(250, 42)
pill.Position = UDim2.new(1, -266, 0, 14)
pill.BackgroundColor3 = Color3.fromRGB(24, 32, 48)
pill.TextColor3 = Color3.fromRGB(248, 250, 252)
pill.Font = Enum.Font.GothamBold
pill.TextSize = 15
pill.Text = "🔗 Подключить Зубрик  ☆☆☆"
pill.Parent = gui

local pillCorner = Instance.new("UICorner")
pillCorner.CornerRadius = UDim.new(0, 14)
pillCorner.Parent = pill

local pillStroke = Instance.new("UIStroke")
pillStroke.Color = Color3.fromRGB(132, 204, 22)
pillStroke.Thickness = 2
pillStroke.Parent = pill

-- Окно ввода 6-значного кода
local modal = Instance.new("Frame")
modal.Name = "PairModal"
modal.Size = UDim2.fromOffset(340, 210)
modal.Position = UDim2.fromScale(0.5, 0.5)
modal.AnchorPoint = Vector2.new(0.5, 0.5)
modal.BackgroundColor3 = Color3.fromRGB(17, 24, 39)
modal.Visible = true
modal.Parent = gui

local mCorner = Instance.new("UICorner")
mCorner.CornerRadius = UDim.new(0, 18)
mCorner.Parent = modal

local mStroke = Instance.new("UIStroke")
mStroke.Color = Color3.fromRGB(132, 204, 22)
mStroke.Thickness = 2
mStroke.Parent = modal

local title = Instance.new("TextLabel")
title.Size = UDim2.new(1, -24, 0, 34)
title.Position = UDim2.fromOffset(12, 12)
title.BackgroundTransparency = 1
title.Text = "Введи код из приложения Зубрик"
title.TextColor3 = Color3.new(1, 1, 1)
title.Font = Enum.Font.GothamBold
title.TextSize = 16
title.Parent = modal

local input = Instance.new("TextBox")
input.Size = UDim2.new(1, -40, 0, 46)
input.Position = UDim2.fromOffset(20, 56)
input.BackgroundColor3 = Color3.fromRGB(30, 41, 59)
input.TextColor3 = Color3.new(1, 1, 1)
input.PlaceholderText = "6 цифр (например 123456)"
input.Text = ""
input.Font = Enum.Font.Code
input.TextSize = 22
input.ClearTextOnFocus = false
input.Parent = modal
Instance.new("UICorner", input).CornerRadius = UDim.new(0, 10)

local msg = Instance.new("TextLabel")
msg.Size = UDim2.new(1, -24, 0, 24)
msg.Position = UDim2.fromOffset(12, 108)
msg.BackgroundTransparency = 1
msg.Text = ""
msg.TextColor3 = Color3.fromRGB(250, 204, 21)
msg.Font = Enum.Font.Gotham
msg.TextSize = 13
msg.Parent = modal

local btnOk = Instance.new("TextButton")
btnOk.Size = UDim2.fromOffset(170, 40)
btnOk.Position = UDim2.fromOffset(20, 148)
btnOk.BackgroundColor3 = Color3.fromRGB(132, 204, 22)
btnOk.TextColor3 = Color3.fromRGB(15, 23, 42)
btnOk.Font = Enum.Font.GothamBold
btnOk.TextSize = 15
btnOk.Text = "Подключить"
btnOk.Parent = modal
Instance.new("UICorner", btnOk).CornerRadius = UDim.new(0, 10)

local btnClose = Instance.new("TextButton")
btnClose.Size = UDim2.fromOffset(110, 40)
btnClose.Position = UDim2.fromOffset(210, 148)
btnClose.BackgroundColor3 = Color3.fromRGB(51, 65, 85)
btnClose.TextColor3 = Color3.new(1, 1, 1)
btnClose.Font = Enum.Font.Gotham
btnClose.TextSize = 14
btnClose.Text = "Скрыть"
btnClose.Parent = modal
Instance.new("UICorner", btnClose).CornerRadius = UDim.new(0, 10)

-- Экран победы
local winBox = Instance.new("Frame")
winBox.Name = "WinOverlay"
winBox.Size = UDim2.fromOffset(360, 220)
winBox.Position = UDim2.fromScale(0.5, 0.45)
winBox.AnchorPoint = Vector2.new(0.5, 0.5)
winBox.BackgroundColor3 = Color3.fromRGB(17, 24, 39)
winBox.Visible = false
winBox.Parent = gui
Instance.new("UICorner", winBox).CornerRadius = UDim.new(0, 20)
local wStroke = Instance.new("UIStroke", winBox)
wStroke.Color = Color3.fromRGB(250, 204, 21)
wStroke.Thickness = 3

local winTitle = Instance.new("TextLabel")
winTitle.Size = UDim2.new(1, -20, 0, 44)
winTitle.Position = UDim2.fromOffset(10, 18)
winTitle.BackgroundTransparency = 1
winTitle.Text = "🎉 Уровень пройден!"
winTitle.TextColor3 = Color3.fromRGB(250, 204, 21)
winTitle.Font = Enum.Font.GothamBold
winTitle.TextSize = 24
winTitle.Parent = winBox

local winSub = Instance.new("TextLabel")
winSub.Size = UDim2.new(1, -20, 0, 72)
winSub.Position = UDim2.fromOffset(10, 70)
winSub.BackgroundTransparency = 1
winSub.Text = "★★★\n+240 XP и подарок в «Дом питомца»!"
winSub.TextColor3 = Color3.new(1, 1, 1)
winSub.Font = Enum.Font.GothamMedium
winSub.TextSize = 18
winSub.TextWrapped = true
winSub.Parent = winBox

local winBtn = Instance.new("TextButton")
winBtn.Size = UDim2.fromOffset(150, 40)
winBtn.Position = UDim2.fromOffset(105, 160)
winBtn.BackgroundColor3 = Color3.fromRGB(132, 204, 22)
winBtn.TextColor3 = Color3.fromRGB(15, 23, 42)
winBtn.Font = Enum.Font.GothamBold
winBtn.TextSize = 16
winBtn.Text = "Ура!"
winBtn.Parent = winBox
Instance.new("UICorner", winBtn).CornerRadius = UDim.new(0, 10)
winBtn.MouseButton1Click:Connect(function()
	winBox.Visible = false
end)

pill.MouseButton1Click:Connect(function()
	modal.Visible = not modal.Visible
end)

btnClose.MouseButton1Click:Connect(function()
	modal.Visible = false
end)

btnOk.MouseButton1Click:Connect(function()
	msg.Text = "Подключаемся…"
	local res = pairFn:InvokeServer(input.Text)
	if res and res.ok then
		msg.TextColor3 = Color3.fromRGB(74, 222, 128)
		msg.Text = "Готово! Привет, " .. tostring(res.name or "")
		task.delay(1.0, function()
			modal.Visible = false
		end)
	else
		msg.TextColor3 = Color3.fromRGB(248, 113, 113)
		msg.Text = (res and res.error) or "Ошибка подключения"
	end
end)

local function starsStr(n)
	n = math.clamp(tonumber(n) or 0, 0, 3)
	return string.rep("★", n) .. string.rep("☆", 3 - n)
end

stateEv.OnClientEvent:Connect(function(st)
	if not st then
		return
	end
	local name = st.name or "Зубрик"
	pill.Text = (st.linked and "✓ " or "🔗 ") .. name .. "  " .. starsStr(st.stars)
end)

effectEv.OnClientEvent:Connect(function(kind, data)
	if kind == "win" then
		local s = data and data.stars or 1
		local xp = data and data.xp or 80
		winSub.Text = starsStr(s) .. "\n+" .. tostring(xp) .. " XP и «Деревянный мостик» в дом!"
		winBox.Visible = true
	end
end)
