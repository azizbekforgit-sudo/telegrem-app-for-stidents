-- Синхронизация с сервером Express для всех 11 уровней:
-- сопряжение, выбор питомца из профиля, опрос активного уровня, прогресс и награды.
local HttpService = game:GetService("HttpService")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local TextService = game:GetService("TextService")

local Config = require(ReplicatedStorage.Shared.Config)
local Plots = require(script.Parent.Plots)
local Bridge = require(script.Parent.Bridge)
local Mascot = require(script.Parent.Mascot)

local remotes = ReplicatedStorage:WaitForChild("Remotes")
local pairFn = remotes:WaitForChild(Config.REMOTES.Pair)
local stateEv = remotes:WaitForChild(Config.REMOTES.State)
local effectEv = remotes:WaitForChild(Config.REMOTES.Effect)

local function filterText(text, fromUserId)
	if type(text) ~= "string" or #text == 0 then return "" end
	local ok, result = pcall(function()
		local res = TextService:FilterStringAsync(text, fromUserId, Enum.TextFilterContext.PrivateChat)
		return res:GetNonChatStringForUserAsync(fromUserId)
	end)
	if ok and type(result) == "string" then return result end
	return nil
end

local function highlightCss(lines, userId)
	local joined = table.concat(lines or {}, "\n")
	local safe = filterText(joined, userId)
	if not safe then return "/* CSS скрыт фильтром */" end
	safe = safe:gsub("&", "&amp;"):gsub("<", "&lt;"):gsub(">", "&gt;")
	local out = {}
	for line in (safe .. "\n"):gmatch("(.-)\n") do
		local colored = line
			:gsub("([%.#%w%-_]+)%s*{", '<font color="#fde047">%1</font> {')
			:gsub("([%w%-]+)%s*:", '<font color="#38bdf8">%1</font>:')
			:gsub(":([^;]+);", ':<font color="#fb923c">%1</font>;')
		table.insert(out, colored)
	end
	return table.concat(out, "\n")
end

local function postJson(path, body, token)
	local headers = { ["Content-Type"] = "application/json" }
	if token then headers["X-World-Token"] = token end
	local ok, resp = pcall(function()
		return HttpService:RequestAsync({
			Url = Config.SERVER_URL .. path,
			Method = "POST",
			Headers = headers,
			Body = HttpService:JSONEncode(body or {}),
		})
	end)
	if not ok then return false, { error = tostring(resp) } end
	local parsedOk, data = pcall(function() return HttpService:JSONDecode(resp.Body) end)
	return resp.Success, (parsedOk and data or { error = "HTTP " .. tostring(resp.StatusCode) })
end

local function getJson(path, token)
	local ok, resp = pcall(function()
		return HttpService:RequestAsync({
			Url = Config.SERVER_URL .. path,
			Method = "GET",
			Headers = { ["X-World-Token"] = token },
		})
	end)
	if not ok or not resp.Success then return false, nil end
	local parsedOk, data = pcall(function() return HttpService:JSONDecode(resp.Body) end)
	return parsedOk, data
end

local function sumStars(plot)
	local s = 0
	for _, v in pairs(plot.starsByLevel or {}) do
		s = s + (tonumber(v) or 0)
	end
	return s
end

local function applyAccent(plot, accent)
	local col = accent and Config.ACCENTS[accent]
	if not col then return end
	for _, b in pairs(plot.biomes or {}) do
		if b.flagCloth then b.flagCloth.Color = col end
	end
end

pairFn.OnServerInvoke = function(player, rawCode)
	local code = tostring(rawCode or ""):gsub("%D", "")
	if #code ~= 6 then return { ok = false, error = "Введи 6 цифр кода" } end
	local plot = Plots.Get(player) or Plots.Assign(player)
	if not plot then return { ok = false, error = "Все острова заняты" } end

	local ok, data = postJson("/api/world/link", {
		code = code,
		robloxUserId = tostring(player.UserId),
		robloxName = player.Name,
	})
	if not ok or not data or not data.token then
		return { ok = false, error = (data and data.error) or "Не удалось подключиться" }
	end

	plot.token = data.token
	plot.lastPushId = 0
	plot.lastActivity = os.clock()
	if data.mascot then Mascot.SetType(plot, data.mascot) end
	applyAccent(plot, data.accent)

	local safeName = filterText(tostring(data.name or player.Name), player.UserId) or player.Name
	Mascot.Say(plot, "Подключено! Привет, " .. safeName .. " 👋")
	Mascot.Jump(plot)

	plot.onFall = function()
		if plot.token then
			task.spawn(function()
				postJson("/api/world/event", { kind = "fall", levelId = plot.activeLevelId or "8-1" }, plot.token)
			end)
		end
	end

	plot.onWin = function(levelId)
		local lv = levelId or plot.activeLevelId or "8-1"
		local stars = math.max(1, tonumber(plot.starsByLevel[lv]) or 1)
		plot.starsByLevel[lv] = stars
		Mascot.Jump(plot)
		Mascot.Say(plot, plot.kapiLines.win or "Ура! Уровень пройден!")
		if plot.token then
			task.spawn(function()
				local wok, wdata = postJson("/api/world/win", { levelId = lv, stars = stars }, plot.token)
				if plot.owner then
					stateEv:FireClient(plot.owner, { linked = true, name = safeName, stars = sumStars(plot), levelId = (wok and wdata and wdata.nextLevelId) or lv, progress = plot.wonLevels })
					effectEv:FireClient(plot.owner, "win", {
						levelId = lv,
						title = wok and wdata and wdata.title or lv,
						nextLevelId = wok and wdata and wdata.nextLevelId or nil,
						nextTitle = wok and wdata and wdata.nextTitle or nil,
						stars = stars,
						xp = wok and wdata and wdata.xpAwarded or (stars * 80),
					})
				end
			end)
		elseif plot.owner then
			effectEv:FireClient(plot.owner, "win", { levelId = lv, stars = stars, xp = stars * 80 })
		end
	end

	stateEv:FireClient(player, { linked = true, name = safeName, stars = sumStars(plot), coins = plot.coins })
	return { ok = true, name = safeName }
