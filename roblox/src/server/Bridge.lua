-- Превращение CSS Grid из приложения в уникальные 3D-фигуры для каждого уровня Урока 8:
-- мост, золотая лестница, плот из брёвен, хрустальный ключ, прыгучие облака, семафор,
-- крыша, руны, замковый мост, солнечные крылья и радужная дорога.
-- Поддерживает перетаскивание мышью (DragDetector), перенос по [E] и поворот по [R].
local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local RunService = game:GetService("RunService")
local Config = require(ReplicatedStorage.Shared.Config)

local Bridge = {}

local LEVEL_LABELS = {
	["8-1"] = "Мост из CSS Grid",
	["8-2"] = "Небесная лестница",
	["8-3"] = "Плот из брёвен",
	["8-4"] = "Хрустальный ключ",
	["8-5"] = "Прыгучие облака",
	["8-6"] = "Семафор станции",
	["8-7"] = "Крыша Светлячков",
	["8-8"] = "Руны Портала",
	["8-9"] = "Замковый мост",
	["8-10"] = "Солнечные крылья",
	["8-11"] = "Радужная дорога",
}

local function addTrim(parent, size, cf, color, mat)
	local t = Instance.new("Part")
	t.Name = "Trim"
	t.Size = size
	t.CFrame = cf
	t.Color = color
	t.Material = mat or Enum.Material.Neon
	t.CanCollide = false
	t.Massless = true
	t.TopSurface = Enum.SurfaceType.Smooth
	t.BottomSurface = Enum.SurfaceType.Smooth
	t.Parent = parent
	return t
end

