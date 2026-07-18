import { AIDecisionOption, AIDecisionRequest, AIDecisionSemanticHint } from "@mine-monopoly/types";

function hasAnyKeyword(text: string, keywords: string[]): boolean {
	return keywords.some((keyword) => text.includes(keyword));
}

function uniqueTextList(items: Array<string | undefined>): string[] | undefined {
	const normalized = items.map((item) => item?.trim()).filter((item): item is string => !!item);
	if (!normalized.length) {
		return undefined;
	}
	return Array.from(new Set(normalized));
}

export function mergeAIDecisionSemantics(
	base?: AIDecisionSemanticHint,
	extra?: AIDecisionSemanticHint,
): AIDecisionSemanticHint | undefined {
	if (!base && !extra) {
		return undefined;
	}
	if (!base) {
		return extra ? { ...extra } : undefined;
	}
	if (!extra) {
		return { ...base };
	}

	return {
		...base,
		...extra,
		tags: uniqueTextList([...(base.tags || []), ...(extra.tags || [])]),
		effects: uniqueTextList([...(base.effects || []), ...(extra.effects || [])]),
		metadata: {
			...(base.metadata || {}),
			...(extra.metadata || {}),
		},
	};
}

export interface AIDecisionAdapter {
	id: string;
	supports(request: AIDecisionRequest, option?: AIDecisionOption): boolean;
	buildSemantics(request: AIDecisionRequest, option?: AIDecisionOption): AIDecisionSemanticHint | undefined;
}

function getSearchText(request: AIDecisionRequest, option?: AIDecisionOption): string {
	return [
		request.title,
		request.summary,
		request.semantics?.summary,
		option?.label,
		option?.description,
		option?.semantics?.summary,
	]
		.filter(Boolean)
		.join(" ")
		.toLowerCase();
}

function getPreferredDecisionSummary(request: AIDecisionRequest, option?: AIDecisionOption): string {
	return option?.semantics?.summary || option?.description || option?.label || request.title;
}

const stockAdapter: AIDecisionAdapter = {
	id: "stock-system",
	supports(request, option) {
		return hasAnyKeyword(getSearchText(request, option), ["股票", "股市", "证券", "涨停", "跌停", "分红", "持股"]);
	},
	buildSemantics(request, option) {
		const text = getSearchText(request, option);
		const tags = ["stock"];
		let summary = getPreferredDecisionSummary(request, option);
		let reward: number | undefined;
		let risk: number | undefined;

		if (hasAnyKeyword(text, ["买入", "购买"])) {
			tags.push("buy", "speculation");
			summary = summary || "买入一支股票";
			risk = 800;
		}
		if (hasAnyKeyword(text, ["卖出", "出售", "抛售", "清仓"])) {
			tags.push("sell");
			summary = summary || "卖出当前持仓";
			reward = 700;
		}
		if (hasAnyKeyword(text, ["内幕", "查看", "窥探", "评级"])) {
			tags.push("inspect", "information");
			reward = Math.max(reward ?? 0, 900);
			risk = Math.min(risk ?? 200, 200);
		}
		if (hasAnyKeyword(text, ["涨停", "暴涨", "引爆"])) {
			tags.push("manipulate", "bullish");
			reward = Math.max(reward ?? 0, 1200);
			risk = Math.max(risk ?? 0, 900);
		}
		if (hasAnyKeyword(text, ["跌停", "砸盘", "崩盘"])) {
			tags.push("manipulate", "bearish");
			reward = Math.max(reward ?? 0, 950);
			risk = Math.max(risk ?? 0, 950);
		}

		return {
			category: "economy",
			sourceSystem: "stock",
			summary,
			tags,
			timing: hasAnyKeyword(text, ["内幕", "查看", "窥探"]) ? "short-term" : "immediate",
			reward,
			risk,
		};
	},
};

const lotteryAdapter: AIDecisionAdapter = {
	id: "lottery-system",
	supports(request, option) {
		return hasAnyKeyword(getSearchText(request, option), ["彩票", "奖池", "开奖", "号码"]);
	},
	buildSemantics(request, option) {
		const text = getSearchText(request, option);
		const free = hasAnyKeyword(text, ["免费", "赠送"]);
		return {
			category: "economy",
			sourceSystem: "lottery",
			tags: ["lottery", free ? "free" : "gamble"],
			summary: getPreferredDecisionSummary(request, option),
			timing: "short-term",
			reward: free ? 950 : 650,
			risk: free ? 250 : 1100,
			requiresSetup: !free,
		};
	},
};

