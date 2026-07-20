import {
	AIDecisionMemoryPatch,
	AIDecisionRequest,
	AIStrategyMemoryEntry,
	AIStrategyState,
} from "@mine-monopoly/types";

type AIDecisionFeedback = {
	playerId: string;
	request: AIDecisionRequest;
	selectedOptionLabel?: string;
	selectedSourceSystem?: string;
	selectedIntent?: string;
	outcome?: string;
	memoryPatches?: AIDecisionMemoryPatch[];
	decisionId?: string;
};

type StructuredMemory = NonNullable<AIStrategyState["memory"]>;
type MemoryStat = NonNullable<NonNullable<StructuredMemory["match"]>["actionStats"]>[number];
type ContextPlayer = AIDecisionRequest["context"]["players"][number];
type ContextProperty = AIDecisionRequest["context"]["properties"][number];
type ContextMapItem = AIDecisionRequest["context"]["mapItems"][number];
type ContextMapEvent = AIDecisionRequest["context"]["mapEvents"][number];

const MEMORY_VERSION = 3;
const RECENT_EXPERIENCE_LIMIT = 4;
const SHORT_TERM_HINT_LIMIT = 3;
const SHORT_TERM_MEMORY_PATCH_LIMIT = 4;
const MATCH_STAT_LIMIT = 6;
const CANDIDATE_LONG_TERM_LIMIT = 8;
const PROMOTED_LONG_TERM_LIMIT = 8;
const TURN_MEMORY_TTL_LIMIT = 4;
const LONG_TERM_PROMOTION_MIN_HITS = 2;
const LONG_TERM_PROMOTION_CONFIDENCE = 0.65;

function clamp(value: number, min: number, max: number): number {
	return Math.min(max, Math.max(min, value));
}

function normalizeText(value: string | undefined): string | undefined {
	if (!value) return undefined;
	const normalized = value.replace(/\s+/g, " ").trim();
	return normalized || undefined;
}

function uniqueTail(values: Array<string | undefined>, limit: number): string[] {
	const normalized = values.map((value) => normalizeText(value)).filter((value): value is string => Boolean(value));
	const deduped: string[] = [];
	for (let index = normalized.length - 1; index >= 0; index--) {
		if (!deduped.includes(normalized[index])) {
			deduped.unshift(normalized[index]);
		}
	}
	return deduped.slice(-limit);
}

function appendTail(values: string[] | undefined, value: string | undefined, limit: number): string[] | undefined {
	const next = uniqueTail([...(values || []), value], limit);
	return next.length > 0 ? next : undefined;
}

function normalizeKeyLike(value: string): string {
	return value
		.toLowerCase()
		.replace(/\s+/g, "_")
		.replace(/[^\p{L}\p{N}_:-]/gu, "")
		.slice(0, 80);
}

function clampOptionalConfidence(value: unknown): number | undefined {
	return typeof value === "number" && Number.isFinite(value) ? clamp(value, 0, 1) : undefined;
}

function normalizeMemoryPatchScope(value: unknown): "turn" | "match" | "map" | undefined {
	return value === "turn" || value === "match" || value === "map" ? value : undefined;
}

function normalizeMemoryPatchKind(value: unknown):
	| "systemPreference"
	| "riskRule"
	| "timingHeuristic"
	| "targetingBias"
	| "plan"
	| "experienceNote"
	| undefined {
	return value === "systemPreference" ||
		value === "riskRule" ||
		value === "timingHeuristic" ||
		value === "targetingBias" ||
		value === "plan" ||
		value === "experienceNote"
		? value
		: undefined;
}

function normalizeMemoryPatch(patch: AIDecisionMemoryPatch | undefined): AIDecisionMemoryPatch | undefined {
	if (!patch) return undefined;
	const scope = normalizeMemoryPatchScope(patch.scope);
	const kind = normalizeMemoryPatchKind(patch.kind);
	const summary = normalizeText(patch.summary)?.slice(0, 120);
	if (!scope || !kind || !summary) {
		return undefined;
	}
	const key = normalizeText(patch.key);
	const evidence = normalizeText(patch.evidence)?.slice(0, 120);
	const tags = Array.isArray(patch.tags)
		? Array.from(
				new Set(
					patch.tags
						.map((item) => normalizeText(typeof item === "string" ? item : undefined))
						.filter((item): item is string => Boolean(item)),
				),
			).slice(0, 4)
		: undefined;
	const ttlTurns =
		scope === "turn"
			? clamp(
					typeof patch.ttlTurns === "number" && Number.isFinite(patch.ttlTurns) ? Math.round(patch.ttlTurns) : 1,
					1,
					TURN_MEMORY_TTL_LIMIT,
				)
			: undefined;
	return {
		scope,
		kind,
		key,
		summary,
		confidence: clampOptionalConfidence(patch.confidence),
		evidence,
		tags,
		ttlTurns,
		promoteCandidate: Boolean(patch.promoteCandidate),
	};
}

function buildMemoryEntryKey(patch: AIDecisionMemoryPatch): string {
	return normalizeKeyLike(patch.key || `${patch.scope}::${patch.kind}::${patch.summary}`);
}