end

task.spawn(function()
	while true do
		for _, plot in ipairs(Plots.All()) do
			if plot.owner and plot.token then
				local ok, data = getJson("/api/world/pull", plot.token)
				if ok and data then
					plot.kapiLines = data.kapi or {}
					plot.activeLevelId = data.levelId or plot.activeLevelId or "8-1"

					if data.user then
						if data.user.mascot then Mascot.SetType(plot, data.user.mascot) end
						applyAccent(plot, data.user.accent)
					end

					-- Восстанавливаем пройденные уровни с сервера (чтобы при смерти/перезаходе ничего не терялось!)
					local progressChanged = false
					if type(data.progress) == "table" then
						for lvId, rec in pairs(data.progress) do
							if rec.stars then
								plot.starsByLevel[lvId] = math.max(plot.starsByLevel[lvId] or 0, tonumber(rec.stars) or 0)
							end
							if rec.won and not plot.wonLevels[lvId] then
								plot.wonLevels[lvId] = true
								progressChanged = true
								local b = plot.biomes[lvId]
								if b and b.nextBridge then
									b.nextBridge.Transparency = 0.15
									b.nextBridge.CanCollide = true
								end
							end
						end
					end
					if progressChanged and plot.owner then
						stateEv:FireClient(plot.owner, { linked = true, stars = sumStars(plot), levelId = plot.activeLevelId, progress = plot.wonLevels })
					end

					local st = data.state
					if st and st.pushId and st.pushId ~= plot.lastPushId then
						plot.lastPushId = st.pushId
						plot.lastActivity = os.clock()
						local lv = st.levelId or data.levelId or "8-1"
						local v = st.verdict or {}
						local lvStars = tonumber(v.stars) or 0
						plot.starsByLevel[lv] = math.max(plot.starsByLevel[lv] or 0, lvStars)

						if plot.screenCode then plot.screenCode.Text = highlightCss(st.cssLines, plot.owner.UserId) end
						if plot.screenVerdict then
							plot.screenVerdict.Text = (v.tips and v.tips[1]) or ""
							plot.screenVerdict.TextColor3 = lvStars > 0 and Color3.fromRGB(74, 222, 128) or Color3.fromRGB(250, 204, 21)
						end

						local biome = plot.biomes[lv] or plot.biomes["8-1"]
						local anchor = biome and biome.printerPos or plot.printerPos
						Bridge.Spawn(plot, st.boxes, st.container, anchor, lv)
						if biome and biome.sparks then biome.sparks:Emit(45) end

						-- Если игрок сейчас далеко от этого биома, переносим его ко входу в нужный биом
						if biome and plot.owner.Character then
							local hrp = plot.owner.Character:FindFirstChild("HumanoidRootPart")
							if hrp and (hrp.Position - anchor).Magnitude > 65 then
								plot.currentSpawn = biome.entrySpawn
								hrp.AssemblyLinearVelocity = Vector3.zero
								hrp.CFrame = CFrame.new(biome.entrySpawn)
							end
						end

						effectEv:FireClient(plot.owner, "bridge", { levelId = lv, stars = lvStars })
						stateEv:FireClient(plot.owner, { linked = true, stars = sumStars(plot), levelId = lv, progress = plot.wonLevels })

						if lvStars > 0 then
							Mascot.Jump(plot)
							Mascot.Say(plot, plot.kapiLines.pushedGood or "Готово! Нажми [E] или потяни мышкой!")
						else
							Mascot.Say(plot, plot.kapiLines.pushedBad or "Посмотри на экран и поправь CSS.")
						end
					elseif not plot.wonLevels[plot.activeLevelId] and (os.clock() - plot.lastActivity) > 45 then
						plot.lastActivity = os.clock()
						Mascot.Say(plot, plot.kapiLines.idle or "Отправь код из приложения Зубрик!")
					end
				end
			end
		end
		task.wait(Config.POLL_INTERVAL)
	end
end)
