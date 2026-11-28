-- Небесный архипелаг Зубрика: 11 уровней Урока 8 (CSS Grid) цепочкой островов для каждого ученика.
-- На каждом уровне: остров-старт с 3D-принтером и экраном кода → пропасть 20 studs (не перепрыгнуть) →
-- остров-финиш с флагом → закрытые ворота к следующему уровню (открываются после победы).
-- span-уровни: предмет из CSS кладётся через пропасть; socket-уровни: предмет ставится в механизм,
-- и тот включает световой мост.
local Players = game:GetService("Players")
local Lighting = game:GetService("Lighting")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local RunService = game:GetService("RunService")
local TweenService = game:GetService("TweenService")
local Workspace = game:GetService("Workspace")

local Config = require(ReplicatedStorage.Shared.Config)
local Plots = require(script.Parent.Plots)
local Mascot = require(script.Parent.Mascot)
local Bridge = require(script.Parent.Bridge)

local Terrain = Workspace.Terrain
local UP = Vector3.new(0, 1, 0)
local STEP = Config.LEVEL_STEP
local GAP = Config.GAP

-- персонажа выпускаем только когда его остров построен (иначе он падает в пустоту)
Players.CharacterAutoLoads = false

for _, oldName in ipairs({ "Baseplate", "SpawnLocation" }) do
	local old = Workspace:FindFirstChild(oldName)
	if old then old:Destroy() end
end

local remotesFolder = ReplicatedStorage:FindFirstChild("Remotes") or Instance.new("Folder")
remotesFolder.Name = "Remotes"
remotesFolder.Parent = ReplicatedStorage
local function getRemote(cls, name)
	local existing = remotesFolder:FindFirstChild(name)
	if existing then return existing end
	local r = Instance.new(cls)
	r.Name = name
	r.Parent = remotesFolder
	return r
end
getRemote("RemoteFunction", Config.REMOTES.Pair)
local stateEv = getRemote("RemoteEvent", Config.REMOTES.State)
local effectEv = getRemote("RemoteEvent", Config.REMOTES.Effect)
local tpEv = getRemote("RemoteEvent", Config.REMOTES.Teleport)
local dropEv = getRemote("RemoteEvent", Config.REMOTES.Drop)

-- Темы островов (порядок = Config.LEVELS)
local THEMES = {
	["8-1"] = { top = Enum.Material.LeafyGrass, rock = Enum.Material.Rock, tree = "pine", accent = Color3.fromRGB(132, 204, 22), gap = "waterfall", arch = "camp" },
	["8-2"] = { top = Enum.Material.Sandstone, rock = Enum.Material.Sandstone, tree = "palm", accent = Color3.fromRGB(250, 204, 21), gap = "clouds", arch = "temple" },
	["8-3"] = { top = Enum.Material.Basalt, rock = Enum.Material.Basalt, tree = "dead", accent = Color3.fromRGB(249, 115, 22), gap = "lava", arch = "volcano" },
	["8-4"] = { top = Enum.Material.Glacier, rock = Enum.Material.Rock, tree = "crystal", accent = Color3.fromRGB(56, 189, 248), gap = "crystal", arch = "gate" },
	["8-5"] = { top = Enum.Material.LeafyGrass, rock = Enum.Material.Rock, tree = "sakura", accent = Color3.fromRGB(244, 114, 182), gap = "clouds", arch = "garden" },
	["8-6"] = { top = Enum.Material.Slate, rock = Enum.Material.Slate, tree = "crystal", accent = Color3.fromRGB(167, 139, 250), gap = "stars", arch = "station" },
	["8-7"] = { top = Enum.Material.LeafyGrass, rock = Enum.Material.Rock, tree = "mushroom", accent = Color3.fromRGB(251, 146, 60), gap = "clouds", arch = "cottage" },
	["8-8"] = { top = Enum.Material.Pavement, rock = Enum.Material.Slate, tree = "crystal", accent = Color3.fromRGB(192, 132, 252), gap = "stars", arch = "portal" },
	["8-9"] = { top = Enum.Material.LeafyGrass, rock = Enum.Material.Cobblestone, tree = "pine", accent = Color3.fromRGB(148, 163, 184), gap = "clouds", arch = "castle" },
	["8-10"] = { top = Enum.Material.Snow, rock = Enum.Material.Rock, tree = "pine", accent = Color3.fromRGB(253, 224, 71), gap = "stars", arch = "observatory" },
	["8-11"] = { top = Enum.Material.Sand, rock = Enum.Material.Sandstone, tree = "palm", accent = Color3.fromRGB(236, 72, 153), gap = "rainbow", arch = "crown" },
}

-- ───────────── небо и свет ─────────────
local function setupTerrainColors()
	Terrain:SetMaterialColor(Enum.Material.LeafyGrass, Color3.fromRGB(104, 178, 64))
	Terrain:SetMaterialColor(Enum.Material.Rock, Color3.fromRGB(136, 112, 98))
	Terrain:SetMaterialColor(Enum.Material.Sandstone, Color3.fromRGB(214, 172, 112))
	Terrain:SetMaterialColor(Enum.Material.Sand, Color3.fromRGB(240, 214, 150))
	Terrain:SetMaterialColor(Enum.Material.Glacier, Color3.fromRGB(176, 224, 245))
	Terrain:SetMaterialColor(Enum.Material.Snow, Color3.fromRGB(240, 247, 255))
end

local function setupLighting()
	Lighting.ClockTime = 14.2
	Lighting.GeographicLatitude = 30
	Lighting.Brightness = 2.4
	Lighting.EnvironmentDiffuseScale = 0.6
	Lighting.EnvironmentSpecularScale = 0.6
	Lighting.GlobalShadows = true
	Lighting.Ambient = Color3.fromRGB(90, 96, 120)
	Lighting.OutdoorAmbient = Color3.fromRGB(150, 160, 190)
	pcall(function() Lighting.Technology = Enum.Technology.Future end)

	local atm = Lighting:FindFirstChildOfClass("Atmosphere") or Instance.new("Atmosphere", Lighting)
	atm.Density = 0.32
	atm.Offset = 0.12
	atm.Color = Color3.fromRGB(200, 226, 255)
	atm.Decay = Color3.fromRGB(120, 170, 235)
	atm.Glare = 0.25
	atm.Haze = 1.4

	local bloom = Lighting:FindFirstChildOfClass("BloomEffect") or Instance.new("BloomEffect", Lighting)
	bloom.Intensity = 0.6
	bloom.Size = 26
	bloom.Threshold = 1.6
	local cc = Lighting:FindFirstChildOfClass("ColorCorrectionEffect") or Instance.new("ColorCorrectionEffect", Lighting)
	cc.Saturation = 0.18
	cc.Contrast = 0.06
	cc.Brightness = 0.02
	cc.TintColor = Color3.fromRGB(255, 250, 244)
	local rays = Lighting:FindFirstChildOfClass("SunRaysEffect") or Instance.new("SunRaysEffect", Lighting)
	rays.Intensity = 0.08
	rays.Spread = 0.6

	local clouds = Terrain:FindFirstChildOfClass("Clouds") or Instance.new("Clouds", Terrain)
	clouds.Cover = 0.55
	clouds.Density = 0.6
	clouds.Color = Color3.fromRGB(255, 255, 255)
end

-- Пухлое облако из шаров (без столкновений)
local function cloudPuff(parent, pos, size, rng)
	local n = rng:NextInteger(4, 7)
	for k = 1, n do
		local r = size * rng:NextNumber(0.45, 0.85)
		local p = Instance.new("Part")
		p.Name = "Cloud"
		p.Shape = Enum.PartType.Ball
		p.Size = Vector3.new(r, r * 0.75, r)
		p.Position = pos + Vector3.new(rng:NextNumber(-size, size) * 0.9, rng:NextNumber(-0.15, 0.25) * size, rng:NextNumber(-size, size) * 0.6)
		p.Color = Color3.fromRGB(255, 255, 255)
		p.Material = Enum.Material.SmoothPlastic
		p.Transparency = 0.05
		p.Anchored = true
		p.CanCollide = false
		p.CanQuery = false
		p.CanTouch = false
		p.CastShadow = false
		p.Parent = parent
	end
end

local function setupCloudSea()
	if Workspace:FindFirstChild("CloudSea") then return end
	local folder = Instance.new("Folder")
	folder.Name = "CloudSea"
	local rng = Random.new(7)
	for i = 1, 70 do
		local ang = rng:NextNumber(0, math.pi * 2)
		local dist = rng:NextNumber(150, 2100)
		cloudPuff(folder, Vector3.new(math.cos(ang) * dist, rng:NextNumber(-34, -14), math.sin(ang) * dist), rng:NextNumber(18, 36), rng)
		if i % 10 == 0 then task.wait() end
	end
	folder.Parent = Workspace
