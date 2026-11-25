-- Процедурная постройка живого мира «Мира Зубрика» (природа, свет, 8 островов-участков)
local Players = game:GetService("Players")
local Lighting = game:GetService("Lighting")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local TweenService = game:GetService("TweenService")
local Workspace = game:GetService("Workspace")

local Config = require(ReplicatedStorage.Shared.Config)
local Plots = require(script.Parent.Plots)
local Mascot = require(script.Parent.Mascot)

local Terrain = Workspace.Terrain

-- Создаём Remote-объекты для клиента
local remotesFolder = Instance.new("Folder")
remotesFolder.Name = "Remotes"
remotesFolder.Parent = ReplicatedStorage

local pairFn = Instance.new("RemoteFunction")
pairFn.Name = Config.REMOTES.Pair
pairFn.Parent = remotesFolder

local stateEv = Instance.new("RemoteEvent")
stateEv.Name = Config.REMOTES.State
stateEv.Parent = remotesFolder

local effectEv = Instance.new("RemoteEvent")
effectEv.Name = Config.REMOTES.Effect
effectEv.Parent = remotesFolder

-- Атмосфера и рассветный свет
local function setupLighting()
	Lighting.ClockTime = 7.5
	Lighting.Brightness = 2.2
	Lighting.OutdoorAmbient = Color3.fromRGB(130, 125, 145)
	Lighting.Ambient = Color3.fromRGB(90, 88, 105)

	local atm = Instance.new("Atmosphere")
	atm.Density = 0.3
	atm.Offset = 0.25
	atm.Color = Color3.fromRGB(255, 214, 178)
	atm.Decay = Color3.fromRGB(220, 180, 160)
	atm.Glare = 0.25
	atm.Haze = 1.4
	atm.Parent = Lighting

	local bloom = Instance.new("BloomEffect")
	bloom.Intensity = 0.45
	bloom.Size = 20
	bloom.Threshold = 1.1
	bloom.Parent = Lighting

	local rays = Instance.new("SunRaysEffect")
	rays.Intensity = 0.12
	rays.Spread = 0.65
	rays.Parent = Lighting

	local cc = Instance.new("ColorCorrectionEffect")
	cc.Saturation = 0.14
	cc.Contrast = 0.06
	cc.Parent = Lighting

	local clouds = Instance.new("Clouds")
	clouds.Cover = 0.55
	clouds.Density = 0.6
	clouds.Color = Color3.fromRGB(255, 245, 235)
	clouds.Parent = Terrain

	-- Медленный цикл от рассвета к полудню за 10 минут
	task.spawn(function()
		local t0 = os.clock()
		while true do
			local phase = (math.sin((os.clock() - t0) / 600 * math.pi * 2 - math.pi / 2) + 1) * 0.5
			Lighting.ClockTime = 7.5 + phase * 4.5
			task.wait(2)
		end
	end)
end

-- Море облаков под островами
local function setupCloudSea()
	local cloudFolder = Instance.new("Folder")
	cloudFolder.Name = "CloudSea"
	cloudFolder.Parent = Workspace
	local rng = Random.new(42)
	for i = 1, 45 do
		local c = Instance.new("Part")
		c.Name = "Cloud_" .. tostring(i)
		c.Shape = Enum.PartType.Ball
		local r = rng:NextNumber(28, 65)
		c.Size = Vector3.new(r * 1.6, r * 0.55, r * 1.4)
		c.Position = Vector3.new(rng:NextNumber(-520, 520), rng:NextNumber(-18, -6), rng:NextNumber(-520, 520))
		c.Color = Color3.fromRGB(250, 252, 255)
		c.Material = Enum.Material.SmoothPlastic
		c.Transparency = 0.4
		c.Anchored = true
		c.CanCollide = false
		c.Parent = cloudFolder

		local targetPos = c.Position + Vector3.new(rng:NextNumber(12, 28), 0, rng:NextNumber(-10, 10))
		TweenService:Create(c, TweenInfo.new(rng:NextNumber(18, 32), Enum.EasingStyle.Sine, Enum.EasingDirection.InOut, -1, true), {
			Position = targetPos,
		}):Play()
	end
end

