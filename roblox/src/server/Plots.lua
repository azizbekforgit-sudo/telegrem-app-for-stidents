-- Управление участками игроков: ленивая постройка архипелага при входе ученика + сохранение прогресса
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local Config = require(ReplicatedStorage.Shared.Config)

local Plots = {}
local list = {}
local builderFn = nil

function Plots.Init(buildFn)
	builderFn = buildFn
	for i = 1, Config.PLOT_COUNT do
		local angle = (i - 1) * (2 * math.pi / Config.PLOT_COUNT)
		local dir = Vector3.new(math.cos(angle), 0, math.sin(angle))
		local center = dir * Config.PLOT_RADIUS + Vector3.new(0, 24, 0)
		list[i] = {
			index = i,
			dir = dir,
			angle = angle,
			center = center,
			owner = nil,
			token = nil,
			built = false,
			lastPushId = 0,
			lastActivity = os.clock(),
			activeLevelId = "8-1",
			wonLevels = {},
			starsByLevel = {},
			coins = 0,
			currentSpawn = nil,
			spawnPos = center + Vector3.new(-28, 5, 8),
			checkpointPos = center + Vector3.new(-9, 4, 0),
			kapiLines = {},
			bridgeModel = nil,
			folder = nil,
			biomes = {},
		}
	end
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
			plot.token = nil
			plot.lastPushId = 0
			plot.lastActivity = os.clock()
			plot.activeLevelId = "8-1"
			plot.wonLevels = {}
			plot.starsByLevel = {}
			plot.coins = 0
			if not plot.built and builderFn then
				plot.built = true
				builderFn(plot)
			end
			plot.currentSpawn = plot.spawnPos
			if plot.bridgeModel then
				plot.bridgeModel:Destroy()
				plot.bridgeModel = nil
			end
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
	plot.token = nil
	plot.lastPushId = 0
	plot.wonLevels = {}
	plot.starsByLevel = {}
	plot.currentSpawn = plot.spawnPos
	if plot.bridgeModel then
		plot.bridgeModel:Destroy()
		plot.bridgeModel = nil
	end
	if plot.kapi and plot.kapi.bbg then
		plot.kapi.bbg.Enabled = false
	end
end

return Plots
