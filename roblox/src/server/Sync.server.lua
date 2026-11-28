-- Связь с сервером Зубрика: подключение по 6-значному коду, питомец из профиля, опрос раскладки
-- («Отправить в мир» → фигуры у принтера), восстановление прогресса и победа (/api/world/win).
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

-- Подсветка CSS для экрана Мастерской (текст уже отфильтрован)
local function highlightCss(lines, userId)
	local joined = table.concat(lines or {}, "\n")
	local safe = filterText(joined, userId)
	if not safe then return "/* CSS скрыт фильтром */" end
	safe = safe:gsub("&", "&amp;"):gsub("<", "&lt;"):gsub(">", "&gt;")
	local out = {}
	for line in (safe .. "\n"):gmatch("(.-)\n") do
		if line:match("^%s*/%*") then
			table.insert(out, '<font color="#64748b">' .. line .. "</font>")
		else
			local colored = line
				:gsub("([%.#%w%-_]+)%s*{", '<font color="#fde047">%1</font> {')
				:gsub("([%w%-]+)%s*:", '<font color="#7dd3fc">%1</font>:')
				:gsub(":([^;]+);", ':<font color="#fdba74">%1</font>;')
			table.insert(out, colored)
		end
	end
	return table.concat(out, "\n")
end

local function request(method, path, body, token, server)
	local headers = { ["Content-Type"] = "application/json" }
	if token then headers["X-World-Token"] = token end
	local ok, resp = pcall(function()
		return HttpService:RequestAsync({
			Url = (server or Config.SERVER_URL) .. path,
			Method = method,
			Headers = headers,
			Body = body and HttpService:JSONEncode(body) or nil,
		})
	end)
	if not ok then return false, { error = "Нет связи с сервером Зубрика" }, 0 end
	local parsedOk, data = pcall(function() return HttpService:JSONDecode(resp.Body) end)
	return resp.Success, (parsedOk and type(data) == "table" and data or { error = "HTTP " .. tostring(resp.StatusCode) }), resp.StatusCode
end

local function sumStars(plot)
	local s = 0
	for _, v in pairs(plot.starsByLevel or {}) do s += tonumber(v) or 0 end
	return s
end

local function pushState(plot, extra)
	if not plot.owner then return end
	local st = {
		linked = plot.linked,
		name = plot.name,
		lang = plot.lang,
		stars = sumStars(plot),
		coins = plot.coins,
		levelId = plot.activeLevelId,
		progress = plot.wonLevels,
		solved = plot.solved[plot.activeLevelId] == true,
		hasItem = plot.creation ~= nil and plot.creation:GetAttribute("Level") == plot.activeLevelId,
		pet = plot.kapi and plot.kapi.name and plot.kapi.name() or nil,
	}
	for k, v in pairs(extra or {}) do st[k] = v end
	stateEv:FireClient(plot.owner, st)
end

local function applyAccent(plot, accent)
	local col = accent and Config.ACCENTS[accent]
	if not col then return end
	for _, b in pairs(plot.biomes or {}) do
		if b.flagCloth then b.flagCloth.Color = col end
	end
end

local function say(plot, key, vars)
	Mascot.Say(plot, Config.Say(plot.lang, key, vars))
end

-- Победа на уровне: открываем ворота, сообщаем серверу (XP, «Деревянный мостик», уведомление в боте)
local function onWin(plot, levelId)
	if plot.wonLevels[levelId] then return end
	plot.wonLevels[levelId] = true
	local b = plot.biomes[levelId]
	Bridge.Keep(plot, levelId)
	if b and b.unlock then b.unlock(false) end
	Mascot.Jump(plot)
	Mascot.Say(plot, plot.kapiLines.win or Config.T(plot.lang, "winTitle"))
	local idx = Config.LEVEL_INDEX[levelId]
	local nextLv = idx and Config.LEVELS[idx + 1]
	local stars = math.max(1, tonumber(plot.starsByLevel[levelId]) or 1)
	plot.starsByLevel[levelId] = stars
	if nextLv then
		plot.activeLevelId = nextLv.id
		plot.currentSpawn = plot.biomes[nextLv.id].entrySpawn
	end
	task.spawn(function()
		local data, ok = nil, false
		for _ = 1, 3 do
			local okReq, resp, code = request("POST", "/api/world/win", { levelId = levelId, stars = stars }, plot.token, plot.server)
			data = resp
			ok = okReq
			if okReq or (code >= 400 and code < 500) then break end
			task.wait(2)
		end
		if not plot.owner then return end
		local lang = plot.lang
		effectEv:FireClient(plot.owner, "win", {
			levelId = levelId,
			stars = (ok and data.stars) or stars,
			xp = ok and data.xpAwarded or 0,
			already = ok and (data.xpAwarded or 0) == 0,
			nextLevelId = nextLv and nextLv.id or nil,
			nextTitle = nextLv and (nextLv.icon .. " " .. Config.Pick(nextLv.name, lang)) or nil,
			error = (not ok) and data and data.error or nil,
		})
		pushState(plot)
	end)
