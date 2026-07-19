const { ipcRenderer } = require("electron");

const providerBaseUrlPlaceholders = {
	"openai-compatible": "https://api.openai.com/v1",
	anthropic: "https://api.anthropic.com",
};

const providerModelPlaceholders = {
	"openai-compatible": "gpt-4.1-mini",
	anthropic: "claude-sonnet-4-0",
};

const SIDEBAR_COLLAPSED_KEY = "ai-console.sidebar-collapsed";

const state = {
	snapshot: null,
	selectedPlayerId: null,
	selectedProfileId: null,
	globalFormDirty: false,
	profileFormDirty: false,
	playerBindingDirty: false,
	refreshTimer: null,
};

const els = {
	toolbarMeta: document.getElementById("toolbar-meta"),
	refreshBtn: document.getElementById("refresh-btn"),
	closeBtn: document.getElementById("close-btn"),
	toggleSidebarBtn: document.getElementById("toggle-sidebar-btn"),
	sidebarPinBtn: document.getElementById("sidebar-pin-btn"),
	sidebarBackdrop: document.getElementById("sidebar-backdrop"),
	syncScopeText: document.getElementById("sync-scope-text"),
	miniModeText: document.getElementById("mini-mode-text"),
	miniProfileCount: document.getElementById("mini-profile-count"),
	miniTokenTotal: document.getElementById("mini-token-total"),

	globalMode: document.getElementById("global-mode"),
	globalDefaultProfile: document.getElementById("global-default-profile"),
	globalProvider: document.getElementById("global-provider"),
	globalBaseUrl: document.getElementById("global-base-url"),
	globalApiKey: document.getElementById("global-api-key"),
	globalModel: document.getElementById("global-model"),
	globalMemoryLimit: document.getElementById("global-memory-limit"),
	applyGlobalConfigBtn: document.getElementById("apply-global-config-btn"),

	profileList: document.getElementById("profile-list"),
	addProfileBtn: document.getElementById("add-profile-btn"),
	deleteProfileBtn: document.getElementById("delete-profile-btn"),
	profileName: document.getElementById("profile-name"),
	profileProvider: document.getElementById("profile-provider"),
	profileBaseUrl: document.getElementById("profile-base-url"),
	profileApiKey: document.getElementById("profile-api-key"),
	profileModel: document.getElementById("profile-model"),
	saveProfileBtn: document.getElementById("save-profile-btn"),

	usageMetrics: document.getElementById("usage-metrics"),
	usageList: document.getElementById("usage-list"),
	clearUsageBtn: document.getElementById("clear-usage-btn"),

	playerList: document.getElementById("player-list"),
	playerDetailPanel: document.getElementById("player-detail-panel"),
	memoryPanel: document.getElementById("memory-panel"),
	memoryJsonPanel: document.getElementById("memory-json-panel"),
};

function escapeHtml(value) {
	return String(value ?? "")
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;");
}

function formatCount(value) {
	if (typeof value !== "number" || !Number.isFinite(value)) return "--";
	return value.toLocaleString("zh-CN");
}

function formatTime(timestamp) {
	if (!timestamp) return "--";
	return new Date(timestamp).toLocaleTimeString("zh-CN", {
		hour: "2-digit",
		minute: "2-digit",
		second: "2-digit",
		hour12: false,
	});
}

function clampMemoryLimit(value) {
	const parsed = Number(value);
	if (!Number.isFinite(parsed)) return 0;
	return Math.max(0, Math.min(20, Math.floor(parsed)));
}

function deepClone(value) {
	return JSON.parse(JSON.stringify(value ?? null));
}