end

-- ───────────── строительные помощники ─────────────
local function makePart(parent, name, size, cf, color, material, opts)
	opts = opts or {}
	local p = Instance.new(opts.class or "Part")
	p.Name = name
	p.Size = size
	p.CFrame = typeof(cf) == "CFrame" and cf or CFrame.new(cf)
	p.Color = color
	p.Material = material or Enum.Material.SmoothPlastic
	p.Anchored = true
	p.CanCollide = opts.collide ~= false
	if opts.collide == false then p.CanQuery = opts.query == true end
	p.CastShadow = opts.shadow ~= false
	p.TopSurface = Enum.SurfaceType.Smooth
	p.BottomSurface = Enum.SurfaceType.Smooth
	if opts.shape then p.Shape = opts.shape end
	if opts.transparency then p.Transparency = opts.transparency end
	p.Parent = parent
	return p
end

local function at(plot, fwd, right, up)
	return plot.center + plot.dir * fwd + plot.right * right + UP * (up or 0)
end

-- CFrame «лицом вперёд по пути» (LookVector = направление пути)
local function cfAt(plot, fwd, right, up, extra)
	local pos = at(plot, fwd, right, up)
	return CFrame.lookAt(pos, pos + plot.dir) * (extra or CFrame.new())
end

local function label3D(parent, text, size, offset, color, maxDist)
	local bbg = Instance.new("BillboardGui")
	bbg.Size = size or UDim2.fromOffset(220, 50)
	bbg.StudsOffset = offset or Vector3.new(0, 3, 0)
	bbg.MaxDistance = maxDist or 70
	bbg.LightInfluence = 0
	bbg.Parent = parent
	local tl = Instance.new("TextLabel", bbg)
	tl.Size = UDim2.fromScale(1, 1)
	tl.BackgroundColor3 = Color3.fromRGB(15, 23, 42)
	tl.BackgroundTransparency = 0.15
	tl.TextColor3 = color or Color3.new(1, 1, 1)
	tl.Text = text
	tl.TextScaled = true
	tl.Font = Enum.Font.FredokaOne
	Instance.new("UICorner", tl).CornerRadius = UDim.new(0.5, 0)
	local pad = Instance.new("UIPadding", tl)
	pad.PaddingLeft = UDim.new(0, 12)
	pad.PaddingRight = UDim.new(0, 12)
	pad.PaddingTop = UDim.new(0, 4)
	pad.PaddingBottom = UDim.new(0, 4)
	return bbg, tl
end

-- цвета «игрушечной» поверхности островов
local TOP_COLORS = {
	[Enum.Material.LeafyGrass] = Color3.fromRGB(112, 190, 70),
	[Enum.Material.Sandstone] = Color3.fromRGB(224, 184, 122),
	[Enum.Material.Basalt] = Color3.fromRGB(92, 82, 86),
	[Enum.Material.Glacier] = Color3.fromRGB(140, 192, 226),
	[Enum.Material.Slate] = Color3.fromRGB(108, 112, 150),
	[Enum.Material.Pavement] = Color3.fromRGB(150, 140, 176),
	[Enum.Material.Snow] = Color3.fromRGB(240, 247, 255),
	[Enum.Material.Sand] = Color3.fromRGB(244, 216, 150),
}

-- Летающий остров: идеально ровная верхушка из деталей (ничего не торчит под ногами),
-- земляной слой и скалистое «брюхо» из ландшафта снизу
local function buildIsland(plot, fwd, right, sizeF, sizeR, theme, rise, rng)
	local origin = at(plot, fwd, right, rise or 0)
	local cf = CFrame.lookAt(origin, origin + plot.dir)
	local color = TOP_COLORS[theme.top] or Color3.fromRGB(112, 190, 70)
	makePart(plot.folder, "IslandTop", Vector3.new(sizeR, 1.4, sizeF), cf * CFrame.new(0, -0.7, 0), color, theme.top)
	makePart(plot.folder, "IslandRim", Vector3.new(sizeR + 0.8, 0.6, sizeF + 0.8), cf * CFrame.new(0, -1.7, 0), color:Lerp(Color3.new(0, 0, 0), 0.22), theme.top)
	makePart(plot.folder, "IslandSoil", Vector3.new(sizeR - 1, 5, sizeF - 1), cf * CFrame.new(0, -4.5, 0), Color3.fromRGB(150, 104, 72), Enum.Material.Ground)
	Terrain:FillBlock(cf * CFrame.new(0, -11, 0), Vector3.new(sizeR - 6, 8, sizeF - 6), theme.rock)
	local base = cf.Position
	-- «брюхо» сужается книзу
	for k = 1, 4 do
		local r = math.max(3, math.min(sizeF, sizeR) * 0.4 * (1 - (k - 1) * 0.22))
		local depth = 10 + r + (k - 1) * 5
		Terrain:FillBall(base - UP * depth + plot.dir * rng:NextNumber(-2, 2) + plot.right * rng:NextNumber(-2, 2), r, theme.rock)
	end
end

