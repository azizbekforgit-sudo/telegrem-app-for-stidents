-- Интерфейс ученика: окно ввода кода, карточка задания с 4 шагами, звёзды и монеты,
-- кнопка «Положить», карта 11 уровней и экран победы с конфетти. Языки: ru / uz / en.
local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local TweenService = game:GetService("TweenService")
local UserInputService = game:GetService("UserInputService")

local Config = require(ReplicatedStorage.Shared.Config)
local remotes = ReplicatedStorage:WaitForChild("Remotes")
local pairFn = remotes:WaitForChild(Config.REMOTES.Pair)
local stateEv = remotes:WaitForChild(Config.REMOTES.State)
local effectEv = remotes:WaitForChild(Config.REMOTES.Effect)
local tpEv = remotes:WaitForChild(Config.REMOTES.Teleport)
local dropEv = remotes:WaitForChild(Config.REMOTES.Drop)

local player = Players.LocalPlayer
local playerGui = player:WaitForChild("PlayerGui")

-- ───────────── палитра и помощники ─────────────
local C = {
	bg = Color3.fromRGB(255, 255, 255),
	ink = Color3.fromRGB(30, 41, 59),
	sub = Color3.fromRGB(100, 116, 139),
	line = Color3.fromRGB(226, 232, 240),
	lime = Color3.fromRGB(132, 204, 22),
	limeDark = Color3.fromRGB(77, 124, 15),
	sky = Color3.fromRGB(56, 189, 248),
	gold = Color3.fromRGB(250, 204, 21),
	green = Color3.fromRGB(34, 197, 94),
	red = Color3.fromRGB(239, 68, 68),
	shadow = Color3.fromRGB(15, 23, 42),
}
local HEAD = Enum.Font.FredokaOne
local BODY = Enum.Font.GothamBold

local function new(cls, props, children)
	local o = Instance.new(cls)
	for k, v in pairs(props or {}) do
		if k ~= "Parent" then o[k] = v end
	end
	for _, ch in ipairs(children or {}) do ch.Parent = o end
	if props and props.Parent then o.Parent = props.Parent end
	return o
end
local function corner(r) return new("UICorner", { CornerRadius = UDim.new(0, r) }) end
local function stroke(col, th) return new("UIStroke", { Color = col, Thickness = th or 2, ApplyStrokeMode = Enum.ApplyStrokeMode.Border }) end
local function pad(px) return new("UIPadding", { PaddingLeft = UDim.new(0, px), PaddingRight = UDim.new(0, px), PaddingTop = UDim.new(0, px), PaddingBottom = UDim.new(0, px) }) end
local function tween(o, t, props, style)
	local tw = TweenService:Create(o, TweenInfo.new(t, style or Enum.EasingStyle.Quad, Enum.EasingDirection.Out), props)
	tw:Play()
	return tw
end
-- «Пухлая» кнопка: тень снизу и пружинка при нажатии
local function button(parent, text, color, size, pos, anchor)
	local holder = new("Frame", { Parent = parent, Size = size, Position = pos, AnchorPoint = anchor or Vector2.zero, BackgroundColor3 = color:Lerp(Color3.new(0, 0, 0), 0.25), BorderSizePixel = 0 }, { corner(14) })
	local b = new("TextButton", {
		Parent = holder, Size = UDim2.new(1, 0, 1, -4), BackgroundColor3 = color, Text = text, TextColor3 = Color3.new(1, 1, 1),
		Font = HEAD, TextSize = 20, AutoButtonColor = false, BorderSizePixel = 0,
	}, { corner(14) })
	b.MouseButton1Down:Connect(function() tween(b, 0.08, { Position = UDim2.fromOffset(0, 3) }) end)
	b.MouseButton1Up:Connect(function() tween(b, 0.12, { Position = UDim2.fromOffset(0, 0) }) end)
	b.MouseLeave:Connect(function() tween(b, 0.12, { Position = UDim2.fromOffset(0, 0) }) end)
	return b, holder
end

-- ───────────── звуки интерфейса ─────────────
local SoundService = game:GetService("SoundService")
local function sfx(id, vol, pitch)
	if type(id) ~= "string" or #id == 0 then return end
	local s = Instance.new("Sound")
	s.SoundId = id
	s.Volume = vol or 0.6
	s.PlaybackSpeed = pitch or 1
	s.Parent = SoundService
	s:Play()
	s.Ended:Connect(function() s:Destroy() end)
	task.delay(10, function() if s.Parent then s:Destroy() end end)
end