function upsertMemoryEntry(
	entries: AIStrategyMemoryEntry[] | undefined,
	patch: AIDecisionMemoryPatch,
	round: number,
	decisionId: string | undefined,
): AIStrategyMemoryEntry[] {
	const next = [...(entries || [])];
	const entryKey = buildMemoryEntryKey(patch);
	const index = next.findIndex((item) => item.key === entryKey);
	const current = index >= 0 ? next[index] : undefined;
	const previousHits = current?.hitCount || 0;
	const nextHits = previousHits + 1;
	const confidence =
		typeof patch.confidence === "number"
			? current?.confidence === undefined
				? patch.confidence
				: clamp((current.confidence * previousHits + patch.confidence) / nextHits, 0, 1)
			: current?.confidence;
	const mergedTags = Array.from(
		new Set([...(current?.tags || []), ...(patch.tags || [])].map((item) => normalizeText(item)).filter(Boolean)),
	).slice(0, 4) as string[];
	const nextEntry: AIStrategyMemoryEntry = {
		id: current?.id || `${patch.scope}:${patch.kind}:${entryKey}`,
		key: entryKey,
		scope: patch.scope,
		kind: patch.kind,
		summary: patch.summary,
		confidence,
		evidence: patch.evidence || current?.evidence,
		tags: mergedTags.length > 0 ? mergedTags : undefined,
		createdAtRound: current?.createdAtRound || round,
		lastUpdatedRound: round,
		expiresAtRound: patch.scope === "turn" ? round + (patch.ttlTurns || 1) - 1 : current?.expiresAtRound,
		sourceDecisionId: decisionId || current?.sourceDecisionId,
		hitCount: nextHits,
		promotedAtRound: current?.promotedAtRound,
	};
	if (index >= 0) {
		next[index] = nextEntry;
	} else {
		next.push(nextEntry);
	}
	next.sort((left, right) => {
		if ((right.lastUpdatedRound || 0) !== (left.lastUpdatedRound || 0)) {
			return (right.lastUpdatedRound || 0) - (left.lastUpdatedRound || 0);
		}
		return (right.hitCount || 0) - (left.hitCount || 0);
	});
	return next;
}

function pruneExpiredEntries(entries: AIStrategyMemoryEntry[] | undefined, round: number): AIStrategyMemoryEntry[] | undefined {
	const next = (entries || []).filter((entry) => entry.expiresAtRound === undefined || entry.expiresAtRound >= round);
	return next.length > 0 ? next : undefined;
}

function shouldPromoteLongTermEntry(entry: AIStrategyMemoryEntry): boolean {
	if (entry.scope === "turn" || entry.kind === "plan") {
		return false;
	}
	return (entry.hitCount || 0) >= LONG_TERM_PROMOTION_MIN_HITS && (entry.confidence || 0) >= LONG_TERM_PROMOTION_CONFIDENCE;
}

function buildPromotedLongTermEntries(
	candidateEntries: AIStrategyMemoryEntry[] | undefined,
	currentPromotedEntries: AIStrategyMemoryEntry[] | undefined,
	round: number,
): AIStrategyMemoryEntry[] | undefined {
	const promoted = [...(currentPromotedEntries || [])];
	for (const candidate of candidateEntries || []) {
		if (!shouldPromoteLongTermEntry(candidate)) {
			continue;
		}
		const index = promoted.findIndex((item) => item.key === candidate.key);
		const nextEntry: AIStrategyMemoryEntry = {
			...candidate,
			expiresAtRound: undefined,
			promotedAtRound: candidate.promotedAtRound || round,
		};
		if (index >= 0) {
			promoted[index] = {
				...promoted[index],
				...nextEntry,
				createdAtRound: promoted[index].createdAtRound || nextEntry.createdAtRound,
			};
		} else {
			promoted.push(nextEntry);
		}
	}
	promoted.sort((left, right) => {
		if ((right.promotedAtRound || 0) !== (left.promotedAtRound || 0)) {
			return (right.promotedAtRound || 0) - (left.promotedAtRound || 0);
		}
		return (right.hitCount || 0) - (left.hitCount || 0);
	});
	return promoted.slice(0, PROMOTED_LONG_TERM_LIMIT);
}

function pruneStructuredMemory(memory: StructuredMemory | undefined, round: number): StructuredMemory | undefined {
	if (!memory) return undefined;
	return {
		...memory,
		shortTerm: memory.shortTerm
			? {
					...memory.shortTerm,
					memoryPatches: pruneExpiredEntries(memory.shortTerm.memoryPatches, round),
				}
			: undefined,
		candidateLongTerm: memory.candidateLongTerm
			? {
					...memory.candidateLongTerm,
					entries: memory.candidateLongTerm.entries?.slice(0, CANDIDATE_LONG_TERM_LIMIT),
				}
			: undefined,
		promotedLongTerm: memory.promotedLongTerm
			? {
					...memory.promotedLongTerm,
					entries: memory.promotedLongTerm.entries?.slice(0, PROMOTED_LONG_TERM_LIMIT),
				}
			: undefined,
	};
}

function buildFeedbackDecisionSummary(feedback: AIDecisionFeedback): string {
	return `${feedback.request.title}:${feedback.selectedOptionLabel || "skip"}:${feedback.outcome || "done"}`;
}

