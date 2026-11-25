-- Небесный Архипелаг Зубрика: 11 тематических парящих островов, конусные скалы с кристаллами,
-- сакуры и сосны, прыгучие грибы, монеты-звёздочки, водопад, радуга и телепорты между уровнями.
local Players = game:GetService("Players")
local Lighting = game:GetService("Lighting")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local TweenService = game:GetService("TweenService")
local Workspace = game:GetService("Workspace")

local Config = require(ReplicatedStorage.Shared.Config)
local Plots = require(script.Parent.Plots)
local Mascot = require(script.Parent.Mascot)

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

local tpEv = Instance.new("RemoteEvent")
tpEv.Name = Config.REMOTES.Teleport
tpEv.Parent = remotesFolder

local BIOMES = {
	{ id = "8-1", name = "Изумрудный Лагерь", top = Color3.fromRGB(86, 178, 72), rock = Color3.fromRGB(108, 98, 92), gap = "water", tree = "pine" },
	{ id = "8-2", name = "Золотые Руины", top = Color3.fromRGB(234, 179, 8), rock = Color3.fromRGB(146, 114, 72), gap = "clouds", tree = "sakura" },
	{ id = "8-3", name = "Огненный Каньон", top = Color3.fromRGB(87, 83, 78), rock = Color3.fromRGB(54, 48, 46), gap = "lava", tree = "pine" },
	{ id = "8-4", name = "Хрустальный Лес", top = Color3.fromRGB(56, 189, 248), rock = Color3.fromRGB(67, 94, 128), gap = "crystal", tree = "crystal" },
	{ id = "8-5", name = "Облачный Сад", top = Color3.fromRGB(167, 243, 208), rock = Color3.fromRGB(148, 163, 184), gap = "clouds", tree = "sakura" },
	{ id = "8-6", name = "Звёздная Станция", top = Color3.fromRGB(99, 102, 241), rock = Color3.fromRGB(51, 65, 85), gap = "stars", tree = "crystal" },
	{ id = "8-7", name = "Грибная Поляна", top = Color3.fromRGB(74, 222, 128), rock = Color3.fromRGB(120, 92, 74), gap = "clouds", tree = "sakura" },
	{ id = "8-8", name = "Портальная Площадь", top = Color3.fromRGB(168, 85, 247), rock = Color3.fromRGB(68, 56, 98), gap = "stars", tree = "crystal" },
	{ id = "8-9", name = "Заоблачный Замок", top = Color3.fromRGB(148, 163, 184), rock = Color3.fromRGB(71, 85, 105), gap = "clouds", tree = "pine" },
	{ id = "8-10", name = "Обсерватория", top = Color3.fromRGB(59, 130, 246), rock = Color3.fromRGB(45, 58, 92), gap = "stars", tree = "crystal" },
	{ id = "8-11", name = "Остров Короны", top = Color3.fromRGB(250, 204, 21), rock = Color3.fromRGB(139, 92, 246), gap = "rainbow", tree = "sakura" },
}

local function setupLighting()
	Lighting.ClockTime = 7.8
	Lighting.Brightness = 2.4
	Lighting.OutdoorAmbient = Color3.fromRGB(135, 132, 158)
	Lighting.Ambient = Color3.fromRGB(96, 94, 118)

	local atm = Instance.new("Atmosphere")
	atm.Density = 0.28
	atm.Offset = 0.25
	atm.Color = Color3.fromRGB(255, 218, 185)
	atm.Decay = Color3.fromRGB(214, 180, 170)
	atm.Glare = 0.25
	atm.Haze = 1.2
	atm.Parent = Lighting

	local bloom = Instance.new("BloomEffect")
	bloom.Intensity = 0.5
	bloom.Size = 22
	bloom.Threshold = 1.05
	bloom.Parent = Lighting

	local rays = Instance.new("SunRaysEffect")
	rays.Intensity = 0.14
	rays.Spread = 0.65
	rays.Parent = Lighting

	local cc = Instance.new("ColorCorrectionEffect")
	cc.Saturation = 0.18
	cc.Contrast = 0.08
	cc.Parent = Lighting

	local clouds = Instance.new("Clouds")
	clouds.Cover = 0.52
	clouds.Density = 0.58
	clouds.Color = Color3.fromRGB(255, 246, 238)
	clouds.Parent = Workspace.Terrain

	task.spawn(function()
		local t0 = os.clock()
		while true do
			local phase = (math.sin((os.clock() - t0) / 600 * math.pi * 2 - math.pi / 2) + 1) * 0.5
			Lighting.ClockTime = 7.8 + phase * 4.2
			task.wait(2)
		end
	end)
