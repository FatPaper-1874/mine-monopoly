import { GamePhaseInfo } from "@mine-monopoly/types";
import { GamePhaseMark } from "@mine-monopoly/types/enums/game/game-process";
import GameInitedPhaseDefault from "../default-code/game-inited-phase.txt?raw";
import GameOverRuleDefault from "../default-code/game-over-rule.txt?raw";
import GameRoundStartPhaseDefault from "../default-code/game-round-start-phase.txt?raw";
import PlayerRoundStartPhaseDefault from "../default-code/player-round-start-phase.txt?raw";
import RollDicePhaseDefault from "../default-code/roll-dice-phase.txt?raw";
import ArrivedEventPhaseDefault from "../default-code/arrived-event-phase.txt?raw";
import PlayerMovePhaseDefault from "../default-code/player-move-phase.txt?raw";
import PlayerRoundEndPhaseDefault from "../default-code/player-round-end-phase.txt?raw";
import GameRoundEndPhaseDefault from "../default-code/game-round-end-phase.txt?raw";

export function getInitPhase() {
	const gameRoundStartPhases: GamePhaseInfo[] = new Array<GamePhaseInfo>();
	const playerRoundPhases: GamePhaseInfo[] = new Array<GamePhaseInfo>();
	const gameRoundEndPhases: GamePhaseInfo[] = new Array<GamePhaseInfo>();
	const gameInitedPhases: GamePhaseInfo[] = [gameInitedPhase];
	const gameOverRule: GamePhaseInfo[] = [gameOverRulePhase];

	gameRoundStartPhases.push(gameRoundStartPhase);
	playerRoundPhases.push(playerRoundStartPhase);
	playerRoundPhases.push(rollDicePhase);
	playerRoundPhases.push(playerMovePhase);
	playerRoundPhases.push(arrivedEventPhase);
	playerRoundPhases.push(playerRoundEndPhase);
	gameRoundEndPhases.push(gameRoundEndPhase);
	return {
		gameOverRule: gameOverRule,
		gameInited: gameInitedPhases,
		gameRoundStart: gameRoundStartPhases,
		playerRound: playerRoundPhases,
		gameRoundEnd: gameRoundEndPhases,
	};
}

const gameOverRulePhase: GamePhaseInfo = {
	id: crypto.randomUUID(),
	name: "游戏结束判定规则",
	description: "游戏结束判定规则, 返回一个布尔值, 当返回值为true时游戏结束",
	from: "系统",
	mark: GamePhaseMark.GameRoundStart,
	initEventCode: GameOverRuleDefault,
};

const gameInitedPhase: GamePhaseInfo = {
	id: crypto.randomUUID(),
	name: "游戏初始化结束",
	description: "游戏初始化结束阶段",
	from: "系统",
	mark: GamePhaseMark.GameRoundStart,
	initEventCode: GameInitedPhaseDefault,
};

const gameRoundStartPhase: GamePhaseInfo = {
	id: crypto.randomUUID(),
	name: "轮次开始",
	description: "轮次开始阶段",
	from: "系统",
	mark: GamePhaseMark.GameRoundStart,
	initEventCode: GameRoundStartPhaseDefault,
};

const playerRoundStartPhase: GamePhaseInfo = {
	id: crypto.randomUUID(),
	name: "玩家回合开始",
	description: "玩家回合开始阶段",
	from: "系统",
	mark: GamePhaseMark.PlayerRoundStart,
	initEventCode: PlayerRoundStartPhaseDefault,
};

const rollDicePhase: GamePhaseInfo = {
	id: crypto.randomUUID(),
	name: "玩家操作",
	description: "玩家操作阶段",
	from: "系统",
	mark: GamePhaseMark.RollDice,
	initEventCode: RollDicePhaseDefault,
};

const playerMovePhase: GamePhaseInfo = {
	id: crypto.randomUUID(),
	name: "玩家移动",
	description: "玩家移动阶段",
	from: "系统",
	mark: GamePhaseMark.PlayerMove,
	initEventCode: PlayerMovePhaseDefault,
};

const arrivedEventPhase: GamePhaseInfo = {
	id: crypto.randomUUID(),
	name: "到达事件",
	description: "到达事件阶段",
	from: "系统",
	mark: GamePhaseMark.ArrivedEvent,
	initEventCode: ArrivedEventPhaseDefault,
};

const playerRoundEndPhase: GamePhaseInfo = {
	id: crypto.randomUUID(),
	name: "玩家回合结束",
	description: "玩家回合结束阶段",
	from: "系统",
	mark: GamePhaseMark.PlayerRoundEnd,
	initEventCode: PlayerRoundEndPhaseDefault,
};

const gameRoundEndPhase: GamePhaseInfo = {
	id: crypto.randomUUID(),
	name: "轮次结束",
	description: "轮次结束阶段",
	from: "系统",
	mark: GamePhaseMark.GameRoundEnd,
	initEventCode: GameRoundEndPhaseDefault,
};