function buildActionStatIdentity(feedback: AIDecisionFeedback): { key?: string; label?: string } {
	const action = normalizeText(feedback.selectedOptionLabel);
	const intent = normalizeText(feedback.selectedIntent);
	const title = normalizeText(feedback.request.title);
	const system = normalizeText(feedback.selectedSourceSystem);
	const identity = intent || action || title;
	if (!identity) return {};
	return {
		key: `${system || "generic"}::${identity}`.toLowerCase(),
		label: system ? `${system} / ${action || intent || title}` : (action || intent || title),
	};
}

function buildSystemStatIdentity(feedback: AIDecisionFeedback): { key?: string; label?: string } {
	const system = normalizeText(feedback.selectedSourceSystem);
	if (!system) return {};
	return {
		key: system.toLowerCase(),
		label: system,
	};
}

function updateMemoryStats(
	stats: MemoryStat[] | undefined,
	identity: { key?: string; label?: string; sourceSystem?: string },
	outcomeKind: ReturnType<typeof classifyOutcome>,
	round: number,
): MemoryStat[] | undefined {
	if (!identity.key) {
		return stats;
	}
	const next = [...(stats || [])];
	const existingIndex = next.findIndex((item) => item.key === identity.key);
	const current = existingIndex >= 0 ? next[existingIndex] : { key: identity.key };
	const updated: MemoryStat = {
		...current,
		key: identity.key,
		label: identity.label || current.label,
		sourceSystem: identity.sourceSystem || current.sourceSystem,
		successCount: current.successCount || 0,
		failureCount: current.failureCount || 0,
		neutralCount: current.neutralCount || 0,
		lastOutcome: outcomeKind,
		lastRound: round,
	};
	if (outcomeKind === "success") {
		updated.successCount = (updated.successCount || 0) + 1;
	} else if (outcomeKind === "failure") {
		updated.failureCount = (updated.failureCount || 0) + 1;
	} else {
		updated.neutralCount = (updated.neutralCount || 0) + 1;
	}
	if (existingIndex >= 0) {
		next[existingIndex] = updated;
	} else {
		next.push(updated);
	}
	next.sort((left, right) => {
		if ((right.lastRound || 0) !== (left.lastRound || 0)) {
			return (right.lastRound || 0) - (left.lastRound || 0);
		}
		const leftScore = (left.successCount || 0) - (left.failureCount || 0);
		const rightScore = (right.successCount || 0) - (right.failureCount || 0);
		return rightScore - leftScore;
	});
	return next.slice(0, MATCH_STAT_LIMIT);
}

function getStatNetScore(stat: MemoryStat): number {
	return (stat.successCount || 0) - (stat.failureCount || 0);
}

function buildBlockedActionHint(feedback: AIDecisionFeedback): string | undefined {
	const title = normalizeText(feedback.request.title) || "当前操作";
	if (feedback.outcome === "chance-card-no-target") {
		return `${title}：当前条件下没有合适目标`;
	}
	if (feedback.outcome?.includes("no-target")) {
		return `${title}：暂时没有合适目标`;
	}
	if (feedback.outcome === "finish-pre-roll") {
		return `${title}：准备阶段没有高价值动作`;
	}
	return undefined;
}

function buildImmediateFocus(
	currentShortTerm: StructuredMemory["shortTerm"] | undefined,
	feedback: AIDecisionFeedback,
	outcomeKind: ReturnType<typeof classifyOutcome>,
): string[] | undefined {
	const focus = uniqueTail(
		[
			outcomeKind === "success" && feedback.selectedSourceSystem ? `${feedback.selectedSourceSystem} 系统刚刚奏效` : undefined,
			outcomeKind === "failure" && feedback.selectedSourceSystem ? `${feedback.selectedSourceSystem} 系统刚刚受挫` : undefined,
			buildBlockedActionHint(feedback),
			...(currentShortTerm?.immediateFocus || []),
		],
		SHORT_TERM_HINT_LIMIT,
	);
	return focus.length > 0 ? focus : undefined;
}

function buildMatchSystemBiases(
	stats: MemoryStat[] | undefined,
	mode: "effective" | "risky",
): string[] | undefined {
	if (!stats?.length) return undefined;
	const labels = stats
		.filter((stat) => {
			const score = getStatNetScore(stat);
			return mode === "effective" ? score > 0 : score < 0;
		})
		.sort((left, right) => {
			const leftScore = Math.abs(getStatNetScore(left));
			const rightScore = Math.abs(getStatNetScore(right));
			if (rightScore !== leftScore) {
				return rightScore - leftScore;
			}
			return (right.lastRound || 0) - (left.lastRound || 0);
		})
		.slice(0, 3)
		.map((stat) => normalizeText(stat.label || stat.sourceSystem || stat.key))
		.filter((item): item is string => Boolean(item));
	return labels.length > 0 ? labels : undefined;
}

