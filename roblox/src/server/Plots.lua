-- Участки учеников: до 8 цепочек островов в одном сервере. Остров строится лениво при первом входе.
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local Config = require(ReplicatedStorage.Shared.Config)

local Plots = {}
local list = {}
local builderFn = nil

local function resetState(plot)
	plot.token = nil
	plot.linked = false
	plot.lang = "ru"
	plot.name = nil
	plot.lastPushId = 0
	plot.lastActivity = os.clock()
	plot.activeLevelId = "8-1"
	plot.wonLevels = {}
	plot.starsByLevel = {}
	plot.solved = {}
	plot.coins = 0
	plot.kapiLines = {}
	plot.currentSpawn = plot.spawnPos
	if plot.creation then
		plot.creation:Destroy()
		plot.creation = nil
	end
	if plot.resetWorld then
		plot.resetWorld()
	end
end

function Plots.Init(buildFn)
	builderFn = buildFn
	for i = 1, Config.PLOT_COUNT do
		local angle = (i - 1) * (2 * math.pi / Config.PLOT_COUNT)
		local dir = Vector3.new(math.cos(angle), 0, math.sin(angle))
		local center = dir * Config.PLOT_RADIUS + Vector3.new(0, 24, 0)
		local plot = {
			index = i,
			dir = dir,
			right = Vector3.new(-dir.Z, 0, dir.X),
			angle = angle,
			center = center,
			owner = nil,
			built = false,
			biomes = {},
			spawnPos = center + Vector3.new(0, 6, 0),
		}
		resetState(plot)
		list[i] = plot
	end
end

-- другой код на том же острове (сели за один компьютер) — начинаем с чистого листа
function Plots.Reset(plot)
	resetState(plot)
end

function Plots.All()
	return list
end

function Plots.Get(player)
	for _, plot in ipairs(list) do
		if plot.owner == player then
			return plot
		end
	end
	return nil
end

function Plots.Assign(player)
	local existing = Plots.Get(player)
	if existing then
		return existing
	end
	for _, plot in ipairs(list) do
		if not plot.owner then
			plot.owner = player
			if not plot.built and builderFn then
				plot.built = true
				builderFn(plot)
			end
			resetState(plot)
			return plot
		end
	end
	return nil
end

function Plots.Release(player)
	local plot = Plots.Get(player)
	if not plot then
		return
	end
	plot.owner = nil
	resetState(plot)
	if plot.pet and plot.pet.hide then
		plot.pet.hide()
	end
end

return Plots