end

-- Новая раскладка из приложения → печать фигур у принтера
local function spawnCreation(plot, st)
	local lv = st.levelId or plot.activeLevelId
	local b = plot.biomes[lv]
	if not b then return end
	local v = st.verdict or {}
	local stars = tonumber(v.stars) or 0
	plot.starsByLevel[lv] = math.max(plot.starsByLevel[lv] or 0, stars)

	if b.screenCode then b.screenCode.Text = highlightCss(st.cssLines, plot.owner.UserId) end
	if b.screenVerdict then
		local tip = (v.tips and v.tips[1]) or ""
		b.screenVerdict.Text = (stars > 0 and (string.rep("★", stars) .. string.rep("☆", 3 - stars) .. "  ") or "⚠ ") .. tip
		b.screenVerdict.TextColor3 = stars > 0 and Color3.fromRGB(74, 222, 128) or Color3.fromRGB(250, 204, 21)
	end

	if plot.solved[lv] then
		-- уровень уже собран: новый код только улучшает звёзды
		if stars > 0 then Mascot.Say(plot, "★ " .. string.rep("★", stars - 1)) end
		pushState(plot)
		return
	end

	-- ученик далеко от этого уровня — переносим к принтеру
	local hrp = plot.owner.Character and plot.owner.Character:FindFirstChild("HumanoidRootPart")
	if hrp and (hrp.Position - b.printerPos).Magnitude > 80 then
		plot.currentSpawn = b.entrySpawn
		hrp.AssemblyLinearVelocity = Vector3.zero
		hrp.CFrame = CFrame.lookAt(b.entrySpawn, b.entrySpawn + plot.dir)
	end

	local tip = (v.tips and v.tips[1]) or ""
	Bridge.Spawn(plot, lv, st.boxes, v, {
		onPrinted = function(good)
			say(plot, "printed")
			pushState(plot)
		end,
		onPickup = function()
			pushState(plot, { carrying = true })
		end,
		onNear = function()
			say(plot, "near")
		end,
		onPlaced = function()
			plot.solved[lv] = true
			Mascot.Jump(plot)
			if b.target and b.target.upright then say(plot, "socketOpen") else say(plot, "placed") end
			effectEv:FireClient(plot.owner, "placed", { levelId = lv })
			pushState(plot, { carrying = false })
		end,
		onBroken = function()
			Mascot.Say(plot, Config.Say(plot.lang, "broken", { tip = tip }), 12)
			effectEv:FireClient(plot.owner, "broken", { tip = tip })
			pushState(plot, { carrying = false })
		end,
		onLost = function()
			say(plot, "lost")
		end,
	})
	if b.sparks then b.sparks:Emit(40) end
	effectEv:FireClient(plot.owner, "printing", { levelId = lv, stars = stars, tip = tip })
	pushState(plot)
end