function buildMatchLessons(
	matchMemory: StructuredMemory["match"] | undefined,
	experienceMemory: StructuredMemory["experience"] | undefined,
): string[] | undefined {
	const bestSystem = matchMemory?.systemStats
		?.filter((stat) => getStatNetScore(stat) > 0)
		.sort((left, right) => getStatNetScore(right) - getStatNetScore(left))[0];
	const riskySystem = matchMemory?.systemStats
		?.filter((stat) => getStatNetScore(stat) < 0)
		.sort((left, right) => getStatNetScore(left) - getStatNetScore(right))[0];
	const failureAction = matchMemory?.actionStats
		?.filter((stat) => (stat.failureCount || 0) >= 2 && getStatNetScore(stat) <= 0)
		.sort((left, right) => (right.failureCount || 0) - (left.failureCount || 0))[0];
	const lessons = uniqueTail(
		[
			bestSystem ? `本局内 ${bestSystem.label || bestSystem.key} 系统反馈更稳定` : undefined,
			riskySystem ? `本局内 ${riskySystem.label || riskySystem.key} 系统风险偏高` : undefined,
			failureAction ? `${failureAction.label || failureAction.key} 已多次吃亏，避免强行重复` : undefined,
			...(experienceMemory?.compressedLessons || []),
		],
		4,
	);
	return lessons.length > 0 ? lessons : undefined;
}

function getLeadingOpponent(request: AIDecisionRequest) {
	return request.context.players
		.filter((player) => player.id !== request.playerId && !player.isBankrupted)
		.sort((left, right) => {
			if (right.money !== left.money) {
				return right.money - left.money;
			}
			return right.properties.length - left.properties.length;
		})[0];
}

function getCurrentRent(property: ContextProperty): number {
	if (!property.costList.length) return 0;
	const rentIndex = Math.min(Math.max(property.level, 0), property.costList.length - 1);
	return property.costList[rentIndex] || 0;
}

function formatBoardPosition(index: number): string {
	return `第${index + 1}格`;
}

function buildMapItemById(request: AIDecisionRequest): Map<string, ContextMapItem> {
	return new Map(request.context.mapItems.map((item) => [item.id, item]));
}

function buildMapEventById(request: AIDecisionRequest): Map<string, ContextMapEvent> {
	return new Map(request.context.mapEvents.map((item) => [item.id, item]));
}

function sortPropertiesByDanger(properties: ContextProperty[] | undefined): ContextProperty[] {
	return [...(properties || [])]
		.sort((left, right) => {
			const rentGap = getCurrentRent(right) - getCurrentRent(left);
			if (rentGap !== 0) return rentGap;
			if (right.level !== left.level) return right.level - left.level;
			return right.sellCost - left.sellCost;
		})
		.slice(0, 3);
}

function buildSpendMode(
	posture: AIStrategyState["posture"],
	playerMoney: number,
	reserveCashTarget: number,
): NonNullable<StructuredMemory["economy"]>["spendMode"] {
	if (posture === "desperate" || playerMoney < reserveCashTarget) {
		return "hold_cash";
	}
	if ((posture === "expand" || posture === "speculative") && playerMoney > reserveCashTarget * 1.5) {
		return "invest";
	}
	return "balanced";
}

function buildRiskTolerance(
	posture: AIStrategyState["posture"],
): NonNullable<StructuredMemory["economy"]>["riskTolerance"] {
	if (posture === "desperate" || posture === "conservative") {
		return "low";
	}
	if (posture === "speculative") {
		return "high";
	}
	return "medium";
}

function buildWarningFlags(player: ContextPlayer, reserveCashTarget: number): string[] | undefined {
	const flags = uniqueTail(
		[
			player.money < reserveCashTarget ? "现金低于安全线" : undefined,
			player.stop > 0 ? `仍需暂停 ${player.stop} 回合` : undefined,
			player.money < 1500 && player.properties.length === 0 ? "资产薄弱，避免高成本投入" : undefined,
		],
		3,
	);
	return flags.length > 0 ? flags : undefined;
}

function buildThreatReasons(player: ContextPlayer, leadingOpponent: ContextPlayer | undefined): string[] | undefined {
	if (!leadingOpponent) return undefined;
	const reasons = uniqueTail(
		[
			leadingOpponent.money - player.money >= 2000 ? "资金明显领先" : undefined,
			leadingOpponent.properties.length - player.properties.length >= 2 ? "地产数量领先" : undefined,
			sortPropertiesByDanger(leadingOpponent.properties).some((property) => getCurrentRent(property) >= 1200)
				? "持有高租金地段"
				: undefined,
		],
		3,
	);
	return reasons.length > 0 ? reasons : undefined;
}

function buildAvoidedSystems(
	posture: AIStrategyState["posture"],
	playerMoney: number,
	reserveCashTarget: number,
	hasStockSystem: boolean,
): string[] | undefined {
	const avoided = uniqueTail(
		[
			hasStockSystem && (posture === "desperate" || posture === "conservative") ? "stock" : undefined,
			playerMoney < reserveCashTarget ? "high-cost-property" : undefined,
		],
		3,
	);
	return avoided.length > 0 ? avoided : undefined;
}

function buildCurrentGoal(
	posture: AIStrategyState["posture"],
	playerMoney: number,
	reserveCashTarget: number,
	hasStockSystem: boolean,
): string {
	if (playerMoney < reserveCashTarget) {
		return "先稳住现金，不做高风险投入";
	}
	if (posture === "expand") {
		return "趁资金充足争夺高价值地产";
	}
	if (posture === "speculative" && hasStockSystem) {
		return "在保留安全现金的前提下寻找高回报操作";
	}
	if (posture === "conservative") {
		return "优先保守经营，避免被连收租击穿";
	}
	return "保持平衡，优先选择性价比更高的动作";
}

