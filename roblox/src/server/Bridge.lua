-- Фигуры из CSS ученика: прямоугольники из предпросмотра (не код!) печатаются 3D-принтером доска за доской,
-- их можно взять [E], отнести к сияющей рамке и положить. Рамка «притягивает» предмет на место.
-- Если сервер нашёл ошибку в раскладке (0★), предмет разваливается у рамки, а питомец объясняет, что поправить.
local Debris = game:GetService("Debris")
local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local RunService = game:GetService("RunService")
local TweenService = game:GetService("TweenService")

local Config = require(ReplicatedStorage.Shared.Config)

local Bridge = {}

local UP = Vector3.new(0, 1, 0)
local GOLD = Color3.fromRGB(250, 204, 21)

-- ───────────── вспомогательное ─────────────

local function basis(pos, xAxis, yAxis)
	return CFrame.fromMatrix(pos, xAxis, yAxis)
end

-- Плоско: колонки CSS (x) идут вдоль пути, ряды (y) — поперёк
function Bridge.FlatCF(plot, pos)
	return basis(pos, plot.dir, UP)
end

-- Стоя: колонки CSS — слева направо, ряды — сверху вниз, лицом к дороге (как в предпросмотре)
function Bridge.UprightCF(plot, pos)
	return basis(pos, plot.dir, plot.right)
end

local function newPart(parent, name, size, color, mat)
	local p = Instance.new("Part")
	p.Name = name
	p.Size = size
	p.Color = color
	p.Material = mat or Enum.Material.SmoothPlastic
	p.Anchored = true
	p.CanCollide = false
	p.TopSurface = Enum.SurfaceType.Smooth
	p.BottomSurface = Enum.SurfaceType.Smooth
	p.Parent = parent
	return p
end

local function sound(parent, id, volume, pitch)
	if type(id) ~= "string" or #id == 0 then return end
	local s = Instance.new("Sound")
	s.SoundId = id
	s.Volume = volume or 0.7
	s.PlaybackSpeed = pitch or 1
	s.RollOffMaxDistance = 140
	s.Parent = parent
	s:Play()
	Debris:AddItem(s, 6)
end

local function burst(pos, color, count, parent)
	local p = Instance.new("Part")
	p.Anchored = true
	p.CanCollide = false
	p.CanQuery = false
	p.Transparency = 1
	p.Size = Vector3.one
	p.Position = pos
	p.Parent = parent
	local pe = Instance.new("ParticleEmitter", p)
	pe.Texture = "rbxasset://textures/particles/sparkles_main.dds"
	pe.Color = ColorSequence.new(color, Color3.new(1, 1, 1))
	pe.LightEmission = 0.8
	pe.Size = NumberSequence.new({ NumberSequenceKeypoint.new(0, 0.7), NumberSequenceKeypoint.new(1, 0) })
	pe.Speed = NumberRange.new(6, 16)
	pe.SpreadAngle = Vector2.new(180, 180)
	pe.Lifetime = NumberRange.new(0.5, 1.1)
	pe.Drag = 3
	pe.Rate = 0
	pe:Emit(count or 30)
	Debris:AddItem(p, 2)
end
Bridge.Burst = burst
Bridge.Sound = sound

local function tweenPivot(model, toCF, time, style, dir)
	local v = Instance.new("CFrameValue")
	v.Value = model:GetPivot()
	local conn = v.Changed:Connect(function(cf)
		if model.Parent then model:PivotTo(cf) end
	end)
	local tw = TweenService:Create(v, TweenInfo.new(time, style or Enum.EasingStyle.Quad, dir or Enum.EasingDirection.Out), { Value = toCF })
	tw:Play()
	tw.Completed:Wait()
	conn:Disconnect()
	v:Destroy()
	if model.Parent then model:PivotTo(toCF) end
end

