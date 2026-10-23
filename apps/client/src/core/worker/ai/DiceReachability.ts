import type { AIDecisionContextSnapshot, AIDiceReachabilitySnapshot, MapMoveDirection, MapPath } from "@mine-monopoly/types";
import { buildMapPathAdjacency, getAvailableMapPaths } from "@mine-monopoly/utils";

interface HistoryEntry {
	pathId: string;
	fromMapItemId: string;
	toMapItemId: string;
	direction: MapMoveDirection;
}

interface ReachabilityInput {
	context: AIDecisionContextSnapshot;
	mapPaths: readonly MapPath[];
	enabledPathIds: ReadonlySet<string>;
	conditionalPathIds: ReadonlySet<string>;
	movementHistory: readonly HistoryEntry[];
	returnFromMapItemId?: string;
	movementModifiers?: string[];
}

interface NavigationState {
	position: string;
	history: HistoryEntry[];
	returnFrom?: string;
	conditional: boolean;
	movedSteps: number;
	stopped: boolean;
}

// 仅保护 Worker 的计算时间；达到预算时明确返回“无法可靠计算”，不伪造或截断落点。
const MAX_WORK = 100_000;

/** 纯计算：不掷骰、不执行命令、通行回调、修饰器或事件，不改写玩家导航状态。 */
export function buildDiceReachability(input: ReachabilityInput): AIDiceReachabilitySnapshot {
	const { context, mapPaths } = input;
	const { player } = context;
	const dices = player.dices || [];
	const origin = player.positionMapItemId || context.mapIndex[player.positionIndex];
	const notes = new Set<string>();
	const base: AIDiceReachabilitySnapshot = { status: "ready", originMapItemId: origin, diceCount: dices.length, rolls: [], notes: [] };
	const unavailable = (reason: string): AIDiceReachabilitySnapshot => ({ ...base, status: "unavailable", rolls: [], notes: [...notes, reason] });
	if (player.isBankrupted) return { ...base, status: "bankrupted", notes: ["玩家已破产，不预测本次掷骰移动。"] };
	if (player.stop > 0) return { ...base, status: "stopped", notes: [`当前还需暂停 ${player.stop} 回合；以下回合恢复行动后需重新计算。`] };
	const itemById = new Map(context.mapItems.map((item) => [item.id, item]));
	if (!origin || !itemById.has(origin)) return unavailable("当前位置无效，无法计算骰子落点。");
	let work = 0;
	let totals = new Map<number, number>([[0, 1]]);
	for (const dice of dices) {
		// 与 Dice.roll 保持一致：当前实现只将真值 prophecy 作为指定点数，0 不生效。
		const values = dice.prophecy ? [dice.prophecy] : dice.diceValues;
		if (!values?.length || values.some((value) => !Number.isFinite(value))) return unavailable("骰子面值或指定点数无效，无法可靠计算。");
		const faces = new Map<number, number>();
		for (const value of values) faces.set(value, (faces.get(value) || 0) + 1 / values.length);
		const next = new Map<number, number>();
		for (const [sum, probability] of totals) {
			for (const [value, chance] of faces) {
				if (++work > MAX_WORK) return unavailable("骰子组合计算量过大，未生成可靠落点。");
				const total = sum + value;
				if (!Number.isFinite(total)) return unavailable("骰子合计点数超出有效范围。");
				next.set(total, (next.get(total) || 0) + probability * chance);
			}
		}
		totals = next;
	}
	const maxSteps = [...totals.keys()].reduce((max, total) => Math.max(max, Math.ceil(Math.abs(total))), 0);
	if (maxSteps > MAX_WORK) return unavailable("移动步数过大，未生成可靠落点。");
	const pathsById = new Map(mapPaths.map((path) => [path.id, path]));
	const adjacency = buildMapPathAdjacency(mapPaths);
	const eventById = new Map(context.mapEvents.map((event) => [event.id, event]));
	const modifiers = input.movementModifiers || [];
	if (modifiers.length) notes.add(`存在可能改变掷骰或移动结果的效果：${modifiers.join("；")}。以下按当前基础骰子和地形计算，未执行这些效果。`);
	if (!dices.length) notes.add("当前没有骰子，基础点数合计为 0，停留在原地。");
	for (const [total, probability] of [...totals].sort(([left], [right]) => left - right)) {
		const steps = Math.ceil(Math.abs(total));
		const reverse = total < 0;
		let states: NavigationState[] = [{ position: origin, history: input.movementHistory.slice(-steps - 1).map((entry) => ({ ...entry })), returnFrom: input.returnFromMapItemId,
			conditional: modifiers.length > 0, movedSteps: 0, stopped: false }];
		for (let step = 0; step < steps; step++) {
			const next: NavigationState[] = [];
			for (const state of states) {
				if ((work += state.history.length + 1) > MAX_WORK) return unavailable("可达状态计算量过大，未生成可靠落点。");
				if (state.stopped) { next.push(state); continue; }
				let history = state.history;
				let returnFrom = state.returnFrom;
				if (history.length && history[history.length - 1].toMapItemId !== state.position) { history = []; returnFrom = undefined; }
				const previous = history[history.length - 1];
				const incoming = previous?.fromMapItemId;
				const advance = (path: MapPath, target: string, direction: MapMoveDirection, backtrack: boolean, conditional: boolean) => {
					if (!itemById.has(target)) { next.push({ ...state, history, conditional: true, stopped: true }); notes.add("存在指向无效地点的地形连接，相关落点不能保证。"); return; }
					let nextHistory = history;
					if (backtrack) nextHistory = history.slice(0, -1);
					else if (!reverse) nextHistory = [...history, { pathId: path.id, fromMapItemId: state.position, toMapItemId: target, direction }];
					const eventId = itemById.get(target)?.mapEventId;
					const passedEvent = eventId && eventById.get(eventId)?.type === "PassedEvent";
					if (passedEvent) notes.add("行走中会经过触发事件的地块；事件可能改变位置、通行状态或资源，相关结果仅为不执行事件的基础预测。");
					next.push({ position: target, history: nextHistory, returnFrom: backtrack && !reverse ? state.position : undefined,
						conditional: state.conditional || conditional || Boolean(passedEvent), movedSteps: state.movedSteps + 1, stopped: false });
				};
				const backtrack = () => {
					const path = previous && pathsById.get(previous.pathId);
					if (!path) { next.push({ ...state, history, stopped: true }); return; }
					const direction = previous.direction === "forward" ? "reverse" : "forward";
					const guarded = direction === "forward" && input.conditionalPathIds.has(path.id);
					if (guarded) {
						notes.add("存在带动态通行条件的连接；未执行有副作用的通行回调，相关结果不能保证。");
						next.push({ ...state, history, conditional: true, stopped: true });
					}
					advance(path, previous.fromMapItemId, direction, true, guarded);
				};
				if (reverse && previous) { backtrack(); continue; }
				const seenTargets = new Set<string>();
				const candidates = getAvailableMapPaths(adjacency, state.position, reverse ? "reverse" : "forward", input.enabledPathIds)
					.map((path) => ({ path, target: reverse ? path.fromMapItemId : path.toMapItemId }))
					.filter(({ target }) => { if (seenTargets.has(target)) return false; seenTargets.add(target); return true; })
					.filter(({ target }) => reverse || (target !== incoming && target !== returnFrom));
				if (!candidates.length) {
					if (!reverse && previous) backtrack();
					else next.push({ ...state, history, stopped: true });
					continue;
				}
				// AI 按原始顺序自动选择；前一条带条件连接被拒绝时才尝试下一条，不假定随机选岔路。
				let conditional = state.conditional;
				let allMayReject = true;
				for (const { path, target } of candidates) {
					const guarded = !reverse && input.conditionalPathIds.has(path.id);
					advance(path, target, reverse ? "reverse" : "forward", false, conditional || guarded);
					if (!guarded) { allMayReject = false; break; }
					conditional = true;
					notes.add("存在带动态通行条件的连接；未执行有副作用的通行回调，相关结果不能保证。");
				}
				if (allMayReject) next.push({ ...state, history, conditional: true, stopped: true });
			}
			const unique = new Map<string, NavigationState>();
			for (const state of next) {
				const key = JSON.stringify([state.position, state.history, state.returnFrom, state.conditional, state.movedSteps, state.stopped]);
				if (!unique.has(key)) unique.set(key, state);
			}
			states = [...unique.values()];
		}
		const landings = new Map<string, AIDiceReachabilitySnapshot["rolls"][number]["landings"][number]>();
		for (const state of states) {
			const landing = { mapItemId: state.position, movedSteps: state.movedSteps, conditional: state.conditional, stoppedEarly: state.movedSteps < steps };
			landings.set(JSON.stringify(landing), landing);
		}
		base.rolls.push({ total, probability, landings: [...landings.values()] });
	}
	base.notes = [...notes, "这是本地按当前基础骰子与地形计算的落点；不预执行到达事件、地图阶段脚本或道具效果。点数概率不是受动态效果影响后的最终到达概率。"];
	return base;
}
