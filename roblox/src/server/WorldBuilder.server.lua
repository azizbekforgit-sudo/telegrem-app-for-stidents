-- Небесный Архипелаг Зубрика: 11 тематических островов (строго по Уроку 8 CSS Grid),
-- живые препятствия (вращающиеся балки, лава, прыгучие грибы, кристаллы, портал, ворота),
-- зоны подсказки «Положи сюда», интерактивные механизмы для 8-4 / 8-6 / 8-7 / 8-8 и уютный лагерь.
local Players = game:GetService("Players")
local Lighting = game:GetService("Lighting")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local RunService = game:GetService("RunService")
local TweenService = game:GetService("TweenService")
local Workspace = game:GetService("Workspace")

local Config = require(ReplicatedStorage.Shared.Config)
local Plots = require(script.Parent.Plots)
local Mascot = require(script.Parent.Mascot)

local Terrain = Workspace.Terrain

-- Убираем стартовый Baseplate и одиночный SpawnLocation, чтобы архипелаг парил над облаками
for _, oldName in ipairs({ "Baseplate", "SpawnLocation" }) do
	local old = Workspace:FindFirstChild(oldName)
	if old then
		old:Destroy()
	end
end

local remotesFolder = ReplicatedStorage:FindFirstChild("Remotes") or Instance.new("Folder", ReplicatedStorage)
remotesFolder.Name = "Remotes"
local function getRemote(cls, name)
	local existing = remotesFolder:FindFirstChild(name)
	if existing then return existing end
	local r = Instance.new(cls, remotesFolder)
	r.Name = name
	return r
end

local pairFn = getRemote("RemoteFunction", Config.REMOTES.Pair)
local stateEv = getRemote("RemoteEvent", Config.REMOTES.State)
local effectEv = getRemote("RemoteEvent", Config.REMOTES.Effect)
local tpEv = getRemote("RemoteEvent", Config.REMOTES.Teleport)
local rotEv = getRemote("RemoteEvent", Config.REMOTES.Rotate)

local BIOMES = {
	{ id = "8-1", name = "Изумрудный Лагерь", mat = Enum.Material.Grass, gap = "water", tree = "pine", arch = "camp", goalUp = 0, hint = "Положи мост (3×2) через пропасть" },
	{ id = "8-2", name = "Золотые Руины", mat = Enum.Material.Sandstone, gap = "clouds", tree = "sakura", arch = "temple", goalUp = 5.5, hint = "Поставь лестницу вверх к Храму" },
	{ id = "8-3", name = "Огненный Каньон", mat = Enum.Material.Basalt, gap = "lava", tree = "pine", arch = "lava", goalUp = 0, hint = "Положи плот (4×1) на лаву" },
	{ id = "8-4", name = "Хрустальный Лес", mat = Enum.Material.Ice, gap = "crystal", tree = "crystal", arch = "gate", goalUp = 0, hint = "Принеси хрустальный ключ (2×3)" },
	{ id = "8-5", name = "Облачный Сад", mat = Enum.Material.LeafyGrass, gap = "clouds", tree = "sakura", arch = "garden", goalUp = 1.5, hint = "Положи 5 прыгучих облаков (5×1)" },
	{ id = "8-6", name = "Звёздная Станция", mat = Enum.Material.Slate, gap = "stars", tree = "crystal", arch = "station", goalUp = 0, hint = "Принеси семафор (1×3) к станции" },
	{ id = "8-7", name = "Грибная Поляна", mat = Enum.Material.Grass, gap = "clouds", tree = "sakura", arch = "cottage", goalUp = 0, hint = "Положи крышу у Дома Светлячков" },
	{ id = "8-8", name = "Портальная Площадь", mat = Enum.Material.CrackedLava, gap = "stars", tree = "crystal", arch = "portal", goalUp = 0, hint = "Заряди рунами (2×2) древний портал" },
	{ id = "8-9", name = "Заоблачный Замок", mat = Enum.Material.Cobblestone, gap = "clouds", tree = "pine", arch = "castle", goalUp = 0, hint = "Опусти замковый мост (4×2)" },
	{ id = "8-10", name = "Обсерватория", mat = Enum.Material.Snow, gap = "stars", tree = "crystal", arch = "observatory", goalUp = 0, hint = "Построй солнечные крылья (3×3)" },
	{ id = "8-11", name = "Остров Короны", mat = Enum.Material.Sand, gap = "rainbow", tree = "sakura", arch = "crown", goalUp = 1.5, hint = "Проложи радужную дорогу (6×1)" },
}

local function setupLighting()
	Lighting.ClockTime = 8.4
	Lighting.Brightness = 2.6
	Lighting.GlobalShadows = true
	Lighting.OutdoorAmbient = Color3.fromRGB(132, 130, 160)
	Lighting.Ambient = Color3.fromRGB(96, 94, 120)

	if not Lighting:FindFirstChildOfClass("Atmosphere") then
		local atm = Instance.new("Atmosphere", Lighting)
		atm.Density = 0.24; atm.Offset = 0.3
		atm.Color = Color3.fromRGB(255, 224, 196)
		atm.Decay = Color3.fromRGB(205, 175, 170)
		atm.Glare = 0.28; atm.Haze = 1.0
	end
	if not Lighting:FindFirstChildOfClass("BloomEffect") then
		local bloom = Instance.new("BloomEffect", Lighting)
		bloom.Intensity = 0.45; bloom.Size = 22; bloom.Threshold = 1.05
	end
	if not Lighting:FindFirstChildOfClass("ColorCorrectionEffect") then
		local cc = Instance.new("ColorCorrectionEffect", Lighting)
		cc.Saturation = 0.22; cc.Contrast = 0.1
	end
	if not Terrain:FindFirstChildOfClass("Clouds") then
		local clouds = Instance.new("Clouds", Terrain)
		clouds.Cover = 0.52; clouds.Density = 0.55; clouds.Color = Color3.fromRGB(255, 248, 240)
	end

	task.spawn(function()
		local t0 = os.clock()
		while true do
			Lighting.ClockTime = 8.2 + ((math.sin((os.clock() - t0) / 600 * math.pi * 2 - math.pi / 2) + 1) * 0.5) * 3.8
			task.wait(2)
		end
	end)
