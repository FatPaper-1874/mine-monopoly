import type {
	AIDecisionConfig,
	AIDecisionOption,
	AIDecisionProvider,
	AIDecisionRequest,
	AIDecisionSelection,
	AIRemoteLLMConfig,
	AIRemoteLLMProviderKind,
	AIStrategyState,
} from "@mine-monopoly/types";
import { HeuristicDecisionProvider } from "../worker/ai/AIStrategy";

type OpenAIChatCompletionResponse = {
	choices?: Array<{
		message?: {
			content?: string | Array<{ type?: string; text?: string }>;
		};
	}>;
};

type AnthropicMessagesResponse = {
	content?: Array<{ type?: string; text?: string }>;
};

const SYSTEM_PROMPT =
	"你是大富翁游戏 AI 决策器。只能基于给定 options 做选择。返回 JSON 对象，不要输出额外文本。优先返回 optionId；多选时返回 optionIds；表单场景可返回 submitted 和 fieldValues。可以额外返回 chatMessages 数组，但最多只能有 1 条，而且只能是一句话，内容必须像玩家在房间聊天里会说的自然短句，用第一人称，口语化，不要提模型、提示词、JSON 或接口，也不要直接输出“确认”“取消”“提交”这类按钮词，或任何 id / 技术标识符，优先说具体对象名称和意图。";

const GENERIC_CHAT_MESSAGES = new Set(["确认", "取消", "提交", "使用", "继续", "选择", "选项", "目标"]);
const TECHNICAL_CHAT_MESSAGE_PATTERNS = [
	/__[a-z0-9:_-]+__/i,
	/\b(?:optionid|fieldvalues|confirmdialog|targetselect|itemselect|payload|sourceid|propertyid|playerid|mapitemid)\b/i,
	/\b(?:button|chance-card|property|player|map-item):[a-z0-9_-]+\b/i,
	/\b[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}\b/i,
	/机会卡.{0,4}id/i,
	/地皮.{0,4}id/i,
	/玩家.{0,4}id/i,
];

function clipText(text: string | undefined, maxLength: number): string | undefined {
	if (!text) return undefined;
	const normalized = text.replace(/\s+/g, " ").trim();
	if (!normalized) return undefined;
	return normalized.length > maxLength ? `${normalized.slice(0, maxLength)}...` : normalized;
}

function normalizeProviderKind(provider?: AIRemoteLLMProviderKind): AIRemoteLLMProviderKind {
	return provider ?? "openai-compatible";
}

function normalizeBaseUrl(baseUrl: string): string {
	return baseUrl.trim().replace(/\/+$/, "");
}

function buildOpenAIEndpoint(baseUrl: string): string {
	const normalized = normalizeBaseUrl(baseUrl);
	if (normalized.endsWith("/chat/completions")) {
		return normalized;
	}
	return `${normalized}/chat/completions`;
}

function buildAnthropicEndpoint(baseUrl: string): string {
	const normalized = normalizeBaseUrl(baseUrl);
	if (normalized.endsWith("/v1/messages")) {
		return normalized;
	}
	return `${normalized}/v1/messages`;
}

function pickAvailableOptions(options: AIDecisionOption[]): AIDecisionOption[] {
	return options.filter((option) => !option.hidden && !option.disabled);
}

function summarizeRecentDecisionSummaries(summaries: string[] | undefined) {
	return summaries
		?.map((item) => {
			const normalized = item.replace(/\s+/g, " ").trim();
			if (!normalized) return undefined;
			const lastColon = normalized.lastIndexOf(":");
			if (lastColon < 0) {
				return { title: clipText(normalized, 18) };
			}
			const secondLastColon = normalized.lastIndexOf(":", lastColon - 1);
			if (secondLastColon < 0) {
				return {
					title: clipText(normalized.slice(0, lastColon), 18),
					outcome: clipText(normalized.slice(lastColon + 1), 12),
				};
			}
			return {
				title: clipText(normalized.slice(0, secondLastColon), 18),
				choice: clipText(normalized.slice(secondLastColon + 1, lastColon), 16),
				outcome: clipText(normalized.slice(lastColon + 1), 12),
			};
		})
		.filter(Boolean);
}