local function spawnTree(parent, pos, kind, rng)
	if kind == "crystal" then
		local cols = { Color3.fromRGB(56, 189, 248), Color3.fromRGB(168, 85, 247), Color3.fromRGB(52, 211, 153) }
		for s = 1, 3 do
			local h = rng:NextNumber(4, 9)
			local cf = CFrame.new(pos + Vector3.new(rng:NextNumber(-1.2, 1.2), h / 2 - 0.5, rng:NextNumber(-1.2, 1.2))) * CFrame.Angles(rng:NextNumber(-0.25, 0.25), s * 2.1, rng:NextNumber(-0.25, 0.25))
			local c = makePart(parent, "Crystal", Vector3.new(1.4, h, 1.4), cf, cols[s], Enum.Material.Glass, { collide = false, transparency = 0.15 })
			makePart(parent, "CrystalCore", Vector3.new(0.6, h * 0.85, 0.6), cf, cols[s], Enum.Material.Neon, { collide = false, shadow = false })
			if s == 1 then
				local pl = Instance.new("PointLight", c)
				pl.Color = cols[s]
				pl.Range = 12
				pl.Brightness = 0.7
			end
		end
		return
	end
	if kind == "mushroom" then
		local h = rng:NextNumber(4, 7)
		makePart(parent, "Stem", Vector3.new(h, 1.4, 1.4), CFrame.new(pos + UP * h / 2) * CFrame.Angles(0, 0, math.pi / 2), Color3.fromRGB(254, 243, 224), Enum.Material.SmoothPlastic, { shape = Enum.PartType.Cylinder })
		local cap = makePart(parent, "Cap", Vector3.new(6, 3.2, 6), CFrame.new(pos + UP * (h + 0.6)), Color3.fromRGB(239, 68, 68), Enum.Material.SmoothPlastic, { shape = Enum.PartType.Ball })
		for k = 1, 5 do
			local a = k / 5 * math.pi * 2
			makePart(parent, "Dot", Vector3.new(0.8, 0.8, 0.8), CFrame.new(cap.Position + Vector3.new(math.cos(a) * 2.2, 0.9, math.sin(a) * 2.2)), Color3.new(1, 1, 1), Enum.Material.SmoothPlastic, { collide = false, shape = Enum.PartType.Ball })
		end
		return
	end
	local h = rng:NextNumber(7, 11)
	local trunkCol = kind == "dead" and Color3.fromRGB(64, 52, 46) or Color3.fromRGB(110, 74, 46)
	makePart(parent, "Trunk", Vector3.new(h, 1.3, 1.3), CFrame.new(pos + UP * h / 2) * CFrame.Angles(0, 0, math.pi / 2), trunkCol, Enum.Material.Wood, { shape = Enum.PartType.Cylinder })
	if kind == "dead" then
		for k = 1, 3 do
			makePart(parent, "Branch", Vector3.new(0.5, 3.2, 0.5), CFrame.new(pos + UP * (h * 0.6 + k)) * CFrame.Angles(0, k * 2, 0.7), trunkCol, Enum.Material.Wood)
		end
		return
	end
	if kind == "palm" then
		for k = 1, 6 do
			local a = k / 6 * math.pi * 2
			makePart(parent, "Leaf", Vector3.new(0.3, 1.4, 6), CFrame.new(pos + UP * (h + 0.3)) * CFrame.Angles(0, a, 0) * CFrame.new(0, -0.6, 2.6) * CFrame.Angles(-0.35, 0, 0), Color3.fromRGB(34, 160, 80), Enum.Material.SmoothPlastic, { collide = false })
		end
		return
	end
	local palette = kind == "sakura"
		and { Color3.fromRGB(249, 168, 212), Color3.fromRGB(244, 114, 182), Color3.fromRGB(251, 207, 232) }
		or { Color3.fromRGB(60, 150, 70), Color3.fromRGB(80, 172, 78), Color3.fromRGB(46, 130, 66) }
	if kind == "pine" then
		for k = 0, 2 do
			local r = 6.5 - k * 1.8
			makePart(parent, "Pine", Vector3.new(r, 3.6, r), CFrame.new(pos + UP * (h * 0.55 + k * 2.4)) * CFrame.Angles(0, k * 0.8, 0), palette[k + 1], Enum.Material.SmoothPlastic, { collide = false, class = "Part", shape = Enum.PartType.Ball })
		end
		return
	end
	for j = 1, 4 do
		local r = rng:NextNumber(3.6, 5.2)
		local off = Vector3.new(rng:NextNumber(-1.8, 1.8), h + rng:NextNumber(-0.5, 1.6), rng:NextNumber(-1.8, 1.8))
		local leaf = makePart(parent, "Canopy", Vector3.new(r, r * 0.8, r), CFrame.new(pos + off), palette[(j % #palette) + 1], Enum.Material.SmoothPlastic, { collide = false, shape = Enum.PartType.Ball })
		if j == 1 and kind == "sakura" then
			local petals = Instance.new("ParticleEmitter", leaf)
			petals.Color = ColorSequence.new(Color3.fromRGB(251, 207, 232))
			petals.Size = NumberSequence.new({ NumberSequenceKeypoint.new(0, 0.3), NumberSequenceKeypoint.new(1, 0.1) })
			petals.Rate = 3
			petals.Speed = NumberRange.new(1, 2.5)
			petals.Lifetime = NumberRange.new(2, 3.5)
			petals.Acceleration = Vector3.new(0, -2, 0)
		end
	end
end

local function spawnFlowers(parent, pos, rng)
	local cols = { Color3.fromRGB(244, 114, 182), Color3.fromRGB(250, 204, 21), Color3.fromRGB(96, 165, 250), Color3.fromRGB(255, 255, 255) }
	for i = 1, 5 do
		local p = pos + Vector3.new(rng:NextNumber(-2, 2), 0, rng:NextNumber(-2, 2))
		makePart(parent, "FlowerStem", Vector3.new(0.15, 0.9, 0.15), CFrame.new(p + UP * 0.45), Color3.fromRGB(34, 140, 60), Enum.Material.SmoothPlastic, { collide = false, shadow = false })
		makePart(parent, "Flower", Vector3.new(0.6, 0.35, 0.6), CFrame.new(p + UP * 1.0), cols[(i % #cols) + 1], Enum.Material.SmoothPlastic, { collide = false, shadow = false, shape = Enum.PartType.Ball })
	end
end

local function spawnLantern(parent, pos, color)
	makePart(parent, "LanternPost", Vector3.new(0.45, 5, 0.45), CFrame.new(pos + UP * 2.5), Color3.fromRGB(60, 45, 35), Enum.Material.Wood)
	local bulb = makePart(parent, "LanternBulb", Vector3.new(1, 1.2, 1), CFrame.new(pos + UP * 5.4), color or Color3.fromRGB(253, 224, 71), Enum.Material.Neon, { collide = false })
	makePart(parent, "LanternCap", Vector3.new(1.4, 0.3, 1.4), CFrame.new(pos + UP * 6.1), Color3.fromRGB(60, 45, 35), Enum.Material.Wood, { collide = false })
	local pl = Instance.new("PointLight", bulb)
	pl.Color = color or Color3.fromRGB(254, 240, 138)
	pl.Range = 16
	pl.Brightness = 1
end

local function spawnCoin(plot, folder, pos)
	local coin = makePart(folder, "ZubrikCoin", Vector3.new(0.4, 2.2, 2.2), CFrame.new(pos) * CFrame.Angles(0, 0, 0), Color3.fromRGB(250, 204, 21), Enum.Material.Neon, { collide = false, shape = Enum.PartType.Cylinder })
	coin.CanTouch = true
	local inner = makePart(folder, "CoinInner", Vector3.new(0.5, 1.5, 1.5), CFrame.new(pos), Color3.fromRGB(234, 179, 8), Enum.Material.Metal, { collide = false, shape = Enum.PartType.Cylinder })
	local t0 = math.random() * 5
	local conn
	conn = RunService.Heartbeat:Connect(function()
		if not coin.Parent then conn:Disconnect() return end
		local cf = CFrame.new(pos + UP * math.sin((os.clock() + t0) * 2) * 0.3) * CFrame.Angles(0, (os.clock() + t0) * 2.2, 0)
		coin.CFrame = cf
		inner.CFrame = cf
	end)
	local taken = false
	coin.Touched:Connect(function(hit)
		if taken then return end
		local plr = Players:GetPlayerFromCharacter(hit.Parent)
		if not plr or plr ~= plot.owner then return end
		taken = true
		plot.coins = (plot.coins or 0) + 1
		Bridge.Burst(coin.Position, Color3.fromRGB(250, 204, 21), 16, folder)
		effectEv:FireClient(plr, "coin", { coins = plot.coins })
		stateEv:FireClient(plr, { coins = plot.coins })
		coin.Transparency = 1
		inner.Transparency = 1
		-- монетка возвращается через минуту (на случай, если ученик зайдёт снова)
		task.delay(60, function()
			if coin.Parent then
				coin.Transparency = 0
				inner.Transparency = 0
				taken = false
			end
		end)
	end)
end

-- Экран кода у принтера: заголовок, CSS ученика с подсветкой и вердикт сервера
local function makeScreen(folder, cf, w, h, title)
	local frame = makePart(folder, "ScreenFrame", Vector3.new(w + 0.6, h + 0.6, 0.4), cf * CFrame.new(0, 0, 0.12), Color3.fromRGB(30, 41, 59), Enum.Material.Metal)
	local screen = makePart(folder, "CodeScreen", Vector3.new(w, h, 0.3), cf, Color3.fromRGB(15, 23, 42), Enum.Material.SmoothPlastic)
	local sg = Instance.new("SurfaceGui")
	sg.Face = Enum.NormalId.Front
	sg.SizingMode = Enum.SurfaceGuiSizingMode.PixelsPerStud
	sg.PixelsPerStud = 40
	sg.LightInfluence = 0
	sg.Brightness = 1.4
	sg.MaxDistance = 80
	sg.Parent = screen
	local bg = Instance.new("Frame", sg)
	bg.Size = UDim2.fromScale(1, 1)
	bg.BackgroundColor3 = Color3.fromRGB(15, 23, 42)
	local grad = Instance.new("UIGradient", bg)
	grad.Color = ColorSequence.new(Color3.fromRGB(30, 41, 59), Color3.fromRGB(15, 23, 42))
	grad.Rotation = 90
	local pad = Instance.new("UIPadding", bg)
	pad.PaddingLeft = UDim.new(0, 16)
	pad.PaddingRight = UDim.new(0, 16)
	pad.PaddingTop = UDim.new(0, 10)
	pad.PaddingBottom = UDim.new(0, 10)
	local dots = Instance.new("TextLabel", bg)
	dots.Size = UDim2.new(0, 60, 0, 20)
	dots.BackgroundTransparency = 1
	dots.RichText = true
	dots.Text = '<font color="#f87171">●</font> <font color="#fbbf24">●</font> <font color="#4ade80">●</font>'
	dots.TextSize = 16
	dots.Font = Enum.Font.GothamBold
	dots.TextXAlignment = Enum.TextXAlignment.Left
	local header = Instance.new("TextLabel", bg)
	header.Size = UDim2.new(1, -70, 0, 34)
	header.Position = UDim2.fromOffset(70, -6)
	header.BackgroundTransparency = 1
	header.Text = title
	header.TextColor3 = Color3.fromRGB(163, 230, 53)
	header.TextXAlignment = Enum.TextXAlignment.Left
	header.TextScaled = true
	header.Font = Enum.Font.FredokaOne
	local codeLbl = Instance.new("TextLabel", bg)
	codeLbl.Size = UDim2.new(1, 0, 1, -100)
	codeLbl.Position = UDim2.fromOffset(0, 36)
	codeLbl.BackgroundColor3 = Color3.fromRGB(2, 6, 23)
	codeLbl.BackgroundTransparency = 0.2
	codeLbl.Text = "/* style.css появится здесь\n   после «Отправить в мир» */"
	codeLbl.TextColor3 = Color3.fromRGB(148, 163, 184)
	codeLbl.TextXAlignment = Enum.TextXAlignment.Left
	codeLbl.TextYAlignment = Enum.TextYAlignment.Top
	codeLbl.TextSize = 20
	codeLbl.RichText = true
	codeLbl.TextWrapped = true
	codeLbl.Font = Enum.Font.Code
	Instance.new("UICorner", codeLbl).CornerRadius = UDim.new(0, 8)
	local cpad = Instance.new("UIPadding", codeLbl)
	cpad.PaddingLeft = UDim.new(0, 10)
	cpad.PaddingTop = UDim.new(0, 8)
	local verdictLbl = Instance.new("TextLabel", bg)
	verdictLbl.Size = UDim2.new(1, 0, 0, 56)
	verdictLbl.Position = UDim2.new(0, 0, 1, -58)
	verdictLbl.BackgroundTransparency = 1
	verdictLbl.Text = ""
	verdictLbl.TextColor3 = Color3.fromRGB(250, 204, 21)
	verdictLbl.TextXAlignment = Enum.TextXAlignment.Left
	verdictLbl.TextWrapped = true
	verdictLbl.TextScaled = true
	verdictLbl.Font = Enum.Font.GothamBold
	local vlim = Instance.new("UITextSizeConstraint", verdictLbl)
	vlim.MaxTextSize = 24
	return codeLbl, verdictLbl, header
end

-- 3D-принтер: круглая платформа, неоновое кольцо, искры
local function makePrinter(folder, pos, accent)
	makePart(folder, "PrinterBase", Vector3.new(1.2, 9, 9), CFrame.new(pos + UP * 0.3) * CFrame.Angles(0, 0, math.pi / 2), Color3.fromRGB(51, 65, 85), Enum.Material.Metal, { shape = Enum.PartType.Cylinder })
	local ring = makePart(folder, "PrinterRing", Vector3.new(0.3, 8, 8), CFrame.new(pos + UP * 0.95) * CFrame.Angles(0, 0, math.pi / 2), accent, Enum.Material.Neon, { collide = false, shape = Enum.PartType.Cylinder })
	makePart(folder, "PrinterTop", Vector3.new(0.32, 6.6, 6.6), CFrame.new(pos + UP * 0.97) * CFrame.Angles(0, 0, math.pi / 2), Color3.fromRGB(30, 41, 59), Enum.Material.Metal, { collide = false, shape = Enum.PartType.Cylinder })
	for k = 0, 3 do
		local a = k / 4 * math.pi * 2 + math.pi / 4
		local pp = pos + Vector3.new(math.cos(a) * 4.6, 0, math.sin(a) * 4.6)
		makePart(folder, "PrinterPylon", Vector3.new(0.5, 3, 0.5), CFrame.new(pp + UP * 1.5), Color3.fromRGB(71, 85, 105), Enum.Material.Metal)
		makePart(folder, "PrinterTip", Vector3.new(0.7, 0.7, 0.7), CFrame.new(pp + UP * 3.2), accent, Enum.Material.Neon, { collide = false, shape = Enum.PartType.Ball })
	end
	local beam = makePart(folder, "PrinterBeam", Vector3.new(4.6, 0.1, 6), CFrame.new(pos + UP * 3.4) * CFrame.Angles(0, 0, math.pi / 2), accent, Enum.Material.Neon, { collide = false, shape = Enum.PartType.Cylinder, transparency = 0.85, shadow = false })
	local sparks = Instance.new("ParticleEmitter", ring)
	sparks.Texture = "rbxasset://textures/particles/sparkles_main.dds"
	sparks.Color = ColorSequence.new(accent, Color3.fromRGB(255, 255, 255))
	sparks.LightEmission = 1
	sparks.Size = NumberSequence.new({ NumberSequenceKeypoint.new(0, 0.35), NumberSequenceKeypoint.new(1, 0) })
	sparks.Rate = 4
	sparks.Speed = NumberRange.new(2, 5)
	sparks.Lifetime = NumberRange.new(0.5, 1)
	sparks.EmissionDirection = Enum.NormalId.Right
	local pl = Instance.new("PointLight", ring)
	pl.Color = accent
	pl.Range = 12
	pl.Brightness = 1.2
	return beam, sparks
end

-- Сияющая рамка «положи сюда» над пропастью или на механизме
local function makeTarget(plot, folder, pos, sizeF, sizeR, text, upright)
	local parts = {}
	local col = Color3.fromRGB(56, 189, 248)
	local frameCF
	if upright then
		frameCF = CFrame.fromMatrix(pos, plot.right, -plot.dir)
	else
		frameCF = CFrame.fromMatrix(pos + UP * 0.05, plot.dir, UP)
	end
	local edges = upright
		and {
			{ Vector3.new(sizeR, 0.25, 0.5), CFrame.new(0, 0, -sizeF / 2) },
			{ Vector3.new(sizeR, 0.25, 0.5), CFrame.new(0, 0, sizeF / 2) },
			{ Vector3.new(0.5, 0.25, sizeF), CFrame.new(-sizeR / 2, 0, 0) },
			{ Vector3.new(0.5, 0.25, sizeF), CFrame.new(sizeR / 2, 0, 0) },
		}
		or {
			{ Vector3.new(sizeF, 0.25, 0.5), CFrame.new(0, 0, -sizeR / 2) },
			{ Vector3.new(sizeF, 0.25, 0.5), CFrame.new(0, 0, sizeR / 2) },
			{ Vector3.new(0.5, 0.25, sizeR), CFrame.new(-sizeF / 2, 0, 0) },
			{ Vector3.new(0.5, 0.25, sizeR), CFrame.new(sizeF / 2, 0, 0) },
		}
	for _, e in ipairs(edges) do
		table.insert(parts, makePart(folder, "TargetEdge", e[1], frameCF * e[2], col, Enum.Material.Neon, { collide = false, shadow = false }))
	end
	local fill = makePart(folder, "TargetFill", upright and Vector3.new(sizeR, 0.1, sizeF) or Vector3.new(sizeF, 0.1, sizeR), frameCF, col, Enum.Material.ForceField, { collide = false, shadow = false, transparency = 0.2 })
	local bbg, tl = label3D(fill, "⬇ " .. text, UDim2.fromOffset(300, 46), upright and Vector3.new(0, 0, -(sizeF / 2 + 3)) or Vector3.new(0, 4, 0), Color3.new(1, 1, 1), 90)
	local hot = false
	local t0 = os.clock()
	local conn
	conn = RunService.Heartbeat:Connect(function()
		if not fill.Parent then conn:Disconnect() return end
		local k = (math.sin((os.clock() - t0) * (hot and 9 or 3)) + 1) / 2
		local c = hot and Color3.fromRGB(74, 222, 128) or col
		for _, p in ipairs(parts) do
			p.Color = c
			p.Transparency = p:GetAttribute("Hidden") and 1 or (0.1 + k * 0.4)
		end
		fill.Color = c
	end)
	return {
		setHot = function(v)
			hot = v
			tl.TextColor3 = v and Color3.fromRGB(134, 239, 172) or Color3.new(1, 1, 1)
		end,
		setVisible = function(v)
			for _, p in ipairs(parts) do p:SetAttribute("Hidden", not v) end
			fill.Transparency = v and 0.2 or 1
			bbg.Enabled = v
		end,
		setText = function(s) tl.Text = "⬇ " .. s end,
	}
end

-- Мост из досок, который вырастает по очереди (световой или деревянный)
-- upEnd задан — получается наклонный спуск/подъём от up до upEnd
local function makeGrowBridge(folder, plot, fromFwd, toFwd, width, up, color, material, name, upEnd)
	local planks = {}
	local n = math.max(3, math.floor((toFwd - fromFwd) / 2))
	local len = (toFwd - fromFwd) / n
	for k = 1, n do
		local f0 = fromFwd + len * (k - 1)
		local h0 = up + ((upEnd or up) - up) * (k - 1) / n
		local h1 = up + ((upEnd or up) - up) * k / n
		local a = at(plot, f0, 0, h0)
		local b = at(plot, f0 + len, 0, h1)
		local cf = CFrame.lookAt((a + b) / 2, b) * CFrame.new(0, -0.4, 0)
		local p = makePart(folder, name or "GrowPlank", Vector3.new(width, 0.8, (b - a).Magnitude - 0.12), cf, color, material, { collide = false, transparency = 1 })
		p.CanQuery = false
		table.insert(planks, p)
	end
	local api = {}
	function api.grow(instant)
		for _, p in ipairs(planks) do
			p.CanCollide = true
			p.CanQuery = true
			if instant then
				p.Transparency = material == Enum.Material.Neon and 0.25 or 0
			else
				local final = p.CFrame
				p.CFrame = final - UP * 3
				TweenService:Create(p, TweenInfo.new(0.35, Enum.EasingStyle.Back), { CFrame = final, Transparency = material == Enum.Material.Neon and 0.25 or 0 }):Play()
				task.wait(0.06)
			end
		end
	end
	function api.hide()
		for _, p in ipairs(planks) do
			p.CanCollide = false
			p.CanQuery = false
			p.Transparency = 1
		end
	end
	return api
end

-- ───────────── уровень ─────────────
local function buildLevel(plot, folder, idx, lv, rng)
	local theme = THEMES[lv.id]
	local E = (idx - 1) * STEP
	local rise = lv.rise or 0
	local lvFolder = Instance.new("Folder")
	lvFolder.Name = "L" .. lv.id
	lvFolder.Parent = folder
	local biome = { index = idx, id = lv.id }
	plot.biomes[lv.id] = biome

	-- острова: старт [E-20 … E+20], финиш [E+40 … E+68]; у первого уровня лагерь шире
	local entryCenter, entryLen = E, 40
	if idx == 1 then entryCenter, entryLen = E - 10, 60 end
	buildIsland(plot, entryCenter, 0, entryLen, idx == 1 and 56 or 40, theme, 0, rng)
	local goalCenter = E + 20 + GAP + 14
	buildIsland(plot, goalCenter, 0, 28, 30, theme, rise, rng)
	local ground = plot.center.Y
	biome.ground = ground
	biome.entrySpawn = at(plot, E - 12, 0, 4)
	biome.printerPos = at(plot, E - 6, 0, 0)
	biome.goalPos = at(plot, goalCenter, 0, rise)

	-- принтер и экран кода
	local beam, sparks = makePrinter(lvFolder, biome.printerPos, theme.accent)
	biome.beam = beam
	biome.sparks = sparks
	local screenCF = CFrame.lookAt(at(plot, E - 6, 13, 4.2), at(plot, E - 6, 13, 4.2) - plot.right * 1 - plot.dir * 1.6)
	if idx == 1 then
		screenCF = nil -- в лагере большой экран стоит в Мастерской
	else
		-- ножки стоят под экраном и позади него, чтобы не перечёркивать код
		for _, s in ipairs({ -3.4, 3.4 }) do
			local leg = screenCF * CFrame.new(s, -3.6, 0.6)
			makePart(lvFolder, "ScreenLeg", Vector3.new(0.5, 2, 0.5), CFrame.new(leg.Position), Color3.fromRGB(51, 65, 85), Enum.Material.Metal)
		end
		biome.screenCode, biome.screenVerdict, biome.screenHeader = makeScreen(lvFolder, screenCF, 9, 5.4, lv.icon .. " " .. lv.id .. " · " .. Config.Pick(lv.name, "ru"))
	end

	-- табличка уровня у входа
	local signPos = at(plot, E - 16, -9, 0)
	makePart(lvFolder, "SignPost", Vector3.new(0.4, 4, 0.4), CFrame.new(signPos + UP * 2), Color3.fromRGB(115, 76, 46), Enum.Material.Wood)
	local board = makePart(lvFolder, "SignBoard", Vector3.new(7, 2.6, 0.3), CFrame.lookAt(signPos + UP * 4.3, signPos + UP * 4.3 - plot.dir), Color3.fromRGB(245, 232, 200), Enum.Material.Wood)
	local sg = Instance.new("SurfaceGui", board)
	sg.Face = Enum.NormalId.Front
	sg.SizingMode = Enum.SurfaceGuiSizingMode.PixelsPerStud
	sg.PixelsPerStud = 40
	local st = Instance.new("TextLabel", sg)
	st.Size = UDim2.fromScale(1, 1)
	st.BackgroundTransparency = 1
	st.Text = lv.icon .. " " .. lv.id .. "\n" .. Config.Pick(lv.name, "ru")
	st.TextColor3 = Color3.fromRGB(69, 46, 26)
	st.TextScaled = true
	st.TextWrapped = true
	st.Font = Enum.Font.FredokaOne
	biome.signLabel = st

	-- деревья, цветы, фонари — по краям, не на пути
	for t = 1, 4 do
		local side = (t % 2 == 0 or lv.kind == "socket") and 1 or -1
		-- деревья не заслоняют экран кода (он стоит около E-6 справа)
		local spots = { -18, 7, 11, 15 }
		spawnTree(lvFolder, at(plot, E + spots[t] + rng:NextNumber(-1, 1), side * rng:NextNumber(16, 17), 0), theme.tree, rng)
	end
	spawnTree(lvFolder, at(plot, goalCenter + 6, 11, rise), theme.tree, rng)
	spawnFlowers(lvFolder, at(plot, E + 8, 10, 0), rng)
	spawnFlowers(lvFolder, at(plot, E - 14, -12, 0), rng)
	spawnLantern(lvFolder, at(plot, E + 17, 6, 0), theme.accent)
	spawnLantern(lvFolder, at(plot, E + 17, -6, 0), theme.accent)
	spawnCoin(plot, lvFolder, at(plot, E + 6, -6, 2.5))
	spawnCoin(plot, lvFolder, at(plot, goalCenter - 4, 7, rise + 2.5))

	-- пропасть: облака внизу и тематическое «дно»
	local gapMid = E + 20 + GAP / 2
	cloudPuff(lvFolder, at(plot, gapMid, 0, -26), 14, rng)
	if theme.gap == "waterfall" then
		local wf = makePart(lvFolder, "Waterfall", Vector3.new(1, 30, 10), CFrame.lookAt(at(plot, E + 20.5, -10, -14), at(plot, E + 20.5, -10, -14) + plot.dir), Color3.fromRGB(125, 211, 252), Enum.Material.Glass, { collide = false, transparency = 0.35 })
		local mist = Instance.new("ParticleEmitter", wf)
		mist.Texture = "rbxasset://textures/particles/smoke_main.dds"
		mist.Color = ColorSequence.new(Color3.fromRGB(240, 249, 255))
		mist.Size = NumberSequence.new({ NumberSequenceKeypoint.new(0, 2), NumberSequenceKeypoint.new(1, 5) })
		mist.Transparency = NumberSequence.new({ NumberSequenceKeypoint.new(0, 0.6), NumberSequenceKeypoint.new(1, 1) })
		mist.Rate = 8
		mist.Speed = NumberRange.new(2, 4)
		mist.Lifetime = NumberRange.new(1.5, 2.5)
		makePart(lvFolder, "Stream", Vector3.new(14, 0.3, 8), cfAt(plot, E + 13, -10, -0.1), Color3.fromRGB(56, 189, 248), Enum.Material.Glass, { collide = false, transparency = 0.3 })
	elseif theme.gap == "lava" then
		local lava = makePart(lvFolder, "LavaRiver", Vector3.new(GAP + 2, 1, 60), cfAt(plot, gapMid, 0, -7, CFrame.Angles(0, math.pi / 2, 0)), Color3.fromRGB(255, 90, 20), Enum.Material.Neon, { collide = false })
		local fire = Instance.new("ParticleEmitter", lava)
		fire.Texture = "rbxasset://textures/particles/fire_main.dds"
		fire.Color = ColorSequence.new(Color3.fromRGB(255, 180, 60), Color3.fromRGB(255, 60, 20))
		fire.LightEmission = 1
		fire.Size = NumberSequence.new({ NumberSequenceKeypoint.new(0, 1.5), NumberSequenceKeypoint.new(1, 0) })
		fire.Rate = 25
		fire.Speed = NumberRange.new(3, 7)
		fire.Lifetime = NumberRange.new(0.6, 1.2)
		local pl = Instance.new("PointLight", lava)
		pl.Color = Color3.fromRGB(255, 120, 40)
		pl.Range = 30
		pl.Brightness = 2
	elseif theme.gap == "stars" or theme.gap == "crystal" then
		local sp = makePart(lvFolder, "StarDust", Vector3.new(GAP, 1, 30), cfAt(plot, gapMid, 0, -10), Color3.new(1, 1, 1), Enum.Material.SmoothPlastic, { collide = false, transparency = 1 })
		local pe = Instance.new("ParticleEmitter", sp)
		pe.Texture = "rbxasset://textures/particles/sparkles_main.dds"
		pe.Color = ColorSequence.new(theme.accent, Color3.new(1, 1, 1))
		pe.LightEmission = 1
		pe.Size = NumberSequence.new({ NumberSequenceKeypoint.new(0, 0.5), NumberSequenceKeypoint.new(1, 0) })
		pe.Rate = 12
		pe.Speed = NumberRange.new(1, 3)
		pe.Lifetime = NumberRange.new(2, 4)
		pe.EmissionDirection = Enum.NormalId.Top
	elseif theme.gap == "rainbow" then
		local cols = { Color3.fromRGB(239, 68, 68), Color3.fromRGB(249, 115, 22), Color3.fromRGB(250, 204, 21), Color3.fromRGB(34, 197, 94), Color3.fromRGB(59, 130, 246), Color3.fromRGB(168, 85, 247) }
		for k, c in ipairs(cols) do
			makePart(lvFolder, "RainbowArc", Vector3.new(1, 1, 50), cfAt(plot, goalCenter + 16, 0, 20 - k * 1.1, CFrame.Angles(0, math.pi / 2, 0)), c, Enum.Material.Neon, { collide = false, transparency = 0.2 })
		end
	end

	-- ── механика уровня ──
	local itemName = Config.Pick(lv.item, "ru")
	if lv.kind == "span" then
		local tPos = at(plot, gapMid, 0, 0.05)
		biome.target = makeTarget(plot, lvFolder, tPos, GAP + 8, 12, itemName .. " сюда", false)
		biome.target.pos = tPos
		biome.target.radius = 17
		biome.target.onPlaced = function()
			biome.target.setVisible(false)
		end
		-- запасной путь для уже пройденного уровня (если ученик вернулся позже)
		biome.memoryBridge = makeGrowBridge(lvFolder, plot, E + 19, E + 41, 8, 0, Color3.fromRGB(253, 230, 138), rise > 0 and Enum.Material.Sandstone or Enum.Material.WoodPlanks, "MemoryPlank", rise)
		biome.restore = function()
			biome.target.setVisible(false)
			biome.memoryBridge.grow(true)
		end
		biome.reset = function()
			biome.target.setVisible(true)
			biome.memoryBridge.hide()
		end
	else
		-- механизм стоит сбоку от дороги, лицом к ней; световой мост — по центру пропасти
		local sPos = at(plot, E + 4, -13, 0)
		local function facing(pos) return CFrame.lookAt(pos, pos + plot.right) end
		local socketBase = sPos + UP * 0.2
		local light = makeGrowBridge(lvFolder, plot, E + 18, E + 42, 7, 0, theme.accent, Enum.Material.Neon, "LightPlank")
		local onFx = {}
		if theme.arch == "gate" then
			for _, s in ipairs({ -1, 1 }) do
				makePart(lvFolder, "GatePillar", Vector3.new(2, 24, 2), facing(sPos + plot.dir * s * 15 + UP * 12), Color3.fromRGB(186, 230, 253), Enum.Material.Glass)
				table.insert(onFx, makePart(lvFolder, "GateGem", Vector3.new(2.4, 2.4, 2.4), CFrame.new(sPos + plot.dir * s * 15 + UP * 25), Color3.fromRGB(56, 189, 248), Enum.Material.Neon, { collide = false, shape = Enum.PartType.Ball }))
			end
			makePart(lvFolder, "GateTop", Vector3.new(32, 1.6, 2), facing(sPos + UP * 24), Color3.fromRGB(186, 230, 253), Enum.Material.Glass)
		elseif theme.arch == "station" then
			makePart(lvFolder, "Pad", Vector3.new(18, 1, 6), facing(sPos + UP * 0.5), Color3.fromRGB(51, 65, 85), Enum.Material.Metal)
			socketBase = sPos + UP * 1
			for _, s in ipairs({ -1, 1 }) do
				makePart(lvFolder, "Antenna", Vector3.new(0.6, 12, 0.6), CFrame.new(sPos + plot.dir * s * 10 + UP * 6), Color3.fromRGB(148, 163, 184), Enum.Material.Metal)
				table.insert(onFx, makePart(lvFolder, "AntennaLight", Vector3.new(1.4, 1.4, 1.4), CFrame.new(sPos + plot.dir * s * 10 + UP * 12.5), Color3.fromRGB(71, 85, 105), Enum.Material.SmoothPlastic, { collide = false, shape = Enum.PartType.Ball }))
			end
		elseif theme.arch == "cottage" then
			-- домик без крыши: крыша ставится сверху
			makePart(lvFolder, "HouseWalls", Vector3.new(24, 8, 8), facing(sPos - plot.right * 2 + UP * 4), Color3.fromRGB(253, 230, 138), Enum.Material.WoodPlanks)
			makePart(lvFolder, "HouseDoor", Vector3.new(4, 5.5, 0.4), facing(sPos + plot.right * 2.1 + UP * 2.75), Color3.fromRGB(120, 53, 15), Enum.Material.Wood)
			for _, s in ipairs({ -1, 1 }) do
				table.insert(onFx, makePart(lvFolder, "HouseWindow", Vector3.new(3, 3, 0.3), facing(sPos + plot.right * 2.1 + plot.dir * s * 7 + UP * 4.2), Color3.fromRGB(71, 85, 105), Enum.Material.Glass))
			end
			socketBase = sPos - plot.right * 2 + UP * 8.1
		elseif theme.arch == "portal" then
			for k = 0, 15 do
				local a = k / 16 * math.pi * 2
				local p = sPos + UP * 9 + plot.dir * math.cos(a) * 17 + UP * math.sin(a) * 15
				if p.Y > plot.center.Y then
					table.insert(onFx, makePart(lvFolder, "PortalStone", Vector3.new(2.6, 2.6, 2.6), facing(p), Color3.fromRGB(88, 28, 135), Enum.Material.Slate))
				end
			end
		end
		biome.target = makeTarget(plot, lvFolder, socketBase, 26, 6, itemName .. " сюда", false)
		biome.target.pos = socketBase
		biome.target.upright = true
		biome.target.radius = 12
		local function powerOn(instant)
			biome.target.setVisible(false)
			for _, p in ipairs(onFx) do
				p.Material = Enum.Material.Neon
				p.Color = theme.accent
			end
			if instant then light.grow(true) else task.spawn(light.grow) end
		end
		biome.target.onPlaced = function() powerOn(false) end
		biome.restore = function() powerOn(true) end
		local orig = {}
		for _, p in ipairs(onFx) do orig[p] = { p.Material, p.Color } end
		biome.reset = function()
			biome.target.setVisible(true)
			light.hide()
			for p, o in pairs(orig) do p.Material = o[1]; p.Color = o[2] end
		end
	end

	-- ── финиш: флаг, тематическое здание, победа ──
	local flagBase = at(plot, goalCenter + 4, 0, rise)
	makePart(lvFolder, "FlagPole", Vector3.new(0.5, 12, 0.5), CFrame.new(flagBase + UP * 6), Color3.fromRGB(226, 232, 240), Enum.Material.Metal)
	makePart(lvFolder, "FlagTop", Vector3.new(1, 1, 1), CFrame.new(flagBase + UP * 12.2), Color3.fromRGB(250, 204, 21), Enum.Material.Neon, { shape = Enum.PartType.Ball, collide = false })
	local cloth = makePart(lvFolder, "FlagCloth", Vector3.new(0.2, 3.4, 5.2), CFrame.lookAt(flagBase + UP * 10.2 + plot.right * 2.7, flagBase + UP * 10.2 + plot.right * 2.7 + plot.dir), Config.ACCENTS.lime, Enum.Material.Fabric, { collide = false })
	biome.flagCloth = cloth
	local fw = Instance.new("ParticleEmitter", cloth)
	fw.Texture = "rbxasset://textures/particles/sparkles_main.dds"
	fw.Color = ColorSequence.new({ ColorSequenceKeypoint.new(0, Color3.fromRGB(250, 204, 21)), ColorSequenceKeypoint.new(0.5, Color3.fromRGB(244, 114, 182)), ColorSequenceKeypoint.new(1, Color3.fromRGB(56, 189, 248)) })
	fw.LightEmission = 1
	fw.Size = NumberSequence.new({ NumberSequenceKeypoint.new(0, 0.8), NumberSequenceKeypoint.new(1, 0) })
	fw.Rate = 0
	fw.Speed = NumberRange.new(16, 30)
	fw.SpreadAngle = Vector2.new(60, 60)
	fw.Lifetime = NumberRange.new(1, 1.8)
	fw.Acceleration = Vector3.new(0, -20, 0)
	fw.EmissionDirection = Enum.NormalId.Top
	biome.fireworks = fw
	local flagRing = makePart(lvFolder, "FlagRing", Vector3.new(0.2, 10, 10), CFrame.new(flagBase + UP * 0.15) * CFrame.Angles(0, 0, math.pi / 2), Color3.fromRGB(250, 204, 21), Enum.Material.Neon, { collide = false, shape = Enum.PartType.Cylinder, transparency = 0.4 })
	label3D(flagRing, "🏁", UDim2.fromOffset(60, 60), Vector3.new(0, 15, 0), nil, 120).Enabled = true

	if theme.arch == "temple" then
		for _, sr in ipairs({ -9, 9 }) do
			for _, sf in ipairs({ 6, 14 }) do
				makePart(lvFolder, "TempleCol", Vector3.new(1.8, 10, 1.8), CFrame.new(at(plot, goalCenter + sf - 4, sr, rise + 5)), Color3.fromRGB(245, 232, 200), Enum.Material.Marble)
			end
		end
		makePart(lvFolder, "TempleRoof", Vector3.new(21, 1.4, 12), cfAt(plot, goalCenter + 6, 0, rise + 10.7, CFrame.Angles(0, math.pi / 2, 0)), Color3.fromRGB(234, 179, 8), Enum.Material.Marble)
	elseif theme.arch == "castle" then
		for _, sr in ipairs({ -11, 11 }) do
			makePart(lvFolder, "Tower", Vector3.new(5, 16, 5), CFrame.new(at(plot, goalCenter + 8, sr, rise + 8)), Color3.fromRGB(148, 163, 184), Enum.Material.Cobblestone)
			makePart(lvFolder, "TowerRoof", Vector3.new(6, 5, 6), CFrame.new(at(plot, goalCenter + 8, sr, rise + 18.5)), Color3.fromRGB(79, 70, 229), Enum.Material.SmoothPlastic, { class = "WedgePart" })
		end
	elseif theme.arch == "observatory" then
		makePart(lvFolder, "Dome", Vector3.new(11, 11, 11), CFrame.new(at(plot, goalCenter + 8, -8, rise + 2)), Color3.fromRGB(226, 232, 240), Enum.Material.Marble, { shape = Enum.PartType.Ball })
		makePart(lvFolder, "Telescope", Vector3.new(1.4, 1.4, 8), cfAt(plot, goalCenter + 8, -8, rise + 7, CFrame.Angles(0.6, 0.4, 0)), Color3.fromRGB(56, 189, 248), Enum.Material.Metal, { collide = false })
	elseif theme.arch == "crown" then
		makePart(lvFolder, "CrownBase", Vector3.new(2, 8, 8), CFrame.new(at(plot, goalCenter + 4, 0, rise + 14)) * CFrame.Angles(0, 0, math.pi / 2), Color3.fromRGB(250, 204, 21), Enum.Material.Metal, { collide = false, shape = Enum.PartType.Cylinder })
		for i = 1, 6 do
			local a = i / 6 * math.pi * 2
			makePart(lvFolder, "CrownSpike", Vector3.new(0.9, 2.6, 0.9), CFrame.new(at(plot, goalCenter + 4, 0, rise + 16) + Vector3.new(math.cos(a) * 3.4, 0, math.sin(a) * 3.4)), Color3.fromRGB(253, 224, 71), Enum.Material.Neon, { collide = false })
		end
	elseif theme.arch == "volcano" then
		makePart(lvFolder, "Volcano", Vector3.new(14, 12, 14), CFrame.new(at(plot, goalCenter + 9, -9, rise + 4)), Color3.fromRGB(68, 64, 60), Enum.Material.Basalt, { class = "Part" })
	elseif theme.arch == "garden" then
		for k = 1, 3 do
			spawnTree(lvFolder, at(plot, goalCenter + 8, -12 + k * 6, rise), "sakura", rng)
		end
	end

	-- зона победы вокруг флага
	local winZone = makePart(lvFolder, "WinZone", Vector3.new(10, 8, 10), CFrame.new(flagBase + UP * 4), Color3.new(1, 1, 1), Enum.Material.SmoothPlastic, { collide = false, transparency = 1 })
	winZone.CanTouch = true
	local busy = false
	winZone.Touched:Connect(function(hit)
		local plr = Players:GetPlayerFromCharacter(hit.Parent)
		if plr ~= plot.owner or busy then return end
		if plot.wonLevels[lv.id] then
			plot.currentSpawn = flagBase - plot.dir * 3 + UP * 4.5
			return
		end
		busy = true
		if plot.solved[lv.id] then
			plot.currentSpawn = flagBase - plot.dir * 3 + UP * 4.5
			fw:Emit(90)
			if plot.onWin then plot.onWin(lv.id) end
		end
		task.delay(1.5, function() busy = false end)
	end)

	-- ── ворота к следующему уровню ──
	if idx < #Config.LEVELS then
		local gateF = goalCenter + 14
		local gateCF = cfAt(plot, gateF, 0, rise)
		for _, s in ipairs({ -1, 1 }) do
			makePart(lvFolder, "GatePost", Vector3.new(1.6, 10, 1.6), gateCF * CFrame.new(s * 5.5, 5, 0), Color3.fromRGB(100, 116, 139), Enum.Material.Cobblestone)
			makePart(lvFolder, "GateOrb", Vector3.new(1.8, 1.8, 1.8), gateCF * CFrame.new(s * 5.5, 10.6, 0), theme.accent, Enum.Material.Neon, { collide = false, shape = Enum.PartType.Ball })
		end
		local wall = makePart(lvFolder, "LockWall", Vector3.new(9.4, 9, 0.6), gateCF * CFrame.new(0, 4.5, 0), Color3.fromRGB(147, 197, 253), Enum.Material.ForceField, { transparency = 0.1 })
		local lockBbg = label3D(wall, "🔒", UDim2.fromOffset(64, 64), Vector3.new(0, 1, 0), nil, 80)
		-- невидимые стенки по бокам ворот, чтобы не обойти край
		local walls = { wall }
		for _, s in ipairs({ -1, 1 }) do
			table.insert(walls, makePart(lvFolder, "LockSide", Vector3.new(10, 12, 1), gateCF * CFrame.new(s * 11, 6, 0), Color3.new(1, 1, 1), Enum.Material.SmoothPlastic, { transparency = 1 }))
		end
		local link = makeGrowBridge(lvFolder, plot, gateF, E + STEP - 19, 8, rise, Color3.fromRGB(196, 140, 90), Enum.Material.WoodPlanks, "LinkPlank", 0)
		biome.unlock = function(instant)
			if biome.unlocked then return end
			biome.unlocked = true
			for _, w in ipairs(walls) do w.CanCollide = false end
			lockBbg.Enabled = false
			if instant then
				wall.Transparency = 1
				link.grow(true)
			else
				TweenService:Create(wall, TweenInfo.new(0.8), { Transparency = 1 }):Play()
				Bridge.Burst(wall.Position, theme.accent, 40, lvFolder)
				task.spawn(link.grow)
			end
		end
		biome.lock = function()
			biome.unlocked = false
			for _, w in ipairs(walls) do w.CanCollide = true end
			wall.Transparency = 0.1
			lockBbg.Enabled = true
			link.hide()
		end
	end
end

-- ───────────── лагерь (уровень 8-1) ─────────────
local function buildCamp(plot, folder, rng)
	local b = plot.biomes["8-1"]
	-- Мастерская кода: навес, большой экран
	local base = at(plot, -6, 20, 0)
	makePart(folder, "WorkshopFloor", Vector3.new(12, 0.6, 18), CFrame.lookAt(base + UP * 0.3, base + UP * 0.3 + plot.dir), Color3.fromRGB(145, 98, 60), Enum.Material.WoodPlanks)
	for _, o in ipairs({ { -8, -5 }, { 8, -5 }, { -8, 5 }, { 8, 5 } }) do
		makePart(folder, "Pillar", Vector3.new(0.8, 11, 0.8), CFrame.new(base + plot.dir * o[1] + plot.right * o[2] + UP * 5.5), Color3.fromRGB(102, 66, 40), Enum.Material.Wood)
	end
	makePart(folder, "Roof", Vector3.new(14, 0.8, 20), CFrame.lookAt(base + UP * 11.2, base + UP * 11.2 + plot.dir), Color3.fromRGB(180, 96, 52), Enum.Material.WoodPlanks)
	makePart(folder, "RoofTrim", Vector3.new(14.4, 0.4, 20.4), CFrame.lookAt(base + UP * 11.7, base + UP * 11.7 + plot.dir), Color3.fromRGB(132, 204, 22), Enum.Material.Neon, { collide = false })
	local scrPos = base + plot.right * 5 + UP * 4.8
	b.screenCode, b.screenVerdict, b.screenHeader = makeScreen(folder, CFrame.lookAt(scrPos, scrPos - plot.right), 14, 7.4, "🌉 8-1 · Мастерская кода")
	label3D(makePart(folder, "WorkshopSignAnchor", Vector3.one, CFrame.new(base + UP * 13), Color3.new(1, 1, 1), nil, { collide = false, transparency = 1 }),
		"💻 Мастерская кода", UDim2.fromOffset(240, 44), Vector3.new(0, 1.5, 0), Color3.fromRGB(190, 242, 100), 90)

	-- Костёр, брёвна, палатка
	local fire = at(plot, -26, -10, 0)
	for k = 1, 3 do
		local log = makePart(folder, "FireLog", Vector3.new(3, 0.6, 0.6), CFrame.new(fire + UP * 0.3) * CFrame.Angles(0, k * 1.05, 0), Color3.fromRGB(82, 52, 34), Enum.Material.Wood)
		if k == 1 then
			local f = Instance.new("Fire", log)
			f.Size = 5
			f.Heat = 8
			local pl = Instance.new("PointLight", log)
			pl.Color = Color3.fromRGB(255, 170, 80)
			pl.Range = 22
			pl.Brightness = 1.6
		end
	end
	for k = 0, 7 do
		local a = k / 8 * math.pi * 2
		makePart(folder, "FireStone", Vector3.new(0.9, 0.6, 0.9), CFrame.new(fire + Vector3.new(math.cos(a) * 2.2, 0.3, math.sin(a) * 2.2)), Color3.fromRGB(120, 113, 108), Enum.Material.Slate)
	end
	makePart(folder, "BenchLog", Vector3.new(5, 1, 1), CFrame.lookAt(fire + plot.right * 4.5 + UP * 0.5, fire + plot.right * 4.5 + UP * 0.5 + plot.dir), Color3.fromRGB(115, 76, 46), Enum.Material.Wood)
	local tent = at(plot, -34, -18, 0)
	makePart(folder, "TentL", Vector3.new(7, 5, 3.5), CFrame.lookAt(tent + UP * 2.5 - plot.right * 1.75, tent + UP * 2.5 - plot.right * 1.75 + plot.dir), Color3.fromRGB(249, 115, 22), Enum.Material.Fabric, { class = "WedgePart" })
	makePart(folder, "TentR", Vector3.new(7, 5, 3.5), CFrame.lookAt(tent + UP * 2.5 + plot.right * 1.75, tent + UP * 2.5 + plot.right * 1.75 - plot.dir), Color3.fromRGB(234, 88, 12), Enum.Material.Fabric, { class = "WedgePart" })
	spawnFlowers(folder, at(plot, -30, 6, 0), rng)
	spawnLantern(folder, at(plot, -20, -4, 0))
end

local function buildPlot(plot)
	local folder = Instance.new("Folder")
	folder.Name = "Plot_" .. plot.index
	folder.Parent = Workspace
	plot.folder = folder
	plot.rayParams = RaycastParams.new()
	plot.rayParams.FilterType = Enum.RaycastFilterType.Exclude
	plot.rayParams.RespectCanCollide = true
	local rng = Random.new(100 + plot.index)

	for idx, lv in ipairs(Config.LEVELS) do
		buildLevel(plot, folder, idx, lv, rng)
		task.wait()
	end
	buildCamp(plot, folder, rng)
	-- точка появления: чуть выше поверхности стартового острова
	local wanted = at(plot, -22, 0, 0)
	local groundY = plot.center.Y
	plot.spawnPos = Vector3.new(wanted.X, groundY + 4.5, wanted.Z)
	plot.currentSpawn = plot.spawnPos
	local padPos = Vector3.new(wanted.X, groundY - 0.3, wanted.Z)
	local spawnPad = Instance.new("SpawnLocation")
	spawnPad.Name = "PlotSpawn"
	spawnPad.Size = Vector3.new(8, 1, 8)
	spawnPad.CFrame = CFrame.lookAt(padPos, padPos + plot.dir)
	spawnPad.Anchored = true
	spawnPad.CanCollide = false
	spawnPad.Transparency = 1
	spawnPad.Neutral = true
	spawnPad.Duration = 0
	spawnPad.Parent = folder
	plot.spawnPad = spawnPad

	-- страховка от падения: кто ниже островов на 30 studs — возвращается на точку возрождения
	task.spawn(function()
		while folder.Parent do
			local char = plot.owner and plot.owner.Character
			local hrp = char and char:FindFirstChild("HumanoidRootPart")
			if hrp and plot.ready and hrp.Position.Y < plot.center.Y - 30 then
				hrp.AssemblyLinearVelocity = Vector3.zero
				hrp.CFrame = CFrame.lookAt(plot.currentSpawn, plot.currentSpawn + plot.dir)
				effectEv:FireClient(plot.owner, "fall")
				if plot.onFall then plot.onFall() end
			end
			task.wait(0.25)
		end
	end)

	plot.resetWorld = function()
		for _, b in pairs(plot.biomes) do
			if b.kept then
				b.kept:Destroy()
				b.kept = nil
			end
			if b.reset then b.reset() end
			if b.lock then b.lock() end
			if b.screenCode then b.screenCode.Text = "/* style.css появится здесь\n   после «Отправить в мир» */" end
			if b.screenVerdict then b.screenVerdict.Text = "" end
		end
	end
	plot.resetWorld()

	Mascot.Create(plot)
	plot.ready = true
end

setupLighting()
setupTerrainColors()
Plots.Init(buildPlot)
task.spawn(setupCloudSea)

tpEv.OnServerEvent:Connect(function(player, levelId)
	local plot = Plots.Get(player)
	if type(levelId) ~= "string" or not plot or not plot.biomes[levelId] then return end
	local idx = Config.LEVEL_INDEX[levelId]
	if idx and idx > 1 and not plot.wonLevels[Config.LEVELS[idx - 1].id] then return end -- закрытый уровень
	local b = plot.biomes[levelId]
	plot.currentSpawn = b.entrySpawn
	local hrp = player.Character and player.Character:FindFirstChild("HumanoidRootPart")
	if hrp then
		hrp.AssemblyLinearVelocity = Vector3.zero
		hrp.CFrame = CFrame.lookAt(b.entrySpawn, b.entrySpawn + plot.dir)
	end
end)

dropEv.OnServerEvent:Connect(function(player)
	local plot = Plots.Get(player)
	if not plot then return end
	-- взять — через подсказку [E] у предмета; эта кнопка только кладёт
	if plot.carrying then
		Bridge.Drop(plot, player)
	end
end)

local joined = {}

local function onCharacter(player, plot, char)
	local hum = char:WaitForChild("Humanoid", 10)
	local hrp = char:WaitForChild("HumanoidRootPart", 10)
	if not hum or not hrp then return end
	if not char.Parent then char.AncestryChanged:Wait() end
	task.wait()
	-- возрождаемся на последней контрольной точке
	local pos = plot.currentSpawn or plot.spawnPos
	hrp.AssemblyLinearVelocity = Vector3.zero
	char:PivotTo(CFrame.lookAt(pos, pos + plot.dir))
	hum.Died:Once(function()
		task.wait(2)
		if player.Parent then player:LoadCharacter() end
	end)
end

local function onPlayer(player)
	if joined[player] then return end
	joined[player] = true
	local plot = Plots.Assign(player)
	if not plot then
		warn("Все острова заняты: " .. player.Name)
		return
	end
	while not plot.ready do task.wait(0.1) end
	if not player.Parent then return end
	player.RespawnLocation = plot.spawnPad
	player.CharacterAdded:Connect(function(char) onCharacter(player, plot, char) end)
	player:LoadCharacter()
end

Players.PlayerAdded:Connect(onPlayer)
for _, player in ipairs(Players:GetPlayers()) do
	task.spawn(onPlayer, player)
end
Players.PlayerRemoving:Connect(function(player)
	joined[player] = nil
	Plots.Release(player)
end)
