-- Питомец-проводник: строит внешность по выбранному маскоту из приложения (kapi, plu/Шарки, dino, mimi, axi, boo, fox, ugo, bot, zip, ano)
local RunService = game:GetService("RunService")

local Mascot = {}

local function part(parent, name, size, color, shape, material)
	local p = Instance.new("Part")
	p.Name = name
	p.Size = size
	p.Color = color
	p.Material = material or Enum.Material.SmoothPlastic
	p.Shape = shape or Enum.PartType.Block
	p.Anchored = true
	p.CanCollide = false
	p.TopSurface = Enum.SurfaceType.Smooth
	p.BottomSurface = Enum.SurfaceType.Smooth
	p.Parent = parent
	return p
end

local function buildBody(model, kind)
	for _, ch in ipairs(model:GetChildren()) do
		if ch:IsA("BasePart") then
			ch:Destroy()
		end
	end

	local offsets = {}
	local function add(name, size, color, offset, shape, mat, rot)
		local p = part(model, name, size, color, shape, mat)
		table.insert(offsets, { p = p, cf = CFrame.new(offset) * (rot or CFrame.new()) })
		return p
	end

	local headPart
	if kind == "plu" then
		-- Шарки: голубой акулёнок с белым пузиком и плавником
		local blue = Color3.fromRGB(56, 189, 248)
		local belly = Color3.fromRGB(240, 249, 255)
		local root = add("Root", Vector3.new(2.2, 2.0, 3.2), blue, Vector3.new(0, 0, 0), Enum.PartType.Ball)
		model.PrimaryPart = root
		add("Belly", Vector3.new(1.7, 1.3, 2.4), belly, Vector3.new(0, -0.45, -0.1), Enum.PartType.Ball)
		headPart = add("Head", Vector3.new(1.9, 1.6, 2.0), blue, Vector3.new(0, 0.7, -1.1), Enum.PartType.Ball)
		add("FinTop", Vector3.new(0.25, 1.2, 1.1), blue, Vector3.new(0, 1.45, 0.2), Enum.PartType.Block, nil, CFrame.Angles(-0.4, 0, 0))
		add("FinL", Vector3.new(0.9, 0.2, 0.7), blue, Vector3.new(-1.2, 0, -0.2), Enum.PartType.Block, nil, CFrame.Angles(0, 0.3, -0.3))
		add("FinR", Vector3.new(0.9, 0.2, 0.7), blue, Vector3.new(1.2, 0, -0.2), Enum.PartType.Block, nil, CFrame.Angles(0, -0.3, 0.3))
		add("Tail", Vector3.new(0.3, 1.3, 0.9), blue, Vector3.new(0, 0.3, 1.7), Enum.PartType.Block, nil, CFrame.Angles(0.3, 0, 0))
		add("EyeL", Vector3.new(0.26, 0.26, 0.26), Color3.new(0.06, 0.06, 0.08), Vector3.new(-0.55, 0.95, -1.85), Enum.PartType.Ball)
		add("EyeR", Vector3.new(0.26, 0.26, 0.26), Color3.new(0.06, 0.06, 0.08), Vector3.new(0.55, 0.95, -1.85), Enum.PartType.Ball)
	elseif kind == "dino" then
		-- Дино: зелёный динозаврик с жёлтыми шипами
		local green = Color3.fromRGB(74, 222, 128)
		local spike = Color3.fromRGB(250, 204, 21)
		local root = add("Root", Vector3.new(2.3, 2.1, 2.8), green, Vector3.new(0, 0, 0), Enum.PartType.Ball)
		model.PrimaryPart = root
		headPart = add("Head", Vector3.new(1.8, 1.6, 2.0), green, Vector3.new(0, 1.0, -0.9), Enum.PartType.Ball)
		add("Tail", Vector3.new(1.0, 0.9, 1.6), green, Vector3.new(0, -0.2, 1.5), Enum.PartType.Ball)
		for i = 1, 3 do
			add("Spike" .. i, Vector3.new(0.3, 0.55, 0.45), spike, Vector3.new(0, 1.35 - i * 0.25, -0.4 + i * 0.65), Enum.PartType.Block)
		end
		add("EyeL", Vector3.new(0.24, 0.24, 0.24), Color3.new(0.06, 0.06, 0.08), Vector3.new(-0.5, 1.2, -1.75), Enum.PartType.Ball)
		add("EyeR", Vector3.new(0.24, 0.24, 0.24), Color3.new(0.06, 0.06, 0.08), Vector3.new(0.5, 1.2, -1.75), Enum.PartType.Ball)
	elseif kind == "mimi" or kind == "fox" or kind == "ugo" then
		local mainCol = kind == "mimi" and Color3.fromRGB(244, 114, 182) or (kind == "fox" and Color3.fromRGB(249, 115, 22) or Color3.fromRGB(30, 41, 59))
		local accCol = kind == "ugo" and Color3.fromRGB(250, 204, 21) or Color3.fromRGB(255, 241, 242)
		local root = add("Root", Vector3.new(2.0, 1.8, 2.5), mainCol, Vector3.new(0, 0, 0), Enum.PartType.Ball)
		model.PrimaryPart = root
		headPart = add("Head", Vector3.new(1.8, 1.6, 1.7), mainCol, Vector3.new(0, 0.95, -0.8), Enum.PartType.Ball)
		add("EarL", Vector3.new(0.45, 0.7, 0.35), mainCol, Vector3.new(-0.6, 1.75, -0.7), Enum.PartType.Block, nil, CFrame.Angles(0, 0, 0.25))
		add("EarR", Vector3.new(0.45, 0.7, 0.35), mainCol, Vector3.new(0.6, 1.75, -0.7), Enum.PartType.Block, nil, CFrame.Angles(0, 0, -0.25))
		add("Tail", Vector3.new(0.6, 0.6, 1.5), mainCol, Vector3.new(0, 0.2, 1.4), Enum.PartType.Ball)
		add("EyeL", Vector3.new(0.24, 0.24, 0.24), kind == "ugo" and accCol or Color3.new(0.06, 0.06, 0.08), Vector3.new(-0.45, 1.05, -1.55), Enum.PartType.Ball)
		add("EyeR", Vector3.new(0.24, 0.24, 0.24), kind == "ugo" and accCol or Color3.new(0.06, 0.06, 0.08), Vector3.new(0.45, 1.05, -1.55), Enum.PartType.Ball)
	elseif kind == "boo" then
		local white = Color3.fromRGB(241, 245, 249)
		local root = add("Root", Vector3.new(2.1, 2.3, 2.1), white, Vector3.new(0, 0.3, 0), Enum.PartType.Ball)
		model.PrimaryPart = root
		headPart = root
		add("EyeL", Vector3.new(0.3, 0.35, 0.2), Color3.fromRGB(15, 23, 42), Vector3.new(-0.42, 0.5, -0.95), Enum.PartType.Ball)
		add("EyeR", Vector3.new(0.3, 0.35, 0.2), Color3.fromRGB(15, 23, 42), Vector3.new(0.42, 0.5, -0.95), Enum.PartType.Ball)
	elseif kind == "bot" then
		local cyan = Color3.fromRGB(56, 189, 248)
		local dark = Color3.fromRGB(30, 41, 59)
		local root = add("Root", Vector3.new(2.0, 2.0, 1.8), cyan, Vector3.new(0, 0, 0), Enum.PartType.Block)
		model.PrimaryPart = root
		headPart = add("Head", Vector3.new(1.8, 1.4, 1.6), cyan, Vector3.new(0, 1.2, -0.1), Enum.PartType.Block)
		add("Visor", Vector3.new(1.4, 0.65, 0.2), dark, Vector3.new(0, 1.25, -0.88), Enum.PartType.Block)
		add("Antenna", Vector3.new(0.15, 0.6, 0.15), Color3.fromRGB(250, 204, 21), Vector3.new(0, 2.1, -0.1), Enum.PartType.Block, Enum.Material.Neon)
		add("EyeL", Vector3.new(0.24, 0.24, 0.15), Color3.fromRGB(74, 222, 128), Vector3.new(-0.35, 1.25, -0.96), Enum.PartType.Ball, Enum.Material.Neon)
		add("EyeR", Vector3.new(0.24, 0.24, 0.15), Color3.fromRGB(74, 222, 128), Vector3.new(0.35, 1.25, -0.96), Enum.PartType.Ball, Enum.Material.Neon)
	else
		-- Капи (kapi) и остальные — капибара с мандаринкой
		local brown = kind == "axi" and Color3.fromRGB(244, 143, 177) or (kind == "zip" and Color3.fromRGB(250, 204, 21) or (kind == "ano" and Color3.fromRGB(167, 139, 250) or Color3.fromRGB(168, 114, 72)))
		local dark = Color3.fromRGB(92, 60, 38)
		local orange = Color3.fromRGB(249, 115, 22)
		local root = add("Root", Vector3.new(2.4, 2.0, 3.0), brown, Vector3.new(0, 0, 0), Enum.PartType.Ball)
		model.PrimaryPart = root
		headPart = add("Head", Vector3.new(1.8, 1.5, 2.0), brown, Vector3.new(0, 0.9, -1.0), Enum.PartType.Ball)
		add("Snout", Vector3.new(1.2, 0.9, 0.9), dark, Vector3.new(0, 0.75, -1.85), Enum.PartType.Ball)
		add("EarL", Vector3.new(0.45, 0.55, 0.3), dark, Vector3.new(-0.7, 1.55, -0.7), Enum.PartType.Ball)
		add("EarR", Vector3.new(0.45, 0.55, 0.3), dark, Vector3.new(0.7, 1.55, -0.7), Enum.PartType.Ball)
		add("EyeL", Vector3.new(0.22, 0.22, 0.22), Color3.new(0.08, 0.08, 0.08), Vector3.new(-0.48, 1.05, -1.75), Enum.PartType.Ball)
		add("EyeR", Vector3.new(0.22, 0.22, 0.22), Color3.new(0.08, 0.08, 0.08), Vector3.new(0.48, 1.05, -1.75), Enum.PartType.Ball)
		if kind == "kapi" or not kind then
			add("Tangerine", Vector3.new(0.65, 0.55, 0.65), orange, Vector3.new(0, 1.85, -1.0), Enum.PartType.Ball)
			add("Leaf", Vector3.new(0.25, 0.12, 0.35), Color3.fromRGB(34, 197, 94), Vector3.new(0.12, 2.18, -1.0), Enum.PartType.Block, nil, CFrame.Angles(0, 0.3, 0.2))
		end
	end

	return headPart, offsets
