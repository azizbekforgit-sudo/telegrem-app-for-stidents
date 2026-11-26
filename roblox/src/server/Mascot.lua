-- Все 11 3D-питомцев Зубрика (в стиле public/mascots.js) с Highlight-обводкой,
-- характерными деталями (бантик, мандарин, жабры, капюшон, галстук, наушники, молнии),
-- живыми глазами и плавной анимацией следования за учеником.
local RunService = game:GetService("RunService")

local Mascot = {}

local MASCOT_META = {
	mimi = { name = "Мими", outline = Color3.fromRGB(255, 143, 184) },
	kapi = { name = "Капи", outline = Color3.fromRGB(230, 170, 116) },
	dino = { name = "Дино", outline = Color3.fromRGB(79, 207, 134) },
	axi  = { name = "Акси", outline = Color3.fromRGB(255, 126, 176) },
	boo  = { name = "Бу", outline = Color3.fromRGB(168, 85, 247) },
	ano  = { name = "Ано", outline = Color3.fromRGB(148, 163, 184) },
	zip  = { name = "Зип", outline = Color3.fromRGB(250, 204, 21) },
	ugo  = { name = "Уголёк", outline = Color3.fromRGB(255, 154, 31) },
	fox  = { name = "Рыжик", outline = Color3.fromRGB(249, 115, 22) },
	bot  = { name = "Бит", outline = Color3.fromRGB(56, 189, 248) },
	plu  = { name = "Шарки", outline = Color3.fromRGB(96, 165, 250) },
}

local function makePart(parent, name, size, color, className, material)
	local p = Instance.new(className or "Part")
	p.Name = name
	p.Size = size
	p.Color = color
	p.Material = material or Enum.Material.SmoothPlastic
	p.Anchored = true
	p.CanCollide = false
	p.CastShadow = false
	p.TopSurface = Enum.SurfaceType.Smooth
	p.BottomSurface = Enum.SurfaceType.Smooth
	p.Parent = parent
	return p
end

local function addFace(add, headOff, spread, eyeY, eyeZ, irisColor, eyeScale)
	local s = eyeScale or 1
	local white = Color3.new(1, 1, 1)
	local dark = Color3.fromRGB(20, 18, 28)
	local iris = irisColor or Color3.fromRGB(59, 130, 246)
	local blush = Color3.fromRGB(255, 138, 178)

	for _, side in ipairs({ -1, 1 }) do
		local t = side < 0 and "L" or "R"
		add("EyeW" .. t, Vector3.new(0.42 * s, 0.50 * s, 0.18), white, headOff + Vector3.new(side * spread, eyeY, eyeZ), "Part", Enum.Material.SmoothPlastic, nil, Enum.PartType.Ball)
		add("Iris" .. t, Vector3.new(0.32 * s, 0.39 * s, 0.16), iris, headOff + Vector3.new(side * spread, eyeY, eyeZ - 0.045), "Part", Enum.Material.SmoothPlastic, nil, Enum.PartType.Ball)
		add("Pupil" .. t, Vector3.new(0.20 * s, 0.25 * s, 0.14), dark, headOff + Vector3.new(side * spread, eyeY, eyeZ - 0.085), "Part", Enum.Material.SmoothPlastic, nil, Enum.PartType.Ball)
		add("Glint" .. t, Vector3.new(0.11 * s, 0.11 * s, 0.08), white, headOff + Vector3.new(side * spread + 0.06 * s, eyeY + 0.09 * s, eyeZ - 0.135), "Part", Enum.Material.Neon, nil, Enum.PartType.Ball)
		add("Glint2" .. t, Vector3.new(0.05 * s, 0.05 * s, 0.06), white, headOff + Vector3.new(side * spread - 0.05 * s, eyeY - 0.07 * s, eyeZ - 0.13), "Part", Enum.Material.Neon, nil, Enum.PartType.Ball)
		add("Cheek" .. t, Vector3.new(0.38 * s, 0.20 * s, 0.12), blush, headOff + Vector3.new(side * (spread + 0.18 * s), eyeY - 0.28 * s, eyeZ + 0.06), "Part", Enum.Material.SmoothPlastic, nil, Enum.PartType.Ball)
	end
end

local function addPaws(add, col, footCol, spreadX, footY, armY, armZ)
	local fc = footCol or col
	add("FootL", Vector3.new(0.62, 0.44, 0.82), fc, Vector3.new(-spreadX, footY, -0.35), "Part", nil, nil, Enum.PartType.Ball)
	add("FootR", Vector3.new(0.62, 0.44, 0.82), fc, Vector3.new(spreadX, footY, -0.35), "Part", nil, nil, Enum.PartType.Ball)
	add("PawL", Vector3.new(0.52, 0.44, 0.52), col, Vector3.new(-(spreadX + 0.55), armY, armZ or -0.5), "Part", nil, CFrame.Angles(0, 0, 0.3), Enum.PartType.Ball)
	add("PawR", Vector3.new(0.52, 0.44, 0.52), col, Vector3.new(spreadX + 0.55, armY, armZ or -0.5), "Part", nil, CFrame.Angles(0, 0, -0.3), Enum.PartType.Ball)
end