-- ───────────── состояние ─────────────
local S = {
	linked = false, name = nil, lang = "ru", stars = 0, coins = 0,
	levelId = "8-1", progress = {}, solved = false, hasItem = false,
	carrying = false, nearTarget = false,
}
local function T(key, vars) return Config.T(S.lang, key, vars) end
local function levelMeta(id) return Config.LEVELS[Config.LEVEL_INDEX[id] or 1] end

local gui = new("ScreenGui", { Name = "ZubrikUI", ResetOnSpawn = false, IgnoreGuiInset = false, ZIndexBehavior = Enum.ZIndexBehavior.Sibling, Parent = playerGui })
local uiScale = new("UIScale", { Parent = gui })
local function rescale()
	local cam = workspace.CurrentCamera
	local h = cam and cam.ViewportSize.Y or 800
	uiScale.Scale = math.clamp(h / 820, 0.62, 1.15)
end
rescale()
if workspace.CurrentCamera then workspace.CurrentCamera:GetPropertyChangedSignal("ViewportSize"):Connect(rescale) end

-- ───────────── карточка задания (слева сверху) ─────────────
local quest = new("Frame", {
	Parent = gui, Size = UDim2.fromOffset(360, 0), AutomaticSize = Enum.AutomaticSize.Y,
	Position = UDim2.fromOffset(16, 16), BackgroundColor3 = C.bg, BackgroundTransparency = 0.04,
}, { corner(20), stroke(C.line, 2), pad(16), new("UIListLayout", { Padding = UDim.new(0, 8), SortOrder = Enum.SortOrder.LayoutOrder }) })
local questChip = new("TextLabel", {
	Parent = quest, LayoutOrder = 1, Size = UDim2.fromOffset(0, 24), AutomaticSize = Enum.AutomaticSize.X,
	BackgroundColor3 = Color3.fromRGB(236, 252, 203), TextColor3 = C.limeDark, Font = BODY, TextSize = 13, Text = "",
}, { corner(12), new("UIPadding", { PaddingLeft = UDim.new(0, 10), PaddingRight = UDim.new(0, 10) }) })
local questTitle = new("TextLabel", {
	Parent = quest, LayoutOrder = 2, Size = UDim2.new(1, 0, 0, 0), AutomaticSize = Enum.AutomaticSize.Y,
	BackgroundTransparency = 1, TextColor3 = C.ink, Font = HEAD, TextSize = 24, TextWrapped = true,
	TextXAlignment = Enum.TextXAlignment.Left, Text = "",
})
local questGoal = new("TextLabel", {
	Parent = quest, LayoutOrder = 3, Size = UDim2.new(1, 0, 0, 0), AutomaticSize = Enum.AutomaticSize.Y,
	BackgroundTransparency = 1, TextColor3 = C.sub, Font = Enum.Font.GothamMedium, TextSize = 15, TextWrapped = true,
	TextXAlignment = Enum.TextXAlignment.Left, Text = "",
})
local stepRows = {}
for i = 1, 4 do
	local row = new("Frame", { Parent = quest, LayoutOrder = 3 + i, Size = UDim2.new(1, 0, 0, 30), BackgroundTransparency = 1 })
	local dot = new("TextLabel", {
		Parent = row, Size = UDim2.fromOffset(26, 26), Position = UDim2.fromOffset(0, 2), BackgroundColor3 = C.line,
		Text = tostring(i), TextColor3 = C.sub, Font = HEAD, TextSize = 15,
	}, { corner(13) })
	local txt = new("TextLabel", {
		Parent = row, Size = UDim2.new(1, -36, 1, 0), Position = UDim2.fromOffset(36, 0), BackgroundTransparency = 1,
		TextColor3 = C.sub, Font = Enum.Font.GothamMedium, TextSize = 15, TextWrapped = true,
		TextXAlignment = Enum.TextXAlignment.Left, Text = "",
	})
	stepRows[i] = { row = row, dot = dot, txt = txt }
end

