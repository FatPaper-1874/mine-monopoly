import { GamePhaseInfo } from "@mine-monopoly/types";
import { generateShortId } from "@src/utils/short-id";
import { GamePhaseMark } from "@mine-monopoly/types/enums/game/game-process";

/**
 * 系统阶段 ID 常量
 * 系统阶段使用稳定的 ID 前缀，便于跨会话识别和调试
 */
const SYSTEM_PHASE_IDS = {
	GAME_OVER_RULE: "sys-phase-game-over-rule",
	GAME_INITED: "sys-phase-game-inited",
	GAME_ROUND_START: "sys-phase-game-round-start",
	PLAYER_ROUND_START: "sys-phase-player-round-start",
	ROLL_DICE: "sys-phase-roll-dice",
	PLAYER_MOVE: "sys-phase-player-move",
	ARRIVED_EVENT: "sys-phase-arrived-event",
	PLAYER_ROUND_END: "sys-phase-player-round-end",
	GAME_ROUND_END: "sys-phase-game-round-end",
	PLAYER_PRE_INIT: "sys-phase-player-pre-init",
	PROPERTY_PRE_INIT: "sys-phase-property-pre-init",
	POST_RESTORE: "sys-phase-post-restore",
} as const;

import GameInitedPhaseDefault from "../default-code/game-inited-phase.txt?raw";
import GameOverRuleDefault from "../default-code/game-over-rule.txt?raw";
import GameRoundStartPhaseDefault from "../default-code/game-round-start-phase.txt?raw";
import PlayerRoundStartPhaseDefault from "../default-code/player-round-start-phase.txt?raw";
import RollDicePhaseDefault from "../default-code/roll-dice-phase.txt?raw";
import ArrivedEventPhaseDefault from "../default-code/arrived-event-phase.txt?raw";
import PlayerMovePhaseDefault from "../default-code/player-move-phase.txt?raw";
import PlayerRoundEndPhaseDefault from "../default-code/player-round-end-phase.txt?raw";
import GameRoundEndPhaseDefault from "../default-code/game-round-end-phase.txt?raw";
import PlayerPreInitPhaseDefault from "../default-code/player-pre-init-phase.txt?raw";
import PropertyPreInitPhaseDefault from "../default-code/property-pre-init-phase.txt?raw";
import PostRestorePhaseDefault from "../default-code/post-restore-phase.txt?raw";

export function getInitPhase() {
	const gameRoundStartPhases: GamePhaseInfo[] = new Array<GamePhaseInfo>();
	const playerRoundPhases: GamePhaseInfo[] = new Array<GamePhaseInfo>();
	const gameRoundEndPhases: GamePhaseInfo[] = new Array<GamePhaseInfo>();
	const gameInitedPhases: GamePhaseInfo[] = [gameInitedPhase];
	const gameOverRule: GamePhaseInfo[] = [gameOverRulePhase];
	const playerPreInitPhases: GamePhaseInfo[] = [playerPreInitPhase];
	const propertyPreInitPhases: GamePhaseInfo[] = [propertyPreInitPhase];
	const postRestorePhases: GamePhaseInfo[] = [postRestorePhase];

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
		playerPreInit: playerPreInitPhases,
		propertyPreInit: propertyPreInitPhases,
		gameRoundStart: gameRoundStartPhases,
		playerRound: playerRoundPhases,
		gameRoundEnd: gameRoundEndPhases,
		postRestore: postRestorePhases,
	};
}

const gameOverRulePhase: GamePhaseInfo = {
	id: SYSTEM_PHASE_IDS.GAME_OVER_RULE,
	name: "游戏结束判定规则",
	description: "游戏结束判定规则, 返回 false 表示游戏继续; 返回玩家ID数组表示游戏结束, 数组顺序即为排名（索引0为第一名）",
	from: "系统",
	mark: GamePhaseMark.GameRoundStart,
	initEventCode: GameOverRuleDefault,
};

const gameInitedPhase: GamePhaseInfo = {
	id: SYSTEM_PHASE_IDS.GAME_INITED,
	name: "游戏初始化结束",
	description: "游戏初始化结束阶段",
	from: "系统",
	mark: GamePhaseMark.GameRoundStart,
	initEventCode: GameInitedPhaseDefault,
};

const gameRoundStartPhase: GamePhaseInfo = {
	id: SYSTEM_PHASE_IDS.GAME_ROUND_START,
	name: "轮次开始",
	description: "轮次开始阶段",
	from: "系统",
	mark: GamePhaseMark.GameRoundStart,
	initEventCode: GameRoundStartPhaseDefault,
};

const playerRoundStartPhase: GamePhaseInfo = {
	id: SYSTEM_PHASE_IDS.PLAYER_ROUND_START,
	name: "玩家回合开始",
	description: "玩家回合开始阶段",
	from: "系统",
	mark: GamePhaseMark.PlayerRoundStart,
	initEventCode: PlayerRoundStartPhaseDefault,
};

const rollDicePhase: GamePhaseInfo = {
	id: SYSTEM_PHASE_IDS.ROLL_DICE,
	name: "玩家操作",
	description: "玩家操作阶段",
	from: "系统",
	mark: GamePhaseMark.RollDice,
	initEventCode: RollDicePhaseDefault,
};

const playerMovePhase: GamePhaseInfo = {
	id: SYSTEM_PHASE_IDS.PLAYER_MOVE,
	name: "玩家移动",
	description: "玩家移动阶段",
	from: "系统",
	mark: GamePhaseMark.PlayerMove,
	initEventCode: PlayerMovePhaseDefault,
};

const arrivedEventPhase: GamePhaseInfo = {
	id: SYSTEM_PHASE_IDS.ARRIVED_EVENT,
	name: "到达事件",
	description: "到达事件阶段",
	from: "系统",
	mark: GamePhaseMark.ArrivedEvent,
	initEventCode: ArrivedEventPhaseDefault,
};

const playerRoundEndPhase: GamePhaseInfo = {
	id: SYSTEM_PHASE_IDS.PLAYER_ROUND_END,
	name: "玩家回合结束",
	description: "玩家回合结束阶段",
	from: "系统",
	mark: GamePhaseMark.PlayerRoundEnd,
	initEventCode: PlayerRoundEndPhaseDefault,
};

const gameRoundEndPhase: GamePhaseInfo = {
	id: SYSTEM_PHASE_IDS.GAME_ROUND_END,
	name: "轮次结束",
	description: "轮次结束阶段",
	from: "系统",
	mark: GamePhaseMark.GameRoundEnd,
	initEventCode: GameRoundEndPhaseDefault,
};

const playerPreInitPhase: GamePhaseInfo = {
	id: SYSTEM_PHASE_IDS.PLAYER_PRE_INIT,
	name: "玩家预初始化",
	description: "玩家预初始化阶段（在玩家初始化之前运行）",
	from: "系统",
	initEventCode: PlayerPreInitPhaseDefault,
};

const propertyPreInitPhase: GamePhaseInfo = {
	id: SYSTEM_PHASE_IDS.PROPERTY_PRE_INIT,
	name: "地皮预初始化",
	description: "地皮预初始化阶段（在地皮初始化之前运行）",
	from: "系统",
	initEventCode: PropertyPreInitPhaseDefault,
};

const postRestorePhase: GamePhaseInfo = {
	id: SYSTEM_PHASE_IDS.POST_RESTORE,
	name: "存档恢复后",
	description: "存档恢复后阶段（在 restoreFromSnapshot 之后、GameInit 广播之前运行，仅在有存档数据时执行一次）",
	from: "系统",
	initEventCode: PostRestorePhaseDefault,
};