type ContextMapItem = AIDecisionRequest["context"]["mapItems"][number];
type ContextProperty = AIDecisionRequest["context"]["properties"][number];
type ContextMapEvent = AIDecisionRequest["context"]["mapEvents"][number];

function summarizeSemantics(semantics: AIDecisionRequest["semantics"]): Record<string, unknown> | undefined {
	if (!semantics) return undefined;
	const summary: Record<string, unknown> = {};
	if (semantics.category) summary.category = semantics.category;
	if (semantics.intent) summary.intent = semantics.intent;
	if (semantics.summary) summary.summary = clipText(semantics.summary, 72);
	if (semantics.target) summary.target = clipText(semantics.target, 24);
	if (semantics.sourceSystem) summary.sourceSystem = semantics.sourceSystem;
	if (typeof semantics.cost === "number") summary.cost = semantics.cost;
	if (typeof semantics.reward === "number") summary.reward = semantics.reward;
	if (typeof semantics.risk === "number") summary.risk = semantics.risk;
	if (semantics.tags?.length) summary.tags = semantics.tags.slice(0, 4);
	if (semantics.effects?.length) summary.effects = semantics.effects.map((item) => clipText(item, 24)).filter(Boolean).slice(0, 3);
	if (semantics.timing) summary.timing = semantics.timing;
	if (typeof semantics.requiresSetup === "boolean") summary.requiresSetup = semantics.requiresSetup;
	if (typeof semantics.urgency === "number") summary.urgency = semantics.urgency;
	if (semantics.comboKey) summary.comboKey = semantics.comboKey;
	return Object.keys(summary).length > 0 ? summary : undefined;
}

function buildRoleByPlayerId(request: AIDecisionRequest) {
	return new Map((request.context.playerRoles || []).map((item) => [item.playerId, item]));
}

function buildMapItemById(request: AIDecisionRequest) {
	return new Map(request.context.mapItems.map((item) => [item.id, item]));
}

function buildPropertyById(request: AIDecisionRequest) {
	return new Map(request.context.properties.map((item) => [item.id, item]));
}

function buildMapEventById(request: AIDecisionRequest) {
	return new Map(request.context.mapEvents.map((item) => [item.id, item]));
}

function getReadableRoleInfo(
	roleByPlayerId: Map<string, NonNullable<AIDecisionRequest["context"]["playerRoles"]>[number]>,
	playerId: string,
	includeDescription = false,
) {
	const role = roleByPlayerId.get(playerId);
	if (!role?.roleName) return undefined;
	return {
		name: clipText(role.roleName, 20),
		description: includeDescription ? clipText(role.roleDescription, 48) : undefined,
	};
}

function getCurrentRent(property: ContextProperty): number | undefined {
	if (!property.costList.length) return undefined;
	const rentIndex = Math.min(Math.max(property.level, 0), property.costList.length - 1);
	return property.costList[rentIndex];
}

function formatBoardPosition(index: number): string {
	return `第${index + 1}格`;
}

function summarizePropertyBrief(property: ContextProperty, includeOwner = true): Record<string, unknown> {
	const ownerName = clipText(property.owner?.username, 18);
	const currentRent = getCurrentRent(property);
	const summaryParts: string[] = [];
	if (includeOwner) {
		summaryParts.push(ownerName ? `${ownerName}持有` : "无主地");
	}
	if (typeof property.level === "number") {
		summaryParts.push(`等级 ${property.level}/${property.maxLevel}`);
	}
	if (typeof property.sellCost === "number") {
		summaryParts.push(`购买价 ${property.sellCost}`);
	}
	if (typeof currentRent === "number") {
		summaryParts.push(`当前过路费 ${currentRent}`);
	}
	const customDescription = clipText(property.custom?.description, 32);
	if (customDescription) {
		summaryParts.push(customDescription);
	}
	return {
		name: clipText(property.name, 24),
		summary: summaryParts.join("，"),
	};
}