function buildNextTurnPlan(
	posture: AIStrategyState["posture"],
	playerMoney: number,
	reserveCashTarget: number,
	hasStockSystem: boolean,
	leadingOpponent: ContextPlayer | undefined,
): string[] | undefined {
	const plan = uniqueTail(
		[
			playerMoney < reserveCashTarget ? "低价值操作可以直接跳过" : undefined,
			posture === "expand" ? "遇到高性价比地产可优先出手" : undefined,
			posture === "speculative" && hasStockSystem ? "留意高回报系统机会" : undefined,
			leadingOpponent ? "关注领先玩家的高收益地段" : undefined,
		],
		3,
	);
	return plan.length > 0 ? plan : undefined;
}

function buildHoldConditions(playerMoney: number, reserveCashTarget: number): string[] | undefined {
	const conditions = uniqueTail(
		[
			playerMoney < reserveCashTarget ? "未回到现金安全线前，不追加高成本投资" : undefined,
			playerMoney < reserveCashTarget * 1.4 ? "除非回报很明确，否则不连续出手" : undefined,
		],
		2,
	);
	return conditions.length > 0 ? conditions : undefined;
}

function buildPropertyPlan(
	posture: AIStrategyState["posture"],
	playerMoney: number,
	reserveCashTarget: number,
	focusPropertyIds: string[] | undefined,
	dangerousPropertyIds: string[] | undefined,
): StructuredMemory["propertyPlan"] | undefined {
	const expansionReason =
		posture === "expand"
			? "资金较充足，可优先争夺高价值地产"
			: posture === "conservative" || playerMoney < reserveCashTarget
				? "以规避危险地产和保留现金为主"
				: posture === "speculative"
					? "地产不是唯一目标，只在收益明显时出手"
					: "地产扩张和现金安全并行评估";
	const avoidPropertyIds =
		playerMoney < reserveCashTarget ? dangerousPropertyIds?.slice(0, 3) : undefined;
	if (!focusPropertyIds?.length && !avoidPropertyIds?.length) {
		return { expansionReason };
	}
	return {
		focusPropertyIds: focusPropertyIds?.slice(0, 3),
		avoidPropertyIds,
		expansionReason,
	};
}

function buildMapUnderstanding(request: AIDecisionRequest): StructuredMemory["mapUnderstanding"] | undefined {
	const mapItemById = buildMapItemById(request);
	const mapEventById = buildMapEventById(request);
	const boardEntries = request.context.mapIndex
		.map((itemId, index) => {
			const item = mapItemById.get(itemId);
			if (!item) return undefined;
			return { item, index };
		})
		.filter((item): item is { item: ContextMapItem; index: number } => Boolean(item));

	const keyZones = boardEntries
		.filter(({ item }) => item.property)
		.sort((left, right) => getCurrentRent(right.item.property!) - getCurrentRent(left.item.property!))
		.slice(0, 3)
		.map(({ item, index }) => `${formatBoardPosition(index)} ${item.property!.name}（过路费 ${getCurrentRent(item.property!)}）`);

	const specialTileNotes = boardEntries
		.filter(({ item }) => item.mapEventId)
		.slice(0, 3)
		.map(({ item, index }) => {
			const event = item.mapEventId ? mapEventById.get(item.mapEventId) : undefined;
			return event ? `${formatBoardPosition(index)} ${event.name}${event.description ? `：${event.description}` : ""}` : undefined;
		})
		.filter((item): item is string => Boolean(item));

	const totalTiles = request.context.mapIndex.length;
	const routeNotes = totalTiles
		? Array.from({ length: Math.min(4, totalTiles - 1) }, (_, offset) => {
			const step = offset + 1;
			const boardIndex = (request.context.player.positionIndex + step) % totalTiles;
			const itemId = request.context.mapIndex[boardIndex];
			const item = itemId ? mapItemById.get(itemId) : undefined;
			if (!item) return undefined;
			if (item.property) {
				return `${step} 步后是 ${item.property.name}`;
			}
			if (item.mapEventId) {
				const event = mapEventById.get(item.mapEventId);
				return event ? `${step} 步后是事件格 ${event.name}` : undefined;
			}
			return undefined;
		}).filter((item): item is string => Boolean(item))
		: [];

	if (keyZones.length === 0 && specialTileNotes.length === 0 && routeNotes.length === 0) {
		return undefined;
	}

	return {
		keyZones: keyZones.length > 0 ? keyZones : undefined,
		specialTileNotes: specialTileNotes.length > 0 ? specialTileNotes : undefined,
		routeNotes: routeNotes.length > 0 ? routeNotes : undefined,
	};
}

function classifyOutcome(outcome: string | undefined): "success" | "failure" | "neutral" {
	if (!outcome) return "neutral";
	if (outcome.includes("no-target")) return "failure";
	if (outcome.includes("finish") || outcome.includes("cancel") || outcome.includes("skip")) return "neutral";
	return "success";
}