-- ───────────── звёзды, монеты, карта (справа сверху) ─────────────
local topBar = new("Frame", {
	Parent = gui, Size = UDim2.fromOffset(0, 52), AutomaticSize = Enum.AutomaticSize.X, AnchorPoint = Vector2.new(1, 0),
	Position = UDim2.new(1, -16, 0, 16), BackgroundTransparency = 1,
}, { new("UIListLayout", { FillDirection = Enum.FillDirection.Horizontal, Padding = UDim.new(0, 10), VerticalAlignment = Enum.VerticalAlignment.Center, SortOrder = Enum.SortOrder.LayoutOrder }) })
local function pill(order, icon, color)
	local f = new("Frame", { Parent = topBar, LayoutOrder = order, Size = UDim2.fromOffset(0, 48), AutomaticSize = Enum.AutomaticSize.X, BackgroundColor3 = C.bg }, {
		corner(24), stroke(C.line, 2), new("UIPadding", { PaddingLeft = UDim.new(0, 14), PaddingRight = UDim.new(0, 16) }),
		new("UIListLayout", { FillDirection = Enum.FillDirection.Horizontal, Padding = UDim.new(0, 8), VerticalAlignment = Enum.VerticalAlignment.Center }),
	})
	new("TextLabel", { Parent = f, Size = UDim2.fromOffset(26, 26), BackgroundTransparency = 1, Text = icon, TextSize = 24, Font = BODY, TextColor3 = color })
	local v = new("TextLabel", { Parent = f, Size = UDim2.fromOffset(0, 30), AutomaticSize = Enum.AutomaticSize.X, BackgroundTransparency = 1, Text = "0", TextSize = 22, Font = HEAD, TextColor3 = C.ink })
	return f, v
end
local starPill, starVal = pill(1, "★", C.gold)
local coinPill, coinVal = pill(2, "●", Color3.fromRGB(234, 179, 8))
local mapBtn, mapHolder = button(topBar, "🗺", C.sky, UDim2.fromOffset(56, 52))
mapHolder.LayoutOrder = 3
mapBtn.TextSize = 26
local linkBtn, linkHolder = button(topBar, "", C.lime, UDim2.fromOffset(150, 52))
linkHolder.LayoutOrder = 4

-- ───────────── подсказка и кнопка «Положить» (снизу) ─────────────
local actionBar = new("Frame", {
	Parent = gui, Size = UDim2.fromOffset(0, 64), AutomaticSize = Enum.AutomaticSize.X, AnchorPoint = Vector2.new(0.5, 1),
	Position = UDim2.new(0.5, 0, 1, -24), BackgroundColor3 = C.bg, Visible = false,
}, { corner(32), stroke(C.line, 2), new("UIPadding", { PaddingLeft = UDim.new(0, 22), PaddingRight = UDim.new(0, 8) }),
	new("UIListLayout", { FillDirection = Enum.FillDirection.Horizontal, Padding = UDim.new(0, 14), VerticalAlignment = Enum.VerticalAlignment.Center, SortOrder = Enum.SortOrder.LayoutOrder }) })
local actionText = new("TextLabel", { Parent = actionBar, LayoutOrder = 1, Size = UDim2.fromOffset(0, 40), AutomaticSize = Enum.AutomaticSize.X, BackgroundTransparency = 1, Text = "", TextColor3 = C.ink, Font = BODY, TextSize = 17 })
local dropBtn, dropHolder = button(actionBar, "", C.lime, UDim2.fromOffset(190, 50))
dropHolder.LayoutOrder = 2

-- ───────────── всплывашки ─────────────
local toast = new("TextLabel", {
	Parent = gui, Size = UDim2.fromOffset(0, 50), AutomaticSize = Enum.AutomaticSize.X, AnchorPoint = Vector2.new(0.5, 0),
	Position = UDim2.new(0.5, 0, 0, -80), BackgroundColor3 = C.ink, TextColor3 = Color3.new(1, 1, 1), Font = HEAD, TextSize = 20, Text = "",
}, { corner(25), new("UIPadding", { PaddingLeft = UDim.new(0, 24), PaddingRight = UDim.new(0, 24) }) })
local toastToken = 0
local function showToast(text, color)
	toastToken += 1
	local my = toastToken
	toast.Text = text
	toast.BackgroundColor3 = color or C.ink
	tween(toast, 0.35, { Position = UDim2.new(0.5, 0, 0, 20) }, Enum.EasingStyle.Back)
	task.delay(3.2, function()
		if toastToken == my then tween(toast, 0.3, { Position = UDim2.new(0.5, 0, 0, -80) }) end
	end)
end

