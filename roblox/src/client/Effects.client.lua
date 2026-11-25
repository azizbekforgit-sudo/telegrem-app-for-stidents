-- Клиентские эффекты: камера-облёт при сборке моста и звуки из Config.SOUNDS
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local SoundService = game:GetService("SoundService")
local TweenService = game:GetService("TweenService")
local Workspace = game:GetService("Workspace")

local Config = require(ReplicatedStorage.Shared.Config)
local remotes = ReplicatedStorage:WaitForChild("Remotes")
local effectEv = remotes:WaitForChild(Config.REMOTES.Effect)

local function makeSound(name, id, looped, volume)
	if type(id) ~= "string" or #id == 0 then
		return nil
	end
	local s = Instance.new("Sound")
	s.Name = name
	s.SoundId = id
	s.Looped = looped == true
	s.Volume = volume or 0.5
	s.Parent = SoundService
	return s
end

local ambient = makeSound("Ambient", Config.SOUNDS.Ambient, true, 0.35)
if ambient then
	ambient:Play()
end
local wind = makeSound("Wind", Config.SOUNDS.Wind, true, 0.25)
if wind then
	wind:Play()
end

local sfxPrinter = makeSound("Printer", Config.SOUNDS.Printer, false, 0.8)
local sfxFall = makeSound("Fall", Config.SOUNDS.Fall, false, 0.7)
local sfxWin = makeSound("Win", Config.SOUNDS.Win, false, 0.9)

effectEv.OnClientEvent:Connect(function(kind, data)
	if kind == "bridge" then
		if sfxPrinter then
			sfxPrinter:Play()
		end
		-- Короткий плавный облёт камеры к станку-принтеру
		local cam = Workspace.CurrentCamera
		local pos = data and data.printerPos
		if cam and typeof(pos) == "Vector3" then
			local prevType = cam.CameraType
			local prevCF = cam.CFrame
			cam.CameraType = Enum.CameraType.Scriptable
			local targetCF = CFrame.lookAt(pos + Vector3.new(12, 10, 14), pos + Vector3.new(0, 2, 0))
			TweenService:Create(cam, TweenInfo.new(0.8, Enum.EasingStyle.Quad, Enum.EasingDirection.Out), { CFrame = targetCF }):Play()
			task.delay(2.0, function()
				TweenService:Create(cam, TweenInfo.new(0.6, Enum.EasingStyle.Quad, Enum.EasingDirection.InOut), { CFrame = prevCF }):Play()
				task.delay(0.65, function()
					cam.CameraType = prevType
				end)
			end)
		end
	elseif kind == "fall" then
		if sfxFall then
			sfxFall:Play()
		end
	elseif kind == "win" then
		if sfxWin then
			sfxWin:Play()
		end
	end
end)