local function makePart(parent, name, size, cf, color, material, anchored, canCollide)
	local p = Instance.new("Part")
	p.Name = name
	p.Size = size
	p.CFrame = typeof(cf) == "CFrame" and cf or CFrame.new(cf)
	p.Color = color
	p.Material = material or Enum.Material.SmoothPlastic
	p.Anchored = anchored ~= false
	p.CanCollide = canCollide ~= false
	p.TopSurface = Enum.SurfaceType.Smooth
	p.BottomSurface = Enum.SurfaceType.Smooth
	p.Parent = parent
	return p
end

local function makeSign(parent, pos, rotY, title, color)
	local post = makePart(parent, "SignPost", Vector3.new(0.4, 4, 0.4), CFrame.new(pos + Vector3.new(0, 2, 0)) * CFrame.Angles(0, rotY, 0), Color3.fromRGB(115, 76, 46), Enum.Material.Wood)
	local board = makePart(parent, "SignBoard", Vector3.new(6.5, 2.4, 0.3), CFrame.new(pos + Vector3.new(0, 4.2, 0)) * CFrame.Angles(0, rotY, 0), color or Color3.fromRGB(245, 232, 200), Enum.Material.Wood)

	local sg = Instance.new("SurfaceGui")
	sg.Face = Enum.NormalId.Front
	sg.SizingMode = Enum.SurfaceGuiSizingMode.PixelsPerStud
	sg.PixelsPerStud = 35
	sg.Parent = board

	local lbl = Instance.new("TextLabel")
	lbl.Size = UDim2.new(1, -12, 1, -8)
	lbl.Position = UDim2.fromOffset(6, 4)
	lbl.BackgroundTransparency = 1
	lbl.Text = title
	lbl.TextColor3 = Color3.fromRGB(45, 32, 20)
	lbl.TextScaled = true
	lbl.TextWrapped = true
	lbl.Font = Enum.Font.GothamBold
	lbl.Parent = sg
	return lbl, post
end

local function spawnTree(parent, pos, rng)
	local h = rng:NextNumber(5.5, 8.5)
	local trunk = makePart(parent, "Trunk", Vector3.new(1.1, h, 1.1), pos + Vector3.new(0, h / 2, 0), Color3.fromRGB(110, 72, 44), Enum.Material.Wood)
	trunk.Shape = Enum.PartType.Cylinder
	trunk.CFrame = CFrame.new(pos + Vector3.new(0, h / 2, 0)) * CFrame.Angles(0, 0, math.pi / 2)

	local greens = {
		Color3.fromRGB(74, 165, 68),
		Color3.fromRGB(92, 184, 78),
		Color3.fromRGB(62, 148, 66),
	}
	for j = 1, 3 do
		local r = rng:NextNumber(3.4, 5.2)
		local offset = Vector3.new(rng:NextNumber(-1.4, 1.4), h + rng:NextNumber(-0.5, 1.8), rng:NextNumber(-1.4, 1.4))
		local leaf = makePart(parent, "Leaves", Vector3.new(r, r * 0.9, r), pos + offset, greens[j], Enum.Material.Grass, true, false)
		leaf.Shape = Enum.PartType.Ball
		TweenService:Create(leaf, TweenInfo.new(rng:NextNumber(2.8, 4.5), Enum.EasingStyle.Sine, Enum.EasingDirection.InOut, -1, true), {
			Position = leaf.Position + Vector3.new(0.25, 0.1, 0.15),
		}):Play()
	end
end

