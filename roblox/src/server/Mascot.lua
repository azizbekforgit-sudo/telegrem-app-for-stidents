-- Маскот Капи-проводник: собран из простых деталей, следует за игроком и показывает реплики
local TweenService = game:GetService("TweenService")
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

function Mascot.Create(plot)
	local model = Instance.new("Model")
	model.Name = "Kapi"

	local brown = Color3.fromRGB(168, 114, 72)
	local dark = Color3.fromRGB(92, 60, 38)
	local orange = Color3.fromRGB(249, 115, 22)

	local root = part(model, "Root", Vector3.new(2.4, 2.0, 3.0), brown, Enum.PartType.Ball)
	local head = part(model, "Head", Vector3.new(1.8, 1.5, 2.0), brown, Enum.PartType.Ball)
	local snout = part(model, "Snout", Vector3.new(1.2, 0.9, 0.9), dark, Enum.PartType.Ball)
	local earL = part(model, "EarL", Vector3.new(0.45, 0.55, 0.3), dark, Enum.PartType.Ball)
	local earR = part(model, "EarR", Vector3.new(0.45, 0.55, 0.3), dark, Enum.PartType.Ball)
	local eyeL = part(model, "EyeL", Vector3.new(0.22, 0.22, 0.22), Color3.new(0.08, 0.08, 0.08), Enum.PartType.Ball)
	local eyeR = part(model, "EyeR", Vector3.new(0.22, 0.22, 0.22), Color3.new(0.08, 0.08, 0.08), Enum.PartType.Ball)
	local tangerine = part(model, "Tangerine", Vector3.new(0.65, 0.55, 0.65), orange, Enum.PartType.Ball)
	local leaf = part(model, "Leaf", Vector3.new(0.25, 0.12, 0.35), Color3.fromRGB(34, 197, 94))

	model.PrimaryPart = root
	model.Parent = plot.folder

	-- Облачко реплик над головой
	local bbg = Instance.new("BillboardGui")
	bbg.Name = "Bubble"
	bbg.Size = UDim2.fromOffset(250, 76)
	bbg.StudsOffset = Vector3.new(0, 3.4, 0)
	bbg.AlwaysOnTop = true
	bbg.Adornee = head
	bbg.Parent = head

	local frame = Instance.new("Frame")
	frame.Size = UDim2.fromScale(1, 1)
	frame.BackgroundColor3 = Color3.fromRGB(255, 252, 240)
	frame.BorderSizePixel = 0
	frame.Parent = bbg

	local corner = Instance.new("UICorner")
	corner.CornerRadius = UDim.new(0, 12)
	corner.Parent = frame

	local stroke = Instance.new("UIStroke")
	stroke.Color = Color3.fromRGB(217, 178, 120)
	stroke.Thickness = 2
	stroke.Parent = frame

	local label = Instance.new("TextLabel")
	label.Name = "Text"
	label.Size = UDim2.new(1, -14, 1, -10)
	label.Position = UDim2.fromOffset(7, 5)
	label.BackgroundTransparency = 1
	label.TextWrapped = true
	label.TextScaled = true
	label.Font = Enum.Font.GothamMedium
	label.TextColor3 = Color3.fromRGB(45, 36, 26)
	label.Text = "Привет! Я Капи."
	label.Parent = frame

	local basePos = plot.campPos + Vector3.new(4, 2.2, 4)
	local currentCF = CFrame.new(basePos)
	local jumpOffset = 0

	local function layoutParts(cf)
		local bob = math.sin(os.clock() * 3) * 0.08 + jumpOffset
		local bodyCF = cf * CFrame.new(0, bob, 0)
		root.CFrame = bodyCF
		head.CFrame = bodyCF * CFrame.new(0, 0.9, -1.0)
		snout.CFrame = bodyCF * CFrame.new(0, 0.75, -1.85)
		earL.CFrame = bodyCF * CFrame.new(-0.7, 1.55, -0.7)
		earR.CFrame = bodyCF * CFrame.new(0.7, 1.55, -0.7)
		eyeL.CFrame = bodyCF * CFrame.new(-0.48, 1.05, -1.75)
		eyeR.CFrame = bodyCF * CFrame.new(0.48, 1.05, -1.75)
		tangerine.CFrame = bodyCF * CFrame.new(0, 1.85, -1.0)
		leaf.CFrame = bodyCF * CFrame.new(0.12, 2.18, -1.0) * CFrame.Angles(0, 0.3, 0.2)
	end

	layoutParts(currentCF)

	-- Плавное следование за владельцем участка на расстоянии ~6 studs
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
		-- Не прыгаем в пропасть за игроком
		local distFromCenter = (targetPos - plot.center).Magnitude
		if distFromCenter > 95 then
			targetPos = basePos
		end
		targetPos = Vector3.new(targetPos.X, math.max(plot.center.Y + 2.2, hrp.Position.Y - 1), targetPos.Z)
		local pos = currentCF.Position:Lerp(targetPos, math.clamp(dt * 2.5, 0, 1))
		local look = Vector3.new(hrp.Position.X, pos.Y, hrp.Position.Z)
		if (look - pos).Magnitude > 0.2 then
			currentCF = CFrame.lookAt(pos, look)
		else
			currentCF = CFrame.new(pos)
		end
		layoutParts(currentCF)
	end)

	plot.kapi = {
		model = model,
		label = label,
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