end

local function setupCloudSea()
	if Workspace:FindFirstChild("CloudSea") then return end
	local cloudFolder = Instance.new("Folder", Workspace); cloudFolder.Name = "CloudSea"
	local rng = Random.new(42)
	for i = 1, 60 do
		local c = Instance.new("Part", cloudFolder)
		c.Name = "Cloud_" .. tostring(i); c.Shape = Enum.PartType.Ball
		local r = rng:NextNumber(42, 95)
		c.Size = Vector3.new(r * 1.8, r * 0.45, r * 1.6)
		c.Position = Vector3.new(rng:NextNumber(-1600, 1600), rng:NextNumber(-26, -12), rng:NextNumber(-1600, 1600))
		c.Color = Color3.fromRGB(252, 253, 255); c.Material = Enum.Material.SmoothPlastic
		c.Transparency = 0.4; c.Anchored = true; c.CanCollide = false
	end
end

local function makePart(parent, name, size, cf, color, material, anchored, canCollide, className)
	local p = Instance.new(className or "Part", parent)
	p.Name = name; p.Size = size
	p.CFrame = typeof(cf) == "CFrame" and cf or CFrame.new(cf)
	p.Color = color; p.Material = material or Enum.Material.SmoothPlastic
	p.Anchored = anchored ~= false; p.CanCollide = canCollide ~= false
	p.TopSurface = Enum.SurfaceType.Smooth; p.BottomSurface = Enum.SurfaceType.Smooth
	return p
end

local function at(plot, fwd, right, up)
	local rVec = Vector3.new(-plot.dir.Z, 0, plot.dir.X)
	return plot.center + plot.dir * fwd + rVec * right + Vector3.new(0, up or 0, 0)
end

local function cfAt(plot, fwd, right, up, extraRot)
	return CFrame.new(at(plot, fwd, right, up)) * CFrame.Angles(0, -plot.angle, 0) * (extraRot or CFrame.new())
end

local function buildTerrainIsland(folder, cf, width, depth, topMat, rng)
	local pos = cf.Position
	Terrain:FillBlock(cf * CFrame.new(0, -2.5, 0), Vector3.new(width, 5, depth), Enum.Material.Rock)
	Terrain:FillBlock(cf * CFrame.new(0, -0.3, 0), Vector3.new(width - 2, 2.2, depth - 2), topMat)
	for k = 1, 3 do
		local off = Vector3.new(rng:NextNumber(-width * 0.25, width * 0.25), -0.6, rng:NextNumber(-depth * 0.28, depth * 0.28))
		Terrain:FillBall(pos + off, rng:NextNumber(4.5, 7.5), topMat)
	end
	for s = 1, 3 do
		local scale = 1 - s * 0.24
		makePart(folder, "CliffCone", Vector3.new(width * scale * 0.55, 5.5, depth * scale * 0.55), cf * CFrame.new(0, -4 - s * 3.5, 0) * CFrame.Angles(0, s * 0.5, 0), Color3.fromRGB(92, 86, 84), Enum.Material.Rock)
	end
	makePart(folder, "CrystalShard", Vector3.new(2.0, 5.0, 2.0), cf * CFrame.new(0, -16, 0) * CFrame.Angles(math.pi, 0.4, 0), Color3.fromRGB(56, 189, 248), Enum.Material.Neon, true, false, "WedgePart")
end

