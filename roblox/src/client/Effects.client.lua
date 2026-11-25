-- Клиентские эффекты: звуки из Config.SOUNDS (без перехвата камеры — камера всегда на персонаже)
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local SoundService = game:GetService("SoundService")

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

effectEv.OnClientEvent:Connect(function(kind)
	if kind == "bridge" then
		if sfxPrinter then
			sfxPrinter:Play()
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