function summarizeMapEventBrief(event: ContextMapEvent | undefined): Record<string, unknown> | undefined {
	if (!event) return undefined;
	return {
		name: clipText(event.name, 24),
		type: String(event.type),
		description: clipText(event.description, 48),
	};
}

function buildTileDisplayName(item: ContextMapItem, mapEvent?: ContextMapEvent): string {
	return clipText(item.property?.name, 24) || clipText(mapEvent?.name, 24) || clipText(item.type?.name, 20) || "未知格子";
}

function summarizeLinkedProperty(
	request: AIDecisionRequest,
	itemId: string | undefined,
	boardIndexByItemId: Map<string, number>,
): Record<string, unknown> | undefined {
	if (!itemId) return undefined;
	const mapItemById = buildMapItemById(request);
	const linkedTile = mapItemById.get(itemId);
	if (!linkedTile?.property) return undefined;
	return {
		position: typeof boardIndexByItemId.get(itemId) === "number" ? formatBoardPosition(boardIndexByItemId.get(itemId)!) : undefined,
		...summarizePropertyBrief(linkedTile.property),
	};
}

function summarizeAttachedProperties(
	request: AIDecisionRequest,
	item: ContextMapItem,
	boardIndexByItemId: Map<string, number>,
): Array<Record<string, unknown>> | undefined {
	const attached = [item.linkto, item.beLinked]
		.map((linkedId) => summarizeLinkedProperty(request, linkedId, boardIndexByItemId))
		.filter((value): value is Record<string, unknown> => Boolean(value));
	if (attached.length === 0) return undefined;
	const seen = new Set<string>();
	const deduped = attached.filter((property) => {
		const key = JSON.stringify(property);
		if (seen.has(key)) return false;
		seen.add(key);
		return true;
	});
	return deduped.length > 0 ? deduped : undefined;
}

function summarizeTile(
	request: AIDecisionRequest,
	item: ContextMapItem | undefined,
	boardIndexByItemId: Map<string, number>,
	boardIndex?: number,
	options?: {
		includeOwner?: boolean;
	},
): Record<string, unknown> | undefined {
	if (!item) return undefined;
	const mapEventById = buildMapEventById(request);
	const event = item.mapEventId ? mapEventById.get(item.mapEventId) : undefined;
	const includeOwner = options?.includeOwner !== false;
	const typeName = clipText(item.type?.name, 20) || "未知格子";
	const summary: Record<string, unknown> = {
		name: buildTileDisplayName(item, event),
		type: typeName,
	};
	if (typeof boardIndex === "number") {
		summary.position = formatBoardPosition(boardIndex);
	}
	if (event) {
		summary.event = summarizeMapEventBrief(event);
	}
	if (item.property) {
		if (includeOwner) {
			summary.owner = clipText(item.property.owner?.username, 18) || "无主";
		}
		summary.property = summarizePropertyBrief(item.property, includeOwner);
	}
	const attachedProperties = summarizeAttachedProperties(request, item, boardIndexByItemId);
	if (attachedProperties) {
		summary.attachedProperties = attachedProperties;
	}
	if (item.property) {
		summary.summary = summarizePropertyBrief(item.property, includeOwner).summary;
	} else if (attachedProperties?.length) {
		summary.summary = `关联地产：${attachedProperties
			.map((property) => {
				const name = typeof property.name === "string" ? property.name : undefined;
				const brief = typeof property.summary === "string" ? property.summary : undefined;
				return [name, brief].filter(Boolean).join("，");
			})
			.filter(Boolean)
			.join("；")}`;
	} else if (event?.description) {
		summary.summary = clipText(event.description, 48);
	} else {
		summary.summary = "普通功能格";
	}
	return summary;
}

function buildBoardIndexByItemId(request: AIDecisionRequest) {
	return new Map(request.context.mapIndex.map((itemId, index) => [itemId, index]));
}

function summarizeTileAtPosition(request: AIDecisionRequest, positionIndex: number): Record<string, unknown> | undefined {
	const itemId = request.context.mapIndex[positionIndex];
	if (!itemId) return undefined;
	return summarizeTile(request, buildMapItemById(request).get(itemId), buildBoardIndexByItemId(request), positionIndex);
}

