import { GameLinkItem, TargetSelectType, PlayerMoveType } from "../../../../types/enums/game/game";
import { OperateType, GamePhaseMark, EventTiggerTime } from "../../../../types/enums/game/game-process";
import { IModifier, PlayerCommandMap } from "../action-system";
import { UserInRoomInfo } from "../item";
import { GameMap } from "../map";
import { ServerSocketMessage } from "../socket";
import { IRoundTimeTimer, IDice } from "../util";

// 客户端
export interface GameData {
	extra: { [key: string]: any };
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
} & Record<string, any>;

export interface GameSetting {
	[key: string]: { label: string; value: any; displayValue: any };
}

export interface IGameProcess {
	extraData: Record<string, any>;
	mapData: GameMap;
	gameSetting: GameSetting;
	players: Map<string, IPlayer>;
	properties: Map<string, IProperty>;
	chanceCardInfos: Map<string, ChanceCardInfo>;
	currentRoundPlayer: IPlayer | null;
	currentRound: number;
	gameRuntimeStack: IGameRuntimeStack<GameContext>;
	roundTimeTimer: IRoundTimeTimer; //倒计时
	diceUtil: IDice;
	gameOverRuleFunction: () => Promise<boolean>;

	handlePlayerRollDice(playerId: string): Promise<void>;
	handleArriveEvent(arrivedPlayer: IPlayer): Promise<void>;
	handleUseChanceCard(sourcePlayer: IPlayer, chanceCardId: string, targetIdList: string[]): Promise<boolean>;
	roundTurnNotify(playerId: string): void;

	emitPlayerOperation<T extends OperateType>(playerId: string, operationType: T, data: PlayerOperationResult[T]): void;
	oncePlayerOperationAsync<T extends OperateType>(
		playerId: string,
		operationType: T
	): Promise<PlayerOperationResult[T]>;
	onPlayerOperationAsync<T extends OperateType>(playerId: string, operationType: T): Promise<PlayerOperationResult[T]>;
	oncePlayerOperation<T extends OperateType>(
		playerId: string,
		operationType: T,
		callback: (res: PlayerOperationResult[T]) => void
	): void;
	onPlayerOperation<T extends OperateType>(
		playerId: string,
		operationType: T,
		callback: (res: PlayerOperationResult[T]) => void
	): void;
	removePlayerOperationListener<T extends OperateType>(
		playerId: string,
		operationType: T,
		listener: (...args: any[]) => PlayerOperationResult[T]
	): void;
	removePlayerAllOperationListener<T extends OperateType>(playerId: string, operationType?: T): void;

	pushEventToStack(gameEvent: GameEvent<GameContext>): void;
	generateNewChanceCard(sourceId: string): IChanceCard;

	createGameLinkItem(type: GameLinkItem, id: string): void;
	sendToPlayer(id: string, msg: ServerSocketMessage): void;
	gameInfoBroadcast(): void;
	gameMsgNotifyBroadcast(type: "success" | "warning" | "error" | "info", msg: string): void;
	gameLogBroadcast(log: string): void;
	gameBroadcast(msg: ServerSocketMessage): void;

	showConfirmDialog<I extends InputOptionItem<string, any>[]>(
		playerId: string,
		option: ConfirmDialogOption<I>
	): Promise<ConfirmDialogResult<I>>;
	showTargetSelectDialog<I extends TargetSelectType>(
		playerId: string,
		option: SelectDialogOption<I>
	): Promise<SelectDialogResult<I>>;

	checkGameOver(): Promise<void>;
}

interface DialogOption {
	title: string;
	content: string;
	confirmText?: string;
	cancelText?: string;
}

export interface SelectDialogOption<I extends TargetSelectType> extends DialogOption {
	type: I;
}

export interface SelectDialogResult<I extends TargetSelectType> {
	target: TargetSelectResult[I];
}

export interface TargetSelectResult {
	[TargetSelectType.ToMapItem]: string[];
	[TargetSelectType.ToPlayer]: string[];
	[TargetSelectType.ToOtherPlayer]: string[];
	[TargetSelectType.ToSelf]: string[];
	[TargetSelectType.ToProperty]: string[];
}

export interface ConfirmDialogOption<I extends readonly InputOptionItem<string, any>[]> extends DialogOption {
	inputOptions?: I;
}

export type InputOptionItem<K extends string, D> = {
	key: K;
	label: string;
	initData: D;
};

export type ConfirmDialogResult<I extends readonly InputOptionItem<string, any>[]> = {
	[P in I[number] as P["key"]]: P["initData"];
} & { confirm: boolean };

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

// 游戏阶段--游戏循环的第2级单位, 包含多个游戏事件
export interface GamePhaseInfo {
	id: string;
	name: string;
	description: string;
	mark?: GamePhaseMark;
	from: string;
	initEventCode: string;
}