function buildExperienceNote(feedback: AIDecisionFeedback): string | undefined {
	const title = normalizeText(feedback.request.title) || "当前操作";
	switch (feedback.outcome) {
		case "chance-card-no-target":
			return `${title}：没有合适目标，直接跳过`;
		case "finish-pre-roll":
			return `${title}：准备阶段没有高价值动作，直接结束`;
		default: {
			const action = normalizeText(feedback.selectedOptionLabel);
			const system = normalizeText(feedback.selectedSourceSystem);
			if (action && system) {
				return `${title}：选择 ${action}（${system}）`;
			}
			if (action) {
				return `${title}：选择 ${action}`;
			}
			return feedback.outcome ? `${title}：${feedback.outcome}` : undefined;
		}
	}
}

function buildCompressedLessons(
	posture: AIStrategyState["posture"],
	playerMoney: number,
	reserveCashTarget: number,
	memory: StructuredMemory | undefined,
): string[] | undefined {
	const lessons = uniqueTail(
		[
			playerMoney < reserveCashTarget ? "低于现金安全线时，优先保留现金" : undefined,
			memory?.experience?.recentFailures?.some((item) => item.includes("没有合适目标"))
				? "没有合适目标时不要强行动作"
				: undefined,
			memory?.systemPlan?.lastEffectiveSystem ? `近期更偏向 ${memory.systemPlan.lastEffectiveSystem} 系统` : undefined,
			memory?.promotedLongTerm?.entries?.[0]?.summary,
			posture === "expand" ? "资金充足时可主动争夺高价值地产" : undefined,
			posture === "conservative" ? "保守阶段尽量减少连续高成本投入" : undefined,
		],
		3,
	);
	return lessons.length > 0 ? lessons : undefined;
}

function pruneStateForNoRecentMemory(state: AIStrategyState): AIStrategyState {
	return {
		posture: state.posture,
		focusPlayerId: state.focusPlayerId,
		focusPropertyIds: state.focusPropertyIds,
		preferredSystems: state.preferredSystems,
		reserveCashTarget: state.reserveCashTarget,
		recentDecisionSummaries: undefined,
		lastDecisionAtRound: state.lastDecisionAtRound,
		memory: state.memory
			? {
				...state.memory,
				shortTerm: undefined,
				experience: undefined,
			}
			: undefined,
	};
}

export class StrategyStateManager {
	private readonly stateByPlayer = new Map<string, AIStrategyState>();
	private recentDecisionLimit = 6;

	getState(playerId: string): AIStrategyState | undefined {
		return this.stateByPlayer.get(playerId);
	}

	getAllStates(): Record<string, AIStrategyState> {
		return Object.fromEntries(this.stateByPlayer.entries());
	}

	clearState(playerId?: string): void {
		if (playerId) {
			this.stateByPlayer.delete(playerId);
			return;
		}
		this.stateByPlayer.clear();
	}

	setRecentDecisionLimit(limit: number): void {
		this.recentDecisionLimit = Math.max(0, Math.floor(limit));
		if (this.recentDecisionLimit === 0) {
			for (const [playerId, state] of this.stateByPlayer.entries()) {
				this.stateByPlayer.set(playerId, pruneStateForNoRecentMemory(state));
			}
			return;
		}

		for (const [playerId, state] of this.stateByPlayer.entries()) {
			const experience = state.memory?.experience;
			const shortTerm = state.memory?.shortTerm;
			this.stateByPlayer.set(playerId, {
				...state,
				recentDecisionSummaries: state.recentDecisionSummaries?.slice(-this.recentDecisionLimit),
				memory: state.memory
					? {
						...state.memory,
						shortTerm: shortTerm
							? {
								...shortTerm,
								recentDecisions: shortTerm.recentDecisions?.slice(-this.recentDecisionLimit),
								recentFailures: shortTerm.recentFailures?.slice(-Math.min(this.recentDecisionLimit, RECENT_EXPERIENCE_LIMIT)),
								blockedActionHints: shortTerm.blockedActionHints?.slice(-SHORT_TERM_HINT_LIMIT),
								immediateFocus: shortTerm.immediateFocus?.slice(-SHORT_TERM_HINT_LIMIT),
							}
							: undefined,
						experience: experience
							? {
								...experience,
								recentSuccesses: experience.recentSuccesses?.slice(-Math.min(this.recentDecisionLimit, RECENT_EXPERIENCE_LIMIT)),
								recentFailures: experience.recentFailures?.slice(-Math.min(this.recentDecisionLimit, RECENT_EXPERIENCE_LIMIT)),
								compressedLessons: experience.compressedLessons?.slice(-3),
							}
							: undefined,
					}
					: undefined,
			});
		}
	}