end

local function setupCloudSea()
	local cloudFolder = Instance.new("Folder")
	cloudFolder.Name = "CloudSea"
	cloudFolder.Parent = Workspace
	local rng = Random.new(42)
	for i = 1, 55 do
		local c = Instance.new("Part")
		c.Name = "Cloud_" .. tostring(i)
		c.Shape = Enum.PartType.Ball
		local r = rng:NextNumber(40, 90)
		c.Size = Vector3.new(r * 1.7, r * 0.5, r * 1.5)
		c.Position = Vector3.new(rng:NextNumber(-1600, 1600), rng:NextNumber(-24, -10), rng:NextNumber(-1600, 1600))
		c.Color = Color3.fromRGB(250, 252, 255)
		c.Material = Enum.Material.SmoothPlastic
		c.Transparency = 0.42
		c.Anchored = true
		c.CanCollide = false
		c.Parent = cloudFolder
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

local function at(plot, fwd, right, up)
	local rVec = Vector3.new(-plot.dir.Z, 0, plot.dir.X)
	return plot.center + plot.dir * fwd + rVec * right + Vector3.new(0, up or 0, 0)
end

local function cfAt(plot, fwd, right, up, extraRot)
	return CFrame.new(at(plot, fwd, right, up)) * CFrame.Angles(0, -plot.angle, 0) * (extraRot or CFrame.new())
end

-- Парящий остров со ступенчатой скалой снизу и светящимися кристаллами
local function buildFloatingIsland(folder, cf, width, depth, topColor, rockColor)
	makePart(folder, "IslandTop", Vector3.new(width, 2.4, depth), cf, topColor, Enum.Material.Grass)
	makePart(folder, "IslandRim", Vector3.new(width * 0.92, 3.2, depth * 0.92), cf * CFrame.new(0, -2.6, 0), rockColor, Enum.Material.Slate)
	makePart(folder, "IslandCore", Vector3.new(width * 0.65, 5.0, depth * 0.65), cf * CFrame.new(0, -6.2, 0), rockColor, Enum.Material.Rock)
	makePart(folder, "IslandTip", Vector3.new(width * 0.3, 4.5, depth * 0.3), cf * CFrame.new(0, -10.5, 0), rockColor, Enum.Material.Rock)
	-- Висящий светящийся кристалл под островом
	makePart(folder, "UnderCrystal", Vector3.new(1.6, 4.0, 1.6), cf * CFrame.new(0, -13.5, 0) * CFrame.Angles(0.2, 0.4, 0), Color3.fromRGB(56, 189, 248), Enum.Material.Neon, true, false)
end

