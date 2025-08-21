import { EventTiggerTime, GamePhaseMark } from "../../enums/game/game-process";
import { User } from "../common/index";
import { Buff, IChanceCard, IProperty, Street } from "./item";
import { PlayerMoveType } from "../../enums/game/game";
import { GameMap } from "../game/map";

export interface IGameProcess {
	playerList: IPlayer[];
	mapData: GameMap;
	currentRoundPlayer: IPlayer;
	gameEventStack: GameEvent<GameContext>[];

	pushEventToStack(gameEvent: GameEvent<GameContext>): void;
	runPhase(gamePhase: IGamePhase<GameContext>): void;
	run(): Promise<void>;
}

export interface IGameLoop {
	start(): Promise<void>;
}

// export interface IGameRound {
// 	playerInRound: IPlayer;
// 	phases: IGamePhase<any>[];
// 	phaseCache: IGamePhase<any>[];
// 	run(): Promise<void>;
// 	addPhase(phase: IGamePhase<any>): void;
// 	removePhase(id: string): void;
// }

export type GameEvent<Context> = (ctx: Context) => Promise<void>;

export interface IGamePhase<Context extends GameContext> extends GamePhaseInfo {
	new (initEvent: GameEvent<Context>): IGamePhase<Context>;
	initEvent: GameEvent<Context>;
	eventQueue: GameEvent<Context>[];
	use(tiggerTime: EventTiggerTime, fn: GameEvent<Context>): void;

	getEventQueue(): GameEvent<Context>[];
}

export interface GamePhaseInfo {
	id: string;
	name: string;
	description: string;
	mark?: GamePhaseMark;
	from: string;
	initEventCode: string;
}

export type GameContext = {
	cancel?: boolean;
};

export interface GameRoundStartContext extends GameContext {}
export interface PlayerRoundStartContext extends GameContext {
	currentRoundPlayer: IPlayer;
}
export interface RollDiceContext extends GameContext {
	currentRoundPlayer: IPlayer;
	dice: number[];
}
export interface PlayerMoveContext extends GameContext {
	currentRoundPlayer: IPlayer;
	type: PlayerMoveType;
	targetIndex: number;
}
export interface ArrivedEventContext extends GameContext {
	currentRoundPlayer: IPlayer;
	arrivedProperty: IProperty;
}
export interface PlayerRoundEndContext extends GameContext {
	currentRoundPlayer: IPlayer;
}
export interface GameRoundEndContext extends GameContext {}

export interface IPlayer {
	//TODO
	id: string;
	user: User;
	money: number;
	properties: PropertyInfo[];
	chanceCards: ChanceCardInfo[];
	buff: Buff[];
	positionIndex: number;
	isBankrupted: boolean;
	isOffline: boolean;
}

export interface PropertyInfo extends IProperty {
	owner?: PlayerInfo;
}

export interface ChanceCardInfo extends IChanceCard {}

export interface PlayerInfo extends Omit<IPlayer, ""> {
	//TODO
}

// export interface GameHooks {
// 	onGameRoundStart?: (tiggerTime: EventTiggerTime, ctx: GameContext) => Promise<void>;
// 	onPlayerRoundStart?: (tiggerTime: EventTiggerTime, ctx: GameContext) => Promise<void>;
// 	onRollDice?: (tiggerTime: EventTiggerTime, ctx: GameContext) => Promise<void>;
// 	onPlayerMove?: (tiggerTime: EventTiggerTime, ctx: GameContext) => Promise<void>;
// 	onArrivedEvent?: (tiggerTime: EventTiggerTime, ctx: GameContext) => Promise<void>;
// 	onPlayerRoundEnd?: (tiggerTime: EventTiggerTime, ctx: GameContext) => Promise<void>;
// 	onGameRoundEnd?: (tiggerTime: EventTiggerTime, ctx: GameContext) => Promise<void>;
// }
