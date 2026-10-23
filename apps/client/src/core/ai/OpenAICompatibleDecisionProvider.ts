import type {
	AIDecisionConfig,
	AIRemoteCallDetail,
	AIDecisionMemoryPatch,
	AIDecisionOption,
	AIDecisionProvider,
	AIDecisionRequest,
	AIDecisionSelection,
	AIRemoteLLMConfig,
	AIRemoteLLMProfile,
	AIRemoteLLMProviderKind,
} from "@mine-monopoly/types";
import { recordAIRemoteUsage, updateAIRemoteUsage } from "./remote-usage-stats";
import { buildRemotePrompt } from "./ReadableAIPrompt";

type OpenAIChatCompletionResponse = {
	choices?: Array<{
		message?: {
			content?: string | Array<{ type?: string; text?: string }>;
		};
	}>;
	usage?: {
		prompt_tokens?: number;
		completion_tokens?: number;
		total_tokens?: number;
		input_tokens?: number;
		output_tokens?: number;
	};
};

type AnthropicMessagesResponse = {
	content?: Array<{ type?: string; text?: string }>;
	usage?: {
		input_tokens?: number;
		output_tokens?: number;
		cache_creation_input_tokens?: number;
		cache_read_input_tokens?: number;
	};
};

type RemoteUsage = {
	inputTokens?: number;
	outputTokens?: number;
	totalTokens?: number;
};

const SYSTEM_PROMPT =
	"你是大富翁游戏 AI 决策器。只能从“这次需要决定什么”列出的可用选项中选择，原样回传对应 optionId。以本地图的胜利条件、房间参数和当前局面为依据，不要套用其他地图的金额标准或默认胜利规则。“本局策略与记忆”中的姿态、安全线和计划是启发式建议，可根据实际规则与风险调整。本次掷骰的基础落点已由本地计算，按提供的地块信息判断，不要自行推导路线。点数概率仅描述骰子结果，不能当作受动态脚本影响后的最终到达概率。返回 JSON 对象，不要输出额外文本。优先返回 optionId；多选时返回 optionIds；表单场景如果决定提交，返回 optionId:\"__submit__\"、submitted:true，并尽量填写 fieldValues；如果放弃，返回 optionId:\"__cancel__\"、submitted:false。若请求里带有“同一事件的连续决定”，说明这是一串连续弹窗；除非当前约束显示不可执行，否则后续步骤应延续前一步已做出的决定，不要自相矛盾。你还可以可选返回 memoryPatches 数组，每项只允许包含 scope(取值限于 turn/match/map)、kind(systemPreference/riskRule/timingHeuristic/targetingBias/plan/experienceNote)、summary、confidence、evidence、key、tags、ttlTurns、promoteCandidate。你同时扮演正在参与游戏的玩家。默认在 chatMessages 中返回 1 句针对当前局面或所选动作的自然发言，让其他玩家听到你的态度、意图或即时反应。用第一人称、口语化，并结合所选角色的性格；可以表达情绪、简短判断或互动，不必每次解释策略。购买、升级、用卡、选目标、放弃行动或收到事件消息时都可以开口。连续弹窗中只有重复上一句且没有新内容时才可省略发言；仅作聊天回应的请求必须发言。不要编造局面或他人说过的话，不要提模型、提示词、JSON 或接口，也不要只输出“确认”“取消”“提交”这类按钮词，或任何 id / 技术标识符，优先说具体对象名称、意图和感受。chatMessages 必须是字符串数组，例如 {\"chatMessages\":[\"我先买这个，后手更灵活\"]}，不要返回纯字符串。";

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

