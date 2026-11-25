-- Превращение прямоугольников из CSS Grid в 3D-доски с DragDetector
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
	local minX, minY = math.huge, math.huge
	local maxX, maxY = -math.huge, -math.huge
	for _, b in ipairs(boxes) do
		local x = tonumber(b.x) or 0
		local y = tonumber(b.y) or 0
		local w = tonumber(b.w) or 80
		local h = tonumber(b.h) or 60
		minX = math.min(minX, x)
		minY = math.min(minY, y)
		maxX = math.max(maxX, x + w)
		maxY = math.max(maxY, y + h)
	end

	local spanW = (maxX - minX) / scale
	local spanD = (maxY - minY) / scale
	local origin = plot.printerPos + Vector3.new(0, 3.2, 0)

	local parts = {}
	local phys = PhysicalProperties.new(2.0, 1.5, 0.05, 1.0, 1.0)

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

		-- Номер доски сверху
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

	-- Помогаем мосту не переворачиваться
	local gyro = Instance.new("AlignOrientation")
	gyro.Mode = Enum.OrientationAlignmentMode.OneAttachment
	local att = Instance.new("Attachment")
	att.Parent = primary
	gyro.Attachment0 = att
	gyro.MaxTorque = 25000
	gyro.Responsiveness = 12
	gyro.CFrame = CFrame.new()
	gyro.Parent = primary

	-- DragDetector: ученица берёт мост руками и несёт к пропасти
	local drag = Instance.new("DragDetector")
	drag.DragStyle = Enum.DragDetectorDragStyle.TranslatePlane
	drag.MaxForce = 60000
	drag.Responsiveness = 25
	drag.ApplyAtCenterOfMass = true
	drag.Parent = model

	model.Parent = plot.folder
	plot.bridgeModel = model

	-- Не даём выбросить мост за пределы участка
	local conn
	conn = RunService.Heartbeat:Connect(function()
		if not model.Parent or not primary.Parent then
			conn:Disconnect()
			return
		end
		local pos = primary.Position
		local flat = Vector3.new(pos.X - plot.center.X, 0, pos.Z - plot.center.Z)
		if flat.Magnitude > 85 or pos.Y < plot.center.Y - 6 then
			primary.AssemblyLinearVelocity = Vector3.zero
			primary.AssemblyAngularVelocity = Vector3.zero
			model:PivotTo(CFrame.new(origin))
		end
	end)

	return model
end

return Bridge
