-- Синхронизация с сервером Express: сопряжение, опрос раскладки, фильтрация текста, победа
local HttpService = game:GetService("HttpService")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local TextService = game:GetService("TextService")
local TweenService = game:GetService("TweenService")

local Config = require(ReplicatedStorage.Shared.Config)
local Plots = require(script.Parent.Plots)
local Bridge = require(script.Parent.Bridge)
local Mascot = require(script.Parent.Mascot)

local remotes = ReplicatedStorage:WaitForChild("Remotes")
local pairFn = remotes:WaitForChild(Config.REMOTES.Pair)
local stateEv = remotes:WaitForChild(Config.REMOTES.State)
local effectEv = remotes:WaitForChild(Config.REMOTES.Effect)

-- Безопасная фильтрация пользовательского текста через Roblox TextService
local function filterText(text, fromUserId)
	if type(text) ~= "string" or #text == 0 then
		return ""
	end
	local ok, result = pcall(function()
		local res = TextService:FilterStringAsync(text, fromUserId, Enum.TextFilterContext.PrivateChat)
		return res:GetNonChatStringForUserAsync(fromUserId)
	end)
	if ok and type(result) == "string" then
		return result
	end
	return nil -- если фильтр недоступен или вернул ошибку — текст не показываем
end

-- Простая подсветка синтаксиса CSS (RichText) после фильтрации
local function highlightCss(lines, userId)
	local joined = table.concat(lines or {}, "\n")
	local safe = filterText(joined, userId)
	if not safe then
		return "/* CSS скрыт фильтром */"
	end
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
	if token then
		headers["X-World-Token"] = token
	end
	local ok, resp = pcall(function()
		return HttpService:RequestAsync({
			Url = Config.SERVER_URL .. path,
			Method = "POST",
			Headers = headers,
			Body = HttpService:JSONEncode(body or {}),
		})
	end)
	if not ok then
		return false, { error = tostring(resp) }
	end
	local parsedOk, data = pcall(function()
		return HttpService:JSONDecode(resp.Body)
	end)
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
	if not ok then
		return false, nil
	end
	if not resp.Success then
		return false, nil
	end
	local parsedOk, data = pcall(function()
		return HttpService:JSONDecode(resp.Body)
	end)
	return parsedOk, data
end

-- Сопряжение по 6-значному коду
pairFn.OnServerInvoke = function(player, rawCode)
	local code = tostring(rawCode or ""):gsub("%D", "")
	if #code ~= 6 then
		return { ok = false, error = "Введи 6 цифр кода" }
	end
	local plot = Plots.Get(player) or Plots.Assign(player)
	if not plot then
		return { ok = false, error = "Все острова заняты" }
	end

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

	if data.accent and Config.ACCENTS[data.accent] and plot.flagCloth then
		plot.flagCloth.Color = Config.ACCENTS[data.accent]
	end

	local safeName = filterText(tostring(data.name or player.Name), player.UserId) or player.Name
	Mascot.Say(plot, "Подключено! Привет, " .. safeName .. " 👋")
	Mascot.Jump(plot)

	plot.onFall = function()
		if plot.token then
			task.spawn(function()
				postJson("/api/world/event", { kind = "fall", levelId = "8-1" }, plot.token)
			end)
		end
	end

	plot.onWin = function()
		if plot.chestLid then
			TweenService:Create(plot.chestLid, TweenInfo.new(0.8, Enum.EasingStyle.Back), {
				CFrame = plot.chestLid.CFrame * CFrame.new(0, 0.8, -1.0) * CFrame.Angles(-math.pi / 3, 0, 0),
			}):Play()
		end
		if plot.fireworks then
			plot.fireworks:Emit(80)
		end
		Mascot.Jump(plot)
		Mascot.Say(plot, plot.kapiLines.win or "Ура! Мы на Острове Флажка!")
		local stars = math.max(1, plot.stars)
		if plot.token then
			task.spawn(function()
				local wok, wdata = postJson("/api/world/win", { levelId = "8-1", stars = stars }, plot.token)
				if plot.owner then
					effectEv:FireClient(plot.owner, "win", {
						stars = stars,
						xp = wok and wdata and wdata.xpAwarded or (stars * 80),
					})
				end
			end)
		elseif plot.owner then
			effectEv:FireClient(plot.owner, "win", { stars = stars, xp = stars * 80 })
		end
	end

	stateEv:FireClient(player, { linked = true, name = safeName, stars = 0 })
	return { ok = true, name = safeName }
end

-- Опрос сервера каждые 2 секунды
task.spawn(function()
	while true do
		for _, plot in ipairs(Plots.All()) do
			if plot.owner and plot.token then
				local ok, data = getJson("/api/world/pull", plot.token)
				if ok and data then
					plot.kapiLines = data.kapi or {}
					if plot.signCampLabel and plot.kapiLines.signCamp then
						plot.signCampLabel.Text = plot.kapiLines.signCamp
					end
					if plot.signWarnLabel and plot.kapiLines.signWarning then
						plot.signWarnLabel.Text = plot.kapiLines.signWarning
					end
					if plot.signHintLabel and plot.kapiLines.signHint then
						plot.signHintLabel.Text = plot.kapiLines.signHint
					end
					if data.user and data.user.accent and Config.ACCENTS[data.user.accent] and plot.flagCloth then
						plot.flagCloth.Color = Config.ACCENTS[data.user.accent]
					end

					local st = data.state
					if st and st.pushId and st.pushId ~= plot.lastPushId then
						plot.lastPushId = st.pushId
						plot.lastActivity = os.clock()
						local v = st.verdict or {}
						plot.stars = tonumber(v.stars) or 0

						-- Обновляем экран Мастерской кода
						if plot.screenCode then
							plot.screenCode.Text = highlightCss(st.cssLines, plot.owner.UserId)
						end
						if plot.screenVerdict then
							local tip = (v.tips and v.tips[1]) or ""
							plot.screenVerdict.Text = tip
							plot.screenVerdict.TextColor3 = plot.stars > 0
								and Color3.fromRGB(74, 222, 128)
								or Color3.fromRGB(250, 204, 21)
						end

						-- Строим 3D-мост на станке-принтере
						Bridge.Spawn(plot, st.boxes, st.container)
						if plot.printerSparks then
							plot.printerSparks:Emit(45)
						end
						effectEv:FireClient(plot.owner, "bridge", { printerPos = plot.printerPos, stars = plot.stars })
						stateEv:FireClient(plot.owner, { linked = true, stars = plot.stars, verdict = v })

						if plot.stars > 0 then
							Mascot.Jump(plot)
							Mascot.Say(plot, plot.kapiLines.pushedGood or "Отличный мост! Неси его к пропасти!")
						else
							Mascot.Say(plot, plot.kapiLines.pushedBad or "Посмотри на экран и поправь CSS.")
						end
					elseif not plot.won and (os.clock() - plot.lastActivity) > 40 then
						plot.lastActivity = os.clock()
						Mascot.Say(plot, plot.kapiLines.idle or "Напиши CSS Grid в приложении и нажми «Отправить в мир»!")
					end
				end
			end
		end
		task.wait(Config.POLL_INTERVAL)
	end
end)