-- ───────────── окно ввода кода ─────────────
local dim = new("Frame", { Parent = gui, Size = UDim2.new(1, 0, 1, 120), Position = UDim2.fromOffset(0, -120), BackgroundColor3 = C.shadow, BackgroundTransparency = 0.45, Visible = true, ZIndex = 20 })
local modal = new("Frame", {
	Parent = dim, Size = UDim2.fromOffset(460, 0), AutomaticSize = Enum.AutomaticSize.Y, AnchorPoint = Vector2.new(0.5, 0.5),
	Position = UDim2.fromScale(0.5, 0.5), BackgroundColor3 = C.bg, ZIndex = 21,
}, { corner(28), pad(28), new("UIListLayout", { Padding = UDim.new(0, 14), HorizontalAlignment = Enum.HorizontalAlignment.Center, SortOrder = Enum.SortOrder.LayoutOrder }) })
new("TextLabel", { Parent = modal, LayoutOrder = 1, Size = UDim2.fromOffset(90, 90), BackgroundColor3 = Color3.fromRGB(236, 252, 203), Text = "🐾", TextSize = 52, Font = BODY, ZIndex = 22 }, { corner(45) })
local mTitle = new("TextLabel", { Parent = modal, LayoutOrder = 2, Size = UDim2.new(1, 0, 0, 0), AutomaticSize = Enum.AutomaticSize.Y, BackgroundTransparency = 1, Text = "", TextColor3 = C.ink, Font = HEAD, TextSize = 28, TextWrapped = true, ZIndex = 22 })
local mHow = new("TextLabel", { Parent = modal, LayoutOrder = 3, Size = UDim2.new(1, 0, 0, 0), AutomaticSize = Enum.AutomaticSize.Y, BackgroundTransparency = 1, Text = "", TextColor3 = C.sub, Font = Enum.Font.GothamMedium, TextSize = 16, TextWrapped = true, ZIndex = 22 })
local input = new("TextBox", {
	Parent = modal, LayoutOrder = 4, Size = UDim2.new(1, 0, 0, 74), BackgroundColor3 = Color3.fromRGB(241, 245, 249),
	TextColor3 = C.ink, PlaceholderText = "• • • • • •", PlaceholderColor3 = Color3.fromRGB(148, 163, 184), Text = "",
	Font = HEAD, TextSize = 46, ClearTextOnFocus = false, ZIndex = 22,
}, { corner(18), stroke(C.line, 3) })
local inputStroke = input:FindFirstChildOfClass("UIStroke")
local mMsg = new("TextLabel", { Parent = modal, LayoutOrder = 5, Size = UDim2.new(1, 0, 0, 22), BackgroundTransparency = 1, Text = "", TextColor3 = C.red, Font = BODY, TextSize = 16, ZIndex = 22 })
local okBtn, okHolder = button(modal, "", C.lime, UDim2.new(1, 0, 0, 60))
okHolder.LayoutOrder = 6
okHolder.ZIndex = 22
okBtn.ZIndex = 23
okBtn.TextSize = 24

-- оставляем только цифры, максимум 6, и красиво разрежаем
input:GetPropertyChangedSignal("Text"):Connect(function()
	local digits = input.Text:gsub("%D", ""):sub(1, 6)
	if input.Text ~= digits then input.Text = digits end
	inputStroke.Color = #digits == 6 and C.lime or C.line
end)
input.Focused:Connect(function() inputStroke.Color = C.sky end)

local function openModal(v)
	dim.Visible = v
	if v then
		modal.Position = UDim2.fromScale(0.5, 0.56)
		tween(modal, 0.35, { Position = UDim2.fromScale(0.5, 0.5) }, Enum.EasingStyle.Back)
	end
end

local pairing = false
local function doPair()
	if pairing then return end
	if #input.Text ~= 6 then
		mMsg.TextColor3 = C.red
		mMsg.Text = T("pairNeed")
		return
	end
	pairing = true
	mMsg.TextColor3 = C.sub
	mMsg.Text = T("pairWait")
	local ok, res = pcall(function() return pairFn:InvokeServer(input.Text) end)
	pairing = false
	if ok and res and res.ok then
		if res.lang then S.lang = res.lang end
		mMsg.TextColor3 = C.green
		mMsg.Text = T("pairOk", { name = res.name or "" })
		task.delay(0.8, function() openModal(false) end)
	else
		mMsg.TextColor3 = C.red
		mMsg.Text = (ok and res and res.error) or T("pairFail")
		local p0 = modal.Position
		for _, dx in ipairs({ -10, 10, -6, 6, 0 }) do
			tween(modal, 0.05, { Position = p0 + UDim2.fromOffset(dx, 0) })
			task.wait(0.05)
		end
	end