local function buildBody(model, kind)
	for _, ch in ipairs(model:GetChildren()) do
		if ch:IsA("BasePart") or ch:IsA("Highlight") then
			ch:Destroy()
		end
	end

	local offsets = {}
	local function add(name, size, color, offset, className, mat, rot, shape)
		local p = makePart(model, name, size, color, className, mat)
		if shape and p:IsA("Part") then
			p.Shape = shape
		end
		table.insert(offsets, { p = p, cf = CFrame.new(offset) * (rot or CFrame.new()) })
		return p
	end

	local headPart
	if kind == "plu" then
		-- Шарки: голубой акулёнок-программист с плавниками и наушниками
		local blue = Color3.fromRGB(92, 164, 236)
		local deep = Color3.fromRGB(29, 106, 194)
		local belly = Color3.fromRGB(240, 249, 255)
		local hpCol = Color3.fromRGB(30, 41, 59)
		local hpGlow = Color3.fromRGB(56, 189, 248)

		local root = add("Root", Vector3.new(2.35, 2.0, 3.4), blue, Vector3.new(0, 0, 0), "Part", nil, nil, Enum.PartType.Ball)
		model.PrimaryPart = root
		add("Belly", Vector3.new(1.85, 1.35, 2.7), belly, Vector3.new(0, -0.45, -0.15), "Part", nil, nil, Enum.PartType.Ball)
		headPart = add("Head", Vector3.new(2.2, 1.85, 2.3), blue, Vector3.new(0, 0.58, -1.1), "Part", nil, nil, Enum.PartType.Ball)
		add("Snout", Vector3.new(1.55, 0.78, 1.05), belly, Vector3.new(0, 0.22, -1.92), "Part", nil, nil, Enum.PartType.Ball)
		add("Smile", Vector3.new(0.88, 0.16, 0.2), Color3.new(1, 1, 1), Vector3.new(0, 0.18, -2.35), "Part")
		-- Плавники
		add("FinTop", Vector3.new(0.26, 1.45, 1.25), deep, Vector3.new(0, 1.5, 0.25), "WedgePart", nil, CFrame.Angles(0, math.pi, 0))
		add("FinL", Vector3.new(0.22, 0.92, 1.1), deep, Vector3.new(-1.42, -0.12, -0.1), "WedgePart", nil, CFrame.Angles(0, 0, math.rad(72)))
		add("FinR", Vector3.new(0.22, 0.92, 1.1), deep, Vector3.new(1.42, -0.12, -0.1), "WedgePart", nil, CFrame.Angles(0, 0, math.rad(-72)))
		add("TailTop", Vector3.new(0.24, 1.3, 0.95), deep, Vector3.new(0, 0.58, 2.05), "WedgePart", nil, CFrame.Angles(0.35, math.pi, 0))
		add("TailBot", Vector3.new(0.24, 0.95, 0.85), deep, Vector3.new(0, -0.35, 2.05), "WedgePart", nil, CFrame.Angles(math.pi - 0.35, 0, 0))
		-- Наушники программиста
		add("HeadbandTop", Vector3.new(2.15, 0.22, 0.32), hpCol, Vector3.new(0, 1.56, -1.0), "Part", Enum.Material.Metal)
		add("EarCupL", Vector3.new(0.36, 0.88, 0.88), hpCol, Vector3.new(-1.14, 0.72, -1.0), "Part", Enum.Material.Metal, nil, Enum.PartType.Cylinder)
		add("EarGlowL", Vector3.new(0.12, 0.56, 0.56), hpGlow, Vector3.new(-1.3, 0.72, -1.0), "Part", Enum.Material.Neon, nil, Enum.PartType.Cylinder)
		add("EarCupR", Vector3.new(0.36, 0.88, 0.88), hpCol, Vector3.new(1.14, 0.72, -1.0), "Part", Enum.Material.Metal, nil, Enum.PartType.Cylinder)
		add("EarGlowR", Vector3.new(0.12, 0.56, 0.56), hpGlow, Vector3.new(1.3, 0.72, -1.0), "Part", Enum.Material.Neon, nil, Enum.PartType.Cylinder)
		addFace(add, Vector3.new(0, 0.58, -1.1), 0.56, 0.24, -1.0, Color3.fromRGB(14, 165, 233), 1.05)

	elseif kind == "mimi" then
		-- Мими: бело-розовый котёнок с розовым бантиком и усиками
		local fur = Color3.fromRGB(252, 240, 247)
		local pinkIn = Color3.fromRGB(255, 182, 212)
		local bowCol = Color3.fromRGB(255, 93, 154)
		local root = add("Root", Vector3.new(2.1, 1.9, 2.4), fur, Vector3.new(0, 0, 0), "Part", nil, nil, Enum.PartType.Ball)
		model.PrimaryPart = root
		headPart = add("Head", Vector3.new(2.15, 1.9, 2.0), fur, Vector3.new(0, 1.02, -0.75), "Part", nil, nil, Enum.PartType.Ball)
		add("EarL", Vector3.new(0.46, 0.9, 0.48), fur, Vector3.new(-0.72, 2.02, -0.68), "WedgePart", nil, CFrame.Angles(0, 0, 0.22))
		add("EarInL", Vector3.new(0.24, 0.54, 0.25), pinkIn, Vector3.new(-0.72, 1.98, -0.82), "WedgePart", nil, CFrame.Angles(0, 0, 0.22))
		add("EarR", Vector3.new(0.46, 0.9, 0.48), fur, Vector3.new(0.72, 2.02, -0.68), "WedgePart", nil, CFrame.Angles(0, 0, -0.22))
		add("EarInR", Vector3.new(0.24, 0.54, 0.25), pinkIn, Vector3.new(0.72, 1.98, -0.82), "WedgePart", nil, CFrame.Angles(0, 0, -0.22))
		-- Розовый бантик
		add("BowL", Vector3.new(0.48, 0.34, 0.22), bowCol, Vector3.new(0.44, 1.92, -1.05), "WedgePart", nil, CFrame.Angles(0, 0, 0.45))
		add("BowR", Vector3.new(0.48, 0.34, 0.22), bowCol, Vector3.new(0.92, 1.78, -1.05), "WedgePart", nil, CFrame.Angles(0, math.pi, -0.45))
		add("BowKnot", Vector3.new(0.24, 0.24, 0.24), Color3.fromRGB(236, 72, 153), Vector3.new(0.68, 1.85, -1.1), "Part", nil, nil, Enum.PartType.Ball)
		-- Носик, усики, хвостик
		add("Nose", Vector3.new(0.24, 0.16, 0.16), Color3.fromRGB(255, 176, 59), Vector3.new(0, 0.88, -1.75), "Part", nil, nil, Enum.PartType.Ball)
		for _, s in ipairs({ -1, 1 }) do
			for wi = -1, 1, 2 do
				add("Whisk" .. s .. wi, Vector3.new(0.55, 0.05, 0.05), Color3.fromRGB(180, 154, 168), Vector3.new(s * 1.05, 0.88 + wi * 0.12, -1.45), "Part", nil, CFrame.Angles(0, 0, s * wi * 0.15))
			end
		end
		add("Tail1", Vector3.new(0.55, 0.55, 1.25), fur, Vector3.new(0, 0.15, 1.35), "Part", nil, CFrame.Angles(0.35, 0, 0), Enum.PartType.Ball)
		add("Tail2", Vector3.new(0.48, 0.48, 0.9), pinkIn, Vector3.new(0, 0.55, 1.95), "Part", nil, nil, Enum.PartType.Ball)
		addPaws(add, fur, pinkIn, 0.62, -0.82, 0.2, -0.7)
		addFace(add, Vector3.new(0, 1.02, -0.75), 0.48, 0.12, -0.92, Color3.fromRGB(236, 72, 153), 1.02)

	elseif kind == "ugo" then
		-- Уголёк: чёрный котик с большими оранжевыми светящимися глазами
		local black = Color3.fromRGB(29, 28, 34)
		local coralIn = Color3.fromRGB(242, 135, 111)
		local amber = Color3.fromRGB(255, 122, 0)
		local gold = Color3.fromRGB(255, 210, 61)
		local root = add("Root", Vector3.new(2.05, 1.85, 2.35), black, Vector3.new(0, 0, 0), "Part", nil, nil, Enum.PartType.Ball)
		model.PrimaryPart = root
		headPart = add("Head", Vector3.new(2.1, 1.85, 1.95), black, Vector3.new(0, 1.0, -0.75), "Part", nil, nil, Enum.PartType.Ball)
		add("EarL", Vector3.new(0.48, 0.92, 0.48), black, Vector3.new(-0.7, 2.0, -0.68), "WedgePart", nil, CFrame.Angles(0, 0, 0.2))
		add("EarInL", Vector3.new(0.24, 0.54, 0.24), coralIn, Vector3.new(-0.7, 1.96, -0.82), "WedgePart", nil, CFrame.Angles(0, 0, 0.2))
		add("EarR", Vector3.new(0.48, 0.92, 0.48), black, Vector3.new(0.7, 2.0, -0.68), "WedgePart", nil, CFrame.Angles(0, 0, -0.2))
		add("EarInR", Vector3.new(0.24, 0.54, 0.24), coralIn, Vector3.new(0.7, 1.96, -0.82), "WedgePart", nil, CFrame.Angles(0, 0, -0.2))
		add("Nose", Vector3.new(0.24, 0.16, 0.16), Color3.fromRGB(255, 143, 160), Vector3.new(0, 0.85, -1.7), "Part", nil, nil, Enum.PartType.Ball)
		-- Светящиеся оранжево-золотые глаза (как в mascots.js)
		for _, side in ipairs({ -1, 1 }) do
			local t = side < 0 and "L" or "R"
			add("OrbRing" .. t, Vector3.new(0.56, 0.56, 0.18), amber, Vector3.new(side * 0.48, 1.15, -1.62), "Part", Enum.Material.Neon, nil, Enum.PartType.Ball)
			add("OrbGold" .. t, Vector3.new(0.46, 0.46, 0.18), gold, Vector3.new(side * 0.48, 1.15, -1.66), "Part", Enum.Material.Neon, nil, Enum.PartType.Ball)
			add("OrbPupil" .. t, Vector3.new(0.32, 0.34, 0.16), Color3.fromRGB(11, 11, 15), Vector3.new(side * 0.48, 1.15, -1.70), "Part", nil, nil, Enum.PartType.Ball)
			add("OrbGlint" .. t, Vector3.new(0.12, 0.12, 0.08), Color3.new(1, 1, 1), Vector3.new(side * 0.48 + 0.07, 1.24, -1.76), "Part", Enum.Material.Neon, nil, Enum.PartType.Ball)
		end
		add("Tail1", Vector3.new(0.46, 0.46, 1.3), black, Vector3.new(-0.35, 0.15, 1.35), "Part", nil, CFrame.Angles(0.3, -0.4, 0), Enum.PartType.Ball)
		add("Tail2", Vector3.new(0.44, 0.44, 1.0), black, Vector3.new(-0.85, 0.65, 1.85), "Part", nil, nil, Enum.PartType.Ball)
		addPaws(add, black, black, 0.6, -0.82, 0.2, -0.7)

	elseif kind == "fox" then
		-- Рыжик: рыжий лис с пышным белокончиковым хвостом, зелёной рубашкой и полосатым галстуком
		local orange = Color3.fromRGB(240, 123, 42)
		local cream = Color3.fromRGB(255, 241, 220)
		local darkEar = Color3.fromRGB(91, 42, 23)
		local shirt = Color3.fromRGB(167, 217, 87)
		local tieCol = Color3.fromRGB(75, 63, 158)
		local root = add("Root", Vector3.new(2.1, 1.9, 2.5), orange, Vector3.new(0, 0, 0), "Part", nil, nil, Enum.PartType.Ball)
		model.PrimaryPart = root
		add("Shirt", Vector3.new(2.02, 0.95, 2.2), shirt, Vector3.new(0, -0.25, -0.25), "Part", nil, nil, Enum.PartType.Ball)
		add("TieTop", Vector3.new(0.28, 0.24, 0.2), tieCol, Vector3.new(0, 0.15, -1.28), "Part")
		add("TieBody", Vector3.new(0.26, 0.78, 0.18), tieCol, Vector3.new(0, -0.32, -1.32), "WedgePart", nil, CFrame.Angles(math.pi, 0, 0))
		add("TieStripe", Vector3.new(0.28, 0.1, 0.2), Color3.fromRGB(182, 172, 255), Vector3.new(0, -0.25, -1.33), "Part")
		headPart = add("Head", Vector3.new(2.15, 1.8, 2.05), orange, Vector3.new(0, 1.0, -0.8), "Part", nil, nil, Enum.PartType.Ball)
		add("Muzzle", Vector3.new(1.4, 0.72, 0.95), cream, Vector3.new(0, 0.72, -1.62), "Part", nil, nil, Enum.PartType.Ball)
		add("Nose", Vector3.new(0.28, 0.2, 0.22), Color3.fromRGB(43, 27, 23), Vector3.new(0, 0.9, -2.06), "Part", nil, nil, Enum.PartType.Ball)
		add("EarL", Vector3.new(0.5, 1.05, 0.5), orange, Vector3.new(-0.72, 2.05, -0.7), "WedgePart", nil, CFrame.Angles(0, 0, 0.22))
		add("EarInL", Vector3.new(0.24, 0.62, 0.24), darkEar, Vector3.new(-0.72, 2.0, -0.86), "WedgePart", nil, CFrame.Angles(0, 0, 0.22))
		add("EarR", Vector3.new(0.5, 1.05, 0.5), orange, Vector3.new(0.72, 2.05, -0.7), "WedgePart", nil, CFrame.Angles(0, 0, -0.22))
		add("EarInR", Vector3.new(0.24, 0.62, 0.24), darkEar, Vector3.new(0.72, 2.0, -0.86), "WedgePart", nil, CFrame.Angles(0, 0, -0.22))
		-- Пышный хвост с белым кончиком
		add("Tail1", Vector3.new(0.95, 0.95, 1.5), orange, Vector3.new(0, 0.15, 1.45), "Part", nil, CFrame.Angles(0.3, 0, 0), Enum.PartType.Ball)
		add("TailTip", Vector3.new(0.8, 0.8, 1.05), Color3.new(1, 1, 1), Vector3.new(0, 0.55, 2.15), "Part", nil, nil, Enum.PartType.Ball)
		addPaws(add, orange, darkEar, 0.62, -0.84, 0.18, -0.72)
		addFace(add, Vector3.new(0, 1.0, -0.8), 0.48, 0.18, -0.94, Color3.fromRGB(245, 158, 11), 0.96)

	elseif kind == "dino" then
		-- Дино: зелёный динозаврик с неоново-золотыми шипами и хвостом
		local green = Color3.fromRGB(79, 207, 134)
		local belly = Color3.fromRGB(232, 255, 217)
		local spike = Color3.fromRGB(255, 210, 94)
		local root = add("Root", Vector3.new(2.25, 2.05, 2.8), green, Vector3.new(0, 0, 0), "Part", nil, nil, Enum.PartType.Ball)
		model.PrimaryPart = root
		add("Belly", Vector3.new(1.75, 1.4, 2.1), belly, Vector3.new(0, -0.35, -0.28), "Part", nil, nil, Enum.PartType.Ball)
		headPart = add("Head", Vector3.new(2.05, 1.78, 2.15), green, Vector3.new(0, 1.04, -0.95), "Part", nil, nil, Enum.PartType.Ball)
		add("Tail1", Vector3.new(1.25, 1.05, 1.35), green, Vector3.new(0, -0.18, 1.45), "Part", nil, nil, Enum.PartType.Ball)
		add("Tail2", Vector3.new(0.75, 0.65, 1.15), green, Vector3.new(0, -0.15, 2.25), "Part", nil, nil, Enum.PartType.Ball)
		for i = 1, 4 do
			add("Spike" .. i, Vector3.new(0.3, 0.66, 0.58), spike, Vector3.new(0, 1.75 - i * 0.28, -0.75 + i * 0.58), "WedgePart", Enum.Material.Neon, CFrame.Angles(0, math.pi, 0))
		end
		addPaws(add, green, Color3.fromRGB(62, 180, 114), 0.66, -0.9, 0.25, -0.8)
		addFace(add, Vector3.new(0, 1.04, -0.95), 0.5, 0.18, -0.98, Color3.fromRGB(22, 163, 74), 1.02)

	elseif kind == "axi" then
		-- Акси: розовый аксолотль с 6 перистыми жабрами и пятнышками
		local pink = Color3.fromRGB(255, 178, 207)
		local gillCol = Color3.fromRGB(255, 95, 158)
		local gillTip = Color3.fromRGB(255, 143, 190)
		local root = add("Root", Vector3.new(2.1, 1.9, 2.55), pink, Vector3.new(0, 0, 0), "Part", nil, nil, Enum.PartType.Ball)
		model.PrimaryPart = root
		add("Belly", Vector3.new(1.65, 1.3, 2.0), Color3.fromRGB(255, 224, 236), Vector3.new(0, -0.35, -0.2), "Part", nil, nil, Enum.PartType.Ball)
		headPart = add("Head", Vector3.new(2.25, 1.8, 2.0), pink, Vector3.new(0, 0.96, -0.82), "Part", nil, nil, Enum.PartType.Ball)
		for _, s in ipairs({ -1, 1 }) do
			for gi, gy in ipairs({ 1.42, 1.04, 0.66 }) do
				local ang = (gi - 2) * 0.35 * s
				add("Gill" .. s .. gi, Vector3.new(0.85, 0.24, 0.24), gillCol, Vector3.new(s * 1.32, gy, -0.75), "Part", nil, CFrame.Angles(0, 0, ang), Enum.PartType.Ball)
				add("GillTip" .. s .. gi, Vector3.new(0.28, 0.28, 0.28), gillTip, Vector3.new(s * 1.7, gy + (gi == 1 and 0.14 or gi == 3 and -0.14 or 0), -0.75), "Part", Enum.Material.Neon, nil, Enum.PartType.Ball)
			end
		end
		add("TailFin", Vector3.new(0.22, 1.0, 1.5), gillTip, Vector3.new(0, 0.15, 1.55), "WedgePart", nil, CFrame.Angles(0, math.pi, 0))
		addPaws(add, pink, pink, 0.6, -0.82, 0.2, -0.72)
		addFace(add, Vector3.new(0, 0.96, -0.82), 0.54, 0.12, -0.92, Color3.fromRGB(219, 39, 119), 0.98)

	elseif kind == "boo" then
		-- Бу: призрак в тёмном капюшоне со светлым личиком и телефоном
		local hoodCol = Color3.fromRGB(59, 54, 68)
		local innerCol = Color3.fromRGB(14, 12, 19)
		local ghostWhite = Color3.fromRGB(246, 244, 252)
		local root = add("Root", Vector3.new(2.45, 2.6, 2.45), hoodCol, Vector3.new(0, 0.45, 0), "Part", nil, nil, Enum.PartType.Ball)
		model.PrimaryPart = root
		add("HoodPeak", Vector3.new(1.5, 1.15, 1.4), hoodCol, Vector3.new(0, 1.65, 0.25), "WedgePart", nil, CFrame.Angles(0, math.pi, 0))
		add("HoodInner", Vector3.new(1.9, 2.05, 1.3), innerCol, Vector3.new(0, 0.52, -0.58), "Part", nil, nil, Enum.PartType.Ball)
		headPart = add("GhostFace", Vector3.new(1.62, 1.8, 1.1), ghostWhite, Vector3.new(0, 0.56, -0.78), "Part", nil, nil, Enum.PartType.Ball)
		-- Телефон в руке («Ну что, решил тест?»)
		add("PhoneBody", Vector3.new(0.45, 0.88, 0.14), Color3.fromRGB(242, 240, 245), Vector3.new(1.38, 0.55, -0.7), "Part", nil, CFrame.Angles(0, 0, -0.2))
		add("PhoneScreen", Vector3.new(0.32, 0.34, 0.08), Color3.fromRGB(147, 210, 255), Vector3.new(1.38, 0.68, -0.76), "Part", Enum.Material.Neon, CFrame.Angles(0, 0, -0.2))
		add("ArmL", Vector3.new(0.62, 0.52, 0.62), hoodCol, Vector3.new(-1.25, 0.2, -0.25), "Part", nil, nil, Enum.PartType.Ball)
		add("ArmR", Vector3.new(0.62, 0.52, 0.62), hoodCol, Vector3.new(1.28, 0.3, -0.55), "Part", nil, nil, Enum.PartType.Ball)
		addFace(add, Vector3.new(0, 0.56, -0.78), 0.36, 0.16, -0.5, Color3.fromRGB(168, 85, 247), 0.88)

	elseif kind == "ano" then
		-- Ано: хакер в тёмном худи, завязках и белой маске с усами
		local hoodie = Color3.fromRGB(42, 41, 51)
		local inner = Color3.fromRGB(15, 14, 20)
		local maskCol = Color3.fromRGB(248, 246, 252)
		local dark = Color3.fromRGB(30, 26, 36)
		local root = add("Root", Vector3.new(2.4, 2.5, 2.4), hoodie, Vector3.new(0, 0.45, 0), "Part", nil, nil, Enum.PartType.Ball)
		model.PrimaryPart = root
		add("HoodInner", Vector3.new(1.9, 2.0, 1.3), inner, Vector3.new(0, 0.52, -0.56), "Part", nil, nil, Enum.PartType.Ball)
		headPart = add("Mask", Vector3.new(1.66, 1.85, 1.05), maskCol, Vector3.new(0, 0.56, -0.78), "Part", nil, nil, Enum.PartType.Ball)
		-- Завязки худи
		add("StringL", Vector3.new(0.1, 0.65, 0.1), Color3.fromRGB(216, 214, 222), Vector3.new(-0.34, -0.52, -1.05), "Part", nil, CFrame.Angles(0, 0, -0.12))
		add("StringR", Vector3.new(0.1, 0.65, 0.1), Color3.fromRGB(216, 214, 222), Vector3.new(0.34, -0.52, -1.05), "Part", nil, CFrame.Angles(0, 0, 0.12))
		-- Знаменитые усы и бородка
		add("StacheL", Vector3.new(0.45, 0.14, 0.14), dark, Vector3.new(-0.24, 0.34, -1.32), "Part", nil, CFrame.Angles(0, 0, 0.25))
		add("StacheR", Vector3.new(0.45, 0.14, 0.14), dark, Vector3.new(0.24, 0.34, -1.32), "Part", nil, CFrame.Angles(0, 0, -0.25))
		add("Goatee", Vector3.new(0.16, 0.32, 0.14), dark, Vector3.new(0, -0.02, -1.26), "WedgePart", nil, CFrame.Angles(math.pi, 0, 0))
		add("ArmL", Vector3.new(0.6, 0.5, 0.6), hoodie, Vector3.new(-1.24, 0.2, -0.25), "Part", nil, nil, Enum.PartType.Ball)
		add("ArmR", Vector3.new(0.6, 0.5, 0.6), hoodie, Vector3.new(1.24, 0.2, -0.25), "Part", nil, nil, Enum.PartType.Ball)
		addFace(add, Vector3.new(0, 0.56, -0.78), 0.36, 0.18, -0.5, Color3.fromRGB(99, 102, 241), 0.85)

	elseif kind == "zip" then
		-- Зип: красный супергерой скорости с белыми очками и золотыми молниями
		local red = Color3.fromRGB(232, 50, 47)
		local skin = Color3.fromRGB(255, 216, 189)
		local gold = Color3.fromRGB(255, 210, 61)
		local root = add("Root", Vector3.new(2.2, 2.35, 2.2), red, Vector3.new(0, 0.38, 0), "Part", nil, nil, Enum.PartType.Ball)
		model.PrimaryPart = root
		headPart = root
		add("Jaw", Vector3.new(1.42, 0.88, 0.85), skin, Vector3.new(0, -0.05, -0.76), "Part", nil, nil, Enum.PartType.Ball)
		add("ChestBolt", Vector3.new(0.32, 0.72, 0.16), gold, Vector3.new(0, -0.45, -1.02), "WedgePart", Enum.Material.Neon, CFrame.Angles(0, 0, 0.3))
		add("EarBoltL", Vector3.new(0.18, 0.72, 0.42), gold, Vector3.new(-1.14, 0.78, -0.1), "WedgePart", Enum.Material.Neon, CFrame.Angles(0, 0, 0.35))
		add("EarBoltR", Vector3.new(0.18, 0.72, 0.42), gold, Vector3.new(1.14, 0.78, -0.1), "WedgePart", Enum.Material.Neon, CFrame.Angles(0, 0, -0.35))
		add("CrownBolt", Vector3.new(0.24, 0.65, 0.38), gold, Vector3.new(0, 1.72, -0.2), "WedgePart", Enum.Material.Neon, CFrame.Angles(0.2, math.pi, 0))
		add("SpeedTrail1", Vector3.new(0.14, 0.14, 1.35), Color3.fromRGB(255, 179, 168), Vector3.new(-0.55, 0.4, 1.45), "Part", Enum.Material.Neon)
		add("SpeedTrail2", Vector3.new(0.14, 0.14, 1.55), gold, Vector3.new(0.55, 0.25, 1.55), "Part", Enum.Material.Neon)
		addPaws(add, red, gold, 0.6, -0.78, 0.1, -0.5)
		addFace(add, Vector3.new(0, 0.38, 0), 0.44, 0.24, -0.98, Color3.fromRGB(59, 130, 246), 1.02)

	elseif kind == "bot" then
		-- Бит: милый белый/голубой робот с экраном, наушниками и тремя лампочками
		local shell = Color3.fromRGB(235, 243, 252)
		local metal = Color3.fromRGB(148, 163, 184)
		local screen = Color3.fromRGB(20, 35, 58)
		local cyan = Color3.fromRGB(124, 243, 255)
		local root = add("Root", Vector3.new(2.15, 2.25, 1.85), shell, Vector3.new(0, 0.35, 0), "Part")
		model.PrimaryPart = root
		headPart = root
		add("Screen", Vector3.new(1.75, 1.25, 0.18), screen, Vector3.new(0, 0.55, -0.88), "Part")
		add("EarL", Vector3.new(0.32, 0.78, 0.78), metal, Vector3.new(-1.16, 0.55, 0), "Part", Enum.Material.Metal, nil, Enum.PartType.Cylinder)
		add("EarR", Vector3.new(0.32, 0.78, 0.78), metal, Vector3.new(1.16, 0.55, 0), "Part", Enum.Material.Metal, nil, Enum.PartType.Cylinder)
		add("Antenna", Vector3.new(0.14, 0.58, 0.14), metal, Vector3.new(0, 1.75, 0), "Part", Enum.Material.Metal)
		add("AntBall", Vector3.new(0.38, 0.38, 0.38), Color3.fromRGB(255, 95, 95), Vector3.new(0, 2.1, 0), "Part", Enum.Material.Neon, nil, Enum.PartType.Ball)
		add("EyeL", Vector3.new(0.32, 0.36, 0.14), cyan, Vector3.new(-0.38, 0.65, -0.97), "Part", Enum.Material.Neon, nil, Enum.PartType.Ball)
		add("EyeR", Vector3.new(0.32, 0.36, 0.14), cyan, Vector3.new(0.38, 0.65, -0.97), "Part", Enum.Material.Neon, nil, Enum.PartType.Ball)
		add("Mouth", Vector3.new(0.55, 0.12, 0.12), cyan, Vector3.new(0, 0.25, -0.97), "Part", Enum.Material.Neon)
		-- 3 индикатора на корпусе
		add("Led1", Vector3.new(0.18, 0.18, 0.12), Color3.fromRGB(255, 95, 95), Vector3.new(-0.34, -0.35, -0.92), "Part", Enum.Material.Neon, nil, Enum.PartType.Ball)
		add("Led2", Vector3.new(0.18, 0.18, 0.12), Color3.fromRGB(255, 210, 61), Vector3.new(0, -0.35, -0.92), "Part", Enum.Material.Neon, nil, Enum.PartType.Ball)
		add("Led3", Vector3.new(0.18, 0.18, 0.12), Color3.fromRGB(76, 217, 100), Vector3.new(0.34, -0.35, -0.92), "Part", Enum.Material.Neon, nil, Enum.PartType.Ball)
		addPaws(add, shell, metal, 0.58, -0.82, 0.05, -0.3)

	else
		-- Капи (по умолчанию): круглая карамельная капибара с мордочкой и мандарином на голове!
		local bodyCol = Color3.fromRGB(214, 148, 95)
		local dark = Color3.fromRGB(168, 105, 60)
		local snoutCol = Color3.fromRGB(239, 193, 150)
		local orange = Color3.fromRGB(255, 165, 59)
		local root = add("Root", Vector3.new(2.45, 2.05, 3.1), bodyCol, Vector3.new(0, 0, 0), "Part", nil, nil, Enum.PartType.Ball)
		model.PrimaryPart = root
		headPart = add("Head", Vector3.new(2.1, 1.75, 2.25), bodyCol, Vector3.new(0, 0.96, -1.0), "Part", nil, nil, Enum.PartType.Ball)
		add("Snout", Vector3.new(1.38, 0.92, 0.95), snoutCol, Vector3.new(0, 0.72, -1.94), "Part", nil, nil, Enum.PartType.Ball)
		add("NostrilL", Vector3.new(0.14, 0.22, 0.14), Color3.fromRGB(107, 61, 34), Vector3.new(-0.22, 0.84, -2.38), "Part", nil, nil, Enum.PartType.Ball)
		add("NostrilR", Vector3.new(0.14, 0.22, 0.14), Color3.fromRGB(107, 61, 34), Vector3.new(0.22, 0.84, -2.38), "Part", nil, nil, Enum.PartType.Ball)
		add("EarL", Vector3.new(0.45, 0.58, 0.34), dark, Vector3.new(-0.78, 1.68, -0.7), "Part", nil, nil, Enum.PartType.Ball)
		add("EarR", Vector3.new(0.45, 0.58, 0.34), dark, Vector3.new(0.78, 1.68, -0.7), "Part", nil, nil, Enum.PartType.Ball)
		add("Tangerine", Vector3.new(0.82, 0.7, 0.82), orange, Vector3.new(0, 2.02, -1.0), "Part", nil, nil, Enum.PartType.Ball)
		add("Leaf", Vector3.new(0.32, 0.14, 0.44), Color3.fromRGB(92, 201, 107), Vector3.new(0.16, 2.4, -1.0), "Part", nil, CFrame.Angles(0, 0.3, 0.22))
		addPaws(add, bodyCol, dark, 0.68, -0.88, 0.15, -0.95)
		addFace(add, Vector3.new(0, 0.96, -1.0), 0.5, 0.2, -0.96, Color3.fromRGB(92, 60, 38), 0.92)
	end

	local meta = MASCOT_META[kind] or MASCOT_META.kapi
	local hl = Instance.new("Highlight")
	hl.FillTransparency = 1
	hl.OutlineColor = meta.outline
	hl.OutlineTransparency = 0.2
	hl.DepthMode = Enum.HighlightDepthMode.Occluded
	hl.Parent = model

	if model.PrimaryPart then
		local pe = Instance.new("ParticleEmitter", model.PrimaryPart)
		pe.Color = ColorSequence.new(meta.outline, Color3.fromRGB(253, 224, 71))
		pe.Size = NumberSequence.new({ NumberSequenceKeypoint.new(0, 0.2), NumberSequenceKeypoint.new(1, 0) })
		pe.Rate = 5
		pe.Speed = NumberRange.new(0.6, 1.6)
		pe.Lifetime = NumberRange.new(0.6, 1.1)
	end
	return headPart, offsets
