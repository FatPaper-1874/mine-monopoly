import type { AIDecisionRequest } from "@mine-monopoly/types";

type Data = Record<string, unknown>;

const FIELD_NAMES: Record<string, string> = {
	name: "名称", label: "说明", title: "标题", description: "描述", summary: "说明", content: "内容",
	money: "现金", score: "积分", points: "点数", amount: "数量", price: "价格", cost: "费用", value: "数值",
	ownerId: "所有者", playerId: "玩家", targetPlayerId: "目标玩家", propertyId: "地产", mapItemId: "地点",
	targetMapItemId: "目标地点", pathId: "路径", direction: "移动方向", fromMapItemId: "起点", toMapItemId: "终点", mapEventId: "地图事件",
	roleId: "角色", sourceId: "来源", targetId: "目标", targetIds: "目标", id: "条目标记",
	sellCost: "购买费用", buildCost: "升级费用", rentPeak: "最高租金", propertyCount: "地产数量",
	targetType: "作用对象", hasProperty: "是否有关联地产", type: "类别", actionKind: "操作方式",
	maxSelections: "最多选择数量", min: "最小值", max: "最大值", defaultValue: "默认值", valueType: "填写类型",
	options: "可选值", defaultFieldValues: "默认填写内容", chatOnly: "仅作聊天回应",
	messageCardTitle: "提示卡标题", messageCardContent: "提示卡内容",
	posture: "当前策略", focusPlayerId: "重点关注玩家", focusPropertyIds: "重点关注地产",
	preferredSystems: "偏好玩法", reserveCashTarget: "建议保留现金", recentDecisionSummaries: "近期决策", notes: "备注",
	economy: "经济判断", spendMode: "支出倾向", riskTolerance: "风险偏好", warningFlags: "风险提醒",
	threatModel: "对手威胁", threatReasons: "关注原因", dangerousPropertyIds: "危险地产",
	propertyPlan: "地产计划", avoidPropertyIds: "暂避地产", expansionReason: "扩张理由",
	systemPlan: "玩法计划", avoidedSystems: "暂避玩法", lastEffectiveSystem: "最近有效玩法",
	mapUnderstanding: "地图理解", keyZones: "重点区域", specialTileNotes: "特殊地点", routeNotes: "路线认识",
	shortTermIntent: "短期计划", currentGoal: "当前目标", nextTurnPlan: "后续计划", holdConditions: "保守条件",
	shortTerm: "近期记忆", recentDecisions: "近期决策", recentFailures: "近期受挫记录",
	blockedActionHints: "暂时不可行的行动", immediateFocus: "眼下重点", lastChosenSystem: "上次选择的玩法",
	lastOutcome: "最近结果", memoryPatches: "补充记忆", match: "本局经验", experience: "经验总结",
	effectiveSystems: "表现较好的玩法", riskySystems: "风险较高的玩法", systemStats: "玩法反馈", actionStats: "行动反馈",
	notableLessons: "本局经验", recentSuccesses: "近期顺利行动", compressedLessons: "经验总结",
	candidateLongTerm: "本局积累的候选经验", promotedLongTerm: "本局反复记录的经验", entries: "条目",
	kind: "经验类型", scope: "适用范围", confidence: "可信度", evidence: "依据", tags: "标签", hitCount: "记录次数",
	labelKey: "标签", sourceSystem: "所属玩法", successCount: "顺利次数", failureCount: "受挫次数", neutralCount: "中性反馈次数",
	expiresAtRound: "有效至回合", createdAtRound: "记录回合", lastUpdatedRound: "更新回合", lastRound: "最近回合",
	stockMarket: "股票市场", stock: "股票", holdings: "持仓", shares: "股数", cash: "现金", balance: "余额",
};