pairFn.OnServerInvoke = function(player, rawCode)
	local code = tostring(rawCode or ""):gsub("%D", "")
	local plot = Plots.Get(player) or Plots.Assign(player)
	if not plot then return { ok = false, error = "Все острова заняты" } end
	while not plot.ready do task.wait(0.1) end
	if #code ~= 6 then return { ok = false, error = Config.T(plot.lang, "pairNeed") } end

	local servers = Config.TEST_URL and { Config.TEST_URL, Config.SERVER_URL } or { Config.SERVER_URL }
	local ok, data, server = false, nil, nil
	for _, url in ipairs(servers) do
		ok, data = request("POST", "/api/world/link", {
			code = code,
			robloxUserId = tostring(player.UserId),
			robloxName = player.Name,
		}, nil, url)
		if ok and data and data.token then
			server = url
			break
		end
	end
	if not ok or not data or not data.token then
		return { ok = false, error = (data and data.error) or Config.T(plot.lang, "pairFail") }
	end

	local relink = plot.linked
	if relink then Plots.Reset(plot) end
	plot.token = data.token
	plot.server = server
	plot.linked = true
	plot.lang = (data.lang == "uz" or data.lang == "en") and data.lang or "ru"
	plot.lastPushId = 0
	plot.lastActivity = os.clock()
	local safeName = filterText(tostring(data.name or player.Name), player.UserId) or player.Name
	plot.name = safeName
	Mascot.SetType(plot, data.mascot or "kapi")
	Mascot.Show(plot)
	applyAccent(plot, data.accent)
	-- надписи рамок и табличек — на языке ученика
	for id, b in pairs(plot.biomes) do
		local lv = Config.LEVELS[Config.LEVEL_INDEX[id]]
		if b.target and b.target.setText then
			b.target.setText(Config.T(plot.lang, "putHere", { item = Config.Pick(lv.item, plot.lang) }))
		end
		if b.screenHeader then
			b.screenHeader.Text = lv.icon .. " " .. lv.id .. " · " .. Config.Pick(lv.name, plot.lang)
		end
		if b.signLabel then
			b.signLabel.Text = lv.icon .. " " .. lv.id .. "\n" .. Config.Pick(lv.name, plot.lang)
		end
	end
	task.delay(0.6, function()
		Mascot.Jump(plot)
		say(plot, "linked", { pet = plot.kapi.name(), name = safeName })
	end)
	plot.onFall = function()
		if plot.token then
			task.spawn(request, "POST", "/api/world/event", { kind = "fall", levelId = plot.activeLevelId }, plot.token, plot.server)
		end
	end
	plot.onWin = function(levelId) onWin(plot, levelId) end
	effectEv:FireClient(player, "linked", { name = safeName })
	pushState(plot, { reset = relink or nil })
	return { ok = true, name = safeName, lang = plot.lang }
end

-- Опрос сервера для всех подключённых учеников
task.spawn(function()
	while true do
		for _, plot in ipairs(Plots.All()) do
			if plot.owner and plot.token then
				local ok, data = request("GET", "/api/world/pull", nil, plot.token, plot.server)
				if ok and data then
					plot.kapiLines = data.kapi or {}
					if data.user then
						if data.user.mascot then Mascot.SetType(plot, data.user.mascot) end
						applyAccent(plot, data.user.accent)
						if data.user.lang then plot.lang = data.user.lang end
					end

					-- пройденные раньше уровни: открываем путь без повторной стройки
					local changed = false
					if type(data.progress) == "table" then
						for lvId, rec in pairs(data.progress) do
							if rec.stars then
								plot.starsByLevel[lvId] = math.max(plot.starsByLevel[lvId] or 0, tonumber(rec.stars) or 0)
							end
							if rec.won and not plot.wonLevels[lvId] and plot.biomes[lvId] then
								plot.wonLevels[lvId] = true
								plot.solved[lvId] = true
								local b = plot.biomes[lvId]
								if b.restore then b.restore() end
								if b.unlock then b.unlock(true) end
								changed = true
							end
						end
					end
					local serverLevel = data.levelId or plot.activeLevelId
					if serverLevel ~= plot.activeLevelId then
						plot.activeLevelId = serverLevel
						changed = true
					end
					if changed then
						local b = plot.biomes[plot.activeLevelId]
						if b then plot.currentSpawn = b.entrySpawn end
						pushState(plot)
					end

					local st = data.state
					if st and st.pushId and st.pushId ~= plot.lastPushId then
						plot.lastPushId = st.pushId
						plot.lastActivity = os.clock()
						spawnCreation(plot, st)
					elseif not plot.solved[plot.activeLevelId] and not plot.creation and (os.clock() - plot.lastActivity) > 50 then
						plot.lastActivity = os.clock()
						Mascot.Say(plot, plot.kapiLines.idle or Config.T(plot.lang, "step2"))
					end
				end
			end
		end
		task.wait(Config.POLL_INTERVAL)
	end
end)