local function spawnTree(parent, pos, kind, rng)
	if kind == "crystal" then
		local cols = { Color3.fromRGB(56, 189, 248), Color3.fromRGB(168, 85, 247), Color3.fromRGB(52, 211, 153) }
		for s = 1, 3 do
			local h = rng:NextNumber(4, 9.5)
			local ang = CFrame.Angles(rng:NextNumber(-0.22, 0.22), s * 2.1, rng:NextNumber(-0.2, 0.2))
			makePart(parent, "CrystalSpire", Vector3.new(1.5, h, 1.5), CFrame.new(pos + Vector3.new(rng:NextNumber(-1, 1), h / 2, rng:NextNumber(-1, 1))) * ang, cols[s], Enum.Material.Neon, true, false, "WedgePart")
		end
		return
	end
	local h = rng:NextNumber(6, 9)
	local trunk = makePart(parent, "Trunk", Vector3.new(1.1, h, 1.1), CFrame.new(pos + Vector3.new(0, h / 2, 0)) * CFrame.Angles(0, 0, math.pi / 2), Color3.fromRGB(108, 70, 42), Enum.Material.Wood)
	trunk.Shape = Enum.PartType.Cylinder
	local palette = kind == "sakura"
		and { Color3.fromRGB(249, 168, 212), Color3.fromRGB(244, 114, 182), Color3.fromRGB(251, 207, 232) }
		or { Color3.fromRGB(64, 158, 62), Color3.fromRGB(84, 180, 74), Color3.fromRGB(48, 140, 68) }
	for j = 1, 4 do
		local r = rng:NextNumber(3.4, 5.2)
		local off = Vector3.new(rng:NextNumber(-1.8, 1.8), h + rng:NextNumber(-0.5, 1.8), rng:NextNumber(-1.8, 1.8))
		local leaf = makePart(parent, "Canopy", Vector3.new(r, r * 0.8, r), pos + off, palette[(j % #palette) + 1], Enum.Material.SmoothPlastic, true, false)
		leaf.Shape = Enum.PartType.Ball
		if j == 1 and kind == "sakura" then
			local petals = Instance.new("ParticleEmitter", leaf)
			petals.Color = ColorSequence.new(Color3.fromRGB(251, 207, 232))
			petals.Size = NumberSequence.new({ NumberSequenceKeypoint.new(0, 0.28), NumberSequenceKeypoint.new(1, 0.1) })
			petals.Rate = 4; petals.Speed = NumberRange.new(1, 2.5); petals.Lifetime = NumberRange.new(2, 3.5)
		end
	end
end

local function spawnFlowerCluster(parent, pos, rng)
	local cols = { Color3.fromRGB(244, 114, 182), Color3.fromRGB(250, 204, 21), Color3.fromRGB(56, 189, 248), Color3.fromRGB(192, 132, 252) }
	for i = 1, 3 do
		local off = Vector3.new(rng:NextNumber(-1.2, 1.2), 0.35, rng:NextNumber(-1.2, 1.2))
		local f = makePart(parent, "Flower", Vector3.new(0.55, 0.55, 0.55), pos + off, cols[(i % #cols) + 1], Enum.Material.Neon, true, false)
		f.Shape = Enum.PartType.Ball
	end
end

local function spawnLantern(parent, cf)
	makePart(parent, "LanternPost", Vector3.new(0.4, 4.2, 0.4), cf * CFrame.new(0, 2.1, 0), Color3.fromRGB(78, 52, 34), Enum.Material.Wood)
	makePart(parent, "LanternArm", Vector3.new(1.2, 0.25, 0.25), cf * CFrame.new(0.45, 4.1, 0), Color3.fromRGB(78, 52, 34), Enum.Material.Wood)
	local bulb = makePart(parent, "LanternBulb", Vector3.new(0.75, 0.9, 0.75), cf * CFrame.new(0.9, 3.6, 0), Color3.fromRGB(253, 224, 71), Enum.Material.Neon, true, false)
	local pl = Instance.new("PointLight", bulb); pl.Color = Color3.fromRGB(254, 240, 138); pl.Range = 14; pl.Brightness = 0.85
end

local function spawnCoin(folder, pos, plot)
	local coin = makePart(folder, "ZubrikCoin", Vector3.new(0.45, 2.0, 2.0), CFrame.new(pos), Color3.fromRGB(250, 204, 21), Enum.Material.Neon, true, false)
	coin.Shape = Enum.PartType.Cylinder
	local hl = Instance.new("Highlight", coin); hl.FillTransparency = 1; hl.OutlineColor = Color3.new(1, 1, 1); hl.OutlineTransparency = 0.15
	TweenService:Create(coin, TweenInfo.new(2.0, Enum.EasingStyle.Linear, Enum.EasingDirection.InOut, -1), { Orientation = Vector3.new(0, 360, 0) }):Play()
	local taken = false
	coin.Touched:Connect(function(hit)
		if taken then return end
		local plr = Players:GetPlayerFromCharacter(hit.Parent)
		if plr ~= plot.owner then return end
		taken = true; plot.coins = (plot.coins or 0) + 1; coin:Destroy()
		stateEv:FireClient(plr, { coins = plot.coins })
	end)
end

local function spawnBounceMushroom(folder, pos)
	makePart(folder, "MushStem", Vector3.new(0.9, 1.4, 0.9), pos + Vector3.new(0, 0.7, 0), Color3.fromRGB(255, 250, 240))
	local cap = makePart(folder, "BounceCap", Vector3.new(3.6, 0.95, 3.6), CFrame.new(pos + Vector3.new(0, 1.55, 0)) * CFrame.Angles(0, 0, math.pi / 2), Color3.fromRGB(244, 63, 94), Enum.Material.Neon)
	cap.Shape = Enum.PartType.Cylinder
	local db = {}
	cap.Touched:Connect(function(hit)
		local char = hit.Parent; local hrp = char and char:FindFirstChild("HumanoidRootPart")
		if not hrp or db[char] then return end
		db[char] = true; hrp.AssemblyLinearVelocity = Vector3.new(hrp.AssemblyLinearVelocity.X, 64, hrp.AssemblyLinearVelocity.Z)
		task.delay(0.4, function() db[char] = nil end)
	end)
end

-- Дружелюбное препятствие: вращающаяся неоновая балка или скользящий барьер (мягко подталкивает, не убивает)
local function spawnSweeper(folder, baseCF, length, color, speed)
	makePart(folder, "SweeperHub", Vector3.new(1.8, 1.4, 1.8), baseCF, Color3.fromRGB(51, 65, 85), Enum.Material.Metal)
	local bar = makePart(folder, "SweeperBar", Vector3.new(length, 0.9, 0.9), baseCF * CFrame.new(0, 1.0, 0), color, Enum.Material.Neon)
	local db = {}
	bar.Touched:Connect(function(hit)
		local char = hit.Parent; local hrp = char and char:FindFirstChild("HumanoidRootPart")
		if not hrp or db[char] then return end
		db[char] = true
		local push = (hrp.Position - bar.Position)
		push = Vector3.new(push.X, 0, push.Z)
		if push.Magnitude < 0.1 then push = Vector3.new(1, 0, 0) end
		hrp.AssemblyLinearVelocity = push.Unit * 32 + Vector3.new(0, 26, 0)
		task.delay(0.5, function() db[char] = nil end)
	end)
	local t0 = os.clock()
	local conn
	conn = RunService.Heartbeat:Connect(function()
		if not bar.Parent then conn:Disconnect(); return end
		bar.CFrame = baseCF * CFrame.new(0, 1.0, 0) * CFrame.Angles(0, (os.clock() - t0) * speed, 0)
	end)
end

local function spawnSliderObstacle(folder, baseCF, size, color, offsetAxis, dist, speed)
	local block = makePart(folder, "SliderBar", size, baseCF, color, Enum.Material.Neon)
	local t0 = os.clock()
	local conn
	conn = RunService.Heartbeat:Connect(function()
		if not block.Parent then conn:Disconnect(); return end
		local off = math.sin((os.clock() - t0) * speed) * dist
		block.CFrame = baseCF * CFrame.new(offsetAxis * off)
	end)
	return block
end

local function makeSign(parent, cf, title, color)
	makePart(parent, "SignPost", Vector3.new(0.35, 3.6, 0.35), cf * CFrame.new(0, 1.8, 0), Color3.fromRGB(115, 76, 46), Enum.Material.Wood)
	local board = makePart(parent, "SignBoard", Vector3.new(7.4, 2.4, 0.3), cf * CFrame.new(0, 3.8, 0), color or Color3.fromRGB(245, 232, 200), Enum.Material.Wood)
	local sg = Instance.new("SurfaceGui", board); sg.Face = Enum.NormalId.Front; sg.SizingMode = Enum.SurfaceGuiSizingMode.PixelsPerStud; sg.PixelsPerStud = 35; sg.MaxDistance = 45
	local lbl = Instance.new("TextLabel", sg); lbl.Size = UDim2.new(1, -10, 1, -6); lbl.Position = UDim2.fromOffset(5, 3); lbl.BackgroundTransparency = 1
	lbl.Text = title; lbl.TextColor3 = Color3.fromRGB(45, 32, 20); lbl.TextScaled = true; lbl.TextWrapped = true; lbl.Font = Enum.Font.GothamBold
	return lbl
end

local function makeTargetHint(folder, cf, labelText, color)
	local pad = makePart(folder, "TargetPad", Vector3.new(10, 0.25, 10), cf, color or Color3.fromRGB(56, 189, 248), Enum.Material.Neon, true, false)
	pad.Transparency = 0.55
	local bbg = Instance.new("BillboardGui", pad)
	bbg.Size = UDim2.fromOffset(180, 44); bbg.StudsOffset = Vector3.new(0, 2.6, 0); bbg.MaxDistance = 46
	local tl = Instance.new("TextLabel", bbg); tl.Size = UDim2.fromScale(1, 1); tl.BackgroundColor3 = Color3.fromRGB(17, 24, 39)
	tl.BackgroundTransparency = 0.2; tl.TextColor3 = Color3.new(1, 1, 1); tl.Text = labelText
	tl.TextScaled = true; tl.Font = Enum.Font.GothamBold
	Instance.new("UICorner", tl).CornerRadius = UDim.new(0, 8)
	return pad
end

-- Архитектурные украшения и интерактивные мини-задачи для биомов
local function buildBiomeSpecials(folder, plot, b, baseFwd, entryCF, goalCF)
	local arch = b.arch
	if arch == "temple" then
		for _, sx in ipairs({ -7.5, 7.5 }) do
			for _, sz in ipairs({ -7.5, 7.5 }) do
				makePart(folder, "TempleCol", Vector3.new(1.6, 9, 1.6), goalCF * CFrame.new(sx, 5.5, sz), Color3.fromRGB(245, 232, 200), Enum.Material.Marble)
			end
		end
		makePart(folder, "TempleRoofL", Vector3.new(18, 4, 9.5), goalCF * CFrame.new(0, 12, -4.75), Color3.fromRGB(234, 179, 8), Enum.Material.Marble, true, true, "WedgePart")
		makePart(folder, "TempleRoofR", Vector3.new(18, 4, 9.5), goalCF * CFrame.new(0, 12, 4.75) * CFrame.Angles(0, math.pi, 0), Color3.fromRGB(234, 179, 8), Enum.Material.Marble, true, true, "WedgePart")
		-- Подвижная золотая преграда на входе
		spawnSliderObstacle(folder, cfAt(plot, baseFwd + 8, 0, 2.2), Vector3.new(1.6, 2.2, 8), Color3.fromRGB(250, 204, 21), Vector3.new(0, 0, 1), 6, 1.6)
	elseif arch == "lava" then
		-- Каменные кочки в лаве и скользящий огненный кристалл
		for k = 1, 2 do
			local rock = makePart(folder, "LavaRock" .. k, Vector3.new(4, 1.5, 4), cfAt(plot, baseFwd + 22 + k * 7, (k == 1 and -6 or 6), 0.2), Color3.fromRGB(68, 64, 60), Enum.Material.Basalt)
			TweenService:Create(rock, TweenInfo.new(2.2, Enum.EasingStyle.Sine, Enum.EasingDirection.InOut, -1, true), { Position = rock.Position + Vector3.new(0, 1.4, 0) }):Play()
		end
	elseif arch == "gate" then
		-- Хрустальные Ворота на 8-4: открываются, когда приносишь хрустальный ключ (или переходишь мост)
		local gateL = makePart(folder, "GateColL", Vector3.new(2, 10, 2), cfAt(plot, baseFwd + 39, -6, 6), Color3.fromRGB(56, 189, 248), Enum.Material.Glass)
		local gateR = makePart(folder, "GateColR", Vector3.new(2, 10, 2), cfAt(plot, baseFwd + 39, 6, 6), Color3.fromRGB(56, 189, 248), Enum.Material.Glass)
		local barrier = makePart(folder, "CrystalBarrier", Vector3.new(1, 8, 10), cfAt(plot, baseFwd + 39, 0, 5.5), Color3.fromRGB(125, 211, 252), Enum.Material.Neon)
		barrier.Transparency = 0.45
		local socket = makeTargetHint(folder, cfAt(plot, baseFwd + 16, 4, 1.35), "💎 Положи ключ (2×3) здесь", Color3.fromRGB(56, 189, 248))
		local opened = false
		task.spawn(function()
			while barrier.Parent and not opened do
				if plot.bridgeModel and plot.bridgeModel.PrimaryPart and plot.bridgeLevelId == "8-4" then
					if (plot.bridgeModel.PrimaryPart.Position - socket.Position).Magnitude < 16 then
						opened = true
						barrier.CanCollide = false; barrier.Transparency = 0.92
						gateL.Color = Color3.fromRGB(74, 222, 128); gateR.Color = Color3.fromRGB(74, 222, 128)
						Mascot.Say(plot, "Хрустальные ворота открыты! Беги к флагу! 💎")
					end
				end
				task.wait(0.4)
			end
		end)
	elseif arch == "garden" then
		spawnSweeper(folder, cfAt(plot, baseFwd + 6, 0, 1.2), 13, Color3.fromRGB(244, 114, 182), 1.4)
	elseif arch == "station" then
		-- 8-6 Семафор: принеси семафор к Звёздной станции — включится световой мост!
		local dock = makeTargetHint(folder, cfAt(plot, baseFwd + 15, 0, 1.35), "🚦 Поставь семафор сюда", Color3.fromRGB(250, 204, 21))
		local starBridge = makePart(folder, "StarLightBridge", Vector3.new(26, 0.8, 7), cfAt(plot, baseFwd + 28, 0, 0.6), Color3.fromRGB(74, 222, 128), Enum.Material.Neon, true, false)
		starBridge.Transparency = 0.82
		local lit = false
		task.spawn(function()
			while starBridge.Parent and not lit do
				if plot.bridgeModel and plot.bridgeModel.PrimaryPart and plot.bridgeLevelId == "8-6" then
					if (plot.bridgeModel.PrimaryPart.Position - dock.Position).Magnitude < 16 then
						lit = true
						starBridge.Transparency = 0.15; starBridge.CanCollide = true
						dock.Color = Color3.fromRGB(74, 222, 128)
						Mascot.Say(plot, "Семафор горит зелёным! Световой мост открыт! 🚦")
					end
				end
				task.wait(0.4)
			end
		end)
	elseif arch == "cottage" then
		-- 8-7 Дом Светлячков без крыши: принеси свою крышу (.roof)!
		local cotCF = cfAt(plot, baseFwd + 12, 8, 1.2)
		makePart(folder, "CottageBase", Vector3.new(8, 5, 8), cotCF * CFrame.new(0, 2.5, 0), Color3.fromRGB(253, 230, 138), Enum.Material.WoodPlanks)
		makePart(folder, "CottageDoor", Vector3.new(0.4, 3.2, 2.2), cotCF * CFrame.new(-4.05, 1.6, 0), Color3.fromRGB(120, 53, 15), Enum.Material.Wood)
		local dock = makeTargetHint(folder, cotCF * CFrame.new(-6, 0.2, 0), "🏠 Положи крышу у домика", Color3.fromRGB(251, 146, 60))
		local gladeBridge = makePart(folder, "GladeBridge", Vector3.new(26, 0.8, 7), cfAt(plot, baseFwd + 28, 0, 0.6), Color3.fromRGB(251, 146, 60), Enum.Material.Neon, true, false)
		gladeBridge.Transparency = 0.82
		local covered = false
		task.spawn(function()
			while gladeBridge.Parent and not covered do
				if plot.bridgeModel and plot.bridgeModel.PrimaryPart and plot.bridgeLevelId == "8-7" then
					if (plot.bridgeModel.PrimaryPart.Position - dock.Position).Magnitude < 16 then
						covered = true
						gladeBridge.Transparency = 0.15; gladeBridge.CanCollide = true
						dock.Color = Color3.fromRGB(74, 222, 128)
						Mascot.Say(plot, "Уютная крыша готова! Путь через поляну открыт! 🏠")
					end
				end
				task.wait(0.4)
			end
		end)
	elseif arch == "portal" then
		-- 8-8 Кольцо Древнего Портала
		local ring = makePart(folder, "PortalArch", Vector3.new(1.5, 11, 11), cfAt(plot, baseFwd + 42, 0, 6.5), Color3.fromRGB(168, 85, 247), Enum.Material.Neon, true, false)
		ring.Shape = Enum.PartType.Cylinder; ring.Transparency = 0.35
		local dock = makeTargetHint(folder, cfAt(plot, baseFwd + 15, 0, 1.35), "🔮 Положи руны (2×2) сюда", Color3.fromRGB(168, 85, 247))
		local pBridge = makePart(folder, "PortalBridge", Vector3.new(26, 0.8, 7), cfAt(plot, baseFwd + 28, 0, 0.6), Color3.fromRGB(192, 132, 252), Enum.Material.Neon, true, false)
		pBridge.Transparency = 0.82
		local charged = false
		task.spawn(function()
			while pBridge.Parent and not charged do
				if plot.bridgeModel and plot.bridgeModel.PrimaryPart and plot.bridgeLevelId == "8-8" then
					if (plot.bridgeModel.PrimaryPart.Position - dock.Position).Magnitude < 16 then
						charged = true
						pBridge.Transparency = 0.15; pBridge.CanCollide = true
						Mascot.Say(plot, "Портал заряжен! Прыгай вперёд! 🔮")
					end
				end
				task.wait(0.4)
			end
		end)
	elseif arch == "castle" then
		for _, sx in ipairs({ -8.5, 8.5 }) do
			for _, sz in ipairs({ -8.5, 8.5 }) do
				makePart(folder, "Tower", Vector3.new(4.2, 12.5, 4.2), goalCF * CFrame.new(sx, 7.2, sz), Color3.fromRGB(148, 163, 184), Enum.Material.Cobblestone)
				makePart(folder, "TowerTop", Vector3.new(5.0, 3.8, 5.0), goalCF * CFrame.new(sx, 15.2, sz), Color3.fromRGB(79, 70, 229), Enum.Material.SmoothPlastic, true, false, "WedgePart")
			end
		end
		spawnSliderObstacle(folder, cfAt(plot, baseFwd + 4, 0, 2.2), Vector3.new(1.5, 2.5, 9), Color3.fromRGB(239, 68, 68), Vector3.new(0, 0, 1), 7, 1.8)
	elseif arch == "observatory" then
		local dome = makePart(folder, "ObsDome", Vector3.new(11, 7, 11), goalCF * CFrame.new(6, 4.5, -6), Color3.fromRGB(226, 232, 240), Enum.Material.Marble)
		dome.Shape = Enum.PartType.Ball
		makePart(folder, "Telescope", Vector3.new(1.4, 1.4, 7), goalCF * CFrame.new(6, 7.2, -6) * CFrame.Angles(0.45, 0.6, 0), Color3.fromRGB(56, 189, 248), Enum.Material.Metal)
		spawnSweeper(folder, cfAt(plot, baseFwd + 4, 0, 1.2), 14, Color3.fromRGB(56, 189, 248), 1.6)
	elseif arch == "crown" then
		makePart(folder, "CrownBase", Vector3.new(7, 1.8, 7), goalCF * CFrame.new(0, 2.0, 0), Color3.fromRGB(250, 204, 21), Enum.Material.Metal)
		for i = 1, 6 do
			local a = (i / 6) * math.pi * 2
			makePart(folder, "CrownSpike", Vector3.new(0.9, 3.2, 0.9), goalCF * CFrame.new(math.cos(a) * 2.5, 4.2, math.sin(a) * 2.5), Color3.fromRGB(253, 224, 71), Enum.Material.Neon, true, false, "WedgePart")
		end
		spawnSweeper(folder, cfAt(plot, baseFwd + 4, 0, 1.2), 14, Color3.fromRGB(250, 204, 21), 1.7)
	end
end

local function buildPlot(plot)
	local folder = Instance.new("Folder", Workspace); folder.Name = "Plot_" .. tostring(plot.index); plot.folder = folder
	local rng = Random.new(100 + plot.index)
	plot.campPos = at(plot, 0, 0, 0); plot.spawnPos = at(plot, -14, 8, 4.5); plot.checkpointPos = at(plot, 18, 0, 4.5)
	plot.workshopPos = at(plot, 0, -18, 1.5); plot.printerPos = at(plot, 6, -12, 1.6)

	-- Мастерская кода с двускатной крышей из WedgePart
	local wsCF = cfAt(plot, 0, -18, 1.5)
	makePart(folder, "WorkshopFloor", Vector3.new(16, 0.6, 14), wsCF, Color3.fromRGB(145, 98, 60), Enum.Material.WoodPlanks)
	for _, off in ipairs({ Vector3.new(-7, 4, -6), Vector3.new(7, 4, -6), Vector3.new(-7, 4, 6), Vector3.new(7, 4, 6) }) do
		makePart(folder, "Pillar", Vector3.new(0.75, 8, 0.75), wsCF * CFrame.new(off), Color3.fromRGB(102, 66, 40), Enum.Material.Wood)
	end
	makePart(folder, "RoofL", Vector3.new(17.5, 3.2, 7.6), wsCF * CFrame.new(0, 9.6, -3.8) * CFrame.Angles(0, math.pi, 0), Color3.fromRGB(180, 96, 52), Enum.Material.WoodPlanks, true, true, "WedgePart")
	makePart(folder, "RoofR", Vector3.new(17.5, 3.2, 7.6), wsCF * CFrame.new(0, 9.6, 3.8), Color3.fromRGB(180, 96, 52), Enum.Material.WoodPlanks, true, true, "WedgePart")

	local screen = makePart(folder, "CodeScreen", Vector3.new(12.5, 7.0, 0.5), wsCF * CFrame.new(0, 4.4, 5.6), Color3.fromRGB(20, 24, 34))
	local screenGui = Instance.new("SurfaceGui", screen); screenGui.Face = Enum.NormalId.Back; screenGui.SizingMode = Enum.SurfaceGuiSizingMode.PixelsPerStud; screenGui.PixelsPerStud = 40; screenGui.MaxDistance = 60
	local bg = Instance.new("Frame", screenGui); bg.Size = UDim2.fromScale(1, 1); bg.BackgroundColor3 = Color3.fromRGB(17, 24, 39)
	local header = Instance.new("TextLabel", bg); header.Size = UDim2.new(1, -20, 0, 38); header.Position = UDim2.fromOffset(10, 6); header.BackgroundTransparency = 1
	header.Text = "Мастерская кода Зубрик"; header.TextColor3 = Color3.fromRGB(132, 204, 22); header.TextXAlignment = Enum.TextXAlignment.Left; header.TextScaled = true; header.Font = Enum.Font.GothamBold
	local codeLbl = Instance.new("TextLabel", bg); codeLbl.Size = UDim2.new(1, -20, 0, 165); codeLbl.Position = UDim2.fromOffset(10, 48); codeLbl.BackgroundColor3 = Color3.fromRGB(30, 41, 59)
	codeLbl.Text = "/* Код появится после «Отправить в мир» */"; codeLbl.TextColor3 = Color3.fromRGB(226, 232, 240); codeLbl.TextXAlignment = Enum.TextXAlignment.Left; codeLbl.TextYAlignment = Enum.TextYAlignment.Top
	codeLbl.TextSize = 17; codeLbl.RichText = true; codeLbl.TextWrapped = true; codeLbl.Font = Enum.Font.Code
	local verdictLbl = Instance.new("TextLabel", bg); verdictLbl.Size = UDim2.new(1, -20, 0, 52); verdictLbl.Position = UDim2.fromOffset(10, 218); verdictLbl.BackgroundTransparency = 1
	verdictLbl.Text = "Ждём подключения…"; verdictLbl.TextColor3 = Color3.fromRGB(250, 204, 21); verdictLbl.TextXAlignment = Enum.TextXAlignment.Left; verdictLbl.TextWrapped = true; verdictLbl.TextScaled = true; verdictLbl.Font = Enum.Font.GothamMedium
	plot.screenHeader = header; plot.screenCode = codeLbl; plot.screenVerdict = verdictLbl

	-- Костёр, брёвна для посиделок и палатка
	local fireCF = cfAt(plot, -10, -4, 1.5)
	local log1 = makePart(folder, "FireLog", Vector3.new(2.4, 0.5, 0.5), fireCF * CFrame.Angles(0, 0.6, 0), Color3.fromRGB(82, 52, 34), Enum.Material.Wood)
	local fire = Instance.new("Fire", log1); fire.Size = 4; fire.Heat = 6
	local fl = Instance.new("PointLight", log1); fl.Color = Color3.fromRGB(255, 175, 90); fl.Range = 24; fl.Brightness = 1.6
	makePart(folder, "BenchLog", Vector3.new(4.2, 0.8, 0.9), cfAt(plot, -10, 1.5, 1.5), Color3.fromRGB(115, 76, 46), Enum.Material.Wood)
	makePart(folder, "TentL", Vector3.new(6, 3.6, 3.4), cfAt(plot, -18, -7.7, 2.8), Color3.fromRGB(249, 115, 22), Enum.Material.Fabric, true, true, "WedgePart")
	makePart(folder, "TentR", Vector3.new(6, 3.6, 3.4), cfAt(plot, -18, -4.3, 2.8, CFrame.Angles(0, math.pi, 0)), Color3.fromRGB(234, 88, 12), Enum.Material.Fabric, true, true, "WedgePart")

	for idx, b in ipairs(BIOMES) do
		local baseFwd = (idx - 1) * 92
		local entryW = idx == 1 and 52 or 34; local entryD = idx == 1 and 52 or 32
		local entryCF = cfAt(plot, baseFwd, 0, 0)
		local goalCF = cfAt(plot, baseFwd + 54, 0, b.goalUp or 0)

		buildTerrainIsland(folder, entryCF, entryW, entryD, b.mat, rng)
		buildTerrainIsland(folder, goalCF, 28, 28, b.mat, rng)
		buildBiomeSpecials(folder, plot, b, baseFwd, entryCF, goalCF)
		spawnLantern(folder, cfAt(plot, baseFwd + 12, -5, 1.2))
		spawnFlowerCluster(folder, at(plot, baseFwd + 6, 7, 1.0), rng)

		-- Подсказка прямо у пропасти для уровней-мостов
		if idx == 1 or idx == 2 or idx == 3 or idx == 5 or idx == 9 or idx == 10 or idx == 11 then
			makeTargetHint(folder, cfAt(plot, baseFwd + 28, 0, 0.2), b.hint, Color3.fromRGB(132, 204, 22))
		end

		for t = 1, 4 do
			local side = (t % 2 == 0) and 1 or -1
			spawnTree(folder, at(plot, baseFwd + rng:NextNumber(-10, 10), side * rng:NextNumber(9, entryD * 0.42), 1.2), b.tree, rng)
		end
		spawnCoin(folder, at(plot, baseFwd + 5, rng:NextNumber(-4, 4), 3.6), plot)
		spawnCoin(folder, at(plot, baseFwd + 14, rng:NextNumber(-5, 5), 3.8), plot)
		spawnCoin(folder, at(plot, baseFwd + 54, rng:NextNumber(-4, 4), 4.0 + (b.goalUp or 0)), plot)
		if idx % 2 == 1 then spawnBounceMushroom(folder, at(plot, baseFwd + 6, 8, 1.2)) end

		if b.gap == "lava" then
			Terrain:FillBlock(cfAt(plot, baseFwd + 28, 0, -10), Vector3.new(26, 2, 42), Enum.Material.CrackedLava)
		elseif b.gap == "water" then
			Terrain:FillBlock(cfAt(plot, baseFwd + 28, -16, -10), Vector3.new(10, 26, 4), Enum.Material.Water)
		elseif b.gap == "rainbow" then
			local rbCols = { Color3.fromRGB(239, 68, 68), Color3.fromRGB(249, 115, 22), Color3.fromRGB(250, 204, 21), Color3.fromRGB(34, 197, 94), Color3.fromRGB(59, 130, 246), Color3.fromRGB(168, 85, 247) }
			for rbi, col in ipairs(rbCols) do
				makePart(folder, "RainbowArc", Vector3.new(28, 0.5, 1.4), cfAt(plot, baseFwd + 58, (rbi - 3.5) * 1.6, 12), col, Enum.Material.Neon, true, false)
			end
		end

		local prPos = at(plot, baseFwd + 10, -8, 1.5)
		makePart(folder, "Printer_" .. b.id, Vector3.new(8.5, 0.6, 8.5), cfAt(plot, baseFwd + 10, -8, 1.5), Color3.fromRGB(51, 65, 85), Enum.Material.Metal)
		local ring = makePart(folder, "Ring", Vector3.new(7.4, 0.22, 7.4), cfAt(plot, baseFwd + 10, -8, 2.0), Color3.fromRGB(56, 189, 248), Enum.Material.Neon, true, false)
		local pBase = ring
		local sparks = Instance.new("ParticleEmitter", pBase)
		sparks.Color = ColorSequence.new(Color3.fromRGB(56, 189, 248), Color3.fromRGB(250, 204, 21))
		sparks.Size = NumberSequence.new({ NumberSequenceKeypoint.new(0, 0.4), NumberSequenceKeypoint.new(1, 0) })
		sparks.Rate = 0; sparks.Speed = NumberRange.new(8, 16); sparks.Lifetime = NumberRange.new(0.5, 1.0)
		TweenService:Create(ring, TweenInfo.new(5, Enum.EasingStyle.Linear, Enum.EasingDirection.InOut, -1), { Orientation = Vector3.new(0, 360, 0) }):Play()

		local cpPos = at(plot, baseFwd + 15, 0, 2.5)
		local cpPad = makePart(folder, "CP_" .. b.id, Vector3.new(3.5, 0.35, 3.5), cfAt(plot, baseFwd + 15, 0, 1.35), Color3.fromRGB(56, 189, 248), Enum.Material.Neon, true, false)
		cpPad.Touched:Connect(function(hit)
			local plr = Players:GetPlayerFromCharacter(hit.Parent)
			if plr == plot.owner then plot.currentSpawn = cpPos; cpPad.Color = Color3.fromRGB(74, 222, 128) end
		end)

		makeSign(folder, cfAt(plot, baseFwd + 14, 7, 1.2, CFrame.Angles(0, math.pi, 0)), b.id .. " · " .. b.name .. "\n" .. b.hint)

		local flagPos = at(plot, baseFwd + 54, 0, 1.5 + (b.goalUp or 0))
		makePart(folder, "FlagPole_" .. b.id, Vector3.new(0.4, 9, 0.4), cfAt(plot, baseFwd + 54, 0, 6 + (b.goalUp or 0)), Color3.fromRGB(226, 232, 240), Enum.Material.Metal)
		local flagCloth = makePart(folder, "FlagCloth_" .. b.id, Vector3.new(0.2, 2.8, 4.4), cfAt(plot, baseFwd + 54, 2.2, 8.8 + (b.goalUp or 0)), Config.ACCENTS.lime, Enum.Material.Fabric)
		local fw = Instance.new("ParticleEmitter", flagCloth)
		fw.Color = ColorSequence.new(Color3.fromRGB(250, 204, 21), Color3.fromRGB(244, 114, 182))
		fw.Size = NumberSequence.new({ NumberSequenceKeypoint.new(0, 0.5), NumberSequenceKeypoint.new(1, 0) }); fw.Rate = 0; fw.Speed = NumberRange.new(14, 24); fw.Lifetime = NumberRange.new(1.0, 1.8)

		local nextBridge = nil
		if idx < #BIOMES then
			nextBridge = makePart(folder, "NextBridge_" .. b.id, Vector3.new(26, 0.8, 8), cfAt(plot, baseFwd + 74, 0, 0.5 + (b.goalUp or 0) * 0.5), Color3.fromRGB(167, 243, 208), Enum.Material.Neon, true, false)
			nextBridge.Transparency = 0.78
		end

		local winPad = makePart(folder, "WinPad_" .. b.id, Vector3.new(9, 7, 9), cfAt(plot, baseFwd + 54, 0, 3.5 + (b.goalUp or 0)), Color3.new(1, 1, 1), Enum.Material.SmoothPlastic, true, false)
		winPad.Transparency = 1
		winPad.Touched:Connect(function(hit)
			local plr = Players:GetPlayerFromCharacter(hit.Parent)
			if plr ~= plot.owner then return end
			plot.currentSpawn = flagPos + Vector3.new(0, 3, 0)
			if not plot.wonLevels[b.id] then
				plot.wonLevels[b.id] = true; fw:Emit(75)
				if nextBridge then nextBridge.Transparency = 0.15; nextBridge.CanCollide = true end
				if plot.onWin then plot.onWin(b.id) end
			end
		end)

		plot.biomes[b.id] = { index = idx, name = b.name, entrySpawn = at(plot, baseFwd - 4, 0, 4.5), printerPos = prPos, sparks = sparks, flagCloth = flagCloth, fireworks = fw, nextBridge = nextBridge }
		task.wait()
	end

	local catcher = makePart(folder, "FallCatcher", Vector3.new(1200, 4, 180), cfAt(plot, 480, 0, -18), Color3.new(1, 1, 1), Enum.Material.SmoothPlastic, true, false)
	catcher.Transparency = 1
	local fallDb = {}
	catcher.Touched:Connect(function(hit)
		local char = hit.Parent; local plr = Players:GetPlayerFromCharacter(char)
		if not plr or plr ~= plot.owner or fallDb[plr] then return end
		fallDb[plr] = true
		local hrp = char:FindFirstChild("HumanoidRootPart")
		if hrp then hrp.AssemblyLinearVelocity = Vector3.zero; hrp.CFrame = CFrame.new(plot.currentSpawn or plot.checkpointPos) end
		Mascot.Say(plot, plot.kapiLines.fell or "Ой! Попробуй поправить CSS или аккуратнее положить предмет!")
		effectEv:FireClient(plr, "fall")
		if plot.onFall then plot.onFall() end
		task.delay(1.2, function() fallDb[plr] = nil end)
	end)

	Mascot.Create(plot)
end

setupLighting(); setupCloudSea(); Plots.Init(buildPlot)

local function teleportToPlot(player, character)
	local plot = Plots.Assign(player)
	if not plot then return end
	local hrp = character:WaitForChild("HumanoidRootPart", 5)
	if hrp then task.wait(0.1); hrp.CFrame = CFrame.new(plot.currentSpawn or plot.spawnPos) end
end

tpEv.OnServerEvent:Connect(function(player, levelId)
	local plot = Plots.Get(player)
	if not plot or not plot.biomes[levelId] then return end
	local b = plot.biomes[levelId]; plot.currentSpawn = b.entrySpawn
	local hrp = player.Character and player.Character:FindFirstChild("HumanoidRootPart")
	if hrp then hrp.AssemblyLinearVelocity = Vector3.zero; hrp.CFrame = CFrame.new(b.entrySpawn) end
end)

rotEv.OnServerEvent:Connect(function(player)
	local plot = Plots.Get(player)
	if plot and plot.rotateCreation then
		plot.rotateCreation()
	end
end)

Players.PlayerAdded:Connect(function(player)
	local plot = Plots.Assign(player)
	if player.Character then teleportToPlot(player, player.Character) end
	player.CharacterAdded:Connect(function(char) teleportToPlot(player, char) end)
	if plot then Mascot.Say(plot, "Привет! Введи 6-значный код из приложения или бота Зубрик!") end
end)
Players.PlayerRemoving:Connect(function(player) Plots.Release(player) end)