	derive(request: AIDecisionRequest): AIStrategyState {
		const current = this.stateByPlayer.get(request.playerId) || {};
		const currentMemory = pruneStructuredMemory(current.memory, request.context.currentRound);
		const player = request.context.player;
		const leadingOpponent = getLeadingOpponent(request);
		const hasStockSystem = !!request.context.systems?.stockMarket;
		const reserveCashTarget = clamp(Math.round(player.money * 0.2), 1500, 6000);

		let posture: AIStrategyState["posture"] = "balanced";
		if (player.money < 1200) {
			posture = "desperate";
		} else if (player.money < 3500) {
			posture = "conservative";
		} else if (hasStockSystem && player.money > 7000 && player.properties.length <= 1) {
			posture = "speculative";
		} else if (player.money > 9000) {
			posture = "expand";
		}

		const preferredSystems = Array.from(
			new Set([
				...(current.preferredSystems || []),
				...(posture === "speculative" ? ["stock"] : []),
				...(posture === "expand" ? ["property"] : []),
			]),
		);

		const dangerousPropertyIds = sortPropertiesByDanger(leadingOpponent?.properties).map((property) => property.id);
		const focusPropertyIds =
			dangerousPropertyIds.length > 0 ? dangerousPropertyIds : current.focusPropertyIds;
		const matchMemory = currentMemory?.match
			? {
				...currentMemory.match,
				effectiveSystems: buildMatchSystemBiases(currentMemory.match.systemStats, "effective"),
				riskySystems: buildMatchSystemBiases(currentMemory.match.systemStats, "risky"),
				notableLessons: buildMatchLessons(currentMemory.match, currentMemory?.experience),
			}
			: undefined;
		const nextMemory: StructuredMemory = {
			version: MEMORY_VERSION,
			economy: {
				reserveCashTarget,
				spendMode: buildSpendMode(posture, player.money, reserveCashTarget),
				riskTolerance: buildRiskTolerance(posture),
				warningFlags: buildWarningFlags(player, reserveCashTarget),
			},
			threatModel: leadingOpponent
				? {
					focusPlayerId: leadingOpponent.id,
					threatReasons: buildThreatReasons(player, leadingOpponent),
					dangerousPropertyIds,
				}
				: undefined,
			propertyPlan: buildPropertyPlan(
				posture,
				player.money,
				reserveCashTarget,
				focusPropertyIds,
				dangerousPropertyIds,
			),
			systemPlan: {
				preferredSystems,
				avoidedSystems: buildAvoidedSystems(posture, player.money, reserveCashTarget, hasStockSystem),
				lastEffectiveSystem: current.memory?.systemPlan?.lastEffectiveSystem,
			},
			mapUnderstanding: buildMapUnderstanding(request),
			shortTermIntent: {
				currentGoal: buildCurrentGoal(posture, player.money, reserveCashTarget, hasStockSystem),
				nextTurnPlan: buildNextTurnPlan(posture, player.money, reserveCashTarget, hasStockSystem, leadingOpponent),
				holdConditions: buildHoldConditions(player.money, reserveCashTarget),
			},
			shortTerm: this.recentDecisionLimit > 0
				? {
					recentDecisions: current.recentDecisionSummaries?.slice(-this.recentDecisionLimit),
					recentFailures: currentMemory?.shortTerm?.recentFailures?.slice(-Math.min(this.recentDecisionLimit, RECENT_EXPERIENCE_LIMIT)),
					blockedActionHints: currentMemory?.shortTerm?.blockedActionHints?.slice(-SHORT_TERM_HINT_LIMIT),
					immediateFocus: currentMemory?.shortTerm?.immediateFocus?.slice(-SHORT_TERM_HINT_LIMIT),
					lastChosenSystem: currentMemory?.shortTerm?.lastChosenSystem,
					lastOutcome: currentMemory?.shortTerm?.lastOutcome,
					memoryPatches: currentMemory?.shortTerm?.memoryPatches?.slice(-SHORT_TERM_MEMORY_PATCH_LIMIT),
				}
				: undefined,
			match: matchMemory,
			experience: currentMemory?.experience,
			candidateLongTerm: currentMemory?.candidateLongTerm,
			promotedLongTerm: currentMemory?.promotedLongTerm,
		};
		nextMemory.experience = nextMemory.experience
			? {
				...nextMemory.experience,
				compressedLessons: buildCompressedLessons(posture, player.money, reserveCashTarget, nextMemory),
			}
			: {
				compressedLessons: buildCompressedLessons(posture, player.money, reserveCashTarget, nextMemory),
			};

		const nextState: AIStrategyState = {
			...current,
			posture,
			reserveCashTarget,
			focusPlayerId: leadingOpponent?.id,
			focusPropertyIds,
			preferredSystems,
			lastDecisionAtRound: request.context.currentRound,
			memory: nextMemory,
		};
		this.stateByPlayer.set(request.playerId, nextState);
		return nextState;
	}

