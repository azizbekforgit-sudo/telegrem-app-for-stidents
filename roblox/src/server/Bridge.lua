-- Превращение прямоугольников из CSS Grid в 3D-доски:
-- 1) DragDetector (TranslateViewPlane) для свободного перетаскивания мышкой/пальцем
-- 2) Кнопка [E] «Взять / Поставить мост» (ProximityPrompt) для лёгкой переноски
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local RunService = game:GetService("RunService")
local Config = require(ReplicatedStorage.Shared.Config)

local Bridge = {}

function Bridge.Spawn(plot, boxes, container)
	if plot.bridgeModel then
		plot.bridgeModel:Destroy()
		plot.bridgeModel = nil
	end
	if type(boxes) ~= "table" or #boxes == 0 then
		return nil
	end

	local model = Instance.new("Model")
	model.Name = "PlayerBridge"

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
	local origin = plot.printerPos + Vector3.new(0, 3.2, 0)

	local parts = {}
	local phys = PhysicalProperties.new(1.5, 1.5, 0.05, 1.0, 1.0)

	for i, b in ipairs(boxes) do
		local w = math.clamp((tonumber(b.w) or 80) / scale, 0.4, 200)
		local d = math.clamp((tonumber(b.h) or 60) / scale, 0.4, 200)
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

		local plank = Instance.new("Part")
		plank.Name = "Plank_" .. tostring(i)
		plank.Size = Vector3.new(w, 1, d)
		plank.CFrame = CFrame.new(origin + Vector3.new(px, 0, pz))
		plank.Color = color
		plank.Material = Enum.Material.WoodPlanks
		plank.CustomPhysicalProperties = phys
		plank.TopSurface = Enum.SurfaceType.Smooth
		plank.BottomSurface = Enum.SurfaceType.Smooth
		plank.Anchored = false
		plank.Parent = model

		local sg = Instance.new("SurfaceGui")
		sg.Face = Enum.NormalId.Top
		sg.SizingMode = Enum.SurfaceGuiSizingMode.PixelsPerStud
		sg.PixelsPerStud = 30
		sg.Parent = plank

		local lbl = Instance.new("TextLabel")
		lbl.Size = UDim2.fromScale(1, 1)
		lbl.BackgroundTransparency = 1
		lbl.Text = tostring(i)
		lbl.TextColor3 = Color3.new(1, 1, 1)
		lbl.TextStrokeTransparency = 0.4
		lbl.TextScaled = true
		lbl.Font = Enum.Font.GothamBold
		lbl.Parent = sg

		table.insert(parts, plank)
	end

	local primary = parts[1]
	model.PrimaryPart = primary
	for i = 2, #parts do
		local weld = Instance.new("WeldConstraint")
		weld.Part0 = primary
		weld.Part1 = parts[i]
		weld.Parent = primary
	end

	-- Стабилизатор наклона (не переворачивается)
	local gyro = Instance.new("AlignOrientation")
	gyro.Mode = Enum.OrientationAlignmentMode.OneAttachment
	local att = Instance.new("Attachment", primary)
	gyro.Attachment0 = att
	gyro.MaxTorque = 40000
	gyro.Responsiveness = 20
	gyro.CFrame = CFrame.new()
	gyro.Parent = primary

	-- DragDetector: можно свободно тянуть мышкой/пальцем в пространстве (TranslateViewPlane)
	local drag = Instance.new("DragDetector")
	drag.DragStyle = Enum.DragDetectorDragStyle.TranslateViewPlane
	drag.PermissionPolicy = Enum.DragDetectorPermissionPolicy.Everybody
	drag.MaxForce = math.huge
	drag.MaxTorque = 0
	drag.Responsiveness = 30
	drag.ApplyAtCenterOfMass = true
	drag.Parent = primary

	-- ProximityPrompt: удобная кнопка [E] Взять / Поставить мост
	local carrying = false
	local prompt = Instance.new("ProximityPrompt")
	prompt.ActionText = "Взять мост"
	prompt.ObjectText = "Мост из CSS"
	prompt.MaxActivationDistance = 14
	prompt.HoldDuration = 0
	prompt.Parent = primary

	local function setCarry(state)
		carrying = state
		prompt.ActionText = carrying and "Поставить мост" or "Взять мост"
		for _, p in ipairs(parts) do
			p.CanCollide = not carrying
			p.Massless = carrying
		end
		if not carrying then
			primary.AssemblyLinearVelocity = Vector3.zero
			primary.AssemblyAngularVelocity = Vector3.zero
		end
	end

	prompt.Triggered:Connect(function(plr)
		if plr ~= plot.owner then
			return
		end
		setCarry(not carrying)
	end)

	drag.DragStart:Connect(function()
		if carrying then
			setCarry(false)
		end
	end)

	model.Parent = plot.folder
	plot.bridgeModel = model

	local conn
	conn = RunService.Heartbeat:Connect(function()
		if not model.Parent or not primary.Parent then
			conn:Disconnect()
			return
		end
		if carrying and plot.owner and plot.owner.Character then
			local hrp = plot.owner.Character:FindFirstChild("HumanoidRootPart")
			if hrp then
				local targetCF = CFrame.new(hrp.Position + hrp.CFrame.LookVector * 10 + Vector3.new(0, 2.5, 0))
				primary.AssemblyLinearVelocity = Vector3.zero
				model:PivotTo(targetCF)
				return
			end
		end
		local pos = primary.Position
		local flat = Vector3.new(pos.X - plot.center.X, 0, pos.Z - plot.center.Z)
		if flat.Magnitude > 90 or pos.Y < plot.center.Y - 8 then
			primary.AssemblyLinearVelocity = Vector3.zero
			primary.AssemblyAngularVelocity = Vector3.zero
			model:PivotTo(CFrame.new(origin))
		end
	end)

	return model
end

return Bridge
