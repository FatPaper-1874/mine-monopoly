import type { AIDecisionContextSnapshot, AIDecisionEconomySnapshot } from "@mine-monopoly/types";

function medianPositive(values: number[]): number {
	const sorted = values.filter((value) => Number.isFinite(value) && value > 0).sort((left, right) => left - right);
	if (!sorted.length) return 0;
	const middle = Math.floor(sorted.length / 2);
	return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

/** 开局实测资金优先；兼容缺少初始化记录或不使用现金开局的地图。 */
export function buildAIEconomySnapshot(
	context: AIDecisionContextSnapshot,
	initialMoney: number[] = [],
): AIDecisionEconomySnapshot {
	const medianPropertyPrice = medianPositive(context.properties.map((property) => property.sellCost));
	const configuredMoney: unknown = context.gameSetting?.initMoney?.value;
	const candidates: Array<[AIDecisionEconomySnapshot["baselineSource"], number]> = [
		["initial-money", medianPositive(initialMoney)],
		["game-setting", typeof configuredMoney === "number" ? configuredMoney : 0],
		["property-price", medianPropertyPrice],
		["player-cash", medianPositive(context.players.filter((player) => !player.isBankrupted).map((player) => player.money))],
	];
	const [baselineSource, baselineCash] = candidates.find(([, value]) => Number.isFinite(value) && value > 0)
		|| ["unavailable", 0];
	const opponentIds = new Set(context.players.filter((player) => player.id !== context.player.id && !player.isBankrupted).map((player) => player.id));
	const multiplier = Number.isFinite(context.currentMultiplier) && context.currentMultiplier > 0 ? context.currentMultiplier : 1;
	const maxOpponentRent = context.properties.reduce((highest, property) => {
		if (!property.owner || !opponentIds.has(property.owner.userId) || !property.costList.length) return highest;
		const level = Number.isFinite(property.level) ? Math.trunc(property.level) : 0;
		const rent = property.costList[Math.min(Math.max(level, 0), property.costList.length - 1)];
		return Number.isFinite(rent) ? Math.max(highest, rent * multiplier) : highest;
	}, 0);
	return { baselineCash, baselineSource, medianPropertyPrice, maxOpponentRent };
}

/** 安全线同时参考本局规模和实际租金，不设置固定金额下限。 */
export function getAIReserveCashTarget(money: number, economy: AIDecisionEconomySnapshot): number {
	const cash = Number.isFinite(money) ? Math.max(0, money) : 0;
	return Math.max(
		Math.min(Math.max(cash * 0.2, economy.baselineCash * 0.15), economy.baselineCash * 0.6),
		economy.maxOpponentRent,
	);
}