function summarizeNearbyTiles(request: AIDecisionRequest, positionIndex: number, maxSteps = 6) {
	const total = request.context.mapIndex.length;
	if (total <= 1) return undefined;
	const mapItemById = buildMapItemById(request);
	const boardIndexByItemId = buildBoardIndexByItemId(request);
	const tiles: Array<Record<string, unknown>> = [];
	const visibleSteps = Math.min(maxSteps, total - 1);
	for (let step = 1; step <= visibleSteps; step++) {
		const boardIndex = (positionIndex + step) % total;
		const tile = summarizeTile(request, mapItemById.get(request.context.mapIndex[boardIndex]), boardIndexByItemId, boardIndex);
		if (!tile) continue;
		tiles.push({
			step,
			...tile,
		});
	}
	return tiles.length > 0 ? tiles : undefined;
}

function summarizeMapStructure(request: AIDecisionRequest): Record<string, unknown> {
	const mapItemById = buildMapItemById(request);
	const boardIndexByItemId = buildBoardIndexByItemId(request);
	return {
		totalTiles: request.context.mapIndex.length,
		orderedTiles: request.context.mapIndex.map((itemId, index) => {
			const tile = summarizeTile(request, mapItemById.get(itemId), boardIndexByItemId, index, {
				includeOwner: false,
			});
			return {
				index: index + 1,
				...tile,
			};
		}),
	};
}

function summarizeStrategyState(request: AIDecisionRequest): Record<string, unknown> | undefined {
	const state = request.strategyState;
	if (!state) return undefined;
	const summary: Record<string, unknown> = {};
	const playerNameById = new Map(request.context.players.map((item) => [item.id, item.user.username]));
	const propertyById = buildPropertyById(request);
	if (state.posture) summary.posture = state.posture;
	if (typeof state.reserveCashTarget === "number") summary.reserveCashTarget = state.reserveCashTarget;
	if (state.focusPlayerId) {
		summary.focusPlayer = clipText(playerNameById.get(state.focusPlayerId), 20) || "关注目标";
	}
	if (state.focusPropertyIds?.length) {
		const focusProperties = state.focusPropertyIds
			.slice(0, 3)
			.map((id) => clipText(propertyById.get(id)?.name, 20))
			.filter(Boolean);
		if (focusProperties.length > 0) {
			summary.focusProperties = focusProperties;
		}
	}
	if (state.preferredSystems?.length) summary.preferredSystems = state.preferredSystems.slice(-3);
	if (typeof state.lastDecisionAtRound === "number") summary.lastDecisionAtRound = state.lastDecisionAtRound;
	if (state.notes?.length) summary.notes = state.notes.map((item) => clipText(item, 18)).filter(Boolean);
	const recentDecisionMemory = summarizeRecentDecisionSummaries(state.recentDecisionSummaries);
	if (recentDecisionMemory?.length) summary.recentDecisionMemory = recentDecisionMemory;
	return Object.keys(summary).length > 0 ? summary : undefined;
}

function summarizeRequestBase(request: AIDecisionRequest): Record<string, unknown> {
	return {
		mapName: request.context.map.name,
		mapDescription: clipText(request.context.map.description, 120),
		roles: request.context.map.roles?.map((role) => ({
			name: clipText(role.name, 20),
			description: clipText(role.description, 48),
		})),
		enabledSystems: Object.keys(request.context.systems || {}).slice(0, 8),
	};
}

