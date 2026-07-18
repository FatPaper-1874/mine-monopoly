import { AIDecisionRequest, AIStrategyState } from "@mine-monopoly/types";

type AIDecisionFeedback = {
	playerId: string;
	request: AIDecisionRequest;
	selectedOptionLabel?: string;
	selectedSourceSystem?: string;
	outcome?: string;
};

function clamp(value: number, min: number, max: number): number {
	return Math.min(max, Math.max(min, value));
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

export class StrategyStateManager {
	private readonly stateByPlayer = new Map<string, AIStrategyState>();
	private recentDecisionLimit = 6;

	getState(playerId: string): AIStrategyState | undefined {
		return this.stateByPlayer.get(playerId);
	}

	setRecentDecisionLimit(limit: number): void {
		this.recentDecisionLimit = Math.max(0, Math.floor(limit));
		if (this.recentDecisionLimit === 0) {
			for (const [playerId, state] of this.stateByPlayer.entries()) {
				this.stateByPlayer.set(playerId, {
					posture: state.posture,
					focusPlayerId: state.focusPlayerId,
					focusPropertyIds: state.focusPropertyIds,
					reserveCashTarget: state.reserveCashTarget,
					lastDecisionAtRound: state.lastDecisionAtRound,
				});
			}
			return;
		}

		for (const [playerId, state] of this.stateByPlayer.entries()) {
			this.stateByPlayer.set(playerId, {
				...state,
				recentDecisionSummaries: state.recentDecisionSummaries?.slice(-this.recentDecisionLimit),
			});
		}
	}

	derive(request: AIDecisionRequest): AIStrategyState {
		const current =
			this.recentDecisionLimit > 0
				? (this.stateByPlayer.get(request.playerId) || {})
				: {};
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

		const nextState: AIStrategyState = {
			...current,
			posture,
			reserveCashTarget,
			focusPlayerId: leadingOpponent?.id,
			focusPropertyIds:
				leadingOpponent?.properties?.map((property) => property.id).slice(0, 3) || current.focusPropertyIds,
			preferredSystems,
			lastDecisionAtRound: request.context.currentRound,
		};
		this.stateByPlayer.set(request.playerId, nextState);
		return nextState;
	}

	feedback(feedback: AIDecisionFeedback): void {
		if (this.recentDecisionLimit <= 0) {
			return;
		}
		const current = this.stateByPlayer.get(feedback.playerId) || {};
		const recentDecisionSummaries = [
			...(current.recentDecisionSummaries || []),
			`${feedback.request.title}:${feedback.selectedOptionLabel || "skip"}:${feedback.outcome || "done"}`,
		].slice(-this.recentDecisionLimit);
		const preferredSystems = Array.from(
			new Set([
				...(current.preferredSystems || []),
				...(feedback.selectedSourceSystem ? [feedback.selectedSourceSystem] : []),
			]),
		);

		this.stateByPlayer.set(feedback.playerId, {
			...current,
			preferredSystems,
			recentDecisionSummaries,
			lastDecisionAtRound: feedback.request.context.currentRound,
		});
	}
}
