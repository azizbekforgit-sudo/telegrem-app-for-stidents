-- Фоновая музыка и звуки природы (звуки событий играет UI и сервер у самих предметов)
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local SoundService = game:GetService("SoundService")

local Config = require(ReplicatedStorage.Shared.Config)

local function loop(name, id, volume)
	if type(id) ~= "string" or #id == 0 then return nil end
	local s = Instance.new("Sound")
	s.Name = name
	s.SoundId = id
	s.Looped = true
	s.Volume = volume
	s.Parent = SoundService
	s:Play()
	return s
end

-- после появления камера сразу смотрит вперёд по пути (за спиной персонажа)
local player = game:GetService("Players").LocalPlayer
local function faceForward(char)
	local hrp = char:WaitForChild("HumanoidRootPart", 10)
	if not hrp then return end
	task.wait(0.35) -- сервер успевает поставить персонажа на точку
	local cam = workspace.CurrentCamera
	local look = hrp.CFrame.LookVector
	local focus = hrp.Position + Vector3.new(0, 2, 0)
	cam.CFrame = CFrame.lookAt(focus - look * 18 + Vector3.new(0, 7, 0), focus + look * 6)
end
player.CharacterAdded:Connect(faceForward)
if player.Character then task.spawn(faceForward, player.Character) end

loop("Music", Config.SOUNDS.Music, 0.18)
loop("Ambient", Config.SOUNDS.Ambient, 0.25)