export interface IGamePhase<Context extends GameContext> extends GamePhaseInfo {
	eventQueue: GameEvent<Context>[];

	use(tiggerTime: EventTiggerTime, fn: GameEventFunction<Context>, key?: string): void;

	getEventQueue(): GameEvent<Context>[];
}

// 预设的各个游戏阶段传递的内容参数
export interface GameRoundStartContext extends GameContext {}

export interface PlayerRoundContext extends GameContext {
	currentRoundPlayer: IPlayer;
}

export interface PlayerRoundStartContext extends PlayerRoundContext {}

export interface RollDiceContext extends PlayerRoundStartContext {
	dice: number[];
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
	gainProperty: (property: IProperty) => Promise<void>;
	loseProperty: (property: IProperty) => Promise<void>;

	//机会卡相关
	getCardsList: () => IChanceCard[];
	setCardsList: (newChanceCardList: IChanceCard[]) => void;
	getCardById: (cardId: string) => IChanceCard | undefined;
	gainCard: (gainCard: IChanceCard) => Promise<void>;
	loseCard: (cardId: string) => Promise<void>;

	//钱相关
	setMoney: (money: number) => void;
	getMoney: () => number;
	cost: (money: number, target?: IPlayer) => Promise<void>;
	gain: (money: number, source?: IPlayer) => Promise<void>;

	//游戏相关
	setStop: (stop: number) => void;
	getStop: () => number;
	setPositionIndex: (newIndex: number) => void;
	getPositionIndex: () => number;
	setBankrupted: (isBankrupted: boolean) => void;
	getIsBankrupted: () => boolean;
	walk: (step: number) => Promise<void>;
	tp: (positionIndex: number) => Promise<void>;

	//注册修饰器
	registerModifier<K extends keyof PlayerCommandMap>(modifier: IModifier<PlayerCommandMap, K>): void;

	getPlayerInfo: () => PlayerInfo;
	getRoundPhases: () => IGamePhase<GameContext>[];
}

export interface IProperty {
	//房产信息
	getId: () => string;
	getName: () => string;
	getBuildingLevel: () => number;
	getBuildCost: () => number;
	getSellCost: () => number;
	getCostList: () => number[];
	getMaxLevel: () => number;
	getOwner: () => IPlayer | undefined;
	getOriginalData: () => PropertyInfo;

	//设置房产信息
	levelUp: () => Promise<void>;
	levelDown: () => Promise<void>;
	setOwner: (player: IPlayer | undefined) => Promise<void>;
	setLevel: (level: number) => Promise<void>;
	arrived: (player: IPlayer) => Promise<void>;

	getPropertyInfo: () => PropertyInfo;
}

export interface IChanceCard {
	getId: () => string;
	getSourceId: () => string;
	getName: () => string;
	getDescribe: () => string;
	getIcon: () => string;
	getType: () => TargetSelectType;
	getColor: () => string;
	getEffectCode: () => string;
	use: (
		sourcePlayer: IPlayer,
		target: IPlayer | IProperty | IPlayer[] | IProperty[],
		gameProcess: IGameProcess
	) => Promise<void>;

	getChanceCardInfo: () => ChanceCardClientInfo;
}

export interface PlayerInfo {
	id: string;
	user: UserInRoomInfo;
	money: number;
	properties: PropertyInfo[];
	chanceCards: ChanceCardClientInfo[];
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
	maxLevel: number;
	costList: number[];
	streetId: string;
	buildingModelIdList?: string[];
	owner?: UserInRoomInfo;
	custom?: {
		effectCode: string;
	};
}

export interface ChanceCardClientInfo extends Omit<ChanceCardInstanceInfo, "effectCode"> {}

export interface ChanceCardInstanceInfo extends ChanceCardInfo {
	sourceId: string;
}

export interface ChanceCardInfo {
	id: string;
	name: string;
	description: string;
	iconId: string;
	color: string;
	effectCode: string;
	type: TargetSelectType;
}

export interface Buff {
	id: string;
	name: string;
	description: string;
	source: string;
	triggerTiming: string;
	triggerTimes: number;
}

export interface PlayerOperationResult {
	[OperateType.GameInitFinished]: undefined;
	[OperateType.RollDice]: undefined;
	[OperateType.UseChanceCard]: { chanceCardId: string; targetIdList: string[] };
	[OperateType.Animation]: string;
	[OperateType.PauseGame]: undefined;
	[OperateType.ResumeGame]: undefined;
	[OperateType.ConfirmDialogResult]: { id: string; confirm: boolean; data: any };
	[OperateType.SelectDialogResult]: SelectDialogResult<TargetSelectType>;
	// [key: string]: any;
}