end

function Mascot.Create(plot)
	local model = Instance.new("Model")
	model.Name = "PetGuide"
	model.Parent = plot.folder

	local headPart, offsets = buildBody(model, "kapi")

	local bbg = Instance.new("BillboardGui")
	bbg.Name = "Bubble"
	bbg.Size = UDim2.fromOffset(250, 76)
	bbg.StudsOffset = Vector3.new(0, 3.2, 0)
	bbg.AlwaysOnTop = true
	bbg.Adornee = headPart
	bbg.Parent = model

	local frame = Instance.new("Frame")
	frame.Size = UDim2.fromScale(1, 1)
	frame.BackgroundColor3 = Color3.fromRGB(255, 252, 240)
	frame.BorderSizePixel = 0
	frame.Parent = bbg
	Instance.new("UICorner", frame).CornerRadius = UDim.new(0, 12)
	local stroke = Instance.new("UIStroke", frame)
	stroke.Color = Color3.fromRGB(217, 178, 120)
	stroke.Thickness = 2

	local label = Instance.new("TextLabel")
	label.Name = "Text"
	label.Size = UDim2.new(1, -14, 1, -10)
	label.Position = UDim2.fromOffset(7, 5)
	label.BackgroundTransparency = 1
	label.TextWrapped = true
	label.TextScaled = true
	label.Font = Enum.Font.GothamMedium
	label.TextColor3 = Color3.fromRGB(45, 36, 26)
	label.Text = "Привет! Введи код из приложения Зубрик."
	label.Parent = frame

	local basePos = plot.campPos + Vector3.new(4, 2.2, 4)
	local currentCF = CFrame.new(basePos)
	local jumpOffset = 0

	local function layoutParts(cf)
		local bob = math.sin(os.clock() * 3) * 0.08 + jumpOffset
		local bodyCF = cf * CFrame.new(0, bob, 0)
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
		local targetPos = hrp.Position + Vector3.new(5, 0, 5)
		if (targetPos - plot.center).Magnitude > 95 then
			targetPos = basePos
		end
		targetPos = Vector3.new(targetPos.X, math.max(plot.center.Y + 2.2, hrp.Position.Y - 1), targetPos.Z)
		local pos = currentCF.Position:Lerp(targetPos, math.clamp(dt * 2.5, 0, 1))
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
			layoutParts(currentCF)
		end,
		jump = function()
			task.spawn(function()
				for i = 1, 3 do
					for t = 0, math.pi, 0.25 do
						jumpOffset = math.sin(t) * 1.8
						task.wait(0.03)
					end
				end
				jumpOffset = 0
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
	if plot.kapi and plot.kapi.label and text and #text > 0 then
		plot.kapi.label.Text = text
	end
end

function Mascot.Jump(plot)
	if plot.kapi and plot.kapi.jump then
		plot.kapi.jump()
	end
end

return Mascot
