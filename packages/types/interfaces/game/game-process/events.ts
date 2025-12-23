import { PlayerMoveType } from "../../../../types/enums/game/game";
import { GamePhaseMark } from "../../../../types/enums/game/game-process";
import { PropertyInfo } from "./infos"; // 引用 infos
import { IPlayer } from "./entities"; // 引用 entities
import { IGameProcess } from "./core"; // 引用 core
import { DiceResult } from "../util";
import { MapEvent } from "../item";

// Host服务端 Worker
export type GameContext = {
	cancel?: boolean;
} & Record<string, any>;

export interface IGameRuntimeStack<Context extends GameContext> {
	stack: GameEvent<Context>[];
	run(context: Context, gameProcess: IGameProcess): Promise<void>;
	isEmpty(): boolean;
	push(...gameEvents: GameEvent<Context>[]): void;
	pop(): GameEvent<Context> | undefined;
}

export type GameEventFunction<Context extends GameContext> = (
	ctx: Context,
	gameProcess: IGameProcess
) => Promise<void> | void;

// 游戏事件--游戏循环中的最基础的单位
export type GameEvent<Context extends GameContext> = {
	fn: GameEventFunction<Context>;
	key?: string;
};

// 游戏阶段
export interface GamePhaseInfo {
	id: string;
	name: string;
	description: string;
	mark?: GamePhaseMark;
	from: string;
	initEventCode: string;
}

type ModifierTiming = "before" | "after";
export interface IGamePhase<Context extends GameContext> extends GamePhaseInfo {
	eventQueue: GameEvent<Context>[];
	use(tiggerTime: ModifierTiming, fn: GameEventFunction<Context>, key?: string): void;
	getEventQueue(): GameEvent<Context>[];
}

// 预设 Context
export interface GameRoundStartContext extends GameContext {}

export interface PlayerRoundContext extends GameContext {
	currentRoundPlayer: IPlayer;
}

export interface PlayerRoundStartContext extends PlayerRoundContext {}

export interface RollDiceContext extends PlayerRoundStartContext {
	diceResult: DiceResult[];
}

export interface PlayerMoveContext extends RollDiceContext {
	type: PlayerMoveType;
	targetIndex: number;
}

export interface ArrivedEventContext extends PlayerMoveContext {
	arrivedProperty: PropertyInfo;
}

export interface PlayerRoundEndContext extends ArrivedEventContext {}

export interface GameRoundEndContext extends GameContext {}

export type GameRuntimeEvent = {
	"game.round.start": void;
	"game.round.end": void;
	"player.round.start": { player: IPlayer };
	"player.round.end": { player: IPlayer };
	"player.arrived": { positionIndex: number; player: IPlayer };
	"player.passed": { passedMapItemsId: string[]; player: IPlayer };
} & Record<string, any>;

export interface RuntimeMapEvent extends MapEvent {
	fn: (player: IPlayer, gameProcess: IGameProcess) => Promise<void>;
}