local function colorOf(c)
	if type(c) == "table" and #c >= 3 then
		return Color3.fromRGB(
			math.clamp(math.round(tonumber(c[1]) or 160), 0, 255),
			math.clamp(math.round(tonumber(c[2]) or 82), 0, 255),
			math.clamp(math.round(tonumber(c[3]) or 45), 0, 255)
		)
	end
	return Color3.fromRGB(160, 82, 45)
end

local function lighter(c, k)
	return c:Lerp(Color3.new(1, 1, 1), k)
end

local function darker(c, k)
	return c:Lerp(Color3.new(0, 0, 0), k)
end

local RUNES = { "ᚠ", "ᚢ", "ᚦ", "ᚨ", "ᚱ", "ᚲ", "ᚷ", "ᚹ", "ᚺ" }

-- ───────────── сборка формы ─────────────
-- Локальная система предмета: X — колонки CSS, Z — ряды CSS, верхняя грань на y = 0.
-- Каждая «доска» — главный блок (по нему ходят) + украшения без столкновений.

local function decorate(look, main, color, w, d, t, idx)
	local cf = main.CFrame
	local decor = {}
	local function add(name, size, offset, col, mat, shape)
		local p = newPart(main.Parent, name, size, col, mat)
		if shape then p.Shape = shape end
		p.CanQuery = false
		p.CastShadow = false
		table.insert(decor, { p = p, off = offset })
		return p
	end
	if look == "wood" then
		-- доски с прожилками и железными скобами
		for k = -1, 1, 2 do
			add("Groove", Vector3.new(w * 0.96, 0.06, 0.12), CFrame.new(0, t / 2 + 0.01, k * d * 0.22), darker(color, 0.35), Enum.Material.Wood)
		end
		for k = -1, 1, 2 do
			add("Brace", Vector3.new(0.32, 0.1, d * 0.9), CFrame.new(k * (w / 2 - 0.45), t / 2 + 0.03, 0), Color3.fromRGB(71, 85, 105), Enum.Material.Metal)
		end
	elseif look == "stairs" then
		add("Edge", Vector3.new(w * 0.98, 0.12, 0.35), CFrame.new(0, t / 2 + 0.04, 0), GOLD, Enum.Material.Neon)
	elseif look == "raft" then
		for k = -1, 1, 2 do
			add("Rope", Vector3.new(w * 1.02, t * 1.02, 0.4), CFrame.new(0, 0, k * d * 0.3), Color3.fromRGB(217, 178, 120), Enum.Material.Fabric)
		end
	elseif look == "crystal" then
		local core = add("Core", Vector3.new(w * 0.62, t * 0.7, d * 0.62), CFrame.new(), lighter(color, 0.35), Enum.Material.Neon)
		local pl = Instance.new("PointLight", core)
		pl.Color = color
		pl.Range = 10
		pl.Brightness = 0.9
	elseif look == "cloud" then
		for k = 1, 4 do
			local r = math.min(w, d) * 0.45
			local px = (k - 2.5) * w * 0.24
			add("Puff", Vector3.new(r, r * 0.7, r), CFrame.new(px, t * 0.1, ((k % 2) - 0.5) * d * 0.4), Color3.fromRGB(255, 255, 255), Enum.Material.SmoothPlastic, Enum.PartType.Ball)
		end
	elseif look == "lamp" then
		add("Housing", Vector3.new(w + 0.5, t * 0.8, d + 0.5), CFrame.new(0, -0.15, 0), Color3.fromRGB(30, 41, 59), Enum.Material.Metal)
		local r = math.min(w, d) * 0.7
		-- цилиндр лежит вдоль оси X — поворачиваем «линзой» вверх
		local lens = add("Lens", Vector3.new(0.4, r, r), CFrame.new(0, t / 2 + 0.05, 0) * CFrame.Angles(0, 0, math.pi / 2), color, Enum.Material.Neon, Enum.PartType.Cylinder)
		local pl = Instance.new("PointLight", lens)
		pl.Color = color
		pl.Range = 14
		pl.Brightness = 1.2
	elseif look == "roof" then
		for k = 0, math.max(1, math.floor(d / 1.6)) do
			add("Tile", Vector3.new(w * 1.02, 0.18, 0.5), CFrame.new(0, t / 2 + 0.05, -d / 2 + 0.3 + k * 1.6), darker(color, 0.25), Enum.Material.Slate)
		end
	elseif look == "rune" then
		add("Glow", Vector3.new(w * 0.86, 0.12, d * 0.86), CFrame.new(0, t / 2 + 0.03, 0), Color3.fromRGB(192, 132, 252), Enum.Material.Neon)
	elseif look == "stone" then
		add("Trim", Vector3.new(w * 0.98, 0.14, 0.3), CFrame.new(0, t / 2 + 0.04, d / 2 - 0.25), GOLD, Enum.Material.Metal)
	elseif look == "solar" then
		for k = -1, 1 do
			add("CellLine", Vector3.new(w * 0.94, 0.08, 0.12), CFrame.new(0, t / 2 + 0.03, k * d * 0.28), Color3.fromRGB(125, 211, 252), Enum.Material.Neon)
		end
		add("Frame", Vector3.new(w + 0.3, t * 0.6, d + 0.3), CFrame.new(0, -0.2, 0), Color3.fromRGB(203, 213, 225), Enum.Material.Metal)
	elseif look == "rainbow" then
		local sp = Instance.new("ParticleEmitter", main)
		sp.Texture = "rbxasset://textures/particles/sparkles_main.dds"
		sp.Color = ColorSequence.new(color, Color3.new(1, 1, 1))
		sp.LightEmission = 1
		sp.Size = NumberSequence.new({ NumberSequenceKeypoint.new(0, 0.35), NumberSequenceKeypoint.new(1, 0) })
		sp.Rate = 5
		sp.Speed = NumberRange.new(1, 2.5)
		sp.Lifetime = NumberRange.new(0.6, 1)
	end
	return decor
