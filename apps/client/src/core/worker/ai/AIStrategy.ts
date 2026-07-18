import { AIDecisionOption, AIDecisionProvider, AIDecisionRequest, AIDecisionSelection, AIStrategyState, OperateType, PlayerInfo } from "@mine-monopoly/types";

import { DecisionEnricher } from "./DecisionEnricher";
import { StrategyStateManager } from "./StrategyStateManager";

const AI_LOG_PREFIX = "[AI Decision]";

type FormFieldDecisionMeta = {
	key: string;
	label: string;
	defaultValue: unknown;
	min?: number;
	max?: number;
	valueType?: "number" | "string";
	semantics?: AIDecisionOption["semantics"];
};

function clamp(value: number, min: number, max: number): number {
	return Math.min(max, Math.max(min, value));
}

function hasAnyKeyword(text: string, keywords: string[]): boolean {
	return keywords.some((keyword) => text.includes(keyword));
}

function safeNumber(value: unknown, fallback: number = 0): number {
	return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function hasSemanticTag(semantics: AIDecisionOption["semantics"] | undefined, tag: string): boolean {
	return (semantics?.tags || []).includes(tag);
}

function getLeadingOpponent(playerId: string, players: PlayerInfo[]): PlayerInfo | undefined {
	return players
		.filter((player) => player.id !== playerId && !player.isBankrupted)
		.sort((left, right) => {
			if (right.money !== left.money) {
				return right.money - left.money;
			}
			return right.properties.length - left.properties.length;
		})[0];
}

const positiveKeywords = ["获得", "增加", "前进", "奖励", "免费", "赚", "涨", "升级", "抽取", "加倍", "免除", "恢复"];
const negativeKeywords = ["失去", "扣除", "支付", "后退", "罚", "停", "冻结", "破坏", "损失", "减少", "爆炸", "风险"];
const offensiveKeywords = ["偷", "抢", "罚", "扣", "减少", "摧毁", "破坏", "冻结", "停"];
const defensiveKeywords = ["保护", "恢复", "治疗", "免疫", "护盾", "返还", "补偿"];

function getDecisionId(request: AIDecisionRequest): string | undefined {
	return typeof request.metadata?.decisionId === "string" ? request.metadata.decisionId : undefined;
}

/**
 * 默认本地决策提供器
 * 核心目标是“能玩、能降级、可被语义提示增强”，而不是最佳策略。
 */
export class HeuristicDecisionProvider implements AIDecisionProvider {
	decide(request: AIDecisionRequest): AIDecisionSelection {
		const availableOptions = request.options.filter((option) => !option.disabled && !option.hidden);
		if (availableOptions.length === 0) {
			console.log(`${AI_LOG_PREFIX} no available option`, {
				decisionId: getDecisionId(request),
				title: request.title,
				operationType: request.operationType,
				scene: request.scene,
				playerId: request.playerId,
			});
			return { reason: "no_available_option", confidence: 0 };
		}

		this.logRequest(request, availableOptions);

		let selection: AIDecisionSelection;
		if (request.scene === "active-action" || request.scene === "scripted-action" || request.operationType === "active-action" || request.operationType === "scripted-action") {
			selection = this.chooseItemOptions(request, availableOptions);
			this.logSelection(request, selection, availableOptions);
			return selection;
		}

		switch (request.operationType) {
			case OperateType.RollDice:
				selection = { optionId: availableOptions[0]?.id, confidence: 1 };
				break;
			case OperateType.ConfirmDialogResult:
				selection = this.chooseConfirmOption(request, availableOptions);
				break;
			case OperateType.TargetSelectDialogResult:
				selection = this.chooseTargetOptions(request, availableOptions);
				break;
			case OperateType.ItemSelectDialogResult:
				selection = this.chooseItemOptions(request, availableOptions);
				break;
			case OperateType.FormDialogResult:
				selection = this.chooseFormResult(request, availableOptions);
				break;
			case OperateType.DynamicButtonClick:
				selection = this.chooseDynamicButton(request, availableOptions);
				break;
			default:
				selection = { optionId: availableOptions[0]?.id, confidence: 0.2, reason: "fallback_first_option" };
				break;
		}

		this.logSelection(request, selection, availableOptions);
		return selection;
	}

	private chooseConfirmOption(request: AIDecisionRequest, options: AIDecisionOption[]): AIDecisionSelection {
		const confirmOption = options.find((option) => option.actionType === "confirm") ?? options[0];
		const cancelOption = options.find((option) => option.actionType === "cancel");

		const confirmScore = this.scoreOption(request, confirmOption);
		const cancelScore = cancelOption ? this.scoreOption(request, cancelOption) : 0;
		console.log(`${AI_LOG_PREFIX} confirm scores`, {
			decisionId: getDecisionId(request),
			title: request.title,
			confirm: `${confirmOption.label}(${confirmOption.id})`,
			confirmScore,
			cancel: cancelOption ? `${cancelOption.label}(${cancelOption.id})` : null,
			cancelScore,
		});

		if (confirmScore <= cancelScore && cancelOption) {
			return { optionId: cancelOption.id, confidence: 0.72, reason: "confirm_score_not_good_enough" };
		}

		return { optionId: confirmOption.id, confidence: clamp(0.55 + confirmScore / 12, 0.55, 0.95) };
	}

	private chooseTargetOptions(request: AIDecisionRequest, options: AIDecisionOption[]): AIDecisionSelection {
		const maxSelections = safeNumber(request.metadata?.maxSelections, 1);
		const ranked = this.rankOptions(request, options, "target");

		return {
			optionIds: ranked.slice(0, Math.max(1, maxSelections)).map((item) => item.option.id),
			confidence: clamp(0.45 + (ranked[0]?.score ?? 0) / 10, 0.45, 0.9),
		};
	}

	private chooseItemOptions(request: AIDecisionRequest, options: AIDecisionOption[]): AIDecisionSelection {
		const cancelOption = options.find((option) => option.actionType === "cancel");
		const selectable = options.filter(
			(option) => option.actionType === "select" || option.actionType === "use-card",
		);
		const maxSelections = safeNumber(request.metadata?.maxSelections, 1);

		const ranked = this.rankOptions(request, selectable, "item");

		if (ranked.length === 0 && cancelOption) {
			return { optionIds: [], optionId: cancelOption.id, confidence: 0.8, reason: "cancel_empty_selectable" };
		}

		const bestScore = ranked[0]?.score ?? Number.NEGATIVE_INFINITY;
		if (cancelOption && bestScore < 0.25) {
			return { optionIds: [], optionId: cancelOption.id, confidence: 0.76, reason: "cancel_low_value_options" };
		}

		return {
			optionIds: ranked.slice(0, Math.max(1, maxSelections)).map((item) => item.option.id),
			confidence: clamp(0.4 + bestScore / 10, 0.4, 0.88),
		};
	}

	private chooseFormResult(request: AIDecisionRequest, options: AIDecisionOption[]): AIDecisionSelection {
		const submitOption = options.find((option) => option.actionType === "submit");
		const cancelOption = options.find((option) => option.actionType === "cancel");
		const defaultFieldValues = (request.metadata?.defaultFieldValues as Record<string, unknown> | undefined) || {};
		const fieldValues = this.buildFormFieldValues(request, defaultFieldValues);

		if (!submitOption) {
			return { submitted: false, fieldValues, confidence: 0.2, reason: "missing_submit_option" };
		}

		const submitScore = this.scoreOption(request, submitOption);
		const cancelScore = cancelOption ? this.scoreOption(request, cancelOption) : 0;
		console.log(`${AI_LOG_PREFIX} form scores`, {
			decisionId: getDecisionId(request),
			title: request.title,
			submit: `${submitOption.label}(${submitOption.id})`,
			submitScore,
			cancel: cancelOption ? `${cancelOption.label}(${cancelOption.id})` : null,
			cancelScore,
			defaultFieldValues,
			fieldValues,
		});
		if (cancelOption && submitScore <= cancelScore) {
			return { submitted: false, fieldValues, confidence: 0.72, reason: "cancel_form" };
		}

		return {
			submitted: true,
			fieldValues,
			optionId: submitOption.id,
			confidence: clamp(0.5 + submitScore / 10, 0.5, 0.9),
		};
	}

	private chooseDynamicButton(request: AIDecisionRequest, options: AIDecisionOption[]): AIDecisionSelection {
		const ranked = this.rankOptions(request, options, "dynamic-button");

		const best = ranked[0];
		if (!best || best.score < 0.1) {
			return { confidence: 0.3, reason: "no_button_good_enough" };
		}

		return {
			optionId: best.option.id,
			confidence: clamp(0.42 + best.score / 10, 0.42, 0.92),
		};
	}

	private chooseChanceCardOption(request: AIDecisionRequest, options: AIDecisionOption[]): AIDecisionSelection {
		const cancelOption = options.find((option) => option.actionType === "cancel");
		const cardOptions = options.filter((option) => option.actionType === "use-card");
		const ranked = this.rankOptions(request, cardOptions, "chance-card");

		const best = ranked[0];
		if (!best && cancelOption) {
			return { optionId: cancelOption.id, confidence: 0.8, reason: "no_card_available" };
		}
		if (cancelOption && (best?.score ?? Number.NEGATIVE_INFINITY) < 0.65) {
			return { optionId: cancelOption.id, confidence: 0.78, reason: "no_card_good_enough" };
		}
		return {
			optionId: best?.option.id,
			confidence: clamp(0.5 + (best?.score ?? 0) / 10, 0.5, 0.92),
		};
	}

	private scoreOption(request: AIDecisionRequest, option: AIDecisionOption): number {
		const semantics = option.semantics || {};
		const optionText = `${option.label} ${option.description || ""} ${semantics.summary || ""}`.toLowerCase();
		const player = request.context.player;
		const playerMoney = safeNumber(player.money);
		const cost = safeNumber(semantics.cost);
		const reward = safeNumber(semantics.reward);
		const risk = safeNumber(semantics.risk);
		const isBuyProperty = semantics.intent === "buy_property" || hasAnyKeyword(optionText, ["购买", "买下", "买！"]);
		const isUpgradeProperty = semantics.intent === "upgrade_property" || hasAnyKeyword(optionText, ["升级", "升！"]);
		const isInspectAction = hasSemanticTag(semantics, "inspect") || hasSemanticTag(semantics, "information");
		const hasDirectStockOperation =
			hasSemanticTag(semantics, "buy") ||
			hasSemanticTag(semantics, "sell") ||
			hasSemanticTag(semantics, "manipulate") ||
			hasSemanticTag(semantics, "bullish") ||
			hasSemanticTag(semantics, "bearish");
		const isInformationOnlyAction =
			isInspectAction &&
			!hasDirectStockOperation &&
			semantics.intent !== "use_card" &&
			!isBuyProperty &&
			!isUpgradeProperty;
		const rewardWeight = isInformationOnlyAction ? 0.0008 : 0.01;
		const riskWeight = isInformationOnlyAction ? 0.002 : 0.01;
		let score = reward * rewardWeight - cost * 0.008 - risk * riskWeight;

		// 地产投资类动作会在专门函数里结合资金余量和回报再次评估，
		// 这里先抵消通用成本惩罚，避免“花钱”被重复扣分。
		if (isBuyProperty || isUpgradeProperty) {
			score += cost * 0.008;
		}

		if (option.actionType === "cancel") {
			score += 0.2;
		}

		if (isInformationOnlyAction) {
			// 纯信息动作不应被当成立刻兑现收益的高价值操作，避免每回合机械重复点击。
			score -= 0.35;
		}

		if (isBuyProperty) {
			score += this.scoreBuyProperty(playerMoney, cost, reward);
		}

		if (isUpgradeProperty) {
			score += this.scoreUpgradeProperty(playerMoney, cost, reward);
		}

		if (semantics.intent === "use_card" || hasAnyKeyword(optionText, ["使用", "发动", "释放"])) {
			score += reward > cost ? 1.5 : 0.5;
		}

		if (semantics.intent === "end_turn" || hasAnyKeyword(optionText, ["结束", "跳过", "不要", "取消"])) {
			score -= 0.5;
		}

		if (hasAnyKeyword(optionText, ["确认", "继续", "开始", "领取", "掷骰子"])) {
			score += 0.8;
		}

		if (hasAnyKeyword(optionText, ["危险", "损失", "惩罚", "失败"])) {
			score -= 1.5;
		}

		if (semantics.requiresSetup) {
			score -= 0.6;
		}

		if (semantics.timing === "long-term") {
			score += 0.35;
		} else if (semantics.timing === "immediate") {
			score += 0.2;
		}

		if (typeof semantics.urgency === "number") {
			score += clamp(semantics.urgency * 0.15, -1.2, 1.2);
		}

		if (semantics.sourceSystem === "lottery") {
			score -= 0.8;
		}

		if (semantics.sourceSystem === "stock" && playerMoney > 6000 && !isInformationOnlyAction) {
			score += 0.45;
		}

		score += this.scoreKeywordHeuristics(optionText);
		score += this.scorePostureAdjustment(request, optionText, semantics);

		const payloadType = String(option.payload?.type || "");
		if (payloadType === "player") {
			score += this.scoreTargetPlayer(request, option);
		} else if (payloadType === "property") {
			score += this.scoreTargetProperty(option);
		}

		return score;
	}

	private rankOptions(request: AIDecisionRequest, options: AIDecisionOption[], kind: string) {
		const ranked = options
			.map((option) => ({ option, score: this.scoreOption(request, option) }))
			.sort((left, right) => right.score - left.score);

		console.log(`${AI_LOG_PREFIX} ranked ${kind} options`, {
			decisionId: getDecisionId(request),
			title: request.title,
			operationType: request.operationType,
			scene: request.scene,
			playerId: request.playerId,
			ranked: ranked.map((item) => ({
				id: item.option.id,
				label: item.option.label,
				actionType: item.option.actionType,
				score: Number(item.score.toFixed(3)),
				intent: item.option.semantics?.intent,
				category: item.option.semantics?.category,
			})),
		});

		return ranked;
	}

	private logRequest(request: AIDecisionRequest, options: AIDecisionOption[]): void {
		console.log(`${AI_LOG_PREFIX} request`, {
			decisionId: getDecisionId(request),
			title: request.title,
			operationType: request.operationType,
			scene: request.scene,
			playerId: request.playerId,
			posture: request.strategyState?.posture,
			summary: request.summary,
			semantics: request.semantics,
			options: options.map((option) => ({
				id: option.id,
				label: option.label,
				actionType: option.actionType,
				intent: option.semantics?.intent,
				category: option.semantics?.category,
				cost: option.semantics?.cost,
				reward: option.semantics?.reward,
				risk: option.semantics?.risk,
			})),
		});
	}

	private logSelection(request: AIDecisionRequest, selection: AIDecisionSelection, options: AIDecisionOption[]): void {
		const selectedIds = selection.optionIds || (selection.optionId ? [selection.optionId] : []);
		const selected = selectedIds
			.map((id) => options.find((option) => option.id === id))
			.filter((option): option is AIDecisionOption => !!option)
			.map((option) => ({
				id: option.id,
				label: option.label,
				actionType: option.actionType,
			}));

		console.log(`${AI_LOG_PREFIX} selection`, {
			decisionId: getDecisionId(request),
			title: request.title,
			operationType: request.operationType,
			scene: request.scene,
			playerId: request.playerId,
			selection,
			selected,
		});
	}

	private scoreKeywordHeuristics(text: string): number {
		let score = 0;
		for (const keyword of positiveKeywords) {
			if (text.includes(keyword)) {
				score += 0.8;
			}
		}
		for (const keyword of negativeKeywords) {
			if (text.includes(keyword)) {
				score -= 0.9;
			}
		}
		for (const keyword of offensiveKeywords) {
			if (text.includes(keyword)) {
				score += 0.6;
			}
		}
		for (const keyword of defensiveKeywords) {
			if (text.includes(keyword)) {
				score += 0.5;
			}
		}
		return score;
	}

	private scorePostureAdjustment(
		request: AIDecisionRequest,
		text: string,
		semantics: AIDecisionOption["semantics"] | undefined,
	): number {
		const posture = request.strategyState?.posture;
		if (!posture) {
			return 0;
		}

		const intent = semantics?.intent;
		const sourceSystem = semantics?.sourceSystem;
		const isInformationOnlyAction =
			(hasSemanticTag(semantics, "inspect") || hasSemanticTag(semantics, "information")) &&
			!hasSemanticTag(semantics, "buy") &&
			!hasSemanticTag(semantics, "sell") &&
			!hasSemanticTag(semantics, "manipulate") &&
			intent !== "use_card";

		if (posture === "desperate") {
			if (intent === "buy_property" || intent === "upgrade_property") {
				return -1.2;
			}
			if (sourceSystem === "lottery" || sourceSystem === "stock") {
				return -1.4;
			}
			if (hasAnyKeyword(text, ["获得", "返还", "保护", "恢复"])) {
				return 0.8;
			}
		}

		if (posture === "expand") {
			if (intent === "buy_property" || intent === "upgrade_property") {
				return 0.9;
			}
			if (hasAnyKeyword(text, ["前进", "获得", "升级"])) {
				return 0.5;
			}
		}

		if (posture === "speculative") {
			if (sourceSystem === "stock" && !isInformationOnlyAction) {
				return 1.1;
			}
			if (sourceSystem === "lottery") {
				return -0.2;
			}
			if (intent === "buy_property") {
				return -0.3;
			}
		}

		if (posture === "conservative" && hasAnyKeyword(text, ["危险", "爆炸", "随机", "损失"])) {
			return -0.8;
		}

		return 0;
	}

	private scoreBuyProperty(playerMoney: number, cost: number, reward: number): number {
		if (cost <= 0) {
			return 1;
		}
		if (cost > playerMoney) {
			return -100;
		}
		const reserve = playerMoney - cost;
		let score = reward * 0.01 + 1.2;
		if (reserve < 1500) {
			score -= 3.2;
		} else if (reserve < 4000) {
			score -= 1.2;
		} else if (reserve > 9000) {
			score += 0.8;
		}
		return score;
	}

	private scoreUpgradeProperty(playerMoney: number, cost: number, reward: number): number {
		if (cost <= 0) {
			return 0.8;
		}
		if (cost > playerMoney) {
			return -100;
		}
		const reserve = playerMoney - cost;
		let score = reward * 0.012 + 0.8;
		if (reserve < 1200) {
			score -= 3.5;
		} else if (reserve < 3500) {
			score -= 1.5;
		}
		return score;
	}

	private scoreTargetPlayer(request: AIDecisionRequest, option: AIDecisionOption): number {
		const targetId = String(option.payload?.id || "");
		const target = request.context.players.find((player) => player.id === targetId);
		if (!target) {
			return 0;
		}
		if (target.id === request.playerId) {
			return option.semantics?.intent === "target_self" ? 1.5 : -1.5;
		}

		const leadingOpponent = getLeadingOpponent(request.playerId, request.context.players);
		let score = 0.4;
		if (leadingOpponent?.id === target.id) {
			score += 2.2;
		}
		score += clamp(target.money / 5000, 0, 2);
		score += clamp(target.properties.length * 0.4, 0, 2);
		return score;
	}

	private scoreTargetProperty(option: AIDecisionOption): number {
		const sellCost = safeNumber(option.payload?.sellCost);
		const rentPeak = safeNumber(option.payload?.rentPeak);
		const ownerId = String(option.payload?.ownerId || "");
		let score = sellCost * 0.002 + rentPeak * 0.004;
		if (ownerId) {
			score += 0.8;
		}
		return score;
	}

	private buildFormFieldValues(
		request: AIDecisionRequest,
		defaultFieldValues: Record<string, unknown>,
	): Record<string, unknown> {
		const formFields = Array.isArray(request.metadata?.formFields)
			? (request.metadata?.formFields as FormFieldDecisionMeta[])
			: [];
		if (!formFields.length) {
			return defaultFieldValues;
		}

		const nextValues: Record<string, unknown> = { ...defaultFieldValues };
		for (const field of formFields) {
			nextValues[field.key] = this.chooseFormFieldValue(request, field);
		}
		return nextValues;
	}

	private chooseFormFieldValue(request: AIDecisionRequest, field: FormFieldDecisionMeta): unknown {
		if (field.valueType !== "number" || typeof field.defaultValue !== "number") {
			return field.defaultValue;
		}

		const min = typeof field.min === "number" ? field.min : 0;
		const fallbackMax = Math.max(min, field.defaultValue);
		const max = typeof field.max === "number" ? field.max : fallbackMax;
		if (max <= min) {
			return clamp(field.defaultValue, min, max);
		}

		const semantics = field.semantics || {};
		const text = `${field.label} ${semantics.summary || ""} ${semantics.intent || ""}`.toLowerCase();
		let ratio = this.getBaseNumericFieldRatio(request);

		if (hasAnyKeyword(text, ["投资", "下注", "投入", "加仓", "倍率", "预算"])) {
			ratio += request.strategyState?.posture === "desperate" ? -0.15 : 0.1;
		}
		if (hasAnyKeyword(text, ["储备", "保留", "安全", "保险"])) {
			ratio += request.strategyState?.posture === "expand" ? -0.2 : 0.15;
		}
		if (hasAnyKeyword(text, ["风险", "损失", "惩罚"])) {
			ratio -= 0.15;
		}
		if (hasAnyKeyword(text, ["收益", "奖励", "增益", "恢复"])) {
			ratio += 0.12;
		}

		if (typeof semantics.reward === "number" || typeof semantics.risk === "number") {
			const reward = safeNumber(semantics.reward);
			const risk = safeNumber(semantics.risk);
			if (reward > risk) {
				ratio += 0.12;
			} else if (risk > reward) {
				ratio -= 0.12;
			}
		}

		const span = max - min;
		const candidate = Math.round(min + span * clamp(ratio, 0.05, 0.95));
		const defaultDistance = Math.abs(candidate - field.defaultValue);
		const maxAdjustment = Math.max(1, Math.round(span * 0.35));
		if (defaultDistance > maxAdjustment) {
			const direction = candidate > field.defaultValue ? 1 : -1;
			return clamp(field.defaultValue + direction * maxAdjustment, min, max);
		}
		return clamp(candidate, min, max);
	}

	private getBaseNumericFieldRatio(request: AIDecisionRequest): number {
		switch (request.strategyState?.posture) {
			case "desperate":
				return 0.22;
			case "conservative":
				return 0.35;
			case "expand":
				return 0.68;
			case "speculative":
				return 0.78;
			default:
				return 0.5;
		}
	}
}

/**
 * AI 管理器
 * 对外暴露统一 provider / strategyState 管理。
 */
export class AIManager {
	private provider: AIDecisionProvider;
	private readonly enricher: DecisionEnricher;
	private readonly strategyStateManager: StrategyStateManager;

	constructor(provider: AIDecisionProvider = new HeuristicDecisionProvider()) {
		this.provider = provider;
		this.enricher = new DecisionEnricher();
		this.strategyStateManager = new StrategyStateManager();
	}

	setProvider(provider: AIDecisionProvider): void {
		this.provider = provider;
	}

	getProvider(): AIDecisionProvider {
		return this.provider;
	}

	getStrategyState(playerId: string): AIStrategyState | undefined {
		return this.strategyStateManager.getState(playerId);
	}

	getAllStrategyStates(): Record<string, AIStrategyState> {
		return this.strategyStateManager.getAllStates();
	}

	clearStrategyState(playerId?: string): void {
		this.strategyStateManager.clearState(playerId);
	}

	setContextMemoryLimit(limit: number): void {
		this.strategyStateManager.setRecentDecisionLimit(limit);
	}

	async decide(request: AIDecisionRequest): Promise<AIDecisionSelection> {
		const enriched = this.enricher.enrich(request);
		const strategyState = this.strategyStateManager.derive(enriched);
		const enrichedRequest: AIDecisionRequest = {
			...enriched,
			strategyState,
		};
		console.log(`${AI_LOG_PREFIX} strategy state`, {
			decisionId: getDecisionId(enrichedRequest),
			playerId: enriched.playerId,
			operationType: enriched.operationType,
			scene: enriched.scene,
			strategyState,
		});
		return await this.provider.decide(enrichedRequest);
	}

	feedback(args: {
		playerId: string;
		request: AIDecisionRequest;
		selection: AIDecisionSelection;
		outcome?: string;
	}): void {
		const selectedIds = args.selection.optionIds || (args.selection.optionId ? [args.selection.optionId] : []);
		const selectedOption = args.request.options.find((option) => selectedIds.includes(option.id));
		this.strategyStateManager.feedback({
			playerId: args.playerId,
			request: args.request,
			selectedOptionLabel: selectedOption?.label,
			selectedSourceSystem: selectedOption?.semantics?.sourceSystem || args.request.semantics?.sourceSystem,
			selectedIntent: selectedOption?.semantics?.intent || args.request.semantics?.intent,
			outcome: args.outcome,
		});
	}
}

export const aiManager = new AIManager();
