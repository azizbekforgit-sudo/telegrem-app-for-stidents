-- Качественные 3D-питомцы с Highlight-обводкой, WedgePart-плавниками/ушками/шипами,
-- многослойными глазами, лапками и живой анимацией.
local RunService = game:GetService("RunService")

local Mascot = {}

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

local function addFace(add, headOff, spread, eyeY, eyeZ, irisColor)
	local white = Color3.new(1, 1, 1)
	local dark = Color3.fromRGB(15, 18, 28)
	local iris = irisColor or Color3.fromRGB(59, 130, 246)
	local blush = Color3.fromRGB(251, 138, 175)

	for _, side in ipairs({ -1, 1 }) do
		local t = side < 0 and "L" or "R"
		add("EyeW" .. t, Vector3.new(0.38, 0.44, 0.18), white, headOff + Vector3.new(side * spread, eyeY, eyeZ), "Part", Enum.Material.SmoothPlastic, nil, Enum.PartType.Ball)
		add("Iris" .. t, Vector3.new(0.28, 0.34, 0.16), iris, headOff + Vector3.new(side * spread, eyeY, eyeZ - 0.04), "Part", Enum.Material.SmoothPlastic, nil, Enum.PartType.Ball)
		add("Pupil" .. t, Vector3.new(0.18, 0.22, 0.14), dark, headOff + Vector3.new(side * spread, eyeY, eyeZ - 0.08), "Part", Enum.Material.SmoothPlastic, nil, Enum.PartType.Ball)
		add("Glint" .. t, Vector3.new(0.1, 0.1, 0.08), white, headOff + Vector3.new(side * spread + 0.06, eyeY + 0.08, eyeZ - 0.13), "Part", Enum.Material.Neon, nil, Enum.PartType.Ball)
		add("Cheek" .. t, Vector3.new(0.34, 0.18, 0.12), blush, headOff + Vector3.new(side * (spread + 0.16), eyeY - 0.26, eyeZ + 0.06), "Part", Enum.Material.SmoothPlastic, nil, Enum.PartType.Ball)
	end
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
		-- Шарки: обтекаемый акулёнок с WedgePart-плавниками, хвостовым оперением и улыбкой
		local blue = Color3.fromRGB(56, 189, 248)
		local deep = Color3.fromRGB(14, 116, 204)
		local belly = Color3.fromRGB(240, 249, 255)
		local root = add("Root", Vector3.new(2.2, 1.9, 3.3), blue, Vector3.new(0, 0, 0), "Part", nil, nil, Enum.PartType.Ball)
		model.PrimaryPart = root
		add("Belly", Vector3.new(1.75, 1.25, 2.6), belly, Vector3.new(0, -0.45, -0.15), "Part", nil, nil, Enum.PartType.Ball)
		headPart = add("Head", Vector3.new(2.1, 1.75, 2.2), blue, Vector3.new(0, 0.55, -1.1), "Part", nil, nil, Enum.PartType.Ball)
		add("Snout", Vector3.new(1.5, 0.72, 1.0), belly, Vector3.new(0, 0.2, -1.85), "Part", nil, nil, Enum.PartType.Ball)
		add("Smile", Vector3.new(0.8, 0.14, 0.2), Color3.new(1, 1, 1), Vector3.new(0, 0.15, -2.25), "Part")
		-- Спинной и боковые плавники из WedgePart
		add("FinTop", Vector3.new(0.24, 1.35, 1.2), deep, Vector3.new(0, 1.45, 0.2), "WedgePart", nil, CFrame.Angles(0, math.pi, 0))
		add("FinL", Vector3.new(0.22, 0.85, 1.05), deep, Vector3.new(-1.35, -0.15, -0.1), "WedgePart", nil, CFrame.Angles(0, 0, math.rad(72)))
		add("FinR", Vector3.new(0.22, 0.85, 1.05), deep, Vector3.new(1.35, -0.15, -0.1), "WedgePart", nil, CFrame.Angles(0, 0, math.rad(-72)))
		add("TailTop", Vector3.new(0.24, 1.2, 0.9), deep, Vector3.new(0, 0.55, 1.95), "WedgePart", nil, CFrame.Angles(0.35, math.pi, 0))
		add("TailBot", Vector3.new(0.24, 0.9, 0.8), deep, Vector3.new(0, -0.35, 1.95), "WedgePart", nil, CFrame.Angles(math.pi - 0.35, 0, 0))
		addFace(add, Vector3.new(0, 0.55, -1.1), 0.54, 0.22, -0.96, Color3.fromRGB(14, 165, 233))
	elseif kind == "dino" then
		local green = Color3.fromRGB(74, 222, 128)
		local belly = Color3.fromRGB(220, 252, 231)
		local spike = Color3.fromRGB(250, 204, 21)
		local root = add("Root", Vector3.new(2.2, 2.0, 2.8), green, Vector3.new(0, 0, 0), "Part", nil, nil, Enum.PartType.Ball)
		model.PrimaryPart = root
		add("Belly", Vector3.new(1.7, 1.35, 2.1), belly, Vector3.new(0, -0.35, -0.25), "Part", nil, nil, Enum.PartType.Ball)
		headPart = add("Head", Vector3.new(1.95, 1.7, 2.1), green, Vector3.new(0, 1.0, -1.0), "Part", nil, nil, Enum.PartType.Ball)
		add("Tail1", Vector3.new(1.2, 1.0, 1.3), green, Vector3.new(0, -0.2, 1.4), "Part", nil, nil, Enum.PartType.Ball)
		add("Tail2", Vector3.new(0.75, 0.65, 1.1), green, Vector3.new(0, -0.25, 2.2), "Part", nil, nil, Enum.PartType.Ball)
		for i = 1, 4 do
			add("Spike" .. i, Vector3.new(0.28, 0.6, 0.55), spike, Vector3.new(0, 1.55 - i * 0.26, -0.5 + i * 0.55), "WedgePart", Enum.Material.Neon, CFrame.Angles(0, math.pi, 0))
		end
		add("FootL", Vector3.new(0.6, 0.5, 0.75), green, Vector3.new(-0.65, -0.9, -0.3), "Part", nil, nil, Enum.PartType.Ball)
		add("FootR", Vector3.new(0.6, 0.5, 0.75), green, Vector3.new(0.65, -0.9, -0.3), "Part", nil, nil, Enum.PartType.Ball)
		addFace(add, Vector3.new(0, 1.0, -1.0), 0.5, 0.18, -0.95, Color3.fromRGB(22, 163, 74))
	elseif kind == "mimi" or kind == "fox" or kind == "ugo" then
		local mainCol = kind == "mimi" and Color3.fromRGB(244, 114, 182) or (kind == "fox" and Color3.fromRGB(249, 115, 22) or Color3.fromRGB(38, 46, 66))
		local innerEar = Color3.fromRGB(253, 186, 208)
		local root = add("Root", Vector3.new(2.0, 1.8, 2.5), mainCol, Vector3.new(0, 0, 0), "Part", nil, nil, Enum.PartType.Ball)
		model.PrimaryPart = root
		headPart = add("Head", Vector3.new(1.95, 1.7, 1.85), mainCol, Vector3.new(0, 0.95, -0.85), "Part", nil, nil, Enum.PartType.Ball)
		add("EarL", Vector3.new(0.45, 0.85, 0.45), mainCol, Vector3.new(-0.65, 1.9, -0.75), "WedgePart", nil, CFrame.Angles(0, 0, 0.2))
		add("EarInL", Vector3.new(0.24, 0.5, 0.25), innerEar, Vector3.new(-0.65, 1.86, -0.88), "WedgePart", nil, CFrame.Angles(0, 0, 0.2))
		add("EarR", Vector3.new(0.45, 0.85, 0.45), mainCol, Vector3.new(0.65, 1.9, -0.75), "WedgePart", nil, CFrame.Angles(0, 0, -0.2))
		add("EarInR", Vector3.new(0.24, 0.5, 0.25), innerEar, Vector3.new(0.65, 1.86, -0.88), "WedgePart", nil, CFrame.Angles(0, 0, -0.2))
		add("Tail1", Vector3.new(0.8, 0.8, 1.3), mainCol, Vector3.new(0, 0.2, 1.4), "Part", nil, nil, Enum.PartType.Ball)
		add("Tail2", Vector3.new(0.7, 0.7, 1.0), kind == "fox" and Color3.new(1, 1, 1) or mainCol, Vector3.new(0, 0.55, 2.05), "Part", nil, nil, Enum.PartType.Ball)
		add("Nose", Vector3.new(0.26, 0.18, 0.18), Color3.fromRGB(244, 63, 94), Vector3.new(0, 0.82, -1.78), "Part", nil, nil, Enum.PartType.Ball)
		add("FootL", Vector3.new(0.55, 0.45, 0.7), mainCol, Vector3.new(-0.6, -0.8, -0.4), "Part", nil, nil, Enum.PartType.Ball)
		add("FootR", Vector3.new(0.55, 0.45, 0.7), mainCol, Vector3.new(0.6, -0.8, -0.4), "Part", nil, nil, Enum.PartType.Ball)
		addFace(add, Vector3.new(0, 0.95, -0.85), 0.46, 0.16, -0.84, kind == "ugo" and Color3.fromRGB(250, 204, 21) or Color3.fromRGB(59, 130, 246))
	elseif kind == "boo" then
		local white = Color3.fromRGB(248, 250, 252)
		local root = add("Root", Vector3.new(2.2, 2.4, 2.2), white, Vector3.new(0, 0.35, 0), "Part", nil, nil, Enum.PartType.Ball)
		model.PrimaryPart = root
		headPart = root
		add("ArmL", Vector3.new(0.65, 0.5, 0.65), white, Vector3.new(-1.18, 0.25, -0.2), "Part", nil, nil, Enum.PartType.Ball)
		add("ArmR", Vector3.new(0.65, 0.5, 0.65), white, Vector3.new(1.18, 0.25, -0.2), "Part", nil, nil, Enum.PartType.Ball)
		addFace(add, Vector3.new(0, 0.35, 0), 0.44, 0.24, -1.04, Color3.fromRGB(168, 85, 247))
	elseif kind == "bot" then
		local cyan = Color3.fromRGB(56, 189, 248)
		local dark = Color3.fromRGB(15, 23, 42)
		local root = add("Root", Vector3.new(1.9, 1.8, 1.7), cyan, Vector3.new(0, 0, 0), "Part")
		model.PrimaryPart = root
		headPart = add("Head", Vector3.new(1.95, 1.5, 1.75), cyan, Vector3.new(0, 1.2, -0.1), "Part")
		add("Visor", Vector3.new(1.55, 0.76, 0.2), dark, Vector3.new(0, 1.24, -0.94), "Part")
		add("EarL", Vector3.new(0.28, 0.7, 0.7), Color3.fromRGB(148, 163, 184), Vector3.new(-1.08, 1.2, -0.1), "Part", Enum.Material.Metal, nil, Enum.PartType.Cylinder)
		add("EarR", Vector3.new(0.28, 0.7, 0.7), Color3.fromRGB(148, 163, 184), Vector3.new(1.08, 1.2, -0.1), "Part", Enum.Material.Metal, nil, Enum.PartType.Cylinder)
		add("Antenna", Vector3.new(0.14, 0.6, 0.14), Color3.fromRGB(250, 204, 21), Vector3.new(0, 2.2, -0.1), "Part")
		add("AntBall", Vector3.new(0.36, 0.36, 0.36), Color3.fromRGB(250, 204, 21), Vector3.new(0, 2.55, -0.1), "Part", Enum.Material.Neon, nil, Enum.PartType.Ball)
		add("EyeL", Vector3.new(0.3, 0.3, 0.16), Color3.fromRGB(74, 222, 128), Vector3.new(-0.36, 1.24, -1.02), "Part", Enum.Material.Neon, nil, Enum.PartType.Ball)
		add("EyeR", Vector3.new(0.3, 0.3, 0.16), Color3.fromRGB(74, 222, 128), Vector3.new(0.36, 1.24, -1.02), "Part", Enum.Material.Neon, nil, Enum.PartType.Ball)
	else
		local bodyCol = kind == "axi" and Color3.fromRGB(244, 143, 177) or (kind == "zip" and Color3.fromRGB(250, 204, 21) or (kind == "ano" and Color3.fromRGB(167, 139, 250) or Color3.fromRGB(178, 122, 76)))
		local dark = Color3.fromRGB(102, 66, 42)
		local orange = Color3.fromRGB(249, 115, 22)
		local root = add("Root", Vector3.new(2.3, 1.95, 3.0), bodyCol, Vector3.new(0, 0, 0), "Part", nil, nil, Enum.PartType.Ball)
		model.PrimaryPart = root
		headPart = add("Head", Vector3.new(1.95, 1.65, 2.15), bodyCol, Vector3.new(0, 0.92, -1.0), "Part", nil, nil, Enum.PartType.Ball)
		add("Snout", Vector3.new(1.2, 0.85, 0.85), dark, Vector3.new(0, 0.68, -1.9), "Part", nil, nil, Enum.PartType.Ball)
		add("EarL", Vector3.new(0.42, 0.55, 0.32), dark, Vector3.new(-0.75, 1.62, -0.7), "Part", nil, nil, Enum.PartType.Ball)
		add("EarR", Vector3.new(0.42, 0.55, 0.32), dark, Vector3.new(0.75, 1.62, -0.7), "Part", nil, nil, Enum.PartType.Ball)
		add("FootL", Vector3.new(0.6, 0.45, 0.75), dark, Vector3.new(-0.65, -0.85, -0.4), "Part", nil, nil, Enum.PartType.Ball)
		add("FootR", Vector3.new(0.6, 0.45, 0.75), dark, Vector3.new(0.65, -0.85, -0.4), "Part", nil, nil, Enum.PartType.Ball)
		if kind == "axi" then
			for s = -1, 1, 2 do
				add("Gill" .. s, Vector3.new(0.75, 0.25, 0.25), Color3.fromRGB(244, 63, 94), Vector3.new(s * 1.18, 0.95, -0.9), "WedgePart")
			end
		end
		addFace(add, Vector3.new(0, 0.92, -1.0), 0.48, 0.18, -0.96, Color3.fromRGB(92, 60, 38))
		if kind == "kapi" or not kind then
			add("Tangerine", Vector3.new(0.75, 0.65, 0.75), orange, Vector3.new(0, 1.94, -1.0), "Part", nil, nil, Enum.PartType.Ball)
			add("Leaf", Vector3.new(0.28, 0.12, 0.38), Color3.fromRGB(34, 197, 94), Vector3.new(0.14, 2.3, -1.0), "Part", nil, CFrame.Angles(0, 0.3, 0.2))
		end
	end

	-- Мультяшная обводка Highlight вокруг питомца
	local hl = Instance.new("Highlight")
	hl.FillTransparency = 1
	hl.OutlineColor = Color3.new(1, 1, 1)
	hl.OutlineTransparency = 0.25
	hl.DepthMode = Enum.HighlightDepthMode.Occluded
	hl.Parent = model

	if model.PrimaryPart then
		local pe = Instance.new("ParticleEmitter", model.PrimaryPart)
		pe.Color = ColorSequence.new(Color3.fromRGB(253, 224, 71), Color3.fromRGB(167, 243, 208))
		pe.Size = NumberSequence.new({ NumberSequenceKeypoint.new(0, 0.22), NumberSequenceKeypoint.new(1, 0) })
		pe.Rate = 6
		pe.Speed = NumberRange.new(0.5, 1.5)
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
	bbg.Size = UDim2.fromOffset(230, 64)
	bbg.StudsOffset = Vector3.new(0, 3.2, 0)
	bbg.AlwaysOnTop = false
	bbg.MaxDistance = 40
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
	label.Size = UDim2.new(1, -14, 1, -10)
	label.Position = UDim2.fromOffset(7, 5)
	label.BackgroundTransparency = 1
	label.TextWrapped = true
	label.TextScaled = true
	label.Font = Enum.Font.GothamMedium
	label.TextColor3 = Color3.fromRGB(45, 36, 26)
	label.Text = ""

	local basePos = plot.campPos + Vector3.new(4, 2.2, 4)
	local currentCF = CFrame.new(basePos)
	local jumpOffset = 0

	local function layoutParts(cf)
		local bob = math.sin(os.clock() * 3.5) * 0.1 + jumpOffset
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
		local targetPos = hrp.Position + hrp.CFrame.RightVector * 4.2 + hrp.CFrame.LookVector * 1.5
		targetPos = Vector3.new(targetPos.X, math.max(plot.center.Y - 12, hrp.Position.Y - 0.8), targetPos.Z)
		local pos = currentCF.Position:Lerp(targetPos, math.clamp(dt * 3.0, 0, 1))
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