end

function Mascot.Create(plot)
	local model = Instance.new("Model")
	model.Name = "PetGuide"
	model.Parent = plot.folder

	local headPart, offsets = buildBody(model, "kapi")

	local bbg = Instance.new("BillboardGui", model)
	bbg.Name = "Bubble"
	bbg.Size = UDim2.fromOffset(250, 74)
	bbg.StudsOffset = Vector3.new(0, 3.4, 0)
	bbg.AlwaysOnTop = false
	bbg.MaxDistance = 42
	bbg.Enabled = false
	bbg.Adornee = headPart

	local frame = Instance.new("Frame", bbg)
	frame.Size = UDim2.fromScale(1, 1)
	frame.BackgroundColor3 = Color3.fromRGB(255, 252, 240)
	frame.BorderSizePixel = 0
	Instance.new("UICorner", frame).CornerRadius = UDim.new(0, 14)
	local stroke = Instance.new("UIStroke", frame)
	stroke.Color = Color3.fromRGB(217, 178, 120)
	stroke.Thickness = 2

	local label = Instance.new("TextLabel", frame)
	label.Name = "Text"
	label.Size = UDim2.new(1, -16, 1, -12)
	label.Position = UDim2.fromOffset(8, 6)
	label.BackgroundTransparency = 1
	label.TextWrapped = true
	label.TextScaled = true
	label.Font = Enum.Font.GothamBold
	label.TextColor3 = Color3.fromRGB(35, 30, 24)
	label.Text = ""

	local basePos = plot.campPos + Vector3.new(4, 2.2, 4)
	local currentCF = CFrame.new(basePos)
	local jumpOffset = 0
	local spinOffset = 0

	local function layoutParts(cf)
		local bob = math.sin(os.clock() * 3.8) * 0.14 + jumpOffset
		local bodyCF = cf * CFrame.new(0, bob, 0) * CFrame.Angles(0, spinOffset, 0)
		for _, item in ipairs(offsets) do
			if item.p and item.p.Parent then
				item.p.CFrame = bodyCF * item.cf
			end
		end
	end
	layoutParts(currentCF)

	RunService.Heartbeat:Connect(function(dt)
		if not plot.owner or not plot.owner.Character then
			layoutParts(currentCF)
			return
		end
		local hrp = plot.owner.Character:FindFirstChild("HumanoidRootPart")
		if not hrp then
			layoutParts(currentCF)
			return
		end
		local targetPos = hrp.Position + hrp.CFrame.RightVector * 4.4 + hrp.CFrame.LookVector * 1.4
		targetPos = Vector3.new(targetPos.X, math.max(plot.center.Y - 12, hrp.Position.Y - 0.6), targetPos.Z)
		local pos = currentCF.Position:Lerp(targetPos, math.clamp(dt * 3.5, 0, 1))
		local look = Vector3.new(hrp.Position.X, pos.Y, hrp.Position.Z)
		currentCF = (look - pos).Magnitude > 0.2 and CFrame.lookAt(pos, look) or CFrame.new(pos)
		layoutParts(currentCF)
	end)

	plot.kapi = {
		model = model,
		label = label,
		bbg = bbg,
		kind = "kapi",
		setType = function(kind)
			if not kind or kind == plot.kapi.kind then
				return
			end
			plot.kapi.kind = kind
			local newHead, newOffsets = buildBody(model, kind)
			offsets = newOffsets
			bbg.Adornee = newHead
			local meta = MASCOT_META[kind] or MASCOT_META.kapi
			stroke.Color = meta.outline
			layoutParts(currentCF)
		end,
		jump = function()
			task.spawn(function()
				for i = 1, 2 do
					for t = 0, math.pi, 0.22 do
						jumpOffset = math.sin(t) * 2.1
						spinOffset = (i == 2) and (t / math.pi) * math.pi * 2 or 0
						task.wait(0.025)
					end
				end
				jumpOffset = 0
				spinOffset = 0
			end)
		end,
	}
end

function Mascot.SetType(plot, kind)
	if plot.kapi and plot.kapi.setType then
		plot.kapi.setType(kind)
	end
end

function Mascot.Say(plot, text)
	if plot.kapi and plot.kapi.label and plot.kapi.bbg then
		if text and #text > 0 then
			plot.kapi.label.Text = text
			plot.kapi.bbg.Enabled = true
		else
			plot.kapi.bbg.Enabled = false
		end
	end
end

function Mascot.Jump(plot)
	if plot.kapi and plot.kapi.jump then
		plot.kapi.jump()
	end
end

return Mascot
