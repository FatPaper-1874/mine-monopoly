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

function summarizeStrategyState(state: AIStrategyState | undefined): Record<string, unknown> | undefined {
	if (!state) return undefined;
	const summary: Record<string, unknown> = {};
	if (state.posture) summary.posture = state.posture;
	if (typeof state.reserveCashTarget === "number") summary.reserveCashTarget = state.reserveCashTarget;
	if (state.focusPlayerId) summary.focusPlayerId = state.focusPlayerId;
	if (state.focusPropertyIds?.length) summary.focusPropertyIds = state.focusPropertyIds.slice(0, 3);
	if (state.preferredSystems?.length) summary.preferredSystems = state.preferredSystems.slice(-3);
	if (typeof state.lastDecisionAtRound === "number") summary.lastDecisionAtRound = state.lastDecisionAtRound;
	if (state.notes?.length) summary.notes = state.notes.map((item) => clipText(item, 18)).filter(Boolean);
	const recentDecisionMemory = summarizeRecentDecisionSummaries(state.recentDecisionSummaries);
	if (recentDecisionMemory?.length) summary.recentDecisionMemory = recentDecisionMemory;
	return Object.keys(summary).length > 0 ? summary : undefined;
}

function summarizeRequestBase(request: AIDecisionRequest): Record<string, unknown> {
	return {
		map: {
			id: request.context.map.id,
			name: request.context.map.name,
			description: clipText(request.context.map.description, 120),
			roles: request.context.map.roles?.map((role) => ({
				id: role.id,
				name: clipText(role.name, 20),
				description: clipText(role.description, 48),
			})),
		},
		systemKeys: Object.keys(request.context.systems || {}),
	};
}

function summarizeTableState(request: AIDecisionRequest): Record<string, unknown> {
	const currentPlayer = request.context.player;
	const roleByPlayerId = new Map((request.context.playerRoles || []).map((item) => [item.playerId, item]));
	const currentPlayerRole = roleByPlayerId.get(currentPlayer.id);
	return {
		player: {
			id: currentPlayer.id,
			name: currentPlayer.user.username,
			money: currentPlayer.money,
			positionIndex: currentPlayer.positionIndex,
			role: currentPlayerRole
				? {
						id: currentPlayerRole.roleId,
						name: clipText(currentPlayerRole.roleName, 20),
						description: clipText(currentPlayerRole.roleDescription, 48),
				  }
				: undefined,
			propertyCount: currentPlayer.properties.length,
			properties: currentPlayer.properties.slice(0, 8).map((property) => ({
				id: property.id,
				name: property.name,
				level: property.level,
			})),
			chanceCards: currentPlayer.chanceCards.slice(0, 6).map((card) => ({
				id: card.id,
				name: card.name,
				description: clipText(card.description, 28),
			})),
		},
		opponents: request.context.players
			.filter((player) => player.id !== currentPlayer.id)
			.map((player) => {
				const role = roleByPlayerId.get(player.id);
				return {
					id: player.id,
					name: player.user.username,
					money: player.money,
					positionIndex: player.positionIndex,
					propertyCount: player.properties.length,
					isBankrupted: player.isBankrupted,
					role: role
						? {
								id: role.roleId,
								name: clipText(role.roleName, 20),
							}
						: undefined,
				};
			}),
		currentRound: request.context.currentRound,
		currentMultiplier: request.context.currentMultiplier,
		currentPlayerIdInRound: request.context.currentPlayerIdInRound,
	};
}

function summarizeDecision(request: AIDecisionRequest): Record<string, unknown> {
	return {
		operationType: request.operationType,
		scene: request.scene,
		title: request.title,
		summary: clipText(request.summary, 120),
		semantics: request.semantics,
		options: pickAvailableOptions(request.options).map((option) => ({
			id: option.id,
			label: clipText(option.label, 36),
			actionType: option.actionType,
			description: clipText(option.description, 72),
			semantics: option.semantics,
			payload: option.payload,
		})),
	};
}

function buildRemotePrompt(request: AIDecisionRequest): string {
	const sections = [
		`[game_profile]\n${JSON.stringify(summarizeRequestBase(request))}`,
		`[table_state]\n${JSON.stringify(summarizeTableState(request))}`,
		`[decision]\n${JSON.stringify(summarizeDecision(request))}`,
	];
	const strategyState = summarizeStrategyState(request.strategyState);
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