const VALUE_NAMES: Record<string, string> = {
	expand: "积极扩张", balanced: "平衡经营", conservative: "保守经营", desperate: "优先求生", speculative: "寻找高回报机会",
	hold_cash: "保留现金", invest: "投资", low: "低", medium: "中", high: "高",
	turn: "近期回合", match: "当前对局", map: "本地图（本局内）",
	systemPreference: "玩法偏好", riskRule: "风险经验", timingHeuristic: "行动时机", targetingBias: "目标偏好", plan: "计划", experienceNote: "经验记录",
	forward: "正向", reverse: "反向", ToSelf: "自己", ToOtherPlayer: "其他玩家", ToPlayer: "任意玩家", ToProperty: "地产", ToMapItem: "地图地点",
	ArrivedEvent: "到达时触发", PassedEvent: "经过时触发", NormalEvents: "普通事件",
	"active-action": "主动行动", "scripted-action": "地图交互", "confirm-dialog": "确认操作",
	"form-dialog": "填写表单", "target-select": "选择目标", "item-select": "选择物品",
	"dynamic-button": "地图按钮", "chance-card": "机会卡", property: "地产", "player-target": "玩家目标",
	"map-item": "地图地点", "high-cost-property": "高费用地产", stock: "股票", "stockMarket": "股票市场",
	"use-chance-card": "使用机会卡", "use-card": "使用机会卡", roll: "结束准备并掷骰", confirm: "确认", cancel: "取消",
	submit: "提交", select: "选择", target: "选择目标", acknowledge: "回应提示卡", button: "按钮", player: "玩家", item: "物品",
	success: "顺利", failure: "受挫", neutral: "中性反馈", "mapped-operation": "选择已转换为游戏操作",
	"finish-pre-roll": "结束准备", "chance-card-no-target": "机会卡无合适目标", number: "数字", string: "文字",
};

// 只排除展示资源和内部路由；未知的地图自定义玩法数据仍保留。
const PRESENTATION_FIELDS = new Set([
	"avatar", "color", "iconId", "imageId", "modelId", "buildingModelIdList", "customUI", "infoDisplay", "isThinking",
	"effectCode", "initCode", "style", "styleBinding", "propsBinding",
	"mapPaths", "paths", "mapIndex", "mapPathRuntimeState", "enabledPathIds", "pendingChoice", "pathId", "pathIds", "fromMapItemId", "toMapItemId", "movementHistory", "returnFromMapItemId", "routeNotes",
]);

function asData(value: unknown): Data | undefined {
	return value !== null && typeof value === "object" && !Array.isArray(value) ? value as Data : undefined;
}

function without(value: unknown, keys: string[]): Data {
	return Object.fromEntries(Object.entries(asData(value) || {}).filter(([key]) => !keys.includes(key)));
}

function facts(...values: Array<string | undefined>): string {
	return values.filter(Boolean).join("；");
}