function summarizeTableState(request: AIDecisionRequest): Record<string, unknown> {
	const currentPlayer = request.context.player;
	const roleByPlayerId = buildRoleByPlayerId(request);
	const currentPlayerTile = summarizeTileAtPosition(request, currentPlayer.positionIndex);
	const currentTurnPlayerName = request.context.players.find((item) => item.id === request.context.currentPlayerIdInRound)?.user.username;
	return {
		currentRound: request.context.currentRound,
		currentMultiplier: request.context.currentMultiplier,
		currentTurnPlayer: clipText(currentTurnPlayerName, 20),
		currentPlayer: {
			name: currentPlayer.user.username,
			money: currentPlayer.money,
			role: getReadableRoleInfo(roleByPlayerId, currentPlayer.id, true),
			position: formatBoardPosition(currentPlayer.positionIndex),
			currentTile: currentPlayerTile,
			propertyCount: currentPlayer.properties.length,
			ownedProperties: currentPlayer.properties.slice(0, 8).map((property) => summarizePropertyBrief(property, false)),
			chanceCards: currentPlayer.chanceCards.slice(0, 6).map((card) => ({
				name: card.name,
				description: clipText(card.description, 28),
			})),
			status:
				currentPlayer.isBankrupted
					? "已破产"
					: currentPlayer.stop > 0
						? `还需暂停 ${currentPlayer.stop} 回合`
						: undefined,
		},
		opponents: request.context.players
			.filter((player) => player.id !== currentPlayer.id)
			.map((player) => {
				return {
					name: player.user.username,
					money: player.money,
					role: getReadableRoleInfo(roleByPlayerId, player.id),
					position: formatBoardPosition(player.positionIndex),
					currentTile: summarizeTileAtPosition(request, player.positionIndex),
					propertyCount: player.properties.length,
					properties: player.properties
						.slice(0, 3)
						.map((property) => clipText(property.name, 18))
						.filter(Boolean),
					isBankrupted: player.isBankrupted,
				};
			}),
		nearbyTiles: summarizeNearbyTiles(request, currentPlayer.positionIndex),
	};
}

function summarizeDecision(request: AIDecisionRequest): Record<string, unknown> {
	return {
		operationType: request.operationType,
		scene: request.scene,
		title: request.title,
		summary: clipText(request.summary, 120),
		semantics: summarizeSemantics(request.semantics),
		options: pickAvailableOptions(request.options).map((option) => ({
			optionId: option.id,
			label: clipText(option.label, 36),
			actionType: option.actionType,
			description: clipText(option.description || option.semantics?.summary, 72),
			semantics: summarizeSemantics(option.semantics),
		})),
	};
}

function buildRemotePrompt(request: AIDecisionRequest): string {
	const sections = [
		`[game_profile]\n${JSON.stringify(summarizeRequestBase(request))}`,
		`[map_structure]\n${JSON.stringify(summarizeMapStructure(request))}`,
		`[board_brief]\n${JSON.stringify(summarizeTableState(request))}`,
		`[decision]\n${JSON.stringify(summarizeDecision(request))}`,
	];
	const strategyState = summarizeStrategyState(request);
	if (strategyState) {
		sections.push(`[strategy_memory]\n${JSON.stringify(strategyState)}`);
	}
	return sections.join("\n\n");
}

function getDecisionTraceId(request: AIDecisionRequest): string {
	const traceId = request.metadata?.decisionId;
	return typeof traceId === "string" && traceId ? traceId : "unknown";
}

function redactHeaders(headers: Record<string, string>): Record<string, string> {
	const nextHeaders = { ...headers };
	if (nextHeaders.Authorization) {
		nextHeaders.Authorization = "Bearer ***";
	}
	if (nextHeaders["x-api-key"]) {
		nextHeaders["x-api-key"] = "***";
	}
	return nextHeaders;
}

function tryParseJson(text: string): unknown {
	try {
		return JSON.parse(text);
	} catch {
		return text;
	}
}

function logRemoteRequest(request: AIDecisionRequest, remoteRequest: ReturnType<typeof buildRemoteRequest>): void {
	const traceId = getDecisionTraceId(request);
	console.groupCollapsed(`[AI Remote] request ${traceId} ${request.title}`);
	console.log("requestMeta", {
		traceId,
		provider: remoteRequest.provider,
		url: remoteRequest.url,
		operationType: request.operationType,
		scene: request.scene,
		playerId: request.playerId,
	});
	console.log("headers", redactHeaders(remoteRequest.headers));
	console.log("body", tryParseJson(remoteRequest.body));
	console.log("prompt", buildRemotePrompt(request));
	console.groupEnd();
}