end
okBtn.MouseButton1Click:Connect(doPair)
input.FocusLost:Connect(function(enter) if enter then doPair() end end)
linkBtn.MouseButton1Click:Connect(function() openModal(not dim.Visible) end)
dim.InputBegan:Connect(function(inp)
	-- клик мимо окна закрывает его (если уже подключены)
	if S.linked and (inp.UserInputType == Enum.UserInputType.MouseButton1 or inp.UserInputType == Enum.UserInputType.Touch) then
		local p, s = modal.AbsolutePosition, modal.AbsoluteSize
		local m = inp.Position
		if m.X < p.X or m.X > p.X + s.X or m.Y < p.Y or m.Y > p.Y + s.Y then openModal(false) end
	end
end)

-- ───────────── карта уровней ─────────────
local map = new("Frame", {
	Parent = gui, Size = UDim2.fromOffset(560, 0), AutomaticSize = Enum.AutomaticSize.Y, AnchorPoint = Vector2.new(1, 0),
	Position = UDim2.new(1, -16, 0, 80), BackgroundColor3 = C.bg, Visible = false, ZIndex = 10,
}, { corner(24), stroke(C.line, 2), pad(18), new("UIListLayout", { Padding = UDim.new(0, 12), SortOrder = Enum.SortOrder.LayoutOrder }) })
local mapTitle = new("TextLabel", { Parent = map, LayoutOrder = 1, Size = UDim2.new(1, 0, 0, 30), BackgroundTransparency = 1, Text = "", TextColor3 = C.ink, Font = HEAD, TextSize = 24, TextXAlignment = Enum.TextXAlignment.Left, ZIndex = 11 })
local grid = new("Frame", { Parent = map, LayoutOrder = 2, Size = UDim2.new(1, 0, 0, 0), AutomaticSize = Enum.AutomaticSize.Y, BackgroundTransparency = 1, ZIndex = 11 },
	{ new("UIGridLayout", { CellSize = UDim2.fromOffset(122, 104), CellPadding = UDim2.fromOffset(10, 10), SortOrder = Enum.SortOrder.LayoutOrder }) })
local tiles = {}
for i, lv in ipairs(Config.LEVELS) do
	local b = new("TextButton", { Parent = grid, LayoutOrder = i, BackgroundColor3 = Color3.fromRGB(241, 245, 249), Text = "", AutoButtonColor = true, ZIndex = 12 }, { corner(16) })
	local st = stroke(C.line, 2)
	st.Parent = b
	local icon = new("TextLabel", { Parent = b, Size = UDim2.new(1, 0, 0, 40), Position = UDim2.fromOffset(0, 8), BackgroundTransparency = 1, Text = lv.icon, TextSize = 32, Font = BODY, ZIndex = 13 })
	local id = new("TextLabel", { Parent = b, Size = UDim2.new(1, 0, 0, 20), Position = UDim2.fromOffset(0, 48), BackgroundTransparency = 1, Text = lv.id, TextColor3 = C.ink, TextSize = 17, Font = HEAD, ZIndex = 13 })
	local nm = new("TextLabel", { Parent = b, Size = UDim2.new(1, -10, 0, 30), Position = UDim2.fromOffset(5, 68), BackgroundTransparency = 1, Text = "", TextColor3 = C.sub, TextSize = 12, TextWrapped = true, Font = Enum.Font.GothamMedium, ZIndex = 13 })
	tiles[lv.id] = { b = b, st = st, icon = icon, id = id, nm = nm }
	b.MouseButton1Click:Connect(function()
		local idx = Config.LEVEL_INDEX[lv.id]
		local unlocked = idx == 1 or S.progress[Config.LEVELS[idx - 1].id]
		if not unlocked then
			showToast("🔒 " .. T("locked"), C.ink)
			return
		end
		map.Visible = false
		tpEv:FireServer(lv.id)
	end)
end
mapBtn.MouseButton1Click:Connect(function() map.Visible = not map.Visible end)

