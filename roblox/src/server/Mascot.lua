-- Улучшенные 3D-питомцы: выразительные глаза с бликами, румянец, аура звёздочек,
-- плавные движения, индивидуальная геометрия для каждого питомца и облачко только для владельца.
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
	p.CastShadow = false
	p.TopSurface = Enum.SurfaceType.Smooth
	p.BottomSurface = Enum.SurfaceType.Smooth
	p.Parent = parent
	return p
end

local function addCuteFace(add, headOffset, eyeSpread, eyeY, eyeZ, cheekColor)
	local white = Color3.new(1, 1, 1)
	local pupil = Color3.fromRGB(18, 22, 32)
	local blush = cheekColor or Color3.fromRGB(251, 146, 178)

	for _, side in ipairs({ -1, 1 }) do
		local tag = side < 0 and "L" or "R"
		add("EyeWhite" .. tag, Vector3.new(0.36, 0.4, 0.18), white, headOffset + Vector3.new(side * eyeSpread, eyeY, eyeZ), Enum.PartType.Ball)
		add("Pupil" .. tag, Vector3.new(0.24, 0.28, 0.16), pupil, headOffset + Vector3.new(side * eyeSpread, eyeY, eyeZ - 0.06), Enum.PartType.Ball)
		add("Glint" .. tag, Vector3.new(0.09, 0.09, 0.08), white, headOffset + Vector3.new(side * eyeSpread + 0.06, eyeY + 0.07, eyeZ - 0.12), Enum.PartType.Ball, Enum.Material.Neon)
		add("Cheek" .. tag, Vector3.new(0.3, 0.18, 0.14), blush, headOffset + Vector3.new(side * (eyeSpread + 0.18), eyeY - 0.24, eyeZ + 0.05), Enum.PartType.Ball)
	end
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
		-- Шарки: милый голубой акулёнок с белым пузиком, плавниками и блестящими глазками
		local blue = Color3.fromRGB(56, 189, 248)
		local deep = Color3.fromRGB(14, 165, 233)
		local belly = Color3.fromRGB(240, 249, 255)
		local root = add("Root", Vector3.new(2.2, 2.0, 3.2), blue, Vector3.new(0, 0, 0), Enum.PartType.Ball)
		model.PrimaryPart = root
		add("Belly", Vector3.new(1.75, 1.35, 2.5), belly, Vector3.new(0, -0.45, -0.1), Enum.PartType.Ball)
		headPart = add("Head", Vector3.new(2.0, 1.7, 2.1), blue, Vector3.new(0, 0.72, -1.05), Enum.PartType.Ball)
		add("Snout", Vector3.new(1.3, 0.75, 0.8), belly, Vector3.new(0, 0.35, -1.75), Enum.PartType.Ball)
		add("FinTop", Vector3.new(0.26, 1.3, 1.15), deep, Vector3.new(0, 1.55, 0.25), Enum.PartType.Block, nil, CFrame.Angles(-0.42, 0, 0))
		add("FinL", Vector3.new(1.05, 0.22, 0.75), deep, Vector3.new(-1.25, -0.1, -0.2), Enum.PartType.Block, nil, CFrame.Angles(0, 0.35, -0.35))
		add("FinR", Vector3.new(1.05, 0.22, 0.75), deep, Vector3.new(1.25, -0.1, -0.2), Enum.PartType.Block, nil, CFrame.Angles(0, -0.35, 0.35))
		add("TailTop", Vector3.new(0.28, 1.1, 0.8), deep, Vector3.new(0, 0.55, 1.75), Enum.PartType.Block, nil, CFrame.Angles(0.45, 0, 0))
		add("TailBot", Vector3.new(0.28, 0.85, 0.7), deep, Vector3.new(0, -0.25, 1.75), Enum.PartType.Block, nil, CFrame.Angles(-0.45, 0, 0))
		addCuteFace(add, Vector3.new(0, 0.72, -1.05), 0.52, 0.18, -0.92)
	elseif kind == "dino" then
		local green = Color3.fromRGB(74, 222, 128)
		local belly = Color3.fromRGB(220, 252, 231)
		local spike = Color3.fromRGB(250, 204, 21)
		local root = add("Root", Vector3.new(2.3, 2.1, 2.8), green, Vector3.new(0, 0, 0), Enum.PartType.Ball)
		model.PrimaryPart = root
		add("Belly", Vector3.new(1.7, 1.4, 2.0), belly, Vector3.new(0, -0.35, -0.2), Enum.PartType.Ball)
		headPart = add("Head", Vector3.new(1.9, 1.7, 2.1), green, Vector3.new(0, 1.05, -0.95), Enum.PartType.Ball)
		add("Tail", Vector3.new(1.1, 0.9, 1.7), green, Vector3.new(0, -0.2, 1.55), Enum.PartType.Ball)
		for i = 1, 4 do
			add("Spike" .. i, Vector3.new(0.32, 0.55, 0.42), spike, Vector3.new(0, 1.55 - i * 0.25, -0.6 + i * 0.55), Enum.PartType.Block, Enum.Material.Neon)
		end
		addCuteFace(add, Vector3.new(0, 1.05, -0.95), 0.48, 0.16, -0.94)
	elseif kind == "mimi" or kind == "fox" or kind == "ugo" then
		local mainCol = kind == "mimi" and Color3.fromRGB(244, 114, 182) or (kind == "fox" and Color3.fromRGB(249, 115, 22) or Color3.fromRGB(36, 44, 62))
		local innerEar = Color3.fromRGB(253, 186, 208)
		local root = add("Root", Vector3.new(2.0, 1.85, 2.5), mainCol, Vector3.new(0, 0, 0), Enum.PartType.Ball)
		model.PrimaryPart = root
		headPart = add("Head", Vector3.new(1.9, 1.65, 1.8), mainCol, Vector3.new(0, 0.95, -0.8), Enum.PartType.Ball)
		add("EarL", Vector3.new(0.5, 0.8, 0.35), mainCol, Vector3.new(-0.62, 1.85, -0.7), Enum.PartType.Block, nil, CFrame.Angles(0, 0, 0.25))
		add("EarInL", Vector3.new(0.28, 0.48, 0.2), innerEar, Vector3.new(-0.62, 1.82, -0.82), Enum.PartType.Block, nil, CFrame.Angles(0, 0, 0.25))
		add("EarR", Vector3.new(0.5, 0.8, 0.35), mainCol, Vector3.new(0.62, 1.85, -0.7), Enum.PartType.Block, nil, CFrame.Angles(0, 0, -0.25))
		add("EarInR", Vector3.new(0.28, 0.48, 0.2), innerEar, Vector3.new(0.62, 1.82, -0.82), Enum.PartType.Block, nil, CFrame.Angles(0, 0, -0.25))
		add("Tail", Vector3.new(0.75, 0.75, 1.6), mainCol, Vector3.new(0, 0.3, 1.45), Enum.PartType.Ball)
		if kind == "fox" then
			add("TailTip", Vector3.new(0.65, 0.65, 0.65), Color3.new(1, 1, 1), Vector3.new(0, 0.4, 2.1), Enum.PartType.Ball)
		end
		add("Nose", Vector3.new(0.24, 0.18, 0.18), Color3.fromRGB(244, 63, 94), Vector3.new(0, 0.85, -1.7), Enum.PartType.Ball)
		addCuteFace(add, Vector3.new(0, 0.95, -0.8), 0.45, 0.16, -0.8)
	elseif kind == "boo" then
		local white = Color3.fromRGB(248, 250, 252)
		local root = add("Root", Vector3.new(2.2, 2.4, 2.2), white, Vector3.new(0, 0.35, 0), Enum.PartType.Ball)
		model.PrimaryPart = root
		headPart = root
		add("ArmL", Vector3.new(0.6, 0.5, 0.6), white, Vector3.new(-1.15, 0.2, -0.2), Enum.PartType.Ball)
		add("ArmR", Vector3.new(0.6, 0.5, 0.6), white, Vector3.new(1.15, 0.2, -0.2), Enum.PartType.Ball)
		addCuteFace(add, Vector3.new(0, 0.35, 0), 0.42, 0.22, -1.02)
	elseif kind == "bot" then
		local cyan = Color3.fromRGB(56, 189, 248)
		local dark = Color3.fromRGB(15, 23, 42)
		local root = add("Root", Vector3.new(2.0, 2.0, 1.8), cyan, Vector3.new(0, 0, 0), Enum.PartType.Block)
		model.PrimaryPart = root
		headPart = add("Head", Vector3.new(1.9, 1.5, 1.7), cyan, Vector3.new(0, 1.25, -0.1), Enum.PartType.Block)
		add("Visor", Vector3.new(1.5, 0.72, 0.2), dark, Vector3.new(0, 1.28, -0.92), Enum.PartType.Block)
		add("Antenna", Vector3.new(0.14, 0.6, 0.14), Color3.fromRGB(250, 204, 21), Vector3.new(0, 2.25, -0.1), Enum.PartType.Block)
		add("AntBall", Vector3.new(0.35, 0.35, 0.35), Color3.fromRGB(250, 204, 21), Vector3.new(0, 2.6, -0.1), Enum.PartType.Ball, Enum.Material.Neon)
		add("EyeL", Vector3.new(0.28, 0.28, 0.15), Color3.fromRGB(74, 222, 128), Vector3.new(-0.36, 1.28, -1.0), Enum.PartType.Ball, Enum.Material.Neon)
		add("EyeR", Vector3.new(0.28, 0.28, 0.15), Color3.fromRGB(74, 222, 128), Vector3.new(0.36, 1.28, -1.0), Enum.PartType.Ball, Enum.Material.Neon)
	else
		local bodyCol = kind == "axi" and Color3.fromRGB(244, 143, 177) or (kind == "zip" and Color3.fromRGB(250, 204, 21) or (kind == "ano" and Color3.fromRGB(167, 139, 250) or Color3.fromRGB(178, 122, 76)))
		local dark = Color3.fromRGB(102, 66, 42)
		local orange = Color3.fromRGB(249, 115, 22)
		local root = add("Root", Vector3.new(2.4, 2.0, 3.0), bodyCol, Vector3.new(0, 0, 0), Enum.PartType.Ball)
		model.PrimaryPart = root
		headPart = add("Head", Vector3.new(1.9, 1.6, 2.1), bodyCol, Vector3.new(0, 0.92, -1.0), Enum.PartType.Ball)
		add("Snout", Vector3.new(1.15, 0.8, 0.85), dark, Vector3.new(0, 0.7, -1.85), Enum.PartType.Ball)
		add("EarL", Vector3.new(0.45, 0.55, 0.3), dark, Vector3.new(-0.72, 1.6, -0.7), Enum.PartType.Ball)
		add("EarR", Vector3.new(0.45, 0.55, 0.3), dark, Vector3.new(0.72, 1.6, -0.7), Enum.PartType.Ball)
		if kind == "axi" then
			for s = -1, 1, 2 do
				add("Gill" .. s, Vector3.new(0.7, 0.25, 0.25), Color3.fromRGB(244, 63, 94), Vector3.new(s * 1.15, 0.95, -0.9), Enum.PartType.Block)
			end
		end
		addCuteFace(add, Vector3.new(0, 0.92, -1.0), 0.46, 0.16, -0.94)
		if kind == "kapi" or not kind then
			add("Tangerine", Vector3.new(0.72, 0.62, 0.72), orange, Vector3.new(0, 1.92, -1.0), Enum.PartType.Ball)
			add("Leaf", Vector3.new(0.28, 0.12, 0.38), Color3.fromRGB(34, 197, 94), Vector3.new(0.14, 2.28, -1.0), Enum.PartType.Block, nil, CFrame.Angles(0, 0.3, 0.2))
		end
	end

	-- Волшебные искорки под питомцем
	if model.PrimaryPart then
		local pe = Instance.new("ParticleEmitter")
		pe.Color = ColorSequence.new(Color3.fromRGB(253, 224, 71), Color3.fromRGB(167, 243, 208))
		pe.Size = NumberSequence.new({ NumberSequenceKeypoint.new(0, 0.22), NumberSequenceKeypoint.new(1, 0) })
		pe.Rate = 6
		pe.Speed = NumberRange.new(0.5, 1.5)
		pe.Lifetime = NumberRange.new(0.6, 1.1)
		pe.Parent = model.PrimaryPart
	end

	return headPart, offsets
end

function Mascot.Create(plot)
	local model = Instance.new("Model")
	model.Name = "PetGuide"
	model.Parent = plot.folder

	local headPart, offsets = buildBody(model, "kapi")

	-- Облачко скрыто до привязки владельца и имеет строгий MaxDistance, чтобы никогда не мелькать на карте
	local bbg = Instance.new("BillboardGui")
	bbg.Name = "Bubble"
	bbg.Size = UDim2.fromOffset(230, 64)
	bbg.StudsOffset = Vector3.new(0, 3.0, 0)
	bbg.AlwaysOnTop = false
	bbg.MaxDistance = 40
	bbg.Enabled = false
	bbg.Adornee = headPart
	bbg.Parent = model

	local frame = Instance.new("Frame")
	frame.Size = UDim2.fromScale(1, 1)
	frame.BackgroundColor3 = Color3.fromRGB(255, 252, 240)
	frame.BorderSizePixel = 0
	frame.Parent = bbg
	Instance.new("UICorner", frame).CornerRadius = UDim.new(0, 14)
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
	label.Text = ""
	label.Parent = frame

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