end

local LOOK = {
	wood = { t = 1.2, mat = Enum.Material.WoodPlanks },
	stairs = { t = 1.2, mat = Enum.Material.Marble },
	raft = { t = 1.5, mat = Enum.Material.Wood },
	crystal = { t = 1.4, mat = Enum.Material.Glass, transparency = 0.25 },
	cloud = { t = 1.4, mat = Enum.Material.SmoothPlastic, tint = 0.55 },
	lamp = { t = 1.3, mat = Enum.Material.Neon },
	roof = { t = 1.3, mat = Enum.Material.WoodPlanks },
	rune = { t = 1.3, mat = Enum.Material.Slate },
	stone = { t = 1.4, mat = Enum.Material.Cobblestone },
	solar = { t = 0.8, mat = Enum.Material.Glass, transparency = 0.1, color = Color3.fromRGB(30, 58, 138) },
	rainbow = { t = 1.2, mat = Enum.Material.Neon },
}

-- Строит части в локальных координатах. Возвращает список { main, local CFrame, decor[] }, размеры и центр.
local function layoutPieces(lvMeta, boxes)
	local scale = Config.SCALE or 10
	local look = LOOK[lvMeta.look] or LOOK.wood
	local minX, minY, maxX, maxY = math.huge, math.huge, -math.huge, -math.huge
	for _, b in ipairs(boxes) do
		local x, y = tonumber(b.x) or 0, tonumber(b.y) or 0
		minX = math.min(minX, x)
		minY = math.min(minY, y)
		maxX = math.max(maxX, x + (tonumber(b.w) or 80))
		maxY = math.max(maxY, y + (tonumber(b.h) or 60))
	end
	local spanU = (maxX - minX) / scale
	local spanV = (maxY - minY) / scale
	local items = {}

	if lvMeta.look == "stairs" then
		-- Лестница: ступеньки по порядку сверху вниз в CSS, каждая выше предыдущей; ширина ступени — из её width
		local ordered = table.clone(boxes)
		table.sort(ordered, function(a, c) return (tonumber(a.y) or 0) < (tonumber(c.y) or 0) end)
		local n = #ordered
		local length = math.clamp(spanU, 26, 34)
		local stepLen = length / n
		local rise = lvMeta.rise or 5
		for i, b in ipairs(ordered) do
			local width = math.clamp((tonumber(b.w) or 100) / scale, 5, 14)
			local top = (i - 1) / math.max(1, n - 1) * rise
			local h = top + look.t
			table.insert(items, {
				box = b, idx = i,
				size = Vector3.new(stepLen + 0.05, h, width),
				cf = CFrame.new(-length / 2 + stepLen * (i - 0.5), top - h / 2, 0),
			})
		end
		return items, length, 14, look
	end

	for i, b in ipairs(boxes) do
		local w = math.clamp((tonumber(b.w) or 80) / scale, 0.5, 200)
		local d = math.clamp((tonumber(b.h) or 60) / scale, 0.5, 200)
		local u = ((tonumber(b.x) or 0) - minX) / scale + w / 2 - spanU / 2
		local v = ((tonumber(b.y) or 0) - minY) / scale + d / 2 - spanV / 2
		table.insert(items, {
			box = b, idx = i,
			size = Vector3.new(w, look.t, d),
			cf = CFrame.new(u, -look.t / 2, v),
		})
	end
	return items, spanU, spanV, look