function logRemoteResponse(
	request: AIDecisionRequest,
	remoteRequest: ReturnType<typeof buildRemoteRequest>,
	data: unknown,
	content: string,
	selection: AIDecisionSelection,
): void {
	const traceId = getDecisionTraceId(request);
	console.groupCollapsed(`[AI Remote] response ${traceId} ${request.title}`);
	console.log("responseMeta", {
		traceId,
		provider: remoteRequest.provider,
		playerId: request.playerId,
	});
	console.log("rawResponse", data);
	console.log("assistantText", content);
	console.log("selection", selection);
	console.groupEnd();
}

function logRemoteFailure(request: AIDecisionRequest, remoteRequest: ReturnType<typeof buildRemoteRequest>, error: unknown): void {
	const traceId = getDecisionTraceId(request);
	console.groupCollapsed(`[AI Remote] error ${traceId} ${request.title}`);
	console.log("requestMeta", {
		traceId,
		provider: remoteRequest.provider,
		url: remoteRequest.url,
		playerId: request.playerId,
	});
	console.log("headers", redactHeaders(remoteRequest.headers));
	console.log("body", tryParseJson(remoteRequest.body));
	console.error("error", error);
	console.groupEnd();
}

function extractTextContent(content: string | Array<{ type?: string; text?: string }> | undefined): string {
	if (typeof content === "string") {
		return content;
	}
	if (Array.isArray(content)) {
		return content
			.map((item) => item?.text || "")
			.join("\n")
			.trim();
	}
	return "";
}

function extractJsonPayload(raw: string): string {
	const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
	if (fenced?.[1]) {
		return fenced[1].trim();
	}
	const firstBrace = raw.indexOf("{");
	const lastBrace = raw.lastIndexOf("}");
	if (firstBrace >= 0 && lastBrace > firstBrace) {
		return raw.slice(firstBrace, lastBrace + 1);
	}
	return raw.trim();
}