local function buildPlot(plot)
	local folder = Instance.new("Folder")
	folder.Name = "Plot_" .. tostring(plot.index)
	folder.Parent = Workspace
	plot.folder = folder

	local c = plot.center
	local rng = Random.new(100 + plot.index)

	-- 1. Остров-лагерь (слева от пропасти, центр на X = c.X - 35)
	local campCenter = c + Vector3.new(-35, 0, 0)
	plot.campPos = campCenter
	plot.spawnPos = campCenter + Vector3.new(-10, 4, 8)
	plot.checkpointPos = c + Vector3.new(-9, 3, 0)

	Terrain:FillBlock(CFrame.new(campCenter + Vector3.new(0, -6, 0)), Vector3.new(58, 12, 54), Enum.Material.Rock)
	Terrain:FillBlock(CFrame.new(campCenter + Vector3.new(0, -0.5, 0)), Vector3.new(56, 3, 52), Enum.Material.Grass)
	-- Песчаная дорожка к Мастерской и к пропасти
	Terrain:FillBlock(CFrame.new(campCenter + Vector3.new(12, 0.3, -4)), Vector3.new(34, 1.5, 6), Enum.Material.Sand)

	-- Деревья, камни, цветы, светлячки
	for i = 1, 10 do
		local angle = (i / 10) * math.pi * 2
		local dist = rng:NextNumber(16, 24)
		local tp = campCenter + Vector3.new(math.cos(angle) * dist, 1, math.sin(angle) * dist)
		if tp.X < c.X - 12 then
			spawnTree(folder, tp, rng)
		end
	end

	-- Светлячки над лагерем
	local ffPart = makePart(folder, "Fireflies", Vector3.new(28, 4, 28), campCenter + Vector3.new(-6, 5, 0), Color3.new(1, 1, 1), Enum.Material.SmoothPlastic, true, false)
	ffPart.Transparency = 1
	local ff = Instance.new("ParticleEmitter")
	ff.Color = ColorSequence.new(Color3.fromRGB(254, 240, 138))
	ff.Size = NumberSequence.new({ NumberSequenceKeypoint.new(0, 0.15), NumberSequenceKeypoint.new(1, 0) })
	ff.Rate = 10
	ff.Lifetime = NumberRange.new(2, 4)
	ff.Speed = NumberRange.new(0.5, 1.5)
	ff.Parent = ffPart

	-- Бабочки
	local bColors = { Color3.fromRGB(251, 191, 36), Color3.fromRGB(244, 114, 182), Color3.fromRGB(96, 165, 250) }
	for i = 1, 5 do
		local b = makePart(folder, "Butterfly", Vector3.new(0.6, 0.15, 0.5), campCenter + Vector3.new(rng:NextNumber(-12, 12), 4, rng:NextNumber(-12, 12)), bColors[(i % #bColors) + 1], Enum.Material.Neon, true, false)
		TweenService:Create(b, TweenInfo.new(rng:NextNumber(2.5, 4.0), Enum.EasingStyle.Sine, Enum.EasingDirection.InOut, -1, true), {
			Position = b.Position + Vector3.new(rng:NextNumber(-4, 4), rng:NextNumber(1, 2.5), rng:NextNumber(-4, 4)),
		}):Play()
	end

	-- Цветы
	for i = 1, 16 do
		local fp = campCenter + Vector3.new(rng:NextNumber(-22, 18), 1.2, rng:NextNumber(-20, 20))
		makePart(folder, "Flower", Vector3.new(0.6, 0.4, 0.6), fp, bColors[(i % #bColors) + 1], Enum.Material.Neon, true, false)
	end

	-- Костёр и пеньки
	local firePos = campCenter + Vector3.new(-6, 1.2, 8)
	local log1 = makePart(folder, "FireLog", Vector3.new(2.4, 0.5, 0.5), CFrame.new(firePos) * CFrame.Angles(0, 0.6, 0), Color3.fromRGB(82, 52, 34), Enum.Material.Wood)
	makePart(folder, "FireLog2", Vector3.new(2.4, 0.5, 0.5), CFrame.new(firePos) * CFrame.Angles(0, -0.6, 0), Color3.fromRGB(82, 52, 34), Enum.Material.Wood)
	local fire = Instance.new("Fire")
	fire.Size = 4
	fire.Heat = 6
	fire.Parent = log1
	local fl = Instance.new("PointLight")
	fl.Color = Color3.fromRGB(255, 175, 90)
	fl.Range = 22
	fl.Brightness = 1.6
	fl.Parent = log1

	for i = 1, 3 do
		local a = i * 2.1
		makePart(folder, "Stump", Vector3.new(1.6, 1.1, 1.6), firePos + Vector3.new(math.cos(a) * 3.5, 0.2, math.sin(a) * 3.5), Color3.fromRGB(120, 82, 50), Enum.Material.Wood)
	end

	-- Палатка
	local tentPos = campCenter + Vector3.new(-16, 2.5, 10)
	makePart(folder, "TentBase", Vector3.new(6, 4, 7), tentPos, Color3.fromRGB(234, 88, 12), Enum.Material.Fabric)
	makePart(folder, "TentRoof", Vector3.new(6.8, 0.6, 7.6), CFrame.new(tentPos + Vector3.new(0, 2.2, 0)) * CFrame.Angles(0, 0, 0.15), Color3.fromRGB(251, 146, 60), Enum.Material.Fabric)

	plot.signCampLabel = makeSign(folder, campCenter + Vector3.new(-4, 1, 15), 0, "Лагерь программистов")

	-- 2. Мастерская кода (беседка, экран, станок-принтер)
	local wsPos = c + Vector3.new(-22, 1, -15)
	plot.workshopPos = wsPos
	plot.printerPos = c + Vector3.new(-17, 1, -4)

	-- Деревянная беседка
	makePart(folder, "WorkshopFloor", Vector3.new(16, 0.6, 14), wsPos, Color3.fromRGB(145, 98, 60), Enum.Material.WoodPlanks)
	for _, off in ipairs({ Vector3.new(-7, 4, -6), Vector3.new(7, 4, -6), Vector3.new(-7, 4, 6), Vector3.new(7, 4, 6) }) do
		makePart(folder, "Pillar", Vector3.new(0.8, 8, 0.8), wsPos + off, Color3.fromRGB(110, 72, 44), Enum.Material.Wood)
	end
	makePart(folder, "WorkshopRoof", Vector3.new(17.5, 0.8, 15.5), wsPos + Vector3.new(0, 8.2, 0), Color3.fromRGB(180, 105, 58), Enum.Material.WoodPlanks)

	-- Гирлянда из неоновых лампочек
	for i = -6, 6, 2 do
		makePart(folder, "Bulb", Vector3.new(0.45, 0.45, 0.45), wsPos + Vector3.new(i, 7.5, 6.5), Color3.fromRGB(253, 224, 71), Enum.Material.Neon, true, false)
	end

	-- Большой экран-терминал (16x9)
	local screen = makePart(folder, "CodeScreen", Vector3.new(13, 7.5, 0.5), wsPos + Vector3.new(0, 4.4, -6), Color3.fromRGB(20, 24, 34), Enum.Material.SmoothPlastic)
	local screenGui = Instance.new("SurfaceGui")
	screenGui.Face = Enum.NormalId.Front
	screenGui.SizingMode = Enum.SurfaceGuiSizingMode.PixelsPerStud
	screenGui.PixelsPerStud = 40
	screenGui.Parent = screen

	local bg = Instance.new("Frame")
	bg.Size = UDim2.fromScale(1, 1)
	bg.BackgroundColor3 = Color3.fromRGB(17, 24, 39)
	bg.Parent = screenGui

	local header = Instance.new("TextLabel")
	header.Name = "Header"
	header.Size = UDim2.new(1, -20, 0, 42)
	header.Position = UDim2.fromOffset(10, 6)
	header.BackgroundTransparency = 1
	header.Text = "Мастерская кода — введи код из приложения Зубрик"
	header.TextColor3 = Color3.fromRGB(132, 204, 22)
	header.TextXAlignment = Enum.TextXAlignment.Left
	header.TextScaled = true
	header.Font = Enum.Font.GothamBold
	header.Parent = bg

	local codeLbl = Instance.new("TextLabel")
	codeLbl.Name = "Code"
	codeLbl.Size = UDim2.new(1, -20, 0, 175)
	codeLbl.Position = UDim2.fromOffset(10, 52)
	codeLbl.BackgroundColor3 = Color3.fromRGB(30, 41, 59)
	codeLbl.Text = "/* CSS появится здесь после «Отправить в мир» */"
	codeLbl.TextColor3 = Color3.fromRGB(226, 232, 240)
	codeLbl.TextXAlignment = Enum.TextXAlignment.Left
	codeLbl.TextYAlignment = Enum.TextYAlignment.Top
	codeLbl.TextSize = 18
	codeLbl.RichText = true
	codeLbl.TextWrapped = true
	codeLbl.Font = Enum.Font.Code
	codeLbl.Parent = bg

	local verdictLbl = Instance.new("TextLabel")
	verdictLbl.Name = "Verdict"
	verdictLbl.Size = UDim2.new(1, -20, 0, 58)
	verdictLbl.Position = UDim2.fromOffset(10, 234)
	verdictLbl.BackgroundTransparency = 1
	verdictLbl.Text = "Ждём подключения…"
	verdictLbl.TextColor3 = Color3.fromRGB(250, 204, 21)
	verdictLbl.TextXAlignment = Enum.TextXAlignment.Left
	verdictLbl.TextWrapped = true
	verdictLbl.TextScaled = true
	verdictLbl.Font = Enum.Font.GothamMedium
	verdictLbl.Parent = bg

	plot.screenHeader = header
	plot.screenCode = codeLbl
	plot.screenVerdict = verdictLbl

	-- Станок-принтер с вращающимися кольцами
	local pBase = makePart(folder, "PrinterBase", Vector3.new(10, 0.8, 10), plot.printerPos, Color3.fromRGB(51, 65, 85), Enum.Material.Metal)
	local ring = makePart(folder, "PrinterRing", Vector3.new(9, 0.25, 9), plot.printerPos + Vector3.new(0, 0.55, 0), Color3.fromRGB(56, 189, 248), Enum.Material.Neon, true, false)
	local sparks = Instance.new("ParticleEmitter")
	sparks.Color = ColorSequence.new(Color3.fromRGB(56, 189, 248), Color3.fromRGB(250, 204, 21))
	sparks.Size = NumberSequence.new({ NumberSequenceKeypoint.new(0, 0.4), NumberSequenceKeypoint.new(1, 0) })
	sparks.Rate = 0
	sparks.Speed = NumberRange.new(8, 16)
	sparks.Lifetime = NumberRange.new(0.5, 1.0)
	sparks.Parent = pBase
	plot.printerSparks = sparks
	TweenService:Create(ring, TweenInfo.new(6, Enum.EasingStyle.Linear, Enum.EasingDirection.InOut, -1), {
		Orientation = Vector3.new(0, 360, 0),
	}):Play()

	-- Доска-подсказка 3x2
	plot.signHintLabel = makeSign(folder, wsPos + Vector3.new(11, 0, 2), -0.4, "Grid: repeat(3, 1fr) + gap", Color3.fromRGB(219, 234, 254))

	-- 3. Облачная пропасть (ширина 30 studs: от X = c.X - 5 до X = c.X + 25)
	plot.signWarnLabel = makeSign(folder, c + Vector3.new(-8, 1, -8), -math.pi / 2, "Щели больше 40px = опасно!", Color3.fromRGB(254, 226, 226))

	-- Водопад с края
	Terrain:FillBlock(CFrame.new(c + Vector3.new(10, -8, -24)), Vector3.new(10, 24, 8), Enum.Material.Water)
	local wfSplash = makePart(folder, "WaterfallSplash", Vector3.new(10, 2, 8), c + Vector3.new(10, -14, -24), Color3.new(1, 1, 1), Enum.Material.SmoothPlastic, true, false)
	wfSplash.Transparency = 1
	local splashEm = Instance.new("ParticleEmitter")
	splashEm.Color = ColorSequence.new(Color3.fromRGB(224, 242, 254))
	splashEm.Rate = 25
	splashEm.Speed = NumberRange.new(4, 9)
	splashEm.Lifetime = NumberRange.new(1, 2)
	splashEm.Parent = wfSplash

	-- Ловушка падения под пропастью
	local catcher = makePart(folder, "FallCatcher", Vector3.new(46, 4, 60), c + Vector3.new(10, -16, 0), Color3.new(1, 1, 1), Enum.Material.SmoothPlastic, true, false)
	catcher.Transparency = 1
	local fallDebounce = {}
	catcher.Touched:Connect(function(hit)
		local char = hit.Parent
		local plr = Players:GetPlayerFromCharacter(char)
		if not plr or plr ~= plot.owner or fallDebounce[plr] then
			return
		end
		fallDebounce[plr] = true
		local hrp = char:FindFirstChild("HumanoidRootPart")
		if hrp then
			hrp.AssemblyLinearVelocity = Vector3.zero
			hrp.CFrame = CFrame.new(plot.checkpointPos)
		end
		Mascot.Say(plot, plot.kapiLines.fell or "Ой! Похоже, в мосту слишком большие щели. Посмотри на gap!")
		effectEv:FireClient(plr, "fall")
		if plot.onFall then
			plot.onFall()
		end
		task.delay(1.5, function()
			fallDebounce[plr] = nil
		end)
	end)

	-- 4. Остров Флажка (финиш, центр X = c.X + 44)
	local finCenter = c + Vector3.new(44, 0, 0)
	plot.finishPos = finCenter
	Terrain:FillBlock(CFrame.new(finCenter + Vector3.new(0, -6, 0)), Vector3.new(38, 12, 42), Enum.Material.Rock)
	Terrain:FillBlock(CFrame.new(finCenter + Vector3.new(0, -0.5, 0)), Vector3.new(36, 3, 40), Enum.Material.Grass)

	-- Радуга (6 дуг)
	local rbColors = {
		Color3.fromRGB(239, 68, 68),
		Color3.fromRGB(249, 115, 22),
		Color3.fromRGB(250, 204, 21),
		Color3.fromRGB(34, 197, 94),
		Color3.fromRGB(59, 130, 246),
		Color3.fromRGB(168, 85, 247),
	}
	for idx, col in ipairs(rbColors) do
		local radius = 14 - idx * 0.65
		for seg = 0, 10 do
			local a = (seg / 10) * math.pi
			local p = finCenter + Vector3.new(8, 1 + math.sin(a) * radius, (seg - 5) * (radius * 0.25))
			makePart(folder, "Rainbow", Vector3.new(0.45, 0.7, 2.2), CFrame.new(p) * CFrame.Angles(a - math.pi / 2, 0, 0), col, Enum.Material.Neon, true, false)
		end
	end

	-- Сундук
	local chestPos = finCenter + Vector3.new(4, 1.8, -6)
	makePart(folder, "ChestBody", Vector3.new(4, 2.2, 2.6), chestPos, Color3.fromRGB(146, 64, 14), Enum.Material.Wood)
	local lid = makePart(folder, "ChestLid", Vector3.new(4.1, 0.7, 2.7), chestPos + Vector3.new(0, 1.45, 0), Color3.fromRGB(217, 119, 6), Enum.Material.Wood)
	plot.chestLid = lid

	-- Флаг победы
	local flagPos = finCenter + Vector3.new(4, 1.2, 4)
	makePart(folder, "FlagPole", Vector3.new(0.45, 11, 0.45), flagPos + Vector3.new(0, 5.5, 0), Color3.fromRGB(226, 232, 240), Enum.Material.Metal)
	local flagCloth = makePart(folder, "FlagCloth", Vector3.new(0.2, 3.2, 5.2), flagPos + Vector3.new(0, 9.2, 2.6), Config.ACCENTS.lime, Enum.Material.Fabric)
	plot.flagCloth = flagCloth

	local fw = Instance.new("ParticleEmitter")
	fw.Color = ColorSequence.new(Color3.fromRGB(250, 204, 21), Color3.fromRGB(244, 114, 182))
	fw.Size = NumberSequence.new({ NumberSequenceKeypoint.new(0, 0.5), NumberSequenceKeypoint.new(1, 0) })
	fw.Rate = 0
	fw.Speed = NumberRange.new(14, 24)
	fw.Lifetime = NumberRange.new(1.0, 1.8)
	fw.Parent = flagCloth
	plot.fireworks = fw

	flagCloth.Parent = folder
	local winPad = makePart(folder, "WinPad", Vector3.new(7, 6, 7), flagPos + Vector3.new(0, 3, 0), Color3.new(1, 1, 1), Enum.Material.SmoothPlastic, true, false)
	winPad.Transparency = 1
	winPad.Touched:Connect(function(hit)
		local plr = Players:GetPlayerFromCharacter(hit.Parent)
		if plr and plr == plot.owner and not plot.won then
			plot.won = true
			if plot.onWin then
				plot.onWin()
			end
		end
	end)

	-- 5. Маскот Капи
	Mascot.Create(plot)
end

setupLighting()
setupCloudSea()
Plots.Init(buildPlot)

local function teleportToPlot(player, character)
	local plot = Plots.Assign(player)
	if not plot then
		return
	end
	local hrp = character:WaitForChild("HumanoidRootPart", 5)
	if hrp then
		task.wait(0.1)
		hrp.CFrame = CFrame.new(plot.spawnPos)
	end
end

Players.PlayerAdded:Connect(function(player)
	local plot = Plots.Assign(player)
	if player.Character then
		teleportToPlot(player, player.Character)
	end
	player.CharacterAdded:Connect(function(char)
		teleportToPlot(player, char)
	end)
	if plot then
		Mascot.Say(plot, "Привет! Я Капи. Введи 6-значный код из приложения Зубрик!")
	end
end)

Players.PlayerRemoving:Connect(function(player)
	Plots.Release(player)
end)