	feedback(feedback: AIDecisionFeedback): void {
		const current = this.stateByPlayer.get(feedback.playerId) || {};
		const decisionSummary = buildFeedbackDecisionSummary(feedback);
		const recentDecisionSummaries = this.recentDecisionLimit > 0
			? [
				...(current.recentDecisionSummaries || []),
				decisionSummary,
			].slice(-this.recentDecisionLimit)
			: undefined;
		const preferredSystems = Array.from(
			new Set([
				...(current.preferredSystems || []),
				...(feedback.selectedSourceSystem ? [feedback.selectedSourceSystem] : []),
			]),
		);

		const currentMemory: StructuredMemory = pruneStructuredMemory(current.memory, feedback.request.context.currentRound) || {
			version: MEMORY_VERSION,
		};
		const experienceNote = buildExperienceNote(feedback);
		const outcomeKind = classifyOutcome(feedback.outcome);
		const recentSuccesses = this.recentDecisionLimit > 0 && outcomeKind === "success"
			? appendTail(currentMemory.experience?.recentSuccesses, experienceNote, RECENT_EXPERIENCE_LIMIT)
			: currentMemory.experience?.recentSuccesses;
		const recentFailures = this.recentDecisionLimit > 0 && outcomeKind === "failure"
			? appendTail(currentMemory.experience?.recentFailures, experienceNote, RECENT_EXPERIENCE_LIMIT)
			: currentMemory.experience?.recentFailures;
		const systemPlan = {
			...(currentMemory.systemPlan || {}),
			preferredSystems,
			lastEffectiveSystem:
				outcomeKind === "success" && feedback.selectedSourceSystem
					? feedback.selectedSourceSystem
					: currentMemory.systemPlan?.lastEffectiveSystem,
		};
		const nextMatch: StructuredMemory["match"] = {
			...(currentMemory.match || {}),
			systemStats: updateMemoryStats(
				currentMemory.match?.systemStats,
				{
					...buildSystemStatIdentity(feedback),
					sourceSystem: feedback.selectedSourceSystem,
				},
				outcomeKind,
				feedback.request.context.currentRound,
			),
			actionStats: updateMemoryStats(
				currentMemory.match?.actionStats,
				{
					...buildActionStatIdentity(feedback),
					sourceSystem: feedback.selectedSourceSystem,
				},
				outcomeKind,
				feedback.request.context.currentRound,
			),
		};
		nextMatch.effectiveSystems = buildMatchSystemBiases(nextMatch.systemStats, "effective");
		nextMatch.riskySystems = buildMatchSystemBiases(nextMatch.systemStats, "risky");
		const nextMemory: StructuredMemory = {
			...currentMemory,
			version: MEMORY_VERSION,
			systemPlan,
			shortTerm: this.recentDecisionLimit > 0
				? {
					recentDecisions: recentDecisionSummaries,
					recentFailures,
					blockedActionHints: appendTail(
						currentMemory.shortTerm?.blockedActionHints,
						buildBlockedActionHint(feedback),
						SHORT_TERM_HINT_LIMIT,
					),
					immediateFocus: buildImmediateFocus(currentMemory.shortTerm, feedback, outcomeKind),
					lastChosenSystem: feedback.selectedSourceSystem || currentMemory.shortTerm?.lastChosenSystem,
					lastOutcome: feedback.outcome || currentMemory.shortTerm?.lastOutcome,
					memoryPatches: currentMemory.shortTerm?.memoryPatches,
				}
				: undefined,
			match: nextMatch,
			experience: this.recentDecisionLimit > 0
				? {
					recentSuccesses,
					recentFailures,
					compressedLessons: currentMemory.experience?.compressedLessons,
				}
				: currentMemory.experience,
			candidateLongTerm: currentMemory.candidateLongTerm,
			promotedLongTerm: currentMemory.promotedLongTerm,
		};
		const normalizedMemoryPatches = (feedback.memoryPatches || [])
			.map((patch) => normalizeMemoryPatch(patch))
			.filter((patch): patch is AIDecisionMemoryPatch => Boolean(patch));
		for (const patch of normalizedMemoryPatches) {
			if (patch.scope === "turn") {
				nextMemory.shortTerm = nextMemory.shortTerm || {};
				nextMemory.shortTerm.memoryPatches = upsertMemoryEntry(
					nextMemory.shortTerm.memoryPatches,
					patch,
					feedback.request.context.currentRound,
					feedback.decisionId,
				).slice(0, SHORT_TERM_MEMORY_PATCH_LIMIT);
				continue;
			}
			nextMemory.candidateLongTerm = nextMemory.candidateLongTerm || {};
			nextMemory.candidateLongTerm.entries = upsertMemoryEntry(
				nextMemory.candidateLongTerm.entries,
				patch,
				feedback.request.context.currentRound,
				feedback.decisionId,
			).slice(0, CANDIDATE_LONG_TERM_LIMIT);
		}
		nextMemory.promotedLongTerm = {
			entries: buildPromotedLongTermEntries(
				nextMemory.candidateLongTerm?.entries,
				nextMemory.promotedLongTerm?.entries,
				feedback.request.context.currentRound,
			),
		};
		if (nextMemory.experience) {
			nextMemory.experience = {
				...nextMemory.experience,
				compressedLessons: buildCompressedLessons(
					current.posture,
					feedback.request.context.player.money,
					current.reserveCashTarget || clamp(Math.round(feedback.request.context.player.money * 0.2), 1500, 6000),
					nextMemory,
				),
			};
		}
		if (nextMemory.match) {
			nextMemory.match = {
				...nextMemory.match,
				notableLessons: buildMatchLessons(nextMemory.match, nextMemory.experience),
			};
		}

		this.stateByPlayer.set(feedback.playerId, {
			...current,
			preferredSystems,
			recentDecisionSummaries,
			lastDecisionAtRound: feedback.request.context.currentRound,
			memory: nextMemory,
		});
	}
}
