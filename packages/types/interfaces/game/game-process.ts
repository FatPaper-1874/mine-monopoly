import { EventTiggerTime, GamePhaseMark, OperateType, PlayerEvents } from "../../enums/game/game-process";
import { UserInRoomInfo } from "./item";
import { TargetSelectType, GameLinkItem, PlayerMoveType } from "../../enums/game/game";
import { GameMap } from "../game/map";
import { IDice, IRoundTimeTimer } from "./util";
import { ServerSocketMessage } from "./socket";

// 客户端
export interface GameData {
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

export interface IGameProcess {
	extraData: Record<string, any>;
	mapData: GameMap;
	players: Map<string, IPlayer>;
	properties: Map<string, IProperty>;
	chanceCardInfos: Map<string, ChanceCardInfo>;
	currentRoundPlayer: IPlayer | null;
	currentRound: number;
	gameRuntimeStack: IGameRuntimeStack<GameContext>;
	roundTimeTimer: IRoundTimeTimer; //倒计时
	diceUtil: IDice;

	handlePlayerRollDice(playerId: string): void;
	handleArriveEvent(arrivedPlayer: IPlayer): void;
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
	pushEventToStack(gameEvent: GameEvent<GameContext>): void;

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

export type GameEventFunction<Context extends GameContext> = (ctx: Context, gameProcess: IGameProcess) => Promise<void>;

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

	use(tiggerTime: EventTiggerTime, fn: string): void;

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
	buildUp: () => void;
	setOwner: (player: IPlayer | undefined) => void;
	setBuildingLevel: (level: number) => void;

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
	cost_lv0: number;
	cost_lv1: number;
	cost_lv2: number;
	buildingModelIdList?: string[];
	effectCode?: string;
	streetId: string;
	owner?: UserInRoomInfo;
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
	describe: string;
	source: string;
	type: PlayerEvents;
	triggerTiming: string; //TODO
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

export interface PlayerEventsCallback {
	[PlayerEvents.GetPropertiesList]: () => IProperty[];
	[PlayerEvents.GetCardsList]: () => IChanceCard[];
	[PlayerEvents.GetMoney]: () => number;
	[PlayerEvents.GetStop]: () => number;
	[PlayerEvents.GetIsBankrupted]: () => boolean;
	[PlayerEvents.AnimationFinished]: (value: void | PromiseLike<void>) => void;
	[PlayerEvents.Walk]: (walkValue: number) => Promise<number>;
	[PlayerEvents.Tp]: (tpValue: number) => Promise<number>;

	[PlayerEvents.BeforeSetPropertiesList]: (newPropertiesList: IProperty[]) => IProperty[] | undefined;
	[PlayerEvents.AfterSetPropertiesList]: (newPropertiesList: IProperty[]) => undefined;

	[PlayerEvents.BeforeRound]: (player: IPlayer) => Promise<IPlayer | undefined | void> | IPlayer | undefined | void;
	[PlayerEvents.AfterRound]: (player: IPlayer) => Promise<IPlayer | undefined | void> | void;

	[PlayerEvents.BeforeGainProperty]: (
		newProperty: IProperty
	) => Promise<IProperty | undefined | void> | IProperty | undefined | void;
	[PlayerEvents.AfterGainProperty]: (newProperty: IProperty) => Promise<IProperty | undefined | void> | void;

	[PlayerEvents.BeforeLoseProperty]: (
		lostProperty: IProperty
	) => Promise<IProperty | undefined | void> | IProperty | undefined | void;
	[PlayerEvents.AfterLoseProperty]: (lostProperty: IProperty) => Promise<IProperty | undefined | void> | void;

	[PlayerEvents.BeforeSetCardsList]: (
		newCardList: IChanceCard[]
	) => Promise<IChanceCard[] | undefined | void> | IChanceCard[] | undefined | void;
	[PlayerEvents.AfterSetCardsList]: (newCardList: IChanceCard[]) => Promise<IChanceCard[] | undefined | void> | void;

	[PlayerEvents.BeforeGainCard]: (
		gainCard: IChanceCard
	) => Promise<IChanceCard | undefined | void> | IChanceCard | undefined | void;
	[PlayerEvents.AfterGainCard]: (gainCard: IChanceCard) => Promise<IChanceCard | undefined | void> | void;

	[PlayerEvents.BeforeLoseCard]: (
		lostCard: IChanceCard
	) => Promise<IChanceCard | undefined | void> | IChanceCard | undefined | void;
	[PlayerEvents.AfterLoseCard]: (lostCard: IChanceCard) => Promise<IChanceCard | undefined | void> | void;

	[PlayerEvents.BeforeSetMoney]: (moneyValue: number) => Promise<number | undefined | void> | number | undefined | void;
	[PlayerEvents.AfterSetMoney]: (moneyValue: number) => Promise<number | undefined | void> | void;

	[PlayerEvents.BeforeGain]: (
		gainMoney: number,
		source?: IPlayer
	) => Promise<number | undefined | void> | number | undefined | void;
	[PlayerEvents.AfterGain]: (gainMoney: number, source?: IPlayer) => Promise<number | undefined | void> | void;

	[PlayerEvents.BeforeCost]: (
		costMoney: number,
		target?: IPlayer
	) => Promise<number | undefined | void> | number | undefined | void;
	[PlayerEvents.AfterCost]: (costMoney: number, target?: IPlayer) => Promise<number | undefined | void> | void;

	[PlayerEvents.BeforeStop]: (stopValue: number) => Promise<number | undefined | void> | number | undefined | void;
	[PlayerEvents.AfterStop]: (stopValue: number) => Promise<number | undefined | void> | void;

	[PlayerEvents.BeforeTp]: (tpValue: number) => Promise<number | undefined | void> | number | undefined | void;
	[PlayerEvents.AfterTp]: (tpValue: number) => Promise<number | undefined | void> | void;

	[PlayerEvents.BeforeWalk]: (walkValue: number) => Promise<number | undefined | void> | number | undefined | void;
	[PlayerEvents.AfterWalk]: (walkValue: number) => Promise<number | undefined | void> | void;

	[PlayerEvents.BeforeSetBankrupted]: (isBankrupted: boolean) => Promise<boolean> | boolean;
	[PlayerEvents.AfterSetBankrupted]: (isBankrupted: boolean) => Promise<boolean | undefined | void> | void;
}
