import { GamePhaseInfo } from "@fatpaper-monopoly/types";
import { GamePhaseMark } from "@fatpaper-monopoly/types/enums/game/game-process";

export function getInitPhase() {
	const gameRoundStartPhases: GamePhaseInfo[] = new Array<GamePhaseInfo>();
	const playerRoundPhases: GamePhaseInfo[] = new Array<GamePhaseInfo>();
	const gameRoundEndPhases: GamePhaseInfo[] = new Array<GamePhaseInfo>();

	gameRoundStartPhases.push(gameRoundStartPhase);
	playerRoundPhases.push(playerRoundStartPhase);
	playerRoundPhases.push(rollDicePhase);
	playerRoundPhases.push(playerMovePhase);
	playerRoundPhases.push(arrivedEventPhase);
	playerRoundPhases.push(playerRoundEndPhase);
	gameRoundEndPhases.push(gameRoundEndPhase);
	return {
		gameRoundStart: gameRoundStartPhases,
		playerRound: playerRoundPhases,
		gameRoundEnd: gameRoundEndPhases,
	};
}

const gameRoundStartPhase: GamePhaseInfo = {
	id: crypto.randomUUID(),
	name: "轮次开始",
	description: "轮次开始阶段",
	from: "系统",
	mark: GamePhaseMark.GameRoundStart,
	initEventCode: `return (async (context, gameProcess) => {

}) as GameEventFunction<GameRoundStartContext>;`,
};

const playerRoundStartPhase: GamePhaseInfo = {
	id: crypto.randomUUID(),
	name: "玩家回合开始",
	description: "玩家回合开始阶段",
	from: "系统",
	mark: GamePhaseMark.PlayerRoundStart,
	initEventCode: `return (async (context, gameProcess) => {
	
}) as GameEventFunction<PlayerRoundStartContext>;`,
};

const rollDicePhase: GamePhaseInfo = {
	id: crypto.randomUUID(),
	name: "玩家掷骰子",
	description: "玩家掷骰子阶段",
	from: "系统",
	mark: GamePhaseMark.RollDice,
	initEventCode: `return (async (context, gameProcess) => {
	
}) as GameEventFunction<RollDiceContext>;`,
};

const playerMovePhase: GamePhaseInfo = {
	id: crypto.randomUUID(),
	name: "玩家移动",
	description: "玩家移动阶段",
	from: "系统",
	mark: GamePhaseMark.PlayerMove,
	initEventCode: `return (async (context, gameProcess) => {
	
}) as GameEventFunction<PlayerMoveContext>;`,
};

const arrivedEventPhase: GamePhaseInfo = {
	id: crypto.randomUUID(),
	name: "到达事件",
	description: "到达事件阶段",
	from: "系统",
	mark: GamePhaseMark.ArrivedEvent,
	initEventCode: `return (async (context, gameProcess) => {
	
}) as GameEventFunction<ArrivedEventContext>;`,
};

const playerRoundEndPhase: GamePhaseInfo = {
	id: crypto.randomUUID(),
	name: "玩家回合结束",
	description: "玩家回合结束阶段",
	from: "系统",
	mark: GamePhaseMark.PlayerRoundEnd,
	initEventCode: `return (async (context, gameProcess) => {
	
}) as GameEventFunction<PlayerRoundEndContext>;`,
};

const gameRoundEndPhase: GamePhaseInfo = {
	id: crypto.randomUUID(),
	name: "轮次结束",
	description: "轮次结束阶段",
	from: "系统",
	mark: GamePhaseMark.GameRoundEnd,
	initEventCode: `return (async (context, gameProcess) => {
	
}) as GameEventFunction<GameRoundEndContext>;`,
};