function normalizeMemoryText(text: string | undefined): string | undefined {
	if (!text) return undefined;
	const normalized = text.replace(/\s+/g, " ").trim();
	if (!normalized) return undefined;
	return normalized;
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

function getDecisionTraceId(request: AIDecisionRequest): string {
	const traceId = request.metadata?.decisionId;
	return typeof traceId === "string" && traceId ? traceId : "unknown";
}

function normalizeTokenCount(value: unknown): number | undefined {
	return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function sumTokenCounts(...values: Array<number | undefined>): number | undefined {
	const filtered = values.filter((value): value is number => typeof value === "number" && Number.isFinite(value));
	if (filtered.length === 0) return undefined;
	return filtered.reduce((sum, value) => sum + value, 0);
}

function extractUsage(provider: AIRemoteLLMProviderKind, data: unknown): RemoteUsage | undefined {
	switch (provider) {
		case "anthropic": {
			const usage = (data as AnthropicMessagesResponse)?.usage;
			if (!usage) return undefined;
			const inputTokens = sumTokenCounts(
				normalizeTokenCount(usage.input_tokens),
				normalizeTokenCount(usage.cache_creation_input_tokens),
				normalizeTokenCount(usage.cache_read_input_tokens),
			);
			const outputTokens = normalizeTokenCount(usage.output_tokens);
			const totalTokens = sumTokenCounts(inputTokens, outputTokens);
			if (inputTokens === undefined && outputTokens === undefined && totalTokens === undefined) {
				return undefined;
			}
			return {
				inputTokens,
				outputTokens,
				totalTokens,
			};
		}
		case "openai-compatible":
		default: {
			const usage = (data as OpenAIChatCompletionResponse)?.usage;
			if (!usage) return undefined;
			const inputTokens = normalizeTokenCount(usage.prompt_tokens) ?? normalizeTokenCount(usage.input_tokens);
			const outputTokens = normalizeTokenCount(usage.completion_tokens) ?? normalizeTokenCount(usage.output_tokens);
			const totalTokens = normalizeTokenCount(usage.total_tokens) ?? sumTokenCounts(inputTokens, outputTokens);
			if (inputTokens === undefined && outputTokens === undefined && totalTokens === undefined) {
				return undefined;
			}
			return {
				inputTokens,
				outputTokens,
				totalTokens,
			};
		}
	}
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
	const rawMessages = Array.isArray(value) ? value : typeof value === "string" ? [value] : undefined;
	if (!rawMessages) {
		return undefined;
	}
	const normalized = rawMessages
		.filter((item): item is string => typeof item === "string")
		.map((item) => item.replace(/\s+/g, " ").trim())
		.filter((item) => item.length > 0 && isNaturalChatMessage(item))
		.map((item) => (item.length > 96 ? `${item.slice(0, 96)}...` : item))
		.slice(0, 1);
	return normalized.length > 0 ? normalized : undefined;
}

function sanitizeMemoryPatches(value: unknown): AIDecisionMemoryPatch[] | undefined {
	if (!Array.isArray(value)) {
		return undefined;
	}
	const normalized = value
		.map((item) => {
			if (typeof item !== "object" || item === null) {
				return undefined;
			}
			const patch = item as Record<string, unknown>;
			const scope = patch.scope === "turn" || patch.scope === "match" || patch.scope === "map" ? patch.scope : undefined;
			const kind =
				patch.kind === "systemPreference" ||
				patch.kind === "riskRule" ||
				patch.kind === "timingHeuristic" ||
				patch.kind === "targetingBias" ||
				patch.kind === "plan" ||
				patch.kind === "experienceNote"
					? patch.kind
					: undefined;
			const summary = normalizeMemoryText(typeof patch.summary === "string" ? patch.summary : undefined);
			if (!scope || !kind || !summary) {
				return undefined;
			}
			const tags = Array.isArray(patch.tags)
				? Array.from(
						new Set(
							patch.tags
								.filter((tag): tag is string => typeof tag === "string")
								.map((tag) => tag.replace(/\s+/g, " ").trim())
								.filter(Boolean),
						),
					).slice(0, 4)
				: undefined;
			return {
				scope,
				kind,
				summary,
				key: normalizeMemoryText(typeof patch.key === "string" ? patch.key : undefined),
				confidence: typeof patch.confidence === "number" ? Math.max(0, Math.min(1, patch.confidence)) : undefined,
				evidence: normalizeMemoryText(typeof patch.evidence === "string" ? patch.evidence : undefined),
				tags,
				ttlTurns:
					scope === "turn" && typeof patch.ttlTurns === "number" && Number.isFinite(patch.ttlTurns)
						? Math.max(1, Math.min(4, Math.round(patch.ttlTurns)))
						: undefined,
				promoteCandidate: Boolean(patch.promoteCandidate),
			} satisfies AIDecisionMemoryPatch;
		})
		.filter(Boolean) as AIDecisionMemoryPatch[];
	return normalized.length > 0 ? normalized.slice(0, 4) : undefined;
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
	const submitted =
		typeof payload.submitted === "boolean"
			? payload.submitted
			: request.scene === "form-dialog"
				? optionId === "__submit__"
					? true
					: optionId === "__cancel__"
						? false
						: undefined
				: undefined;
	const chatMessages = sanitizeChatMessages(payload.chatMessages);
	const memoryPatches = sanitizeMemoryPatches(payload.memoryPatches);
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
			memoryPatches,
		};
	}

	return {
		optionId: availableOptions[0]?.id,
		confidence: 0.2,
		reason: "fallback_first_option",
		chatMessages,
		memoryPatches,
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
	model: string;
	prompt: string;
} {
	const provider = normalizeProviderKind(config.provider);
	const prompt = buildRemotePrompt(request);

	switch (provider) {
		case "anthropic":
			return {
				provider,
				model: config.model,
				prompt,
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
				model: config.model,
				prompt,
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
	constructor(private readonly config: AIRemoteLLMConfig) {}

	async decide(request: AIDecisionRequest): Promise<AIDecisionSelection> {
		if (!hasRequiredConfig(this.config)) return {};

		const startedAt = Date.now();
		const provider = normalizeProviderKind(this.config.provider);
		const playerRole = request.context.playerRoles?.find((role) => role.playerId === request.playerId);
		const recordId = recordAIRemoteUsage({
			traceId: getDecisionTraceId(request),
			playerId: request.playerId,
			playerName: request.context.player.user.username,
			roleName: playerRole?.roleName,
			round: request.context.currentRound,
			title: request.title,
			scene: request.scene,
			profileId: this.config.id,
			profileName: this.config.name,
			provider,
			model: this.config.model,
			promptChars: 0,
			responseChars: 0,
			timestamp: startedAt,
			usageAvailable: false,
			status: "pending",
		});
		const controller = new AbortController();
		const timeoutMs = this.config.timeoutMs ?? 30000;
		const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);
		let responseDetail: AIRemoteCallDetail["response"];
		let usage: RemoteUsage | undefined;
		let content = "";
		let selection: AIDecisionSelection | undefined;
		let errorMessage: string | undefined;

		try {
			const remoteRequest = buildRemoteRequest(this.config, request);
			updateAIRemoteUsage(recordId, { promptChars: remoteRequest.prompt.length }, {
				request: {
					url: remoteRequest.url.replace(/([?&](?:api[_-]?key|access_token|token)=)[^&#]*/gi, "$1[已隐藏]"),
					method: "POST",
					headers: Object.fromEntries(Object.entries(remoteRequest.headers).map(([key, value]) => [
						key, /^(?:authorization|proxy-authorization|x-api-key|api-key)$/i.test(key) ? "[已隐藏]" : value,
					])),
					body: remoteRequest.body,
				},
			});
			const response = await fetch(remoteRequest.url, {
				method: "POST",
				headers: remoteRequest.headers,
				body: remoteRequest.body,
				signal: controller.signal,
			});
			responseDetail = {
				status: response.status,
				statusText: response.statusText,
				headers: Object.fromEntries(response.headers.entries()),
				body: "",
			};
			responseDetail.body = await response.text();
			if (!response.ok) throw new Error(`HTTP ${response.status} ${response.statusText}`.trim());

			const data: unknown = JSON.parse(responseDetail.body);
			usage = extractUsage(provider, data);
			content = extractResponseContent(provider, data);
			if (!content) throw new Error("远程模型未返回内容");
			selection = normalizeSelection(request, JSON.parse(extractJsonPayload(content)));
			return selection;
		} catch (error) {
			errorMessage = controller.signal.aborted
				? `请求超时（${timeoutMs}ms）`
				: error instanceof Error ? error.message : String(error);
			console.error(`[AI Remote:${provider}] request failed`, error);
			return {};
		} finally {
			clearTimeout(timeoutId);
			updateAIRemoteUsage(recordId, {
				status: errorMessage ? "error" : "success",
				durationMs: Date.now() - startedAt,
				error: errorMessage,
				inputTokens: usage?.inputTokens,
				outputTokens: usage?.outputTokens,
				totalTokens: usage?.totalTokens,
				responseChars: (content || responseDetail?.body || "").length,
				usageAvailable: Boolean(usage),
			}, { response: responseDetail, modelOutput: content, selection: selection || {} });
		}
	}
}

export function createAIDecisionProviderFromConfig(config: AIDecisionConfig): AIDecisionProvider {
	return createRemoteAIDecisionProvider(config.remote);
}

export function createRemoteAIDecisionProvider(config: AIRemoteLLMConfig | AIRemoteLLMProfile): AIDecisionProvider {
	return new RemoteAIDecisionProvider({
		...config,
		provider: normalizeProviderKind(config.provider),
	});
}