end

-- ───────────── предмет ─────────────

function Bridge.Clear(plot)
	if plot.creation then
		plot.creation:Destroy()
		plot.creation = nil
	end
	plot.carrying = false
	if plot.creationConn then
		plot.creationConn:Disconnect()
		plot.creationConn = nil
	end
end

local function notify(plot, payload)
	if not plot.owner then return end
	local stateEv = ReplicatedStorage.Remotes:FindFirstChild(Config.REMOTES.State)
	if stateEv then stateEv:FireClient(plot.owner, payload) end
end

local function effect(plot, kind, data)
	if not plot.owner then return end
	local ev = ReplicatedStorage.Remotes:FindFirstChild(Config.REMOTES.Effect)
	if ev then ev:FireClient(plot.owner, kind, data) end
end

-- boxes — прямоугольники из предпросмотра; verdict — проверка сервера (stars, tips)
function Bridge.Spawn(plot, levelId, boxes, verdict, hooks)
	Bridge.Clear(plot)
	local lvIndex = Config.LEVEL_INDEX[levelId]
	local lvMeta = lvIndex and Config.LEVELS[lvIndex]
	local biome = plot.biomes[levelId]
	if not lvMeta or not biome or type(boxes) ~= "table" or #boxes == 0 then
		return nil
	end
	hooks = hooks or {}
	local good = (tonumber(verdict and verdict.stars) or 0) >= 1

	local model = Instance.new("Model")
	model.Name = "Creation_" .. levelId
	model:SetAttribute("Level", levelId)
	model:SetAttribute("Good", good)

	local items, spanU, spanV, look = layoutPieces(lvMeta, boxes)
	local holdCF = Bridge.FlatCF(plot, biome.printerPos + UP * (5.5 + (lvMeta.look == "stairs" and 0 or 0)))
	model.WorldPivot = holdCF

	local pieces = {}
	for _, it in ipairs(items) do
		local cssColor = colorOf(it.box.color)
		local col = look.color or cssColor
		if look.tint then col = lighter(cssColor, look.tint) end
		local main = newPart(model, "Piece_" .. it.idx, it.size, col, look.mat)
		main.Transparency = 1
		main.CFrame = holdCF * it.cf
		main:SetAttribute("FinalTransparency", look.transparency or 0)
		local decor = decorate(lvMeta.look, main, cssColor, it.size.X, it.size.Z, it.size.Y, it.idx)
		for _, dc in ipairs(decor) do
			dc.p.Transparency = 1
			dc.p.CFrame = main.CFrame * dc.off
		end
		-- номер блока — как в предпросмотре
		local sg = Instance.new("SurfaceGui")
		sg.Face = Enum.NormalId.Top
		sg.SizingMode = Enum.SurfaceGuiSizingMode.PixelsPerStud
		sg.PixelsPerStud = 24
		sg.LightInfluence = 0
		sg.Enabled = false
		sg.Parent = main
		local lbl = Instance.new("TextLabel", sg)
		lbl.AnchorPoint = Vector2.new(0.5, 0.5)
		lbl.Position = UDim2.fromScale(0.5, 0.5)
		lbl.Size = UDim2.fromOffset(math.min(it.size.X, it.size.Z) * 24, math.min(it.size.X, it.size.Z) * 24)
		lbl.Rotation = 90 -- чтобы цифры читались по ходу движения
		lbl.BackgroundTransparency = 1
		lbl.Text = lvMeta.look == "rune" and (RUNES[(it.idx - 1) % #RUNES + 1]) or tostring(it.idx)
		lbl.TextColor3 = lvMeta.look == "rune" and Color3.fromRGB(233, 213, 255) or Color3.new(1, 1, 1)
		lbl.TextStrokeTransparency = 0.35
		lbl.TextScaled = true
		lbl.Font = Enum.Font.FredokaOne
		local lim = Instance.new("UITextSizeConstraint", lbl)
		lim.MaxTextSize = 90
		table.insert(pieces, { main = main, local_ = it.cf, decor = decor, gui = sg, label = lbl, size = it.size })
	end

	-- перила для мостов: два каната по краям, чтобы было видно, что это мост
	if lvMeta.look == "wood" or lvMeta.look == "stone" then
		for k = -1, 1, 2 do
			local railCol = lvMeta.look == "wood" and Color3.fromRGB(194, 150, 98) or Color3.fromRGB(148, 163, 184)
			local rail = newPart(model, "Rail", Vector3.new(spanU, 0.25, 0.25), railCol, lvMeta.look == "wood" and Enum.Material.Fabric or Enum.Material.Metal)
			rail.Transparency = 1
			local off = CFrame.new(0, 2.4, k * (spanV / 2 - 0.15))
			rail.CFrame = holdCF * off
			table.insert(pieces, { main = rail, local_ = off, decor = {}, size = rail.Size, rail = true })
			for _, px in ipairs({ -spanU / 2 + 0.3, 0, spanU / 2 - 0.3 }) do
				local post = newPart(model, "Post", Vector3.new(0.35, 2.6, 0.35), darker(railCol, 0.3), lvMeta.look == "wood" and Enum.Material.Wood or Enum.Material.Metal)
				post.Transparency = 1
				local poff = CFrame.new(px, 1.2, k * (spanV / 2 - 0.15))
				post.CFrame = holdCF * poff
				table.insert(pieces, { main = post, local_ = poff, decor = {}, size = post.Size, rail = true })
			end
		end
	end

	-- контур: золотой у рабочего предмета, красный у сломанного
	local hl = Instance.new("Highlight")
	hl.FillTransparency = 1
	hl.OutlineColor = good and GOLD or Color3.fromRGB(248, 113, 113)
	hl.OutlineTransparency = 0.3
	hl.DepthMode = Enum.HighlightDepthMode.Occluded
	hl.Parent = model

	-- невидимая «ручка» в центре: к ней крепится подсказка [E]
	local handle = newPart(model, "Handle", Vector3.new(1, 1, 1), Color3.new(1, 1, 1))
	handle.Transparency = 1
	handle.CanQuery = false
	handle.CFrame = holdCF
	model.PrimaryPart = handle

	local prompt = Instance.new("ProximityPrompt")
	prompt.ActionText = Config.T(plot.lang, "take")
	prompt.ObjectText = Config.Pick(lvMeta.item, plot.lang)
	prompt.KeyboardKeyCode = Enum.KeyCode.E
	prompt.MaxActivationDistance = math.max(spanU, spanV) / 2 + 8
	prompt.RequiresLineOfSight = false
	prompt.HoldDuration = 0
	prompt.Enabled = false
	prompt.Style = Enum.ProximityPromptStyle.Default
	prompt.Parent = handle

	model.Parent = plot.folder
	plot.creation = model
	plot.carrying = false

	local state = {
		mode = "printing", -- printing | idle | carry | busy | placed
		lvMeta = lvMeta,
		levelId = levelId,
		good = good,
		verdict = verdict,
		pieces = pieces,
		spanU = spanU,
		spanV = spanV,
		holdCF = holdCF,
	}
	plot.creationState = state

	local function setCollide(on)
		for _, pc in ipairs(pieces) do
			pc.main.CanCollide = on and not pc.rail
		end
	end

	-- пока предмет несут, он полупрозрачный — видно дорогу и рамку
	local function setGhost(on)
		for _, pc in ipairs(pieces) do
			local final = pc.main:GetAttribute("FinalTransparency") or 0
			pc.main.Transparency = on and math.max(final, 0.35) or final
			for _, dc in ipairs(pc.decor) do
				dc.p.Transparency = on and 0.35 or 0
			end
		end
	end

	local wasNear = false

	local function returnToPrinter()
		state.mode = "busy"
		model:PivotTo(holdCF * CFrame.new(0, -3, 0))
		tweenPivot(model, holdCF, 0.6, Enum.EasingStyle.Back)
		state.mode = "idle"
		prompt.Enabled = true
	end

	-- ── печать: доски вылетают из принтера по очереди ──
	task.spawn(function()
		local printerTop = biome.printerPos + UP * 0.8
		sound(handle, Config.SOUNDS.Print, 0.8)
		for i, pc in ipairs(pieces) do
			if not model.Parent then return end
			local final = holdCF * pc.local_
			local fromCF = CFrame.new(printerTop) * final.Rotation
			pc.main.CFrame = fromCF
			pc.main.Size = pc.size * 0.08
			local ti = TweenInfo.new(pc.rail and 0.2 or 0.38, Enum.EasingStyle.Back, Enum.EasingDirection.Out)
			TweenService:Create(pc.main, ti, {
				CFrame = final,
				Size = pc.size,
				Transparency = pc.main:GetAttribute("FinalTransparency") or 0,
			}):Play()
			for _, dc in ipairs(pc.decor) do
				local target = final * dc.off
				dc.p.CFrame = fromCF
				local fullSize = dc.p.Size
				dc.p.Size = fullSize * 0.08
				TweenService:Create(dc.p, ti, { CFrame = target, Size = fullSize, Transparency = 0 }):Play()
			end
			if not pc.rail then
				sound(pc.main, Config.SOUNDS.Plank, 0.35, 0.9 + i * 0.05)
				task.delay(0.3, function()
					if pc.main.Parent then
						burst(final.Position, pc.main.Color, 10, plot.folder)
						if pc.gui then pc.gui.Enabled = true end
					end
				end)
			end
			task.wait(pc.rail and 0.04 or 0.16)
		end
		task.wait(0.45)
		if not model.Parent then return end
		-- выравниваем всё ровно по месту (после твинов)
		model:PivotTo(holdCF)
		for _, pc in ipairs(pieces) do
			pc.main.CFrame = holdCF * pc.local_
			for _, dc in ipairs(pc.decor) do
				dc.p.CFrame = pc.main.CFrame * dc.off
			end
		end
		state.mode = "idle"
		prompt.Enabled = true
		if hooks.onPrinted then hooks.onPrinted(good) end
	end)

	-- ── перенос ──
	local function groundBelow(pos)
		local params = RaycastParams.new()
		local ignore = { model }
		for _, pl in ipairs(Players:GetPlayers()) do
			if pl.Character then table.insert(ignore, pl.Character) end
		end
		if plot.kapi and plot.kapi.model then table.insert(ignore, plot.kapi.model) end
		params.FilterDescendantsInstances = ignore
		params.FilterType = Enum.RaycastFilterType.Exclude
		return workspace:Raycast(pos + UP * 8, -UP * 60, params)
	end

	-- «рядом» считается по ученику: подошёл к рамке — предмет сам встаёт над ней
	local function nearTarget(extra)
		local tg = biome.target
		local char = plot.owner and plot.owner.Character
		local hrp = char and char:FindFirstChild("HumanoidRootPart")
		if not tg or not hrp then return false end
		local flat = Vector3.new(hrp.Position.X - tg.pos.X, 0, hrp.Position.Z - tg.pos.Z)
		return flat.Magnitude <= (tg.radius or 16) + (extra or 0)
	end

	local function targetCF()
		local tg = biome.target
		if tg.upright then
			-- стоя: низ предмета на основании механизма
			return Bridge.UprightCF(plot, tg.pos + UP * (spanV / 2))
		end
		return Bridge.FlatCF(plot, tg.pos)
	end

	local function turnLabels(upright)
		for _, pc in ipairs(pieces) do
			if pc.label then pc.label.Rotation = upright and 0 or 90 end
		end
	end

	local function placeAtTarget()
		local tg = biome.target
		setGhost(false)
		state.mode = "busy"
		prompt.Enabled = false
		plot.carrying = false
		notify(plot, { carrying = false })
		local finalCF = targetCF()
		turnLabels(tg.upright)
		tweenPivot(model, finalCF * CFrame.new(0, 2.5, 0), 0.35, Enum.EasingStyle.Sine)
		tweenPivot(model, finalCF, 0.28, Enum.EasingStyle.Bounce)
		if not model.Parent then return end

		if not good then
			-- Сломанная раскладка: доски разлетаются и падают в облака
			sound(handle, Config.SOUNDS.Break, 0.9)
			hl.OutlineColor = Color3.fromRGB(248, 113, 113)
			task.wait(0.35)
			for _, pc in ipairs(pieces) do
				local parts = { pc.main }
				for _, dc in ipairs(pc.decor) do table.insert(parts, dc.p) end
				for _, part in ipairs(parts) do
					part.Anchored = false
					part.CanCollide = false
					part.AssemblyLinearVelocity = Vector3.new(math.random(-8, 8), math.random(4, 14), math.random(-8, 8))
					part.AssemblyAngularVelocity = Vector3.new(math.random(-4, 4), math.random(-4, 4), math.random(-4, 4))
				end
			end
			Debris:AddItem(model, 4)
			if plot.creation == model then plot.creation = nil end
			if hooks.onBroken then hooks.onBroken() end
			return
		end

		setCollide(true)
		state.mode = "placed"
		hl.OutlineTransparency = 1
		sound(handle, Config.SOUNDS.Place, 0.9)
		for _, pc in ipairs(pieces) do
			if not pc.rail then burst(pc.main.Position + UP, GOLD, 8, plot.folder) end
		end
		if tg.onPlaced then tg.onPlaced(model) end
		if hooks.onPlaced then hooks.onPlaced() end
	end

	local function dropHere()
		turnLabels(false)
		setGhost(false)
		state.mode = "busy"
		plot.carrying = false
		notify(plot, { carrying = false })
		local p = model:GetPivot().Position
		local hit = groundBelow(p)
		if hit and hit.Material ~= Enum.Material.Water and hit.Material ~= Enum.Material.CrackedLava then
			local rest = Bridge.FlatCF(plot, Vector3.new(p.X, hit.Position.Y + 0.05, p.Z))
			tweenPivot(model, rest, 0.3, Enum.EasingStyle.Bounce)
			sound(handle, Config.SOUNDS.Place, 0.6, 1.1)
			setCollide(true)
			state.mode = "idle"
			prompt.Enabled = true
			return
		end
		-- упал в пропасть — питомец возвращает предмет на принтер
		sound(handle, Config.SOUNDS.Fall, 0.8)
		tweenPivot(model, model:GetPivot() - UP * 40, 0.9, Enum.EasingStyle.Quad, Enum.EasingDirection.In)
		if not model.Parent then return end
		setCollide(false)
		if hooks.onLost then hooks.onLost() end
		returnToPrinter()
	end

	function state.pickUp(player)
		if player ~= plot.owner or state.mode ~= "idle" then return end
		state.mode = "carry"
		wasNear = false
		plot.carrying = true
		prompt.Enabled = false
		setCollide(false)
		setGhost(true)
		sound(handle, Config.SOUNDS.Pickup, 0.7)
		notify(plot, { carrying = true })
		if hooks.onPickup then hooks.onPickup() end
	end

	function state.drop(player)
		if player ~= plot.owner or state.mode ~= "carry" then return end
		if nearTarget(2) then
			task.spawn(placeAtTarget)
		else
			task.spawn(dropHere)
		end
	end

	prompt.Triggered:Connect(function(player)
		state.pickUp(player)
	end)

	local t0 = os.clock()
	plot.creationConn = RunService.Heartbeat:Connect(function(dt)
		if not model.Parent then
			if plot.creationConn then plot.creationConn:Disconnect() plot.creationConn = nil end
			return
		end
		if state.mode == "idle" and model:GetPivot().Position.Y > biome.printerPos.Y + 3 then
			-- лёгкое покачивание над принтером
			model:PivotTo(holdCF * CFrame.new(0, math.sin((os.clock() - t0) * 2) * 0.25, 0))
		elseif state.mode == "carry" then
			local char = plot.owner and plot.owner.Character
			local hrp = char and char:FindFirstChild("HumanoidRootPart")
			if not hrp then return end
			local look = hrp.CFrame.LookVector
			look = Vector3.new(look.X, 0, look.Z)
			if look.Magnitude < 0.1 then look = plot.dir end
			look = look.Unit
			local near = nearTarget(wasNear and 2 or 0)
			local goal
			if near then
				-- «примерка»: предмет висит там, куда встанет
				goal = targetCF() + UP * (2.2 + math.sin(os.clock() * 4) * 0.2)
			else
				-- предмет плывёт впереди ученика; расстояние — до ближнего края
				local ext = math.abs(look:Dot(plot.dir)) * spanU / 2 + math.abs(look:Dot(plot.right)) * spanV / 2
				goal = Bridge.FlatCF(plot, hrp.Position + look * (ext + 4) - UP * 1.2)
			end
			model:PivotTo(model:GetPivot():Lerp(goal, math.clamp(dt * 10, 0, 1)))
			if near ~= wasNear then
				wasNear = near
				turnLabels(near and biome.target.upright)
				if biome.target and biome.target.setHot then biome.target.setHot(near) end
				notify(plot, { nearTarget = near })
				if near and hooks.onNear then hooks.onNear() end
			end
		end
	end)

	return model
end

-- Победа: положенный предмет остаётся на уровне навсегда (по нему можно ходить назад)
function Bridge.Keep(plot, levelId)
	local model = plot.creation
	if not model or model:GetAttribute("Level") ~= levelId then return end
	if plot.creationConn then
		plot.creationConn:Disconnect()
		plot.creationConn = nil
	end
	local prompt = model:FindFirstChildWhichIsA("ProximityPrompt", true)
	if prompt then prompt:Destroy() end
	local biome = plot.biomes[levelId]
	if biome then biome.kept = model end
	plot.creation = nil
	plot.creationState = nil
	plot.carrying = false
end

function Bridge.Drop(plot, player)
	local st = plot.creationState
	if st and plot.creation and st.drop then
		st.drop(player)
	end
end

function Bridge.PickUp(plot, player)
	local st = plot.creationState
	if st and plot.creation and st.pickUp then
		st.pickUp(player)
	end
end

return Bridge