-- ───────────── экран победы ─────────────
local winDim = new("Frame", { Parent = gui, Size = UDim2.new(1, 0, 1, 120), Position = UDim2.fromOffset(0, -120), BackgroundColor3 = C.shadow, BackgroundTransparency = 0.4, Visible = false, ZIndex = 30 })
local confettiLayer = new("Frame", { Parent = winDim, Size = UDim2.fromScale(1, 1), BackgroundTransparency = 1, ClipsDescendants = true, ZIndex = 31 })
local winCard = new("Frame", {
	Parent = winDim, Size = UDim2.fromOffset(460, 0), AutomaticSize = Enum.AutomaticSize.Y, AnchorPoint = Vector2.new(0.5, 0.5),
	Position = UDim2.fromScale(0.5, 0.5), BackgroundColor3 = C.bg, ZIndex = 32,
}, { corner(30), pad(28), new("UIListLayout", { Padding = UDim.new(0, 12), HorizontalAlignment = Enum.HorizontalAlignment.Center, SortOrder = Enum.SortOrder.LayoutOrder }) })
local winScale = new("UIScale", { Parent = winCard })
local winTitle = new("TextLabel", { Parent = winCard, LayoutOrder = 1, Size = UDim2.new(1, 0, 0, 0), AutomaticSize = Enum.AutomaticSize.Y, BackgroundTransparency = 1, Text = "", TextColor3 = C.ink, Font = HEAD, TextSize = 32, TextWrapped = true, ZIndex = 33 })
local starRow = new("Frame", { Parent = winCard, LayoutOrder = 2, Size = UDim2.fromOffset(260, 80), BackgroundTransparency = 1, ZIndex = 33 },
	{ new("UIListLayout", { FillDirection = Enum.FillDirection.Horizontal, Padding = UDim.new(0, 10), HorizontalAlignment = Enum.HorizontalAlignment.Center, VerticalAlignment = Enum.VerticalAlignment.Center }) })
local bigStars = {}
for i = 1, 3 do
	local s = new("TextLabel", { Parent = starRow, Size = UDim2.fromOffset(74, 74), BackgroundTransparency = 1, Text = "★", TextSize = 70, Font = HEAD, TextColor3 = C.line, ZIndex = 34 })
	bigStars[i] = { lbl = s, scale = new("UIScale", { Parent = s }) }
end
local winXp = new("TextLabel", { Parent = winCard, LayoutOrder = 3, Size = UDim2.fromOffset(0, 40), AutomaticSize = Enum.AutomaticSize.X, BackgroundColor3 = Color3.fromRGB(254, 249, 195), Text = "", TextColor3 = Color3.fromRGB(161, 98, 7), Font = HEAD, TextSize = 22, ZIndex = 33 },
	{ corner(20), new("UIPadding", { PaddingLeft = UDim.new(0, 18), PaddingRight = UDim.new(0, 18) }) })
local winNext = new("TextLabel", { Parent = winCard, LayoutOrder = 4, Size = UDim2.new(1, 0, 0, 0), AutomaticSize = Enum.AutomaticSize.Y, BackgroundTransparency = 1, Text = "", TextColor3 = C.sub, Font = BODY, TextSize = 18, TextWrapped = true, ZIndex = 33 })
local winBtn, winBtnHolder = button(winCard, "", C.lime, UDim2.new(1, 0, 0, 60))
winBtnHolder.LayoutOrder = 5
winBtnHolder.ZIndex = 33
winBtn.ZIndex = 34
winBtn.TextSize = 24
local pendingNext = nil
winBtn.MouseButton1Click:Connect(function()
	winDim.Visible = false
	if pendingNext then tpEv:FireServer(pendingNext) end
	pendingNext = nil
end)