function Bridge.Spawn(plot, boxes, container, spawnAnchor, levelId)
	if plot.bridgeModel then
		plot.bridgeModel:Destroy()
		plot.bridgeModel = nil
	end
	if type(boxes) ~= "table" or #boxes == 0 then
		return nil
	end

	local lv = tostring(levelId or plot.activeLevelId or "8-1")
	plot.bridgeLevelId = lv

	local model = Instance.new("Model")
	model.Name = "PlayerCreation"

	local scale = Config.SCALE or 10
	local minX, minY, maxX, maxY = math.huge, math.huge, -math.huge, -math.huge
	for _, b in ipairs(boxes) do
		local x, y = tonumber(b.x) or 0, tonumber(b.y) or 0
		local w, h = tonumber(b.w) or 80, tonumber(b.h) or 60
		minX = math.min(minX, x)
		minY = math.min(minY, y)
		maxX = math.max(maxX, x + w)
		maxY = math.max(maxY, y + h)
	end

	local spanW = (maxX - minX) / scale
	local spanD = (maxY - minY) / scale
	local origin = (spawnAnchor or plot.printerPos) + Vector3.new(0, 3.6, 0)

	local parts = {}
	local phys = PhysicalProperties.new(1.8, 1.6, 0.02, 1.0, 1.0)
	local dirAngle = plot.angle or 0
	local rotSteps = 0

	local function currentAngle()
		return -dirAngle + rotSteps * (math.pi / 2)
	end

	-- Сортируем по Y для лестницы/крыши, чтобы индекс шёл сверху вниз ровно
	local ordered = {}
	for i, b in ipairs(boxes) do
		table.insert(ordered, { idx = i, b = b })
	end
	if lv == "8-2" or lv == "8-7" then
		table.sort(ordered, function(a, c)
			return (tonumber(a.b.y) or 0) < (tonumber(c.b.y) or 0)
		end)
	end

	for orderIdx, entry in ipairs(ordered) do
		local i = entry.idx
		local b = entry.b
		local w = math.clamp((tonumber(b.w) or 80) / scale, 0.5, 200)
		local d = math.clamp((tonumber(b.h) or 60) / scale, 0.5, 200)
		local px = ((tonumber(b.x) or 0) - minX) / scale + w / 2 - spanW / 2
		local pz = ((tonumber(b.y) or 0) - minY) / scale + d / 2 - spanD / 2

		local c = b.color
		local color = Color3.fromRGB(160, 82, 45)
		if type(c) == "table" and #c >= 3 then
			color = Color3.fromRGB(
				math.clamp(math.round(tonumber(c[1]) or 160), 0, 255),
				math.clamp(math.round(tonumber(c[2]) or 82), 0, 255),
				math.clamp(math.round(tonumber(c[3]) or 45), 0, 255)
			)
		end

		local thickness = 1.15
		local py = 0
		local mat = Enum.Material.WoodPlanks
		local shape = Enum.PartType.Block

		if lv == "8-2" then
			-- Лестница: каждая следующая ступенька поднимается вверх!
			thickness = 1.2 + (orderIdx - 1) * 1.15
			py = (orderIdx - 1) * 0.575
			mat = Enum.Material.Marble
		elseif lv == "8-3" then
			-- Плот из круглых брёвен
			thickness = 1.45
			mat = Enum.Material.Wood
			shape = Enum.PartType.Cylinder
		elseif lv == "8-4" then
			-- Хрустальные кристаллы
			thickness = 1.35
			mat = Enum.Material.Glass
		elseif lv == "8-5" then
			-- Прыгучие облака-батуты
			thickness = 1.3
			mat = Enum.Material.Neon
		elseif lv == "8-6" then
			-- Семафорные фонари
			thickness = 1.3
			mat = Enum.Material.Neon
		elseif lv == "8-7" then
			-- Ярусы крыши Дома Светлячков (пирамидка вверх!)
			thickness = 1.25
			py = (#ordered - orderIdx) * 1.15
			mat = Enum.Material.WoodPlanks
		elseif lv == "8-8" then
			-- Руны портала
			thickness = 1.2
			mat = Enum.Material.Slate
		elseif lv == "8-9" then
			-- Каменный замковый мост
			thickness = 1.35
			mat = Enum.Material.Cobblestone
		elseif lv == "8-10" then
			-- Солнечные панели
			thickness = 0.9
			mat = Enum.Material.Glass
		elseif lv == "8-11" then
			-- Радужные неоновые балки
			thickness = 1.25
			mat = Enum.Material.Neon
		end

		local plank = Instance.new("Part")
		plank.Name = "Plank_" .. tostring(i)
		if shape == Enum.PartType.Cylinder then
			-- Цилиндр ориентирован вдоль локальной оси X, поэтому поворачиваем вокруг Y на 90°, чтобы лежал вдоль Z (длины бревна)
			plank.Size = Vector3.new(d, math.min(w, thickness * 1.35), math.min(w, thickness * 1.35))
			plank.CFrame = CFrame.new(origin) * CFrame.Angles(0, currentAngle(), 0) * CFrame.new(px, py, pz) * CFrame.Angles(0, math.pi / 2, 0)
			plank.Shape = Enum.PartType.Cylinder
		else
			plank.Size = Vector3.new(w, thickness, d)
			plank.CFrame = CFrame.new(origin) * CFrame.Angles(0, currentAngle(), 0) * CFrame.new(px, py, pz)
		end
		plank.Color = color
		plank.Material = mat
		plank.CustomPhysicalProperties = phys
		plank.TopSurface = Enum.SurfaceType.Smooth
		plank.BottomSurface = Enum.SurfaceType.Smooth
		plank.Anchored = false
		plank.Parent = model

		-- Декоративные 3D-детали на каждом блоке
		if lv == "8-1" or lv == "8-9" then
			local trimCol = lv == "8-9" and Color3.fromRGB(250, 204, 21) or Color3.fromRGB(92, 60, 38)
			addTrim(plank, Vector3.new(w * 0.96, 0.16, 0.28), plank.CFrame * CFrame.new(0, thickness / 2 + 0.04, 0), trimCol, lv == "8-9" and Enum.Material.Neon or Enum.Material.Metal)
		elseif lv == "8-2" then
			addTrim(plank, Vector3.new(w * 0.92, 0.18, d * 0.88), plank.CFrame * CFrame.new(0, thickness / 2 + 0.05, 0), Color3.fromRGB(253, 224, 71), Enum.Material.Neon)
		elseif lv == "8-4" then
			local core = addTrim(plank, Vector3.new(w * 0.65, thickness * 0.65, d * 0.65), plank.CFrame, Color3.fromRGB(125, 211, 252), Enum.Material.Neon)
			local pl = Instance.new("PointLight", core); pl.Color = Color3.fromRGB(56, 189, 248); pl.Range = 10; pl.Brightness = 0.8
		elseif lv == "8-5" then
			-- Мягкая белая каёмка облака + батутная физика!
			local fluff = addTrim(plank, Vector3.new(w + 0.45, 0.65, d + 0.45), plank.CFrame * CFrame.new(0, -0.15, 0), Color3.fromRGB(255, 245, 250), Enum.Material.SmoothPlastic)
			fluff.Shape = Enum.PartType.Ball
			local bounceDb = {}
			plank.Touched:Connect(function(hit)
				local char = hit.Parent
				local hrp = char and char:FindFirstChild("HumanoidRootPart")
				if not hrp or bounceDb[char] then return end
				bounceDb[char] = true
				hrp.AssemblyLinearVelocity = Vector3.new(hrp.AssemblyLinearVelocity.X, 58, hrp.AssemblyLinearVelocity.Z)
				task.delay(0.35, function() bounceDb[char] = nil end)
			end)
		elseif lv == "8-6" then
			addTrim(plank, Vector3.new(w + 0.35, thickness * 0.7, d + 0.35), plank.CFrame, Color3.fromRGB(30, 41, 59), Enum.Material.Metal)
			local pl = Instance.new("PointLight", plank); pl.Color = color; pl.Range = 12; pl.Brightness = 1.1
		elseif lv == "8-8" then
			addTrim(plank, Vector3.new(w * 0.86, 0.16, d * 0.86), plank.CFrame * CFrame.new(0, thickness / 2 + 0.05, 0), Color3.fromRGB(192, 132, 252), Enum.Material.Neon)
		elseif lv == "8-10" then
			addTrim(plank, Vector3.new(w * 0.9, 0.12, 0.2), plank.CFrame * CFrame.new(0, thickness / 2 + 0.04, 0), Color3.fromRGB(250, 204, 21), Enum.Material.Neon)
		elseif lv == "8-11" then
			local sparkles = Instance.new("ParticleEmitter", plank)
			sparkles.Color = ColorSequence.new(color, Color3.new(1, 1, 1))
			sparkles.Size = NumberSequence.new({ NumberSequenceKeypoint.new(0, 0.25), NumberSequenceKeypoint.new(1, 0) })
			sparkles.Rate = 4; sparkles.Speed = NumberRange.new(1, 2.5); sparkles.Lifetime = NumberRange.new(0.5, 0.9)
		end

		-- Номер блока на верхней грани
		local sg = Instance.new("SurfaceGui")
		sg.Face = shape == Enum.PartType.Cylinder and Enum.NormalId.Top or Enum.NormalId.Top
		sg.SizingMode = Enum.SurfaceGuiSizingMode.PixelsPerStud
		sg.PixelsPerStud = 32
		sg.Parent = plank

		local lbl = Instance.new("TextLabel")
		lbl.Size = UDim2.fromScale(1, 1)
		lbl.BackgroundTransparency = 1
		lbl.Text = tostring(i)
		lbl.TextColor3 = Color3.new(1, 1, 1)
		lbl.TextStrokeTransparency = 0.25
		lbl.TextScaled = true
		lbl.Font = Enum.Font.GothamBold
		lbl.Parent = sg

		table.insert(parts, plank)
	end

	-- Поперечная верёвочная стяжка для плота 8-3, чтобы брёвна выглядели как единый плот
	if lv == "8-3" and #parts > 1 then
		local strap = addTrim(parts[1], Vector3.new(math.max(2, spanW), 0.22, 0.55), CFrame.new(origin) * CFrame.Angles(0, currentAngle(), 0), Color3.fromRGB(217, 178, 120), Enum.Material.Fabric)
		strap.CanCollide = false
	end

	local primary = parts[1]
	model.PrimaryPart = primary
	for _, p in ipairs(parts) do
		for _, ch in ipairs(p:GetChildren()) do
			if ch:IsA("BasePart") then
				local w = Instance.new("WeldConstraint")
				w.Part0 = p
				w.Part1 = ch
				w.Parent = p
			end
		end
	end
	for i = 2, #parts do
		local weld = Instance.new("WeldConstraint")
		weld.Part0 = primary
		weld.Part1 = parts[i]
		weld.Parent = primary
	end

	-- Лёгкая золотая подсветка, чтобы ученик сразу видел интерактивный предмет
	local hl = Instance.new("Highlight", model)
	hl.FillTransparency = 1
	hl.OutlineColor = Color3.fromRGB(250, 204, 21)
	hl.OutlineTransparency = 0.45
	hl.DepthMode = Enum.HighlightDepthMode.Occluded

	local gyro = Instance.new("AlignOrientation")
	gyro.Mode = Enum.OrientationAlignmentMode.OneAttachment
	local att = Instance.new("Attachment", primary)
	gyro.Attachment0 = att
	gyro.MaxTorque = 60000
	gyro.Responsiveness = 25
	gyro.CFrame = CFrame.Angles(0, currentAngle(), 0)
	gyro.Parent = primary

	local drag = Instance.new("DragDetector")
	drag.DragStyle = Enum.DragDetectorDragStyle.TranslateViewPlane
	drag.PermissionPolicy = Enum.DragDetectorPermissionPolicy.Everybody
	drag.MaxForce = math.huge
	drag.MaxTorque = 0
	drag.Responsiveness = 32
	drag.ApplyAtCenterOfMass = true
	drag.Parent = primary

	local carrying = false
	local prompt = Instance.new("ProximityPrompt")
	prompt.ActionText = "Взять предмет"
	prompt.ObjectText = LEVEL_LABELS[lv] or "Сборка из CSS"
	prompt.MaxActivationDistance = 18
	prompt.HoldDuration = 0
	prompt.Parent = primary

	local function notifyCarryState()
		if plot.owner then
			local remotes = ReplicatedStorage:FindFirstChild("Remotes")
			local stateEv = remotes and remotes:FindFirstChild(Config.REMOTES.State)
			if stateEv then
				stateEv:FireClient(plot.owner, { carrying = carrying })
			end
		end
	end

	local function setCarry(state)
		carrying = state
		prompt.ActionText = carrying and "Поставить" or "Взять предмет"
		hl.OutlineColor = carrying and Color3.fromRGB(74, 222, 128) or Color3.fromRGB(250, 204, 21)
		hl.OutlineTransparency = carrying and 0.1 or 0.45
		primary.Anchored = carrying
		for _, p in ipairs(parts) do
			p.CanCollide = not carrying
			p.Massless = carrying
		end
		if not carrying then
			primary.AssemblyLinearVelocity = Vector3.zero
			primary.AssemblyAngularVelocity = Vector3.zero
		end
		notifyCarryState()
	end

	plot.rotateCreation = function()
		if not model.Parent or not primary.Parent then return end
		rotSteps = (rotSteps + 1) % 4
		local ang = currentAngle()
		gyro.CFrame = CFrame.Angles(0, ang, 0)
		if not carrying then
			local pos = model:GetPivot().Position
			model:PivotTo(CFrame.new(pos) * CFrame.Angles(0, ang, 0))
		end
	end

	prompt.Triggered:Connect(function(plr)
		if plr ~= plot.owner then return end
		setCarry(not carrying)
	end)

	drag.DragStart:Connect(function(plr)
		if plr ~= plot.owner then return end
		if carrying then
			setCarry(false)
		end
	end)

	model.Parent = plot.folder
	plot.bridgeModel = model

	local carryDist = math.clamp(math.max(spanW, spanD) * 0.45 + 6, 9, 18)
	local conn
	conn = RunService.Heartbeat:Connect(function()
		if not model.Parent or not primary.Parent then
			conn:Disconnect()
			return
		end
		if carrying and plot.owner and plot.owner.Character then
			local hrp = plot.owner.Character:FindFirstChild("HumanoidRootPart")
			if hrp then
				local targetCF = CFrame.new(hrp.Position + hrp.CFrame.LookVector * carryDist + Vector3.new(0, 2.0, 0)) * CFrame.Angles(0, currentAngle(), 0)
				model:PivotTo(targetCF)
				return
			end
		end
		local pos = primary.Position
		if pos.Y < plot.center.Y - 25 then
			primary.AssemblyLinearVelocity = Vector3.zero
			primary.AssemblyAngularVelocity = Vector3.zero
			model:PivotTo(CFrame.new(origin) * CFrame.Angles(0, currentAngle(), 0))
		end
	end)

	return model
end

return Bridge