/** 全量描述游戏事实；仅回传选项和表单字段保留执行所需的标识。 */
export function buildRemotePrompt(request: AIDecisionRequest): string {
	const { context } = request;
	const names = new Map<string, string>();
	function register(items: Array<{ id: string; name?: string }>, kind: string): void {
		const counts = new Map<string, number>();
		for (const item of items) counts.set(item.name || kind, (counts.get(item.name || kind) || 0) + 1);
		items.forEach((item, index) => {
			const name = item.name || kind;
			names.set(item.id, counts.get(name)! > 1 ? `${name}（${kind}${index + 1}）` : name);
		});
	}
	register(context.players.map((player) => ({ id: player.id, name: player.user.username })), "玩家");
	register(context.map.roles || [], "角色");
	register(context.properties, "地产");
	register(context.mapEvents, "事件");
	for (const player of context.players) {
		for (const card of player.chanceCards) {
			names.set(card.id, card.name);
			if (card.sourceId) names.set(card.sourceId, card.name);
		}
	}
	const eventById = new Map(context.mapEvents.map((event) => [event.id, event]));

	context.mapItems.forEach((item, index) => {
		const title = (item.property && names.get(item.property.id)) || (item.mapEventId && names.get(item.mapEventId)) || item.type?.name || "未命名地点";
		names.set(item.id, `地点${index + 1}「${title}」`);
		if (item.type?.id) names.set(item.type.id, item.type.name);
	});
	for (const option of request.options) {
		if (!names.has(option.id) && option.label && option.label !== option.id) names.set(option.id, option.label);
		const id = option.payload?.id;
		if (typeof id === "string" && !names.has(id) && option.label && option.label !== id) names.set(id, option.label);
	}
	const escapedIds = [...names.keys()].filter((id) => id && !/^\d+$/.test(id)).sort((left, right) => right.length - left.length)
		.map((id) => id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
	const references = escapedIds.length
		? new RegExp(`(?<![A-Za-z0-9_-])(?:${escapedIds.join("|")})(?![A-Za-z0-9_-])`, "g")
		: undefined;
	function text(value: string): string {
		if (/^\d+$/.test(value)) return value;
		return names.get(value) || VALUE_NAMES[value] || (references ? value.replace(references, (id) => names.get(id)!) : value);
	}
	function describe(value: unknown, ancestors = new Set<object>()): string {
		if (value === undefined) return "";
		if (value === null) return "无";
		if (typeof value === "boolean") return value ? "是" : "否";
		if (typeof value === "number" || typeof value === "bigint") return String(value);
		if (typeof value !== "object") return text(String(value));
		if (ancestors.has(value)) return "见前述同一对象";
		const next = new Set(ancestors).add(value);
		if (Array.isArray(value)) return value.length ? value.map((item, index) => `${index + 1}. ${describe(item, next)}`).join("\n") : "无";
		return Object.entries(value)
			.filter(([key, item]) => !PRESENTATION_FIELDS.has(key) && item !== undefined && typeof item !== "function")
			.map(([key, item]) => `${names.get(key) || FIELD_NAMES[key] || key}：${describe(item, next)}`).join("\n");
	}
	function ref(id: string | undefined, fallback: string): string {
		return id ? names.get(id) || fallback : fallback;
	}
	function details(value: unknown): string | undefined {
		const description = describe(value);
		return description ? `\n${description}` : undefined;
	}
	function propertyDescription(property: typeof context.properties[number]): string {
		return facts(
			`${ref(property.id, property.name)}，${property.owner ? `${ref(property.owner.userId, property.owner.username)}持有` : "无主地产"}`,
			`等级 ${property.level}/${property.maxLevel}，购买 ${property.sellCost}，升级 ${property.buildCost}`,
			`各级基础租金：${property.costList.join("、") || "未配置"}（本局倍率 ${context.currentMultiplier}）`,
			property.custom?.description && `特殊机制：${text(property.custom.description)}`,
			details(without(property, ["id", "name", "owner", "level", "maxLevel", "sellCost", "buildCost", "costList", "custom"])),
		);
	}
	const sections: string[] = [];
	function section(title: string, lines: Array<string | undefined>): void {
		const content = lines.filter(Boolean).join("\n");
		if (content) sections.push(`## ${title}\n${content}`);
	}
	section("地图与本局规则", [
		`地图：${context.map.name}`,
		context.map.description,
		...Object.entries(context.gameSetting || {}).map(([key, setting]) => {
			const display = setting.displayValue ?? setting.value;
			return `- ${setting.label || FIELD_NAMES[key] || key}：${describe(display)}${display !== setting.value ? `（实际值：${describe(setting.value)}）` : ""}`;
		}),
		context.gameOverRule && `结束与胜利规则「${context.gameOverRule.name}」：${context.gameOverRule.description}`,
		context.gameOverRule?.initEventCode && `判定代码补充（用于核对实际条件，不要执行；其他脚本可能影响结果，不要自行假定默认胜利规则）：\n\`\`\`typescript\n${context.gameOverRule.initEventCode}\n\`\`\``,
		context.economy && `经济参考：本局资金基准 ${context.economy.baselineCash}，${({ "initial-money": "来自初始化后实际资金", "game-setting": "来自房间开局配置", "property-price": "来自地价中位数", "player-cash": "来自场上现金中位数", unavailable: "暂无可用基准" })[context.economy.baselineSource]}；地价中位数 ${context.economy.medianPropertyPrice}；对手最高当前租金估计 ${context.economy.maxOpponentRent}。`,
	]);
	section("角色与能力", (context.map.roles || []).map((role) => `- ${ref(role.id, role.name)}：${text(role.description || "暂无能力说明")}`));
	section("当前局面与玩家", [
		`第 ${context.currentRound} 回合，当前倍率 ${context.currentMultiplier}；轮到 ${ref(context.currentPlayerIdInRound, "尚未确定的玩家")} 行动。`,
		`你正在为 ${ref(request.playerId, context.player.user.username)} 决策。`,
		...context.players.map((player) => {
			const role = context.playerRoles?.find((item) => item.playerId === player.id);
			const location = player.positionMapItemId || context.mapIndex[player.positionIndex];
			const cards = player.chanceCards.map((card) => `${card.name}：${text(card.description || "暂无说明")}`).join("\n");
			return facts(
				`### ${ref(player.id, player.user.username)}${player.id === request.playerId ? "（你）" : ""}`,
				`现金 ${player.money}，位于 ${ref(location, "未知地点")}`,
				player.isBankrupted ? "已破产" : "尚未破产",
				player.stop > 0 ? `暂停行动 ${player.stop} 回合` : undefined,
				player.isOffline ? "当前离线" : undefined,
				role?.roleName ? `角色：${ref(role.roleId || player.user.roleId, role.roleName)}；能力：${text(role.roleDescription || "暂无说明")}` : undefined,
				`地产：${player.properties.map((property) => ref(property.id, property.name)).join("、") || "无"}`,
				`\n手牌：\n${cards || "无"}`,
				player.buff?.length ? `\n状态效果：\n${describe(player.buff.map((buff) => without(buff, ["id"])))}` : undefined,
				player.dices?.length ? `\n骰子：\n${player.dices.map((dice, index) => `骰子${index + 1}：可掷出 ${dice.diceValues.join("、")}${dice.prophecy ? `；已指定点数 ${dice.prophecy}` : ""}`).join("\n")}` : undefined,
				details(without(player, ["id", "user", "money", "positionIndex", "positionMapItemId", "properties", "chanceCards", "buff", "dices", "stop", "isBankrupted", "isOffline", "isAI"])),
			);
		}),
	]);
	const mapItemById = new Map(context.mapItems.map((item) => [item.id, item]));
	const propertyById = new Map(context.properties.map((property) => [property.id, property]));
	function tileDescription(mapItemId: string): string {
		const item = mapItemById.get(mapItemId);
		if (!item) return `${ref(mapItemId, "未知地块")}：缺少地块信息。`;
		const properties = new Map<string, typeof context.properties[number]>();
		for (const tile of [item, item.linkto && mapItemById.get(item.linkto), item.beLinked && mapItemById.get(item.beLinked)]) {
			if (tile && tile.property) properties.set(tile.property.id, propertyById.get(tile.property.id) || tile.property);
		}
		const event = item.mapEventId ? eventById.get(item.mapEventId) : undefined;
		return facts(`- ${ref(item.id, "未知地块")}，类型：${item.type?.name || "未知"}`,
			...Array.from(properties.values()).map(propertyDescription),
			event ? `事件「${ref(event.id, event.name)}」（${VALUE_NAMES[String(event.type)] || "地图事件"}）：${text(event.description || "暂无机制说明")}` : undefined);
	}
	const reachability = context.diceReachability;
	const origin = reachability?.originMapItemId || context.player.positionMapItemId || context.mapIndex[context.player.positionIndex];
	section("当前所在地块", origin ? [tileDescription(origin)] : []);
	const reachableIds = new Set<string>();
	section("本次掷骰的基础落点", reachability ? [
		...reachability.notes.map(text),
		...reachability.rolls.map((roll) => {
			const probability = `${Number((roll.probability * 100).toPrecision(4))}%`;
			const destinations = roll.landings.map((landing) => {
				reachableIds.add(landing.mapItemId);
				return facts(ref(landing.mapItemId, "未知地块"),
					landing.conditional ? "受动态条件影响，仅为可能的基础落点" : "基础预计落点",
					landing.stoppedEarly ? `移动 ${landing.movedSteps} 步后因无可用连接提前停下` : undefined);
			}).join("；或 ");
			return `- 点数合计 ${roll.total}（该点数掷出概率 ${probability}）：${destinations || "无法确定落点"}。`;
		}),
	] : ["本次请求没有本地骰子落点计算结果，不要自行推导或假定可达地块。"]);
	section("骰子可达地块的信息", [...reachableIds].map(tileDescription));
	section("自定义玩法状态", [details(context.systems)]);
	section("这次需要决定什么", [
		`场景：${VALUE_NAMES[request.scene || ""] || VALUE_NAMES[request.operationType] || "游戏决策"}；${text(request.title)}`,
		request.summary && text(request.summary),
		"以下选项的 optionId 是回传标识，只需原样填写；请按名称和说明判断。",
		...request.options.filter((option) => !option.hidden && !option.disabled).map((option, index) => {
			const targetId = typeof option.payload?.id === "string" ? option.payload.id : undefined;
			const targetName = names.get(option.id) || (targetId && names.get(targetId));
			const label = targetName || (option.label !== option.id ? option.label : `未命名选项${index + 1}`);
			return facts(
				`### 选项${index + 1}：${text(label)}\noptionId=${JSON.stringify(option.id)}`,
				option.description && text(option.description), option.summary && text(option.summary),
				VALUE_NAMES[option.actionType] ? `操作：${VALUE_NAMES[option.actionType]}` : undefined,
				propertyById.has(targetId || option.id) ? propertyDescription(propertyById.get(targetId || option.id)!) : undefined,
				details(without(option.payload, ["id", "type", "actionKind"])),
			);
		}),
		details(without(request.metadata, ["decisionId", "traceId", "traceLabel", "chainContext", "formFields", "defaultFieldValues", "finishActionId"])),
	]);
	const formFields = request.metadata?.formFields;
	section("表单填写要求", Array.isArray(formFields) ? formFields.map((field) => {
		const data = asData(field);
		if (!data) return undefined;
		const fieldKey = String(data.key ?? "");
		const defaults = asData(request.metadata?.defaultFieldValues);
		return `- ${text(String(data.label || fieldKey))}（fieldValues 中使用键 ${JSON.stringify(fieldKey)}）：${describe({ ...without(data, ["key", "label"]), defaultValue: defaults?.[fieldKey] ?? data.defaultValue })}`;
	}) : []);
	const chain = asData(request.metadata?.chainContext);
	section("同一事件的连续决定", chain ? [
		typeof chain.eventName === "string" ? `当前事件：${text(chain.eventName)}` : undefined,
		typeof chain.guidance === "string" ? text(chain.guidance) : undefined,
		...(Array.isArray(chain.previousDecisions) ? chain.previousDecisions.map((step, index) => {
			const data = asData(step);
			return data ? `- 第${index + 1}步：${describe(data.title)}；已选择 ${describe(data.chosen)}；${describe(data.summary)}` : undefined;
		}) : []),
	] : []);
	const state = request.strategyState;
	section("本局策略与记忆", state ? [
		"以下是本局积累的参考判断，可根据地图目标和当前风险调整。",
		describe(without(state, ["memory", "lastDecisionAtRound"])),
		state.memory && describe(Object.fromEntries(Object.entries(state.memory).filter(([key]) => key !== "version").map(([key, value]) => [key, cleanMemory(value)]))),
	] : []);
	function cleanMemory(value: unknown): unknown {
		if (Array.isArray(value)) return value.map(cleanMemory);
		const data = asData(value);
		return data ? Object.fromEntries(Object.entries(data)
			.filter(([key]) => !["id", "key", "sourceDecisionId", "promotedAtRound"].includes(key))
			.map(([key, item]) => [key, cleanMemory(item)])) : value;
	}
	const chatOnly = request.metadata?.chatOnly === true;
	const hasPreviousChoices = Array.isArray(chain?.previousDecisions) && chain.previousDecisions.length > 0;
	section("本次回复要求", [
		chatOnly
			? "本次是聊天回应，请务必在 chatMessages 中写 1 句对刚收到信息的即时反应。"
			: "请在作出选择的同时，在 chatMessages 中写 1 句玩家会说的话：表达这次选择的态度、意图或情绪，直接说具体对象。",
		hasPreviousChoices && !chatOnly
			? "这是同一事件的后续步骤；有新的目标、判断或情绪就继续说，只有与前一句重复且没有新内容时才可用空数组省略发言。"
			: undefined,
		"结合你的角色性格，用第一人称和口语表达，不要每次都套用解释策略的句式。",
		"只返回 JSON 对象；chatMessages 是字符串数组，与动作字段放在同一个对象里。下面仅展示结构，占位内容请按本次情况填写。",
		request.scene === "form-dialog"
			? '{"optionId":"<__submit__ 或 __cancel__>","submitted":true,"fieldValues":{},"chatMessages":["<你对本次决定的一句自然发言>"]}；提交时按表单要求填写 fieldValues，取消时 submitted 为 false。'
			: '{"optionId":"<所选选项的原始 optionId>","chatMessages":["<你对本次局面或选择的一句自然发言>"]}；多选时用 optionIds 数组代替 optionId。',
	]);
	return sections.join("\n\n");
}
