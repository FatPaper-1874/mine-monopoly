import { EventTiggerTime, GamePhaseMark } from "../../enums/game/game-process";
import { UserInRoomInfo } from "./item";
import { ChanceCardType, PlayerMoveType } from "../../enums/game/game";
import { GameMap } from "../game/map";

// 客户端
export interface GameData {
	ping: number;
	currentPlayerIdInRound: string;
	currentRound: number;
	currentMultiplier: number;
	playersList: PlayerInfo[];
	propertiesList: PropertyInfo[];
	isGameOver: boolean;
}

// Host服务端 Worker
export type GameContext = {
	cancel?: boolean;
};

export interface IGameProcess {
	mapData: GameMap;
	players: Map<string, IPlayer>;
	properties: Map<string, IProperty>;
	chanceCards: Map<string, IChanceCard>;
	currentRoundPlayer: IPlayer | null;
	currentRound: number;
	gameEventStack: GameEvent<GameContext>[];

	pushEventToStack(gameEvent: GameEvent<GameContext>): void;
	start(): Promise<void>;
}

// 游戏事件--游戏循环中的最基础的单位
export type GameEvent<Context> = (ctx: Context) => Promise<void>;

// 游戏阶段--游戏循环的第2级单位, 包含多个游戏事件
export interface GamePhaseInfo {
	id: string;
	name: string;
	description: string;
	mark?: GamePhaseMark;
	from: string;
	initEventCode: string;
}

export interface IGamePhase<GameContext> extends GamePhaseInfo {
	eventQueue: GameEvent<GameContext>[];
	use(tiggerTime: EventTiggerTime, fn: string): void;

	getEventQueue(): GameEvent<GameContext>[];
}

// 预设的各个游戏阶段传递的内容参数
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
	arrivedProperty: PropertyInfo;
}
export interface PlayerRoundEndContext extends GameContext {
	currentRoundPlayer: IPlayer;
}
export interface GameRoundEndContext extends GameContext {}

export interface IPlayer {
	//TODO
	extras: Record<string, any>;
	roundPhases: IGamePhase<GameContext>[];

	//玩家信息
	getUser: () => UserInRoomInfo;
	getId: () => string;
	getName: () => string;

	//地产相关
	getPropertiesList: () => IProperty[];
	setPropertiesList: (newPropertiesList: IProperty[]) => void;
	gainProperty: (property: IProperty) => void;
	loseProperty: (property: IProperty) => void;

	//机会卡相关
	getCardsList: () => IChanceCard[];
	setCardsList: (newChanceCardList: IChanceCard[]) => void;
	getCardById: (cardId: string) => IChanceCard | undefined;
	gainCard: (gainCard: IChanceCard) => void;
	loseCard: (cardId: string) => void;

	//钱相关
	setMoney: (money: number) => void;
	getMoney: () => number;
	cost: (money: number, target?: IPlayer) => boolean;
	gain: (money: number, source?: IPlayer) => number;

	//游戏相关
	setStop: (stop: number) => void;
	getStop: () => number;
	setPositionIndex: (newIndex: number) => void;
	getPositionIndex: () => number;
	setBankrupted: (isBankrupted: boolean) => void;
	getIsBankrupted: () => boolean;
	walk: (step: number) => Promise<void>;
	tp: (positionIndex: number) => Promise<void>;
	updateBuff(buffId: string, newBuff: Buff): void;

	getPlayerInfo: () => PlayerInfo;
}

export interface IProperty {
	//房产信息
	getId: () => string;
	getName: () => string;
	getBuildingLevel: () => number;
	getBuildCost: () => number;
	getSellCost: () => number;
	getCost_lv0: () => number;
	getCost_lv1: () => number;
	getCost_lv2: () => number;
	getOwner: () => IPlayer | undefined;
	getPassCost: () => number;

	//设置房产信息
	setOwner: (player: IPlayer | undefined) => Promise<void>;
	setBuildingLevel: (level: number) => void;

	getPropertyInfo: () => PropertyInfo;
}

export interface IChanceCard {
	getId: () => string;
	getSourceId: () => string;
	getName: () => string;
	getDescribe: () => string;
	getIcon: () => string;
	getType: () => ChanceCardType;
	getColor: () => string;
	getEffectCode: () => string;
	use: (
		sourcePlayer: IPlayer,
		target: IPlayer | IProperty | IPlayer[] | IProperty[],
		gameProcess: IGameProcess
	) => Promise<void>;

	getChanceCardInfo: () => ChanceCardInstanceInfo;
}

export interface PlayerInfo {
	id: string;
	user: UserInRoomInfo;
	money: number;
	properties: PropertyInfo[];
	chanceCards: ChanceCardInstanceInfo[];
	buff: Buff[];
	positionIndex: number;
	stop: number;
	isBankrupted: boolean;
	isOffline: boolean;
}

export interface PropertyInfo {
	id: string;
	name: string;
	sellCost: number;
	buildCost: number;
	level: number;
	cost_lv0: number;
	cost_lv1: number;
	cost_lv2: number;
	buildingModelIdList?: string[];
	effectCode?: string;
	streetId: string;
	owner?: UserInRoomInfo;
}

export interface ChanceCardInstanceInfo extends Omit<ChanceCardInfo, "effectCode"> {
	sourceId: string;
}

export interface ChanceCardInfo {
	id: string;
	name: string;
	description: string;
	iconId: string;
	color: string;
	effectCode: string;
	type: ChanceCardType;
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

export interface Buff {
	id: string;
	name: string;
	describe: string;
	source: string;
	triggerTiming: string; //TODO
	triggerTimes: number;
}