local function spawnTree(parent, pos, kind, rng)
	if kind == "crystal" then
		local cols = { Color3.fromRGB(56, 189, 248), Color3.fromRGB(168, 85, 247), Color3.fromRGB(52, 211, 153) }
		local col = cols[rng:NextInteger(1, #cols)]
		local h = rng:NextNumber(5, 9)
		makePart(parent, "CrystalSpire", Vector3.new(1.8, h, 1.8), CFrame.new(pos + Vector3.new(0, h / 2, 0)) * CFrame.Angles(rng:NextNumber(-0.15, 0.15), rng:NextNumber(0, 3), 0), col, Enum.Material.Neon, true, false)
		return
	end
	local h = rng:NextNumber(5.2, 8.2)
	local trunk = makePart(parent, "Trunk", Vector3.new(1.1, h, 1.1), CFrame.new(pos + Vector3.new(0, h / 2, 0)) * CFrame.Angles(0, 0, math.pi / 2), Color3.fromRGB(115, 76, 46), Enum.Material.Wood)
	trunk.Shape = Enum.PartType.Cylinder
	local palette = kind == "sakura"
		and { Color3.fromRGB(249, 168, 212), Color3.fromRGB(244, 114, 182), Color3.fromRGB(251, 207, 232) }
		or { Color3.fromRGB(74, 165, 68), Color3.fromRGB(92, 184, 78), Color3.fromRGB(52, 152, 74) }
	for j = 1, 3 do
		local r = rng:NextNumber(3.2, 4.8)
		local off = Vector3.new(rng:NextNumber(-1.3, 1.3), h + rng:NextNumber(-0.4, 1.6), rng:NextNumber(-1.3, 1.3))
		local leaf = makePart(parent, "Leaves", Vector3.new(r, r * 0.85, r), pos + off, palette[j], Enum.Material.SmoothPlastic, true, false)
		leaf.Shape = Enum.PartType.Ball
	end
end

local function spawnCoin(folder, pos, plot)
	local coin = makePart(folder, "ZubrikCoin", Vector3.new(0.45, 1.8, 1.8), CFrame.new(pos), Color3.fromRGB(250, 204, 21), Enum.Material.Neon, true, false)
	coin.Shape = Enum.PartType.Cylinder
	TweenService:Create(coin, TweenInfo.new(2.2, Enum.EasingStyle.Linear, Enum.EasingDirection.InOut, -1), {
		Orientation = Vector3.new(0, 360, 0),
	}):Play()
	local taken = false
	coin.Touched:Connect(function(hit)
		if taken then return end
		local plr = Players:GetPlayerFromCharacter(hit.Parent)
		if plr ~= plot.owner then return end
		taken = true
		plot.coins = (plot.coins or 0) + 1
		coin.Transparency = 1
		coin:Destroy()
		stateEv:FireClient(plr, { coins = plot.coins })
	end)
end

local function spawnBounceMushroom(folder, pos)
	makePart(folder, "MushStem", Vector3.new(0.8, 1.3, 0.8), pos + Vector3.new(0, 0.65, 0), Color3.fromRGB(255, 250, 240), Enum.Material.SmoothPlastic)
	local cap = makePart(folder, "BounceCap", Vector3.new(3.2, 0.9, 3.2), pos + Vector3.new(0, 1.5, 0), Color3.fromRGB(244, 63, 94), Enum.Material.Neon)
	cap.Shape = Enum.PartType.Cylinder
	cap.CFrame = CFrame.new(pos + Vector3.new(0, 1.5, 0)) * CFrame.Angles(0, 0, math.pi / 2)
	local db = {}
	cap.Touched:Connect(function(hit)
		local char = hit.Parent
		local hrp = char and char:FindFirstChild("HumanoidRootPart")
		if not hrp or db[char] then return end
		db[char] = true
		hrp.AssemblyLinearVelocity = Vector3.new(hrp.AssemblyLinearVelocity.X, 62, hrp.AssemblyLinearVelocity.Z)
		task.delay(0.4, function() db[char] = nil end)
	end)
end

local function makeSign(parent, cf, title, color)
	makePart(parent, "SignPost", Vector3.new(0.35, 3.6, 0.35), cf * CFrame.new(0, 1.8, 0), Color3.fromRGB(115, 76, 46), Enum.Material.Wood)
	local board = makePart(parent, "SignBoard", Vector3.new(6.2, 2.1, 0.3), cf * CFrame.new(0, 3.8, 0), color or Color3.fromRGB(245, 232, 200), Enum.Material.Wood)
	local sg = Instance.new("SurfaceGui")
	sg.Face = Enum.NormalId.Front
	sg.SizingMode = Enum.SurfaceGuiSizingMode.PixelsPerStud
	sg.PixelsPerStud = 35
	sg.MaxDistance = 45
	sg.Parent = board
	local lbl = Instance.new("TextLabel")
	lbl.Size = UDim2.new(1, -10, 1, -6)
	lbl.Position = UDim2.fromOffset(5, 3)
	lbl.BackgroundTransparency = 1
	lbl.Text = title
	lbl.TextColor3 = Color3.fromRGB(45, 32, 20)
	lbl.TextScaled = true
	lbl.TextWrapped = true
	lbl.Font = Enum.Font.GothamBold
	lbl.Parent = sg
	return lbl
end

local function buildPlot(plot)
	local folder = Instance.new("Folder")
	folder.Name = "Plot_" .. tostring(plot.index)
	folder.Parent = Workspace
	plot.folder = folder

	local rng = Random.new(100 + plot.index)
	plot.campPos = at(plot, 0, 0, 0)
	plot.spawnPos = at(plot, -14, 8, 4.5)
	plot.checkpointPos = at(plot, 18, 0, 4.5)
	plot.workshopPos = at(plot, 0, -18, 1.5)
	plot.printerPos = at(plot, 6, -12, 1.6)

	-- Главная Мастерская кода на первом острове
	local wsCF = cfAt(plot, 0, -18, 1.5)
	makePart(folder, "WorkshopFloor", Vector3.new(15, 0.6, 13), wsCF, Color3.fromRGB(145, 98, 60), Enum.Material.WoodPlanks)
	for _, off in ipairs({ Vector3.new(-6.5, 4, -5.5), Vector3.new(6.5, 4, -5.5), Vector3.new(-6.5, 4, 5.5), Vector3.new(6.5, 4, 5.5) }) do
		makePart(folder, "Pillar", Vector3.new(0.7, 8, 0.7), wsCF * CFrame.new(off), Color3.fromRGB(110, 72, 44), Enum.Material.Wood)
	end
	makePart(folder, "WorkshopRoof", Vector3.new(16.5, 0.7, 14.5), wsCF * CFrame.new(0, 8.2, 0), Color3.fromRGB(180, 105, 58), Enum.Material.WoodPlanks)

	local screen = makePart(folder, "CodeScreen", Vector3.new(12.5, 7.0, 0.5), wsCF * CFrame.new(0, 4.4, 5.6), Color3.fromRGB(20, 24, 34))
	local screenGui = Instance.new("SurfaceGui")
	screenGui.Face = Enum.NormalId.Back
	screenGui.SizingMode = Enum.SurfaceGuiSizingMode.PixelsPerStud
	screenGui.PixelsPerStud = 40
	screenGui.MaxDistance = 60
	screenGui.Parent = screen
	local bg = Instance.new("Frame", screenGui)
	bg.Size = UDim2.fromScale(1, 1)
	bg.BackgroundColor3 = Color3.fromRGB(17, 24, 39)

	local header = Instance.new("TextLabel", bg)
	header.Size = UDim2.new(1, -20, 0, 38); header.Position = UDim2.fromOffset(10, 6); header.BackgroundTransparency = 1
	header.Text = "Мастерская кода Зубрик"; header.TextColor3 = Color3.fromRGB(132, 204, 22)
	header.TextXAlignment = Enum.TextXAlignment.Left; header.TextScaled = true; header.Font = Enum.Font.GothamBold

	local codeLbl = Instance.new("TextLabel", bg)
	codeLbl.Size = UDim2.new(1, -20, 0, 165); codeLbl.Position = UDim2.fromOffset(10, 48); codeLbl.BackgroundColor3 = Color3.fromRGB(30, 41, 59)
	codeLbl.Text = "/* Код появится после «Отправить в мир» */"; codeLbl.TextColor3 = Color3.fromRGB(226, 232, 240)
	codeLbl.TextXAlignment = Enum.TextXAlignment.Left; codeLbl.TextYAlignment = Enum.TextYAlignment.Top
	codeLbl.TextSize = 17; codeLbl.RichText = true; codeLbl.TextWrapped = true; codeLbl.Font = Enum.Font.Code

	local verdictLbl = Instance.new("TextLabel", bg)
	verdictLbl.Size = UDim2.new(1, -20, 0, 52); verdictLbl.Position = UDim2.fromOffset(10, 218); verdictLbl.BackgroundTransparency = 1
	verdictLbl.Text = "Ждём подключения…"; verdictLbl.TextColor3 = Color3.fromRGB(250, 204, 21)
	verdictLbl.TextXAlignment = Enum.TextXAlignment.Left; verdictLbl.TextWrapped = true; verdictLbl.TextScaled = true; verdictLbl.Font = Enum.Font.GothamMedium

	plot.screenHeader = header
	plot.screenCode = codeLbl
	plot.screenVerdict = verdictLbl

	-- Костёр и палатка в лагере
	local fireCF = cfAt(plot, -10, -4, 1.5)
	local log1 = makePart(folder, "FireLog", Vector3.new(2.4, 0.5, 0.5), fireCF * CFrame.Angles(0, 0.6, 0), Color3.fromRGB(82, 52, 34), Enum.Material.Wood)
	local fire = Instance.new("Fire", log1); fire.Size = 4; fire.Heat = 6
	local fl = Instance.new("PointLight", log1); fl.Color = Color3.fromRGB(255, 175, 90); fl.Range = 24; fl.Brightness = 1.6
	makePart(folder, "Tent", Vector3.new(5.5, 3.8, 6.5), cfAt(plot, -18, -6, 3.0), Color3.fromRGB(249, 115, 22), Enum.Material.Fabric)

	-- Строим 11 связанных парящих биомов-островов вдоль радиуса
	for idx, b in ipairs(BIOMES) do
		local baseFwd = (idx - 1) * 92
		local entryW = idx == 1 and 52 or 34
		local entryD = idx == 1 and 52 or 32
		local entryCF = cfAt(plot, baseFwd, 0, 0)
		local goalCF = cfAt(plot, baseFwd + 54, 0, idx == 2 and 4 or 0)

		buildFloatingIsland(folder, entryCF, entryW, entryD, b.top, b.rock)
		buildFloatingIsland(folder, goalCF, 26, 28, b.top, b.rock)

		-- Деревья/кристаллы, грибы-батуты и монеты
		for t = 1, 4 do
			local side = (t % 2 == 0) and 1 or -1
			local tp = at(plot, baseFwd + rng:NextNumber(-10, 10), side * rng:NextNumber(9, entryD * 0.42), 1.2)
			spawnTree(folder, tp, b.tree, rng)
		end
		spawnCoin(folder, at(plot, baseFwd + 12, rng:NextNumber(-5, 5), 3.6), plot)
		spawnCoin(folder, at(plot, baseFwd + 54, rng:NextNumber(-4, 4), 4.0), plot)
		if idx % 2 == 1 then
			spawnBounceMushroom(folder, at(plot, baseFwd + 6, 8, 1.2))
		end

		-- Эффект пропасти между стартом и финишем биома
		if b.gap == "lava" then
			makePart(folder, "LavaStream", Vector3.new(26, 1.5, 42), cfAt(plot, baseFwd + 28, 0, -10), Color3.fromRGB(249, 115, 22), Enum.Material.Neon, true, false)
		elseif b.gap == "water" then
			local wf = makePart(folder, "Waterfall", Vector3.new(10, 26, 4), cfAt(plot, baseFwd + 28, -16, -10), Color3.fromRGB(56, 189, 248), Enum.Material.Glass, true, false)
			wf.Transparency = 0.25
		elseif b.gap == "rainbow" then
			local rbCols = { Color3.fromRGB(239, 68, 68), Color3.fromRGB(249, 115, 22), Color3.fromRGB(250, 204, 21), Color3.fromRGB(34, 197, 94), Color3.fromRGB(59, 130, 246), Color3.fromRGB(168, 85, 247) }
			for rbi, col in ipairs(rbCols) do
				makePart(folder, "RainbowArc", Vector3.new(28, 0.5, 1.4), cfAt(plot, baseFwd + 58, (rbi - 3.5) * 1.6, 10), col, Enum.Material.Neon, true, false)
			end
		end

		-- Станок-принтер на каждом острове
		local prPos = at(plot, baseFwd + 10, -8, 1.5)
		local pBase = makePart(folder, "Printer_" .. b.id, Vector3.new(8, 0.6, 8), cfAt(plot, baseFwd + 10, -8, 1.5), Color3.fromRGB(51, 65, 85), Enum.Material.Metal)
		local ring = makePart(folder, "Ring", Vector3.new(7, 0.2, 7), cfAt(plot, baseFwd + 10, -8, 2.0), Color3.fromRGB(56, 189, 248), Enum.Material.Neon, true, false)
		local sparks = Instance.new("ParticleEmitter", pBase)
		sparks.Color = ColorSequence.new(Color3.fromRGB(56, 189, 248), Color3.fromRGB(250, 204, 21))
		sparks.Size = NumberSequence.new({ NumberSequenceKeypoint.new(0, 0.4), NumberSequenceKeypoint.new(1, 0) })
		sparks.Rate = 0; sparks.Speed = NumberRange.new(8, 16); sparks.Lifetime = NumberRange.new(0.5, 1.0)
		TweenService:Create(ring, TweenInfo.new(5, Enum.EasingStyle.Linear, Enum.EasingDirection.InOut, -1), { Orientation = Vector3.new(0, 360, 0) }):Play()

		-- Чекпоинт у края биома
		local cpPos = at(plot, baseFwd + 15, 0, 2.5)
		local cpPad = makePart(folder, "CP_" .. b.id, Vector3.new(3.5, 0.35, 3.5), cfAt(plot, baseFwd + 15, 0, 1.35), Color3.fromRGB(56, 189, 248), Enum.Material.Neon, true, false)
		cpPad.Touched:Connect(function(hit)
			local plr = Players:GetPlayerFromCharacter(hit.Parent)
			if plr == plot.owner then
				plot.currentSpawn = cpPos
				cpPad.Color = Color3.fromRGB(74, 222, 128)
			end
		end)

		-- Табличка названия острова (с MaxDistance = 45)
		makeSign(folder, cfAt(plot, baseFwd + 14, 7, 1.2, CFrame.Angles(0, math.pi, 0)), b.id .. " · " .. b.name)

		-- Флаг победы биома + телепорт-мостик на следующий остров
		local flagPos = at(plot, baseFwd + 54, 0, 1.5)
		makePart(folder, "FlagPole_" .. b.id, Vector3.new(0.4, 9, 0.4), cfAt(plot, baseFwd + 54, 0, 6), Color3.fromRGB(226, 232, 240), Enum.Material.Metal)
		local flagCloth = makePart(folder, "FlagCloth_" .. b.id, Vector3.new(0.2, 2.8, 4.4), cfAt(plot, baseFwd + 54, 2.2, 8.8), Config.ACCENTS.lime, Enum.Material.Fabric)
		local fw = Instance.new("ParticleEmitter", flagCloth)
		fw.Color = ColorSequence.new(Color3.fromRGB(250, 204, 21), Color3.fromRGB(244, 114, 182))
		fw.Size = NumberSequence.new({ NumberSequenceKeypoint.new(0, 0.5), NumberSequenceKeypoint.new(1, 0) })
		fw.Rate = 0; fw.Speed = NumberRange.new(14, 24); fw.Lifetime = NumberRange.new(1.0, 1.8)

		-- Стеклянный мостик к следующему биому (становится твёрдым после победы на текущем!)
		local nextBridge = nil
		if idx < #BIOMES then
			nextBridge = makePart(folder, "NextBridge_" .. b.id, Vector3.new(26, 0.8, 8), cfAt(plot, baseFwd + 74, 0, 0.5), Color3.fromRGB(167, 243, 208), Enum.Material.Neon, true, false)
			nextBridge.Transparency = 0.78
		end

		local winPad = makePart(folder, "WinPad_" .. b.id, Vector3.new(8, 6, 8), cfAt(plot, baseFwd + 54, 0, 3.5), Color3.new(1, 1, 1), Enum.Material.SmoothPlastic, true, false)
		winPad.Transparency = 1
		winPad.Touched:Connect(function(hit)
			local plr = Players:GetPlayerFromCharacter(hit.Parent)
			if plr ~= plot.owner then return end
			plot.currentSpawn = flagPos + Vector3.new(0, 3, 0)
			if not plot.wonLevels[b.id] then
				plot.wonLevels[b.id] = true
				fw:Emit(70)
				if nextBridge then
					nextBridge.Transparency = 0.15
					nextBridge.CanCollide = true
				end
				if plot.onWin then
					plot.onWin(b.id)
				end
			end
		end)

		plot.biomes[b.id] = {
			index = idx,
			name = b.name,
			entrySpawn = at(plot, baseFwd - 4, 0, 4.5),
			printerPos = prPos,
			sparks = sparks,
			flagCloth = flagCloth,
			fireworks = fw,
			nextBridge = nextBridge,
		}

		-- Порция паузы при постройке, чтобы Studio не подвисала
		task.wait()
	end

	-- Общая ловушка падения под всем архипелагом
	local catcher = makePart(folder, "FallCatcher", Vector3.new(1200, 4, 160), cfAt(plot, 480, 0, -18), Color3.new(1, 1, 1), Enum.Material.SmoothPlastic, true, false)
	catcher.Transparency = 1
	local fallDb = {}
	catcher.Touched:Connect(function(hit)
		local char = hit.Parent
		local plr = Players:GetPlayerFromCharacter(char)
		if not plr or plr ~= plot.owner or fallDb[plr] then return end
		fallDb[plr] = true
		local hrp = char:FindFirstChild("HumanoidRootPart")
		if hrp then
			hrp.AssemblyLinearVelocity = Vector3.zero
			hrp.CFrame = CFrame.new(plot.currentSpawn or plot.checkpointPos)
		end
		Mascot.Say(plot, plot.kapiLines.fell or "Ой! Похоже, в мосту слишком большие щели!")
		effectEv:FireClient(plr, "fall")
		if plot.onFall then plot.onFall() end
		task.delay(1.2, function() fallDb[plr] = nil end)
	end)

	Mascot.Create(plot)
end

setupLighting()
setupCloudSea()
Plots.Init(buildPlot)

local function teleportToPlot(player, character)
	local plot = Plots.Assign(player)
	if not plot then return end
	local hrp = character:WaitForChild("HumanoidRootPart", 5)
	if hrp then
		task.wait(0.1)
		hrp.CFrame = CFrame.new(plot.currentSpawn or plot.spawnPos)
	end
end

tpEv.OnServerEvent:Connect(function(player, levelId)
	local plot = Plots.Get(player)
	if not plot or not plot.biomes[levelId] then return end
	local b = plot.biomes[levelId]
	plot.currentSpawn = b.entrySpawn
	local char = player.Character
	local hrp = char and char:FindFirstChild("HumanoidRootPart")
	if hrp then
		hrp.AssemblyLinearVelocity = Vector3.zero
		hrp.CFrame = CFrame.new(b.entrySpawn)
	end
end)

Players.PlayerAdded:Connect(function(player)
	local plot = Plots.Assign(player)
	if player.Character then teleportToPlot(player, player.Character) end
	player.CharacterAdded:Connect(function(char) teleportToPlot(player, char) end)
	if plot then
		Mascot.Say(plot, "Привет! Введи 6 цифр из приложения Зубрик!")
	end
end)

Players.PlayerRemoving:Connect(function(player)
	Plots.Release(player)
end)