function isNaturalChatMessage(text: string): boolean {
	const trimmed = text.trim();
	if (!trimmed) {
		return false;
	}
	const compact = trimmed.replace(/[「」"'`，。！？、,.!?：:\s]/g, "");
	if (!compact) {
		return false;
	}
	if (GENERIC_CHAT_MESSAGES.has(compact)) {
		return false;
	}
	return !TECHNICAL_CHAT_MESSAGE_PATTERNS.some((pattern) => pattern.test(trimmed));
}

function sanitizeChatMessages(value: unknown): string[] | undefined {
	if (!Array.isArray(value)) {
		return undefined;
	}
	const normalized = value
		.filter((item): item is string => typeof item === "string")
		.map((item) => item.replace(/\s+/g, " ").trim())
		.filter((item) => item.length > 0 && isNaturalChatMessage(item))
		.map((item) => (item.length > 48 ? `${item.slice(0, 48)}...` : item))
		.slice(0, 1);
	return normalized.length > 0 ? normalized : undefined;
}

function normalizeSelection(request: AIDecisionRequest, value: unknown): AIDecisionSelection {
	const availableOptions = pickAvailableOptions(request.options);
	const validIds = new Set(availableOptions.map((option) => option.id));
	const payload = typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};
	const optionId = typeof payload.optionId === "string" && validIds.has(payload.optionId) ? payload.optionId : undefined;
	const optionIds = Array.isArray(payload.optionIds)
		? payload.optionIds.filter((item): item is string => typeof item === "string" && validIds.has(item))
		: undefined;
	const confidence = typeof payload.confidence === "number" ? payload.confidence : undefined;
	const reason = typeof payload.reason === "string" ? payload.reason : undefined;
	const submitted = typeof payload.submitted === "boolean" ? payload.submitted : undefined;
	const chatMessages = sanitizeChatMessages(payload.chatMessages);
	const fieldValues =
		typeof payload.fieldValues === "object" && payload.fieldValues !== null
			? (payload.fieldValues as Record<string, unknown>)
			: undefined;

	if (optionId || (optionIds && optionIds.length > 0) || submitted !== undefined || fieldValues) {
		return {
			optionId,
			optionIds,
			confidence,
			reason,
			submitted,
			fieldValues,
			chatMessages,
		};
	}

	return {
		optionId: availableOptions[0]?.id,
		confidence: 0.2,
		reason: "fallback_first_option",
		chatMessages,
	};
}

function requiresApiKey(config: AIRemoteLLMConfig): boolean {
	return true;
}

function hasRequiredConfig(config: AIRemoteLLMConfig): boolean {
	if (!config.baseUrl || !config.model) {
		return false;
	}
	if (requiresApiKey(config) && !config.apiKey) {
		return false;
	}
	return true;
}

function buildRemoteRequest(config: AIRemoteLLMConfig, request: AIDecisionRequest): {
	url: string;
	headers: Record<string, string>;
	body: string;
	provider: AIRemoteLLMProviderKind;
} {
	const provider = normalizeProviderKind(config.provider);
	const prompt = buildRemotePrompt(request);

	switch (provider) {
		case "anthropic":
			return {
				provider,
				url: buildAnthropicEndpoint(config.baseUrl),
				headers: {
					"Content-Type": "application/json",
					"x-api-key": config.apiKey,
					"anthropic-version": "2023-06-01",
				},
				body: JSON.stringify({
					model: config.model,
					max_tokens: 512,
					temperature: 0.2,
					system: SYSTEM_PROMPT,
					messages: [
						{
							role: "user",
							content: prompt,
						},
					],
				}),
			};
		case "openai-compatible":
		default:
			return {
				provider,
				url: buildOpenAIEndpoint(config.baseUrl),
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${config.apiKey}`,
				},
				body: JSON.stringify({
					model: config.model,
					temperature: 0.2,
					messages: [
						{
							role: "system",
							content: SYSTEM_PROMPT,
						},
						{
							role: "user",
							content: prompt,
						},
					],
				}),
			};
	}
}

function extractResponseContent(provider: AIRemoteLLMProviderKind, data: unknown): string {
	switch (provider) {
		case "anthropic":
			return extractTextContent((data as AnthropicMessagesResponse)?.content);
		case "openai-compatible":
		default:
			return extractTextContent((data as OpenAIChatCompletionResponse)?.choices?.[0]?.message?.content);
	}
}

class RemoteAIDecisionProvider implements AIDecisionProvider {
	private readonly fallback = new HeuristicDecisionProvider();

	constructor(private readonly config: AIRemoteLLMConfig) {}

	async decide(request: AIDecisionRequest): Promise<AIDecisionSelection> {
		if (!hasRequiredConfig(this.config)) {
			return this.fallback.decide(request);
		}

		const controller = new AbortController();
		const timeoutMs = this.config.timeoutMs ?? 30000;
		const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);
		const remoteRequest = buildRemoteRequest(this.config, request);
		logRemoteRequest(request, remoteRequest);

		try {
			const response = await fetch(remoteRequest.url, {
				method: "POST",
				headers: remoteRequest.headers,
				body: remoteRequest.body,
				signal: controller.signal,
			});

			if (!response.ok) {
				throw new Error(`HTTP ${response.status}`);
			}

			const data = await response.json();
			const content = extractResponseContent(remoteRequest.provider, data);
			if (!content) {
				throw new Error("远程模型未返回内容");
			}
			const selection = normalizeSelection(request, JSON.parse(extractJsonPayload(content)));
			logRemoteResponse(request, remoteRequest, data, content, selection);
			return selection;
		} catch (error) {
			logRemoteFailure(request, remoteRequest, error);
			console.warn(`[AI Remote:${remoteRequest.provider}] fallback to heuristic provider`, error);
			return this.fallback.decide(request);
		} finally {
			clearTimeout(timeoutId);
		}
	}
}

export function createAIDecisionProviderFromConfig(config: AIDecisionConfig): AIDecisionProvider {
	if (config.mode === "remote") {
		return new RemoteAIDecisionProvider({
			...config.remote,
			provider: normalizeProviderKind(config.remote.provider),
		});
	}
	return new HeuristicDecisionProvider();
}
