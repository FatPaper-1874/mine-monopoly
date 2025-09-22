declare enum OperateType {
	GameInitFinished = "GameInitFinished",//前端加载完毕
	RollDice = "RollDice",//前端掷骰子
	UseChanceCard = "UseChanceCard",//使用机会卡
	Animation = "AnimationComplete",//前端动画完成回馈
	BuyProperty = "BuyProperty",//买房子
	BuildHouse = "BuildHouse",//升级房子
	PauseGame = "PauseGame",//房主暂停游戏
	ResumeGame = "ResumeGame"
}
declare enum PlayerMoveType {
	Walk = 0,
	Tp = 1
}
declare enum ChanceCardType {
	ToSelf = "ToSelf",
	ToOtherPlayer = "ToOtherPlayer",
	ToPlayer = "ToPlayer",
	ToProperty = "ToProperty",
	ToMapItem = "ToMapItem"
}
declare enum MapEventType {
	ArrivedEvent = "ArrivedEvent",
	NormalEvents = "NormalEvents"
}
declare enum GamePhaseMark {
	GameRoundStart = 0,
	PlayerRoundStart = 1,
	RollDice = 2,
	PlayerMove = 3,
	ArrivedEvent = 4,
	PlayerRoundEnd = 5,
	GameRoundEnd = 6
}
declare enum EventTiggerTime {
	Before = "BEFORE",
	After = "AFTER"
}
declare enum PlayerEvents {
	GetPropertiesList = "GetPropertiesList",
	GetCardsList = "GetCardsList",
	GetMoney = "GetMoney",
	GetStop = "GetStop",
	GetIsBankrupted = "GetIsBankrupted",
	AnimationFinished = "AnimationFinished",
	Walk = "Walk",
	Tp = "Tp",
	BeforeSetPropertiesList = "BeforeSetPropertiesList",
	AfterSetPropertiesList = "AfterSetPropertiesList",
	BeforeGainProperty = "BeforeGainProperty",
	AfterGainProperty = "AfterGainProperty",
	BeforeRound = "BeforeRound",
	AfterRound = "AfterRound",
	BeforeLoseProperty = "BeforeLoseProperty",
	AfterLoseProperty = "AfterLoseProperty",
	BeforeSetCardsList = "BeforeSetCardsList",
	AfterSetCardsList = "AfterSetCardsList",
	BeforeGainCard = "BeforeGainCard",
	AfterGainCard = "AfterGainCard",
	BeforeLoseCard = "BeforeLoseCard",
	AfterLoseCard = "AfterLoseCard",
	BeforeSetMoney = "BeforeSetMoney",
	AfterSetMoney = "AfterSetMoney",
	BeforeGain = "BeforeGain",
	AfterGain = "AfterGain",
	BeforeCost = "BeforeCost",
	AfterCost = "AfterCost",
	BeforeStop = "BeforeStop",
	AfterStop = "AfterStop",
	BeforeTp = "BeforeTp",
	AfterTp = "AfterTp",
	BeforeWalk = "BeforeWalk",
	AfterWalk = "AfterWalk",
	BeforeSetBankrupted = "BeforeSetBankrupted",
	AfterSetBankrupted = "AfterSetBankrupted"
}
interface GameMap {
	id: string;
	info: GameMapInfo;
	mapItems: MapItem[];
	chanceCards: ChanceCardInfo[];
	mapItemTypes: MapItemType[];
	mapIndex: string[];
	streets: Street[];
	roles: Role[];
	inUse: boolean;
	mapEvents: MapEvent[];
	phases: {
		gameRoundStart: GamePhaseInfo[];
		playerRound: GamePhaseInfo[];
		gameRoundEnd: GamePhaseInfo[];
	};
	buildingModelIdList: string[];
}
interface IRoundTimeTimer {
	start(callback: Function | null, timeS?: number): Promise<void>;
	nextTick(): void;
	pause(): void;
	resume(): void;
	stop(): void;
	setTimeOutFunction(newFunction: Function | null): Promise<void>;
	setIntervalFunction(countDownCallback: (remainingTime: number) => void): void;
	clearInterval(): void;
	destroy(): void;
}
interface IDice {
	/** 获取骰子点数总和 */
	getResultNumber(): number;
	/** 获取所有骰子的结果数组 */
	getResultArray(): number[];
	/** 掷骰子 */
	roll(): void;
}
type GameContext = {
	cancel?: boolean;
} & Record<string, any>;
interface IGameProcess {
	extraData: Record<string, any>;
	mapData: GameMap;
	players: Map<string, IPlayer>;
	properties: Map<string, IProperty>;
	chanceCardInfos: Map<string, ChanceCardInfo>;
	currentRoundPlayer: IPlayer | null;
	currentRound: number;
	gameRuntimeStack: IGameRuntimeStack<GameContext>;
	roundTimeTimer: IRoundTimeTimer;
	diceUtil: IDice;
	emitPlayerOperation<T extends OperateType>(playerId: string, operationType: T, data: PlayerOperationResult[T]): void;
	oncePlayerOperationAsync<T extends OperateType>(playerId: string, operationType: T): Promise<PlayerOperationResult[T]>;
	onPlayerOperationAsync<T extends OperateType>(playerId: string, operationType: T): Promise<PlayerOperationResult[T]>;
	oncePlayerOperation<T extends OperateType>(playerId: string, operationType: T, callback: (res: PlayerOperationResult[T]) => void): void;
	onPlayerOperation<T extends OperateType>(playerId: string, operationType: T, callback: (res: PlayerOperationResult[T]) => void): void;
	pushEventToStack(gameEvent: GameEvent<GameContext>): void;
}
interface IGameRuntimeStack<Context extends GameContext> {
	stack: GameEvent<Context>[];
	run(context: Context, gameProcess: IGameProcess): Promise<void>;
	isEmpty(): boolean;
	push(...gameEvents: GameEvent<Context>[]): void;
	pop(): GameEvent<Context> | undefined;
}
type GameEventFunction<Context extends GameContext> = (ctx: Context, gameProcess: IGameProcess) => Promise<void>;
type GameEvent<Context extends GameContext> = {
	fn: GameEventFunction<Context>;
	key?: string;
};
interface GamePhaseInfo {
	id: string;
	name: string;
	description: string;
	mark?: GamePhaseMark;
	from: string;
	initEventCode: string;
}
interface IGamePhase<Context extends GameContext> extends GamePhaseInfo {
	eventQueue: GameEvent<Context>[];
	use(tiggerTime: EventTiggerTime, fn: string): void;
	getEventQueue(): GameEvent<Context>[];
}
interface PlayerRoundContext extends GameContext {
	currentRoundPlayer: IPlayer;
}
interface PlayerRoundStartContext extends PlayerRoundContext {
}
interface RollDiceContext extends PlayerRoundStartContext {
	dice: number[];
}
interface PlayerMoveContext extends RollDiceContext {
	type: PlayerMoveType;
	targetIndex: number;
}
interface ArrivedEventContext extends PlayerMoveContext {
	arrivedProperty: PropertyInfo;
}
interface IPlayer {
	extras: Record<string, any>;
	roundPhases: IGamePhase<GameContext>[];
	getUser: () => UserInRoomInfo;
	getId: () => string;
	getName: () => string;
	getPropertiesList: () => IProperty[];
	setPropertiesList: (newPropertiesList: IProperty[]) => void;
	gainProperty: (property: IProperty) => void;
	loseProperty: (property: IProperty) => void;
	getCardsList: () => IChanceCard[];
	setCardsList: (newChanceCardList: IChanceCard[]) => void;
	getCardById: (cardId: string) => IChanceCard | undefined;
	gainCard: (gainCard: IChanceCard) => void;
	loseCard: (cardId: string) => void;
	setMoney: (money: number) => void;
	getMoney: () => number;
	cost: (money: number, target?: IPlayer) => boolean;
	gain: (money: number, source?: IPlayer) => number;
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
interface IProperty {
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
	setOwner: (player: IPlayer | undefined) => Promise<void>;
	setBuildingLevel: (level: number) => void;
	getPropertyInfo: () => PropertyInfo;
}
interface IChanceCard {
	getId: () => string;
	getSourceId: () => string;
	getName: () => string;
	getDescribe: () => string;
	getIcon: () => string;
	getType: () => ChanceCardType;
	getColor: () => string;
	getEffectCode: () => string;
	use: (sourcePlayer: IPlayer, target: IPlayer | IProperty | IPlayer[] | IProperty[], gameProcess: IGameProcess) => Promise<void>;
	getChanceCardInfo: () => ChanceCardClientInfo;
}
interface PlayerInfo {
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
interface PropertyInfo {
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
interface ChanceCardClientInfo extends Omit<ChanceCardInstanceInfo, "effectCode"> {
}
interface ChanceCardInstanceInfo extends ChanceCardInfo {
	sourceId: string;
}
interface ChanceCardInfo {
	id: string;
	name: string;
	description: string;
	iconId: string;
	color: string;
	effectCode: string;
	type: ChanceCardType;
}
interface Buff {
	id: string;
	name: string;
	describe: string;
	source: string;
	type: PlayerEvents;
	triggerTiming: string;
	triggerTimes: number;
}
interface PlayerOperationResult {
	[OperateType.GameInitFinished]: void;
	[OperateType.RollDice]: void;
	[OperateType.UseChanceCard]: {
		chanceCardId: string;
		targetIdList: string[];
	};
	[OperateType.Animation]: void;
	[OperateType.BuyProperty]: boolean;
	[OperateType.BuildHouse]: boolean;
	[OperateType.PauseGame]: void;
	[OperateType.ResumeGame]: void;
}
type SemVer = `${number}.${number}.${number}`;
interface GameMapInfo {
	name: string;
	version: SemVer;
	backgroundImageId: string;
	coverImageId: string;
}
interface User {
	userId: string;
	username: string;
	isReady: boolean;
	avatar: string;
	color: string;
}
interface UserInRoomInfo extends User {
	roleId: string;
}
interface MapItem {
	id: string;
	type: MapItemType;
	x: number;
	y: number;
	rotation: 0 | 1 | 2 | 3;
	mapEventId?: string;
	linkto?: string;
	beLinked?: string;
	property?: PropertyInfo;
}
interface Role {
	id: string;
	name: string;
	description: string;
	color: string;
	imageId: string;
	initCode: string;
}
interface Street {
	id: string;
	name: string;
	description: string;
	effectCode: string;
	properties: string[];
}
interface MapItemType {
	id: string;
	color: string;
	name: string;
	modelId: string;
	size: number;
}
interface MapEvent {
	id: string;
	type: MapEventType;
	name: string;
	description: string;
	iconId: string;
	effectCode: string;
}
declare let arrivedEventPhase: IGamePhase<ArrivedEventContext>;