const chanceCardAdapter: AIDecisionAdapter = {
	id: "chance-card-system",
	supports(request, option) {
		return hasAnyKeyword(getSearchText(request, option), ["机会卡", "卡牌", "商店", "抽卡", "购卡"]);
	},
	buildSemantics(request, option) {
		const text = getSearchText(request, option);
		const buying = hasAnyKeyword(text, ["购买", "买", "选购"]);
		return {
			category: buying ? "economy" : "utility",
			sourceSystem: buying ? "chance-card-shop" : "chance-card",
			tags: ["chance-card", buying ? "buy" : "use"],
			summary: getPreferredDecisionSummary(request, option),
			timing: buying ? "short-term" : "immediate",
			reward: buying ? 700 : undefined,
			risk: buying ? 400 : undefined,
		};
	},
};

const randomEventAdapter: AIDecisionAdapter = {
	id: "random-event-system",
	supports(request, option) {
		return hasAnyKeyword(getSearchText(request, option), ["魔法屋", "随机事件", "随机", "命运轮盘", "时空传送"]);
	},
	buildSemantics(request, option) {
		const text = getSearchText(request, option);
		return {
			category: hasAnyKeyword(text, ["获得", "升级", "奖励"]) ? "economy" : "control",
			sourceSystem: "random-event",
			tags: ["random-event", hasAnyKeyword(text, ["随机"]) ? "random" : "event"],
			summary: getPreferredDecisionSummary(request, option),
			timing: "immediate",
			reward: hasAnyKeyword(text, ["获得", "升级", "奖励", "偷", "抢"]) ? 850 : undefined,
			risk: hasAnyKeyword(text, ["失去", "损失", "后退", "崩盘", "惩罚"]) ? 950 : 650,
		};
	},
};

const propertyAdapter: AIDecisionAdapter = {
	id: "property-system",
	supports(request, option) {
		return hasAnyKeyword(getSearchText(request, option), ["地皮", "地产", "房产", "建筑", "升级", "收租", "过路费"]);
	},
	buildSemantics(request, option) {
		const text = getSearchText(request, option);
		const tags = ["property"];
		if (hasAnyKeyword(text, ["购买", "买下"])) {
			tags.push("buy");
		}
		if (hasAnyKeyword(text, ["升级"])) {
			tags.push("upgrade");
		}
		if (hasAnyKeyword(text, ["拆迁", "降级", "破坏"])) {
			tags.push("pressure");
		}
		return {
			category: "economy",
			sourceSystem: "property",
			tags,
			summary: getPreferredDecisionSummary(request, option),
			timing: hasAnyKeyword(text, ["收租", "过路费"]) ? "long-term" : "short-term",
		};
	},
};

const DEFAULT_ADAPTERS: AIDecisionAdapter[] = [
	propertyAdapter,
	stockAdapter,
	lotteryAdapter,
	chanceCardAdapter,
	randomEventAdapter,
];

export class DecisionAdapterRegistry {
	constructor(private readonly adapters: AIDecisionAdapter[] = DEFAULT_ADAPTERS) {}

	enrichRequest(request: AIDecisionRequest): AIDecisionSemanticHint | undefined {
		return this.adapters.reduce<AIDecisionSemanticHint | undefined>((merged, adapter) => {
			if (!adapter.supports(request)) {
				return merged;
			}
			return mergeAIDecisionSemantics(merged, adapter.buildSemantics(request));
		}, undefined);
	}

	enrichOption(request: AIDecisionRequest, option: AIDecisionOption): AIDecisionSemanticHint | undefined {
		return this.adapters.reduce<AIDecisionSemanticHint | undefined>((merged, adapter) => {
			if (!adapter.supports(request, option)) {
				return merged;
			}
			return mergeAIDecisionSemantics(merged, adapter.buildSemantics(request, option));
		}, undefined);
	}
}