function generateId(prefix) {
	return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function setStatus(message, kind = "") {
	els.toolbarMeta.textContent = message;
	els.toolbarMeta.className = `toolbar__meta${kind ? ` ${kind}` : ""}`;
}

function isEditableElement(element) {
	if (!element || !(element instanceof HTMLElement)) return false;
	const tagName = element.tagName;
	if (tagName === "TEXTAREA") return true;
	if (tagName === "SELECT") return true;
	if (tagName !== "INPUT") return false;
	return !element.readOnly && !element.disabled;
}

function isUserEditingForm() {
	return isEditableElement(document.activeElement);
}

function shouldPauseAutoRefresh() {
	return state.globalFormDirty || state.profileFormDirty || state.playerBindingDirty || isUserEditingForm();
}

function isSidebarCollapsed() {
	return document.body.classList.contains("sidebar-collapsed");
}

function updateSidebarToggleButtons() {
	const collapsed = isSidebarCollapsed();
	const toolbarLabel = collapsed ? "展开配置" : "收起配置";
	const pinLabel = collapsed ? "展开" : "收起";
	els.toggleSidebarBtn.textContent = toolbarLabel;
	els.sidebarPinBtn.textContent = pinLabel;
}

function setSidebarCollapsed(collapsed) {
	document.body.classList.toggle("sidebar-collapsed", Boolean(collapsed));
	try {
		localStorage.setItem(SIDEBAR_COLLAPSED_KEY, collapsed ? "1" : "0");
	} catch {}
	updateSidebarToggleButtons();
}

function toggleSidebarCollapsed() {
	setSidebarCollapsed(!isSidebarCollapsed());
}

function restoreSidebarCollapsed() {
	try {
		setSidebarCollapsed(localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "1");
	} catch {
		updateSidebarToggleButtons();
	}
}

function getSnapshotConfig() {
	return deepClone(state.snapshot?.config || {});
}

function getProfiles() {
	return state.snapshot?.config?.remoteProfiles || [];
}

function getSelectedProfile() {
	return getProfiles().find((profile) => profile.id === state.selectedProfileId) || null;
}

function getSelectedPlayer() {
	return (state.snapshot?.aiPlayers || []).find((player) => player.userId === state.selectedPlayerId) || null;
}

function getProfileSelectOptions(selectedValue, includeDirectDefault = true) {
	const options = [];
	if (includeDirectDefault) {
		options.push({ value: "", label: "直接使用默认远端配置" });
	}
	for (const profile of getProfiles()) {
		options.push({
			value: profile.id,
			label: `${profile.name} (${profile.model || profile.provider || "--"})`,
		});
	}
	return options
		.map((option) => `<option value="${escapeHtml(option.value)}"${option.value === selectedValue ? " selected" : ""}>${escapeHtml(option.label)}</option>`)
		.join("");
}

function updateProviderPlaceholders() {
	els.globalBaseUrl.placeholder = providerBaseUrlPlaceholders[els.globalProvider.value] || "";
	els.globalModel.placeholder = providerModelPlaceholders[els.globalProvider.value] || "";
	els.profileBaseUrl.placeholder = providerBaseUrlPlaceholders[els.profileProvider.value] || "";
	els.profileModel.placeholder = providerModelPlaceholders[els.profileProvider.value] || "";
}

function markGlobalFormDirty() {
	state.globalFormDirty = true;
	updateProviderPlaceholders();
}

function markProfileFormDirty() {
	state.profileFormDirty = true;
	updateProviderPlaceholders();
}

function buildInfoBlock(label, value) {
	return `
		<div class="info-block">
			<div class="info-block__label">${escapeHtml(label)}</div>
			<div class="info-block__value">${escapeHtml(value || "--")}</div>
		</div>
	`;
}

function buildList(items, emptyText = "暂无数据") {
	if (!items || !items.length) {
		return `<div class="empty">${escapeHtml(emptyText)}</div>`;
	}
	return `<div class="list-stack">${items.map((item) => `<div class="list-item">${escapeHtml(item)}</div>`).join("")}</div>`;
}

function updateSidebarMini(snapshot) {
	const config = snapshot?.config || {};
	const summary = snapshot?.remoteUsage?.summary || {};
	els.miniModeText.textContent = "远程";
	els.miniProfileCount.textContent = String((config.remoteProfiles || []).length);
	els.miniTokenTotal.textContent = formatCount(summary.totalTokens);
}

function populateGlobalForm(config) {
	if (!config || state.globalFormDirty) return;
	els.globalMode.value = "remote";
	els.globalDefaultProfile.innerHTML = getProfileSelectOptions(config.defaultRemoteProfileId || "", true);
	els.globalProvider.value = config.remote?.provider || "openai-compatible";
	els.globalBaseUrl.value = config.remote?.baseUrl || "";
	els.globalApiKey.value = config.remote?.apiKey || "";
	els.globalModel.value = config.remote?.model || "";
	els.globalMemoryLimit.value = clampMemoryLimit(config.contextMemoryLimit ?? 6);
	updateProviderPlaceholders();
}

function populateProfileEditor(profile) {
	if (state.profileFormDirty) return;
	els.profileName.value = profile?.name || "";
	els.profileProvider.value = profile?.provider || "openai-compatible";
	els.profileBaseUrl.value = profile?.baseUrl || "";
	els.profileApiKey.value = profile?.apiKey || "";
	els.profileModel.value = profile?.model || "";
	updateProviderPlaceholders();
}

function renderGlobalUsage(snapshot) {
	const summary = snapshot?.remoteUsage?.summary || {};
	els.usageMetrics.innerHTML = [
		["请求数", summary.requestCount],
		["输入 Token", summary.inputTokens],
		["输出 Token", summary.outputTokens],
		["总 Token", summary.totalTokens],
	].map(([label, value]) => `
		<div class="metric">
			<div class="metric__label">${escapeHtml(label)}</div>
			<div class="metric__value">${escapeHtml(formatCount(value))}</div>
		</div>
	`).join("");

	const records = snapshot?.remoteUsage?.records || [];
	if (!records.length) {
		els.usageList.innerHTML = `<div class="empty">当前还没有远程 usage 记录。</div>`;
		return;
	}

	els.usageList.innerHTML = records.slice(0, 8).map((record) => `
		<div class="list-item">
			<div><strong>${escapeHtml(record.title || "未命名决策")}</strong></div>
			<div>${escapeHtml(record.playerId)} · ${escapeHtml(record.profileName || "默认远端")} · ${escapeHtml(record.model || "--")} · ${escapeHtml(formatTime(record.timestamp))}</div>
			<div>${record.usageAvailable
				? `输入 ${escapeHtml(formatCount(record.inputTokens))} / 输出 ${escapeHtml(formatCount(record.outputTokens))} / 总计 ${escapeHtml(formatCount(record.totalTokens))}`
				: `网关未返回 usage，请求 ${escapeHtml(formatCount(record.promptChars))} 字符，响应 ${escapeHtml(formatCount(record.responseChars))} 字符`
			}</div>
		</div>
	`).join("");
}

function renderProfiles(snapshot) {
	const profiles = snapshot?.config?.remoteProfiles || [];
	if (!state.selectedProfileId || !profiles.some((profile) => profile.id === state.selectedProfileId)) {
		state.selectedProfileId = profiles[0]?.id || null;
		state.profileFormDirty = false;
	}

	if (!profiles.length) {
		els.profileList.innerHTML = `<div class="empty">还没有保存远端档案。可先新增一套模型配置。</div>`;
	} else {
		els.profileList.innerHTML = profiles.map((profile) => `
			<div class="profile-item${profile.id === state.selectedProfileId ? " is-active" : ""}" data-profile-id="${escapeHtml(profile.id)}">
				<div class="profile-item__title">${escapeHtml(profile.name)}</div>
				<div class="profile-item__meta">${escapeHtml(profile.provider || "--")} · ${escapeHtml(profile.model || "--")}</div>
				<div class="profile-item__meta">${escapeHtml(profile.baseUrl || "--")}</div>
			</div>
		`).join("");

		Array.from(els.profileList.querySelectorAll("[data-profile-id]")).forEach((node) => {
			node.addEventListener("click", () => {
				state.selectedProfileId = node.getAttribute("data-profile-id");
				state.profileFormDirty = false;
				renderProfiles(state.snapshot);
				renderPlayerDetail();
			});
		});
	}

	els.globalDefaultProfile.innerHTML = getProfileSelectOptions(
		state.globalFormDirty ? els.globalDefaultProfile.value : snapshot?.config?.defaultRemoteProfileId || "",
		true,
	);

	populateProfileEditor(getSelectedProfile());
}

function getPlayerBindingLabel(player) {
	if (!player?.binding) return "跟随默认";
	return player.resolvedRemoteProfile?.name || "默认远端";
}

function renderPlayers(snapshot) {
	const aiPlayers = snapshot?.aiPlayers || [];
	if (!aiPlayers.length) {
		state.selectedPlayerId = null;
		els.playerList.innerHTML = `<div class="empty">当前没有可展示的 AI 玩家，或当前客户端不是房主。</div>`;
		return;
	}

	if (!state.selectedPlayerId || !aiPlayers.some((player) => player.userId === state.selectedPlayerId)) {
		state.selectedPlayerId = aiPlayers[0].userId;
		state.playerBindingDirty = false;
	}

	const currentRoundPlayer = snapshot?.debugState?.currentRoundPlayer || "";
	els.playerList.innerHTML = aiPlayers.map((player) => {
		const isActive = player.userId === state.selectedPlayerId;
		const isCurrentRound = typeof currentRoundPlayer === "string" && currentRoundPlayer.includes(player.userId);
		const usageTotal = player.usage?.summary?.totalTokens;
		const tags = [
			isCurrentRound ? `<span class="tag tag--good">当前回合</span>` : "",
			player.strategyState?.posture ? `<span class="tag">${escapeHtml(player.strategyState.posture)}</span>` : "",
			`<span class="tag">${escapeHtml(getPlayerBindingLabel(player))}</span>`,
		].filter(Boolean).join("");
		return `
			<div class="player-item${isActive ? " is-active" : ""}" data-player-id="${escapeHtml(player.userId)}">
				<div class="player-item__title">${escapeHtml(player.username || player.userId)}</div>
				<div class="player-item__meta">ID: ${escapeHtml(player.userId)} · ${player.isReady ? "已就绪" : "未就绪"}</div>
				<div class="player-item__token">Token ${escapeHtml(formatCount(usageTotal))}</div>
				<div class="tag-line">${tags}</div>
			</div>
		`;
	}).join("");

	Array.from(els.playerList.querySelectorAll("[data-player-id]")).forEach((node) => {
		node.addEventListener("click", () => {
			state.selectedPlayerId = node.getAttribute("data-player-id");
			state.playerBindingDirty = false;
			renderPlayers(state.snapshot);
			renderPlayerDetail();
			renderMemoryPanel();
		});
	});
}

function renderPlayerDetail() {
	const player = getSelectedPlayer();
	if (!player) {
		els.playerDetailPanel.innerHTML = `<div class="empty">请选择一个 AI 玩家。</div>`;
		return;
	}

	const usageSummary = player.usage?.summary || {};
	const usageRecords = player.usage?.records || [];
	const currentBinding = player.binding || { mode: "remote", remoteProfileId: "" };

	const bindingMode = state.playerBindingDirty
		? document.getElementById("player-binding-mode")?.value || currentBinding.mode
		: currentBinding.mode;
	const bindingProfileId = state.playerBindingDirty
		? document.getElementById("player-binding-profile")?.value || currentBinding.remoteProfileId || ""
		: currentBinding.remoteProfileId || "";

	els.playerDetailPanel.innerHTML = `
		<div class="player-detail-layout">
			<div class="player-hero">
				<div>
					<div class="player-hero__title">${escapeHtml(player.username || player.userId)}</div>
					<div class="player-hero__meta">ID: ${escapeHtml(player.userId)} · ${player.isReady ? "已就绪" : "未就绪"} · 当前绑定 ${escapeHtml(getPlayerBindingLabel(player))}</div>
				</div>
				<div class="player-hero__usage">
					<div class="info-block__label">总 Token</div>
					<div class="player-hero__usage-value">${escapeHtml(formatCount(usageSummary.totalTokens))}</div>
				</div>
			</div>
			<div class="info-grid">
				${buildInfoBlock("当前绑定", getPlayerBindingLabel(player))}
				${buildInfoBlock("请求数", formatCount(usageSummary.requestCount))}
				${buildInfoBlock("输入 Token", formatCount(usageSummary.inputTokens))}
				${buildInfoBlock("输出 Token", formatCount(usageSummary.outputTokens))}
			</div>
			<div class="card__subtle">为这个 AI 玩家选择默认远端，或某个已保存档案。</div>
			<div class="player-form-grid">
				<div class="field-row">
					<label for="player-binding-mode">模式</label>
					<select id="player-binding-mode">
						<option value="remote" selected>远程</option>
					</select>
				</div>
				<div class="field-row">
					<label for="player-binding-profile">远端档案</label>
					<select id="player-binding-profile">${getProfileSelectOptions(bindingProfileId, true)}</select>
				</div>
			</div>
			<div class="actions">
				<button class="btn btn--primary" id="save-player-binding-btn">保存 AI 绑定</button>
				<button class="btn btn--danger" id="clear-selected-memory-btn">清空当前 AI 记忆</button>
				<button class="btn btn--danger" id="clear-all-memory-btn">清空全部 AI 记忆</button>
			</div>
			<div class="section-gap">
				<div class="card__subtle">这个 AI 玩家最近的远端 usage</div>
				<div class="list-stack" style="margin-top: 10px;">
					${usageRecords.length
						? usageRecords.slice(0, 5).map((record) => `
							<div class="list-item">
								<div><strong>${escapeHtml(record.title || "未命名决策")}</strong></div>
								<div>${escapeHtml(record.profileName || "默认远端")} · ${escapeHtml(record.model || "--")} · ${escapeHtml(formatTime(record.timestamp))}</div>
								<div>${record.usageAvailable
									? `输入 ${escapeHtml(formatCount(record.inputTokens))} / 输出 ${escapeHtml(formatCount(record.outputTokens))} / 总计 ${escapeHtml(formatCount(record.totalTokens))}`
									: `请求 ${escapeHtml(formatCount(record.promptChars))} 字符，响应 ${escapeHtml(formatCount(record.responseChars))} 字符`
								}</div>
							</div>
						`).join("")
						: `<div class="empty">这个 AI 玩家当前还没有远端 usage 记录。</div>`}
				</div>
			</div>
		</div>
	`;

	const bindingModeEl = document.getElementById("player-binding-mode");
	const bindingProfileEl = document.getElementById("player-binding-profile");
	const saveBindingBtn = document.getElementById("save-player-binding-btn");
	const clearSelectedMemoryBtn = document.getElementById("clear-selected-memory-btn");
	const clearAllMemoryBtn = document.getElementById("clear-all-memory-btn");

	[bindingModeEl, bindingProfileEl].forEach((element) => {
		element?.addEventListener("input", () => {
			state.playerBindingDirty = true;
		});
		element?.addEventListener("change", () => {
			state.playerBindingDirty = true;
		});
	});

	saveBindingBtn?.addEventListener("click", async () => {
		const payload = {
			userId: player.userId,
			binding: {
				mode: "remote",
				remoteProfileId: bindingProfileEl?.value || undefined,
			},
		};
		setStatus(`正在保存 ${player.username} 的 AI 绑定...`);
		const result = await ipcRenderer.invoke("ai-console:set-player-binding", payload);
		if (!result?.success) {
			setStatus(result?.error || "保存 AI 绑定失败", "err");
			return;
		}
		state.playerBindingDirty = false;
		await refreshState({ silent: true });
		setStatus(`${player.username} 的 AI 绑定已更新`, "ok");
	});

	clearSelectedMemoryBtn?.addEventListener("click", () => clearMemory(player.userId));
	clearAllMemoryBtn?.addEventListener("click", () => clearMemory());
}

function renderMemoryPanel() {
	const player = getSelectedPlayer();
	if (!player) {
		els.memoryPanel.innerHTML = `<div class="empty">请选择一个 AI 玩家。</div>`;
		els.memoryJsonPanel.innerHTML = `<div class="empty">请选择一个 AI 玩家。</div>`;
		return;
	}

	const strategyState = player.strategyState || {};
	const memory = strategyState.memory || null;
	if (!memory) {
		els.memoryPanel.innerHTML = `<div class="empty">${escapeHtml(player.username || player.userId)} 当前还没有生成可展示的记忆。</div>`;
		els.memoryJsonPanel.innerHTML = `<div class="empty">${escapeHtml(player.username || player.userId)} 当前还没有原始记忆 JSON。</div>`;
		return;
	}

	const shortTermIntent = memory.shortTermIntent || {};
	const shortTerm = memory.shortTerm || {};
	const matchMemory = memory.match || {};
	const experience = memory.experience || {};

	els.memoryPanel.innerHTML = `
		<div class="memory-layout">
			<div class="info-grid">
				${buildInfoBlock("姿态", strategyState.posture || "--")}
				${buildInfoBlock("现金安全线", strategyState.reserveCashTarget ? String(strategyState.reserveCashTarget) : "--")}
				${buildInfoBlock("当前目标", shortTermIntent.currentGoal || "--")}
				${buildInfoBlock("最近结果", shortTerm.lastOutcome || "--")}
			</div>
			<div class="memory-grid">
				<div class="memory-section">
					<div class="card__subtle">短期计划</div>
					${buildList(shortTermIntent.nextTurnPlan, "暂无短期计划")}
				</div>
				<div class="memory-section">
					<div class="card__subtle">即时关注</div>
					${buildList(shortTerm.immediateFocus, "暂无即时关注")}
				</div>
				<div class="memory-section">
					<div class="card__subtle">近期失败 / 阻塞</div>
					${buildList([...(shortTerm.recentFailures || []), ...(shortTerm.blockedActionHints || [])], "暂无失败或阻塞记录")}
				</div>
				<div class="memory-section">
					<div class="card__subtle">对局经验</div>
					${buildList([...(matchMemory.notableLessons || []), ...(experience.compressedLessons || [])], "暂无经验归纳")}
				</div>
			</div>
		</div>
	`;

	els.memoryJsonPanel.innerHTML = `<textarea class="memory-json" readonly>${escapeHtml(JSON.stringify(strategyState, null, 2))}</textarea>`;
}

function renderSnapshot(snapshot) {
	if (snapshot?.__error) {
		setStatus(snapshot.__error, "err");
		els.syncScopeText.textContent = snapshot.__error;
		els.profileList.innerHTML = `<div class="empty">${escapeHtml(snapshot.__error)}</div>`;
		els.playerList.innerHTML = `<div class="empty">${escapeHtml(snapshot.__error)}</div>`;
		els.playerDetailPanel.innerHTML = `<div class="empty">${escapeHtml(snapshot.__error)}</div>`;
		els.memoryPanel.innerHTML = `<div class="empty">${escapeHtml(snapshot.__error)}</div>`;
		els.memoryJsonPanel.innerHTML = `<div class="empty">${escapeHtml(snapshot.__error)}</div>`;
		els.usageMetrics.innerHTML = "";
		els.usageList.innerHTML = `<div class="empty">${escapeHtml(snapshot.__error)}</div>`;
		return;
	}

	state.snapshot = snapshot;
	const room = snapshot.room || {};
	const currentRound = snapshot.debugState?.currentRound;
	const phase = snapshot.debugState?.currentGamePhase;

	els.syncScopeText.textContent = room.canSyncRoomAI ? "当前配置会同步到房间 AI" : "仅当前客户端生效";
	setStatus(
		[
			room.mapName ? `地图: ${room.mapName}` : "",
			typeof currentRound === "number" ? `回合: ${currentRound}` : "",
			phase ? `阶段: ${phase}` : "",
			room.workerState ? `Worker: ${room.workerState}` : "",
		].filter(Boolean).join(" · ") || "AI 控制台已连接",
		"ok",
	);

	populateGlobalForm(snapshot.config);
	updateSidebarMini(snapshot);
	renderProfiles(snapshot);
	renderGlobalUsage(snapshot);
	renderPlayers(snapshot);
	if (!state.playerBindingDirty) {
		renderPlayerDetail();
	}
	renderMemoryPanel();
}

async function refreshState({ silent = false } = {}) {
	if (!silent) {
		setStatus("正在刷新 AI 快照...");
	}
	try {
		const snapshot = await ipcRenderer.invoke("ai-console:get-state");
		renderSnapshot(snapshot);
	} catch (error) {
		setStatus(error?.message || "读取 AI 快照失败", "err");
	}
}

async function applyGlobalConfig() {
	const config = getSnapshotConfig();
	config.mode = els.globalMode.value;
	config.defaultRemoteProfileId = els.globalDefaultProfile.value || undefined;
	config.contextMemoryLimit = clampMemoryLimit(els.globalMemoryLimit.value);
	config.remote = {
		...(config.remote || {}),
		provider: els.globalProvider.value,
		baseUrl: els.globalBaseUrl.value.trim(),
		apiKey: els.globalApiKey.value.trim(),
		model: els.globalModel.value.trim(),
		timeoutMs: 30000,
	};
	if (config.mode === "remote" && !config.defaultRemoteProfileId) {
		if (!config.remote.baseUrl || !config.remote.apiKey || !config.remote.model) {
			setStatus("默认远程模式下，默认远端配置需要填写 Base URL、API Key 和模型名", "err");
			return;
		}
	}
	setStatus("正在应用默认 AI 配置...");
	const result = await ipcRenderer.invoke("ai-console:apply-config", config);
	if (!result?.success) {
		setStatus(result?.error || "应用默认 AI 配置失败", "err");
		return;
	}
	state.globalFormDirty = false;
	await refreshState({ silent: true });
	setStatus(result.syncedRoomAI ? "默认 AI 配置已应用，并同步到房间 AI" : "默认 AI 配置已应用", "ok");
}

async function addProfile() {
	const config = getSnapshotConfig();
	const profileId = generateId("remote-profile");
	config.remoteProfiles = config.remoteProfiles || [];
	config.remoteProfiles.push({
		id: profileId,
		name: `远端配置 ${config.remoteProfiles.length + 1}`,
		provider: "openai-compatible",
		baseUrl: "",
		apiKey: "",
		model: "",
		timeoutMs: 30000,
	});
	setStatus("正在新增远端档案...");
	const result = await ipcRenderer.invoke("ai-console:apply-config", config);
	if (!result?.success) {
		setStatus(result?.error || "新增远端档案失败", "err");
		return;
	}
	state.selectedProfileId = profileId;
	state.profileFormDirty = false;
	await refreshState({ silent: true });
	setStatus("远端档案已新增", "ok");
}

async function saveProfile() {
	if (!state.selectedProfileId) {
		setStatus("请先选择一个远端档案", "err");
		return;
	}
	const config = getSnapshotConfig();
	const profiles = config.remoteProfiles || [];
	const targetIndex = profiles.findIndex((profile) => profile.id === state.selectedProfileId);
	if (targetIndex < 0) {
		setStatus("当前远端档案不存在", "err");
		return;
	}

	const nextProfile = {
		...profiles[targetIndex],
		id: state.selectedProfileId,
		name: els.profileName.value.trim() || profiles[targetIndex].name || "未命名远端档案",
		provider: els.profileProvider.value,
		baseUrl: els.profileBaseUrl.value.trim(),
		apiKey: els.profileApiKey.value.trim(),
		model: els.profileModel.value.trim(),
		timeoutMs: 30000,
	};

	if (!nextProfile.baseUrl || !nextProfile.apiKey || !nextProfile.model) {
		setStatus("远端档案需要填写 Base URL、API Key 和模型名", "err");
		return;
	}

	profiles[targetIndex] = nextProfile;
	config.remoteProfiles = profiles;
	setStatus(`正在保存远端档案 ${nextProfile.name}...`);
	const result = await ipcRenderer.invoke("ai-console:apply-config", config);
	if (!result?.success) {
		setStatus(result?.error || "保存远端档案失败", "err");
		return;
	}
	state.profileFormDirty = false;
	await refreshState({ silent: true });
	setStatus(`远端档案 ${nextProfile.name} 已保存`, "ok");
}

async function deleteProfile() {
	if (!state.selectedProfileId) {
		setStatus("当前没有可删除的远端档案", "err");
		return;
	}
	const config = getSnapshotConfig();
	const profiles = config.remoteProfiles || [];
	const target = profiles.find((profile) => profile.id === state.selectedProfileId);
	if (!target) {
		setStatus("当前远端档案不存在", "err");
		return;
	}
	config.remoteProfiles = profiles.filter((profile) => profile.id !== state.selectedProfileId);
	if (config.defaultRemoteProfileId === state.selectedProfileId) {
		config.defaultRemoteProfileId = undefined;
	}
	setStatus(`正在删除远端档案 ${target.name}...`);
	const result = await ipcRenderer.invoke("ai-console:apply-config", config);
	if (!result?.success) {
		setStatus(result?.error || "删除远端档案失败", "err");
		return;
	}
	state.selectedProfileId = config.remoteProfiles[0]?.id || null;
	state.profileFormDirty = false;
	await refreshState({ silent: true });
	setStatus(`远端档案 ${target.name} 已删除`, "ok");
}

async function clearUsage() {
	setStatus("正在清空远程 usage...");
	const result = await ipcRenderer.invoke("ai-console:clear-usage");
	if (!result?.success) {
		setStatus(result?.error || "清空远程 usage 失败", "err");
		return;
	}
	await refreshState({ silent: true });
	setStatus("远程 usage 已清空", "ok");
}

async function clearMemory(playerId) {
	setStatus(playerId ? "正在清空当前 AI 记忆..." : "正在清空全部 AI 记忆...");
	const result = await ipcRenderer.invoke("ai-console:clear-memory", playerId ? { playerId } : {});
	if (!result?.success) {
		setStatus(result?.error || "清空 AI 记忆失败", "err");
		return;
	}
	await new Promise((resolve) => setTimeout(resolve, 80));
	await refreshState({ silent: true });
	setStatus(playerId ? "当前 AI 记忆已清空" : "全部 AI 记忆已清空", "ok");
}

function bindStaticEvents() {
	els.refreshBtn.addEventListener("click", () => refreshState());
	els.closeBtn.addEventListener("click", () => ipcRenderer.send("close-ai-console"));
	els.toggleSidebarBtn.addEventListener("click", toggleSidebarCollapsed);
	els.sidebarPinBtn.addEventListener("click", toggleSidebarCollapsed);
	els.sidebarBackdrop.addEventListener("click", () => setSidebarCollapsed(true));
	els.applyGlobalConfigBtn.addEventListener("click", applyGlobalConfig);
	els.addProfileBtn.addEventListener("click", addProfile);
	els.saveProfileBtn.addEventListener("click", saveProfile);
	els.deleteProfileBtn.addEventListener("click", deleteProfile);
	els.clearUsageBtn.addEventListener("click", clearUsage);

	[
		els.globalMode,
		els.globalDefaultProfile,
		els.globalProvider,
		els.globalBaseUrl,
		els.globalApiKey,
		els.globalModel,
		els.globalMemoryLimit,
	].forEach((element) => {
		element.addEventListener("input", markGlobalFormDirty);
		element.addEventListener("change", markGlobalFormDirty);
	});

	[
		els.profileName,
		els.profileProvider,
		els.profileBaseUrl,
		els.profileApiKey,
		els.profileModel,
	].forEach((element) => {
		element.addEventListener("input", markProfileFormDirty);
		element.addEventListener("change", markProfileFormDirty);
	});
}

function startPolling() {
	if (state.refreshTimer) {
		clearInterval(state.refreshTimer);
	}
	state.refreshTimer = setInterval(() => {
		if (shouldPauseAutoRefresh()) {
			return;
		}
		refreshState({ silent: true });
	}, 4000);
}

bindStaticEvents();
restoreSidebarCollapsed();
updateProviderPlaceholders();
refreshState();
startPolling();
