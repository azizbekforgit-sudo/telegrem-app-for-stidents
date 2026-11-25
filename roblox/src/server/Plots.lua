-- Управление участками игроков: у каждого ученика свой изолированный остров
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local Config = require(ReplicatedStorage.Shared.Config)

local Plots = {}
local list = {}

function Plots.Init(buildFn)
	for i = 1, Config.PLOT_COUNT do
		local angle = (i - 1) * (2 * math.pi / Config.PLOT_COUNT)
		local center = Vector3.new(
			math.round(math.cos(angle) * Config.PLOT_RADIUS),
			20,
			math.round(math.sin(angle) * Config.PLOT_RADIUS)
		)
		local plot = {
			index = i,
			center = center,
			owner = nil,
			token = nil,
			lastPushId = 0,
			lastActivity = os.clock(),
			won = false,
			stars = 0,
			kapiLines = {},
			bridgeModel = nil,
			folder = nil,
		}
		if buildFn then
			buildFn(plot)
		end
		list[i] = plot
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
			plot.won = false
			plot.stars = 0
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
	plot.won = false
	if plot.bridgeModel then
		plot.bridgeModel:Destroy()
		plot.bridgeModel = nil
	end
end

return Plots
