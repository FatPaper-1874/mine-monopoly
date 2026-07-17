import { AIDecisionOption, AIDecisionRequest, AIDecisionSemanticHint } from "@mine-monopoly/types";

import { DecisionAdapterRegistry, mergeAIDecisionSemantics } from "./DecisionAdapterRegistry";

function hasAnyKeyword(text: string, keywords: string[]): boolean {
	return keywords.some((keyword) => text.includes(keyword));
}

function safeNumber(value: unknown): number | undefined {
	return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function buildText(parts: Array<string | undefined>): string {
	return parts.filter(Boolean).join(" ").toLowerCase();
}

export class DecisionEnricher {
	constructor(private readonly adapterRegistry: DecisionAdapterRegistry = new DecisionAdapterRegistry()) {}

	enrich(request: AIDecisionRequest): AIDecisionRequest {
		const requestHint = mergeAIDecisionSemantics(
			this.inferRequestSemantics(request),
			this.adapterRegistry.enrichRequest(request),
		);

		return {
			...request,
			summary: request.summary || requestHint?.summary,
			semantics: mergeAIDecisionSemantics(request.semantics, requestHint),
			options: request.options.map((option) => this.enrichOption(request, option)),
		};
	}

	private enrichOption(request: AIDecisionRequest, option: AIDecisionOption): AIDecisionOption {
		const inferred = this.inferOptionSemantics(request, option);
		const adapted = this.adapterRegistry.enrichOption(request, option);
		return {
			...option,
			semantics: mergeAIDecisionSemantics(option.semantics, mergeAIDecisionSemantics(inferred, adapted)),
		};
	}

	private inferRequestSemantics(request: AIDecisionRequest): AIDecisionSemanticHint | undefined {
		const text = buildText([request.title, request.summary, request.semantics?.summary]);
		if (!text) {
			return undefined;
		}

		const tags: string[] = [];
		const semantics: AIDecisionSemanticHint = {
			summary: request.summary || request.title,
		};

		if (hasAnyKeyword(text, ["确认", "继续", "开始"])) {
			semantics.category = semantics.category || "control";
			tags.push("confirm");
		}
		if (hasAnyKeyword(text, ["选择目标", "目标"])) {
			semantics.category = semantics.category || "control";
			semantics.intent = semantics.intent || "target_select";
			tags.push("target");
		}
		if (hasAnyKeyword(text, ["股票", "股市", "证券"])) {
			semantics.category = semantics.category || "economy";
			semantics.sourceSystem = "stock";
		}
		if (hasAnyKeyword(text, ["彩票", "开奖"])) {
			semantics.category = semantics.category || "economy";
			semantics.sourceSystem = "lottery";
		}
		if (hasAnyKeyword(text, ["机会卡", "卡牌"])) {
			semantics.category = semantics.category || "utility";
			semantics.sourceSystem = "chance-card";
		}
		if (hasAnyKeyword(text, ["魔法屋", "随机事件"])) {
			semantics.category = semantics.category || "control";
			semantics.sourceSystem = "random-event";
			semantics.risk = Math.max(semantics.risk ?? 0, 650);
		}

		return tags.length || semantics.category || semantics.sourceSystem || semantics.risk
			? {
					...semantics,
					tags,
				}
			: undefined;
	}

	private inferOptionSemantics(request: AIDecisionRequest, option: AIDecisionOption): AIDecisionSemanticHint | undefined {
		const text = buildText([
			request.title,
			request.summary,
			option.label,
			option.description,
			option.semantics?.summary,
		]);
		if (!text) {
			return undefined;
		}

		const tags: string[] = [];
		const semantics: AIDecisionSemanticHint = {
			summary: option.description || option.label,
		};

		if (option.actionType === "cancel") {
			return {
				category: option.semantics?.category || request.semantics?.category || "control",
				intent: "cancel_action",
				summary: option.label,
				risk: 0,
			};
		}

		if (option.actionType === "confirm" || option.actionType === "submit") {
			semantics.category = semantics.category || request.semantics?.category || "control";
			tags.push(option.actionType);
		}

		if (hasAnyKeyword(text, ["购买", "买入", "买下", "选购"])) {
			tags.push("buy");
		}
		if (hasAnyKeyword(text, ["卖出", "出售", "抛售", "清仓"])) {
			tags.push("sell");
		}
		if (hasAnyKeyword(text, ["升级", "升到"])) {
			tags.push("upgrade");
		}
		if (hasAnyKeyword(text, ["查看", "窥探", "内幕", "评级"])) {
			tags.push("inspect");
			semantics.reward = Math.max(semantics.reward ?? 0, 600);
		}
		if (hasAnyKeyword(text, ["随机", "轮盘", "暴涨", "暴跌", "开奖"])) {
			tags.push("volatile");
			semantics.risk = Math.max(semantics.risk ?? 0, 700);
		}
		if (hasAnyKeyword(text, ["免费", "赠送"])) {
			tags.push("free");
			semantics.reward = Math.max(semantics.reward ?? 0, 700);
			semantics.risk = Math.min(semantics.risk ?? 250, 250);
		}

		const payloadType = String(option.payload?.type || "");
		if (payloadType === "player") {
			semantics.target = "other-player";
		} else if (payloadType === "property") {
			semantics.target = "property";
		} else if (payloadType === "button") {
			semantics.target = "system";
		}

		const sellCost = safeNumber(option.payload?.sellCost);
		const rentPeak = safeNumber(option.payload?.rentPeak);
		if (sellCost !== undefined && tags.includes("buy")) {
			semantics.cost = semantics.cost ?? sellCost;
		}
		if (rentPeak !== undefined && (tags.includes("buy") || tags.includes("upgrade"))) {
			semantics.reward = Math.max(semantics.reward ?? 0, rentPeak);
		}

		if (request.semantics?.sourceSystem && !semantics.sourceSystem) {
			semantics.sourceSystem = request.semantics.sourceSystem;
		}
		if (request.semantics?.category && !semantics.category) {
			semantics.category = request.semantics.category;
		}

		return tags.length ||
			semantics.category ||
			semantics.sourceSystem ||
			semantics.cost !== undefined ||
			semantics.reward !== undefined ||
			semantics.risk !== undefined
			? {
					...semantics,
					tags,
				}
			: undefined;
	}
}