local CONFETTI = { C.lime, C.sky, C.gold, Color3.fromRGB(244, 114, 182), Color3.fromRGB(167, 139, 250), Color3.fromRGB(251, 146, 60) }
local function confetti()
	local w = confettiLayer.AbsoluteSize.X
	local h = confettiLayer.AbsoluteSize.Y
	for i = 1, 90 do
		local sz = math.random(8, 16)
		local f = new("Frame", {
			Parent = confettiLayer, Size = UDim2.fromOffset(sz, sz * 0.6), Position = UDim2.fromOffset(math.random(0, math.max(1, w)), -20 - math.random(0, 200)),
			BackgroundColor3 = CONFETTI[math.random(#CONFETTI)], Rotation = math.random(0, 360), BorderSizePixel = 0, ZIndex = 31,
		}, { corner(2) })
		local dur = math.random(22, 38) / 10
		TweenService:Create(f, TweenInfo.new(dur, Enum.EasingStyle.Quad, Enum.EasingDirection.In), {
			Position = UDim2.fromOffset(f.Position.X.Offset + math.random(-120, 120), h + 40),
			Rotation = f.Rotation + math.random(-540, 540),
		}):Play()
		task.delay(dur, function() f:Destroy() end)
	end
end

local function showWin(data)
	local lvMeta = levelMeta(data.levelId)
	winTitle.Text = "🎉 " .. T("winTitle")
	winXp.Text = (data.xp and data.xp > 0) and ("+" .. data.xp .. " XP") or (lvMeta.icon .. " " .. Config.Pick(lvMeta.name, S.lang))
	if data.xp and data.xp > 0 then winXp.Text = T("winXp", { xp = data.xp }) end
	if data.nextTitle then
		winNext.Text = "🔓 " .. T("winNext", { title = data.nextTitle })
		winBtn.Text = T("winBtn")
		pendingNext = data.nextLevelId
	else
		winNext.Text = "🏆 " .. T("winAll")
		winBtn.Text = T("winBtnEnd")
		pendingNext = nil
	end
	if data.error then winNext.Text = winNext.Text .. "\n⚠ " .. tostring(data.error) end
	for _, s in ipairs(bigStars) do
		s.lbl.TextColor3 = C.line
		s.scale.Scale = 1
	end
	winDim.Visible = true
	winScale.Scale = 0.6
	tween(winScale, 0.45, { Scale = 1 }, Enum.EasingStyle.Back)
	confetti()
	task.spawn(function()
		task.wait(0.4)
		for i = 1, math.clamp(tonumber(data.stars) or 1, 1, 3) do
			bigStars[i].lbl.TextColor3 = C.gold
			bigStars[i].scale.Scale = 1.7
			tween(bigStars[i].scale, 0.35, { Scale = 1 }, Enum.EasingStyle.Back)
			sfx(Config.SOUNDS.Coin, 0.6, 1 + i * 0.15)
			task.wait(0.3)
		end
	end)
end

-- ───────────── вспышка при падении ─────────────
local flash = new("Frame", { Parent = gui, Size = UDim2.fromScale(1, 1), BackgroundColor3 = Color3.new(1, 1, 1), BackgroundTransparency = 1, ZIndex = 40, Active = false })

-- ───────────── обновление интерфейса ─────────────
local pulseRow = nil
local function refresh()
	local lv = levelMeta(S.levelId)
	local idx = Config.LEVEL_INDEX[lv.id]
	questChip.Text = T("lesson") .. " · " .. T("level", { n = idx })
	questTitle.Text = lv.icon .. " " .. Config.Pick(lv.name, S.lang)
	questGoal.Text = Config.Pick(lv.goal, S.lang)
	local done = {
		S.linked,
		S.hasItem or S.solved or S.progress[lv.id] == true,
		S.solved or S.progress[lv.id] == true,
		S.progress[lv.id] == true,
	}
	local keys = { "step1", "step2", "step3", "step4" }
	pulseRow = nil
	local currentFound = false
	for i, r in ipairs(stepRows) do
		r.txt.Text = T(keys[i])
		if done[i] then
			r.dot.Text = "✓"
			r.dot.BackgroundColor3 = C.green
			r.dot.TextColor3 = Color3.new(1, 1, 1)
			r.txt.TextColor3 = C.sub
		elseif not currentFound then
			currentFound = true
			r.dot.Text = tostring(i)
			r.dot.BackgroundColor3 = C.sky
			r.dot.TextColor3 = Color3.new(1, 1, 1)
			r.txt.TextColor3 = C.ink
			pulseRow = r
		else
			r.dot.Text = tostring(i)
			r.dot.BackgroundColor3 = C.line
			r.dot.TextColor3 = C.sub
			r.txt.TextColor3 = Color3.fromRGB(148, 163, 184)
		end
	end
	starVal.Text = tostring(S.stars) .. "/33"
	coinVal.Text = tostring(S.coins)
	linkBtn.Text = S.linked and ("✓ " .. tostring(S.name or "")) or ("🔗 " .. T("connect"))
	linkHolder.Size = UDim2.fromOffset(S.linked and 170 or 170, 52)
	linkBtn.BackgroundColor3 = S.linked and Color3.fromRGB(241, 245, 249) or C.lime
	linkBtn.TextColor3 = S.linked and C.ink or Color3.new(1, 1, 1)
	linkHolder.BackgroundColor3 = S.linked and C.line or C.limeDark
	linkBtn.TextSize = 17
	mTitle.Text = T("pairTitle")
	mHow.Text = T("pairHow")
	okBtn.Text = T("pairBtn")
	mapTitle.Text = "🗺 " .. T("mapTitle")
	for i, l in ipairs(Config.LEVELS) do
		local t = tiles[l.id]
		local won = S.progress[l.id] == true
		local unlocked = i == 1 or S.progress[Config.LEVELS[i - 1].id] == true
		t.nm.Text = Config.Pick(l.name, S.lang)
		t.icon.Text = unlocked and l.icon or "🔒"
		t.b.BackgroundColor3 = won and Color3.fromRGB(220, 252, 231) or (l.id == S.levelId and Color3.fromRGB(224, 242, 254) or Color3.fromRGB(241, 245, 249))
		t.st.Color = won and C.green or (l.id == S.levelId and C.sky or C.line)
		t.id.Text = won and ("✓ " .. l.id) or l.id
	end
	-- нижняя кнопка
	if S.carrying then
		actionBar.Visible = true
		actionText.Text = S.nearTarget and ("✨ " .. Config.Say(S.lang, "near")) or ("🧺 " .. T("carryHint"))
		dropBtn.Text = "⬇ " .. T("drop") .. "  [E]"
		dropBtn.BackgroundColor3 = S.nearTarget and C.green or C.sky
		dropHolder.BackgroundColor3 = (S.nearTarget and C.green or C.sky):Lerp(Color3.new(0, 0, 0), 0.25)
	else
		actionBar.Visible = false
	end
end

-- пульсация текущего шага
task.spawn(function()
	while true do
		if pulseRow then
			tween(pulseRow.dot, 0.5, { BackgroundTransparency = 0.35 })
			task.wait(0.5)
			if pulseRow then tween(pulseRow.dot, 0.5, { BackgroundTransparency = 0 }) end
		end
		task.wait(0.5)
	end
end)

dropBtn.MouseButton1Click:Connect(function() if S.carrying then dropEv:FireServer() end end)
UserInputService.InputBegan:Connect(function(inp, processed)
	if processed then return end
	if (inp.KeyCode == Enum.KeyCode.E or inp.KeyCode == Enum.KeyCode.ButtonX) and S.carrying then
		dropEv:FireServer()
	end
end)

stateEv.OnClientEvent:Connect(function(st)
	if type(st) ~= "table" then return end
	local wasLinked = S.linked
	if st.reset then
		S.progress, S.solved, S.hasItem, S.carrying = {}, false, false, false
	end
	for k, v in pairs(st) do
		if k == "progress" and type(v) == "table" then
			for id, won in pairs(v) do if won then S.progress[id] = true end end
		elseif k == "stars" or k == "coins" then
			S[k] = tonumber(v) or 0
		else
			S[k] = v
		end
	end
	if S.linked and not wasLinked then openModal(false) end
	refresh()
end)

effectEv.OnClientEvent:Connect(function(kind, data)
	data = data or {}
	if kind == "linked" then
		sfx(Config.SOUNDS.Linked, 0.7)
		showToast("✨ " .. T("pairOk", { name = data.name or "" }), C.limeDark)
	elseif kind == "printing" then
		showToast((tonumber(data.stars) or 0) > 0 and ("🖨 " .. T("printed")) or ("⚠ " .. tostring(data.tip or "")), (tonumber(data.stars) or 0) > 0 and C.ink or Color3.fromRGB(180, 83, 9))
	elseif kind == "placed" then
		showToast("✅ " .. T("toFlag"), C.limeDark)
	elseif kind == "broken" then
		showToast("💥 " .. T("broken"), C.red)
	elseif kind == "coin" then
		sfx(Config.SOUNDS.Coin, 0.5, 1.1)
		local sc = coinPill:FindFirstChildOfClass("UIScale") or new("UIScale", { Parent = coinPill })
		sc.Scale = 1.25
		tween(sc, 0.3, { Scale = 1 }, Enum.EasingStyle.Back)
	elseif kind == "fall" then
		sfx(Config.SOUNDS.Fall, 0.5)
		flash.BackgroundTransparency = 0.1
		tween(flash, 0.6, { BackgroundTransparency = 1 })
	elseif kind == "win" then
		sfx(Config.SOUNDS.Win, 0.8)
		S.progress[data.levelId] = true
		if data.nextLevelId then S.levelId = data.nextLevelId end
		refresh()
		showWin(data)
	end
end)

-- Облачка чужих питомцев не загораживают экран
task.spawn(function()
	while true do
		local hrp = player.Character and player.Character:FindFirstChild("HumanoidRootPart")
		if hrp then
			for _, plot in ipairs(workspace:GetChildren()) do
				if plot.Name:match("^Plot_") then
					local pet = plot:FindFirstChild("PetGuide")
					local bbg = pet and pet:FindFirstChild("Bubble")
					local root = pet and pet.PrimaryPart
					if bbg and root and (root.Position - hrp.Position).Magnitude > 45 then
						bbg.Enabled = false
					end
				end
			end
		end
		task.wait(1)
	end
end)

refresh()
openModal(true)
