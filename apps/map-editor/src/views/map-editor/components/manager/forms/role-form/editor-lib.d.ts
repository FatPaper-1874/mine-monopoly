declare enum TargetSelectType {
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
declare enum GameLinkItem {
	Player = "Player",
	ChanceCard = "ChanceCard",
	Property = "Property",
	ArrivedEvent = "ArrivedEvent"
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
declare enum OperateType {
	GameInitFinished = "GameInitFinished",//前端加载完毕
	RollDice = "RollDice",//前端掷骰子
	UseChanceCard = "UseChanceCard",//使用机会卡
	Animation = "AnimationComplete",//前端动画完成回馈
	PauseGame = "PauseGame",//房主暂停游戏
	ResumeGame = "ResumeGame",//房主恢复游戏
	ConfirmDialogResult = "ConfirmDialogResult",//由服务端主机调起的dialog的结果返回
	SelectDialogResult = "SelectDialogResult"
}
type ICommand<C extends ICommandMap, K extends keyof C> = {
	type: K;
	payload: C[K]["payload"];
};
interface ICommandContext<C extends ICommandMap, K extends keyof C> {
	cancel(): void;
	setResult(result: C[K]["result"]): void;
}
interface ICommandBus<C extends ICommandMap> {
	execute<K extends keyof C>(command: ICommand<C, K>): Promise<C[K]["result"]>;
	setHandler<K extends keyof C>(type: K, handler: (payload: C[K]["payload"]) => C[K]["result"] | Promise<C[K]["result"]>): void;
}
interface ICommandMap {
	[commandType: string]: {
		payload: any;
		result: any;
	};
}
interface PropertyCommandMap extends ICommandMap {
	"property.owner.change": {
		payload: {
			oldOwner: IPlayer | undefined;
			newOwner: IPlayer | undefined;
		};
		result: {
			oldOwner: IPlayer | undefined;
			newOwner: IPlayer | undefined;
		};
	};
	"property.level.up": {
		payload: {};
		result: {};
	};
	"property.level.down": {
		payload: {};
		result: {};
	};
	"property.level.set": {
		payload: {
			oldLevel: number;
			newLevel: number;
		};
		result: {
			oldLevel: number;
			newLevel: number;
		};
	};
	"property.arrived": {
		payload: {
			owner: IPlayer | undefined;
			arrivedPlayer: IPlayer;
			toll?: number;
		};
		result: {
			owner: IPlayer | undefined;
			arrivedPlayer: IPlayer;
			toll?: number;
		};
	};
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
interface IDice extends DiceInfo {
	addDiceprophecy(prophecy: number): void;
	roll(): number;
	getInfo(): DiceInfo;
}
interface DiceInfo {
	min: number;
	max: number;
	diceProphecyQueue: number[];
}
type ComponentType = "number-input" | "select";
interface SelectOption {
	label: string;
	value: string | number;
}
interface FormSchema {
	id: string;
	key: string;
	type: ComponentType;
	label: string;
	placeholder?: string;
	defaultValue?: number | string;
	options?: SelectOption[];
}
interface PlayerCommandMap extends ICommandMap {
	"player.property.gain": {
		payload: {
			property: IProperty;
		};
		result: {
			property: IProperty;
		};
	};
	"player.property.lose": {
		payload: {
			property: IProperty;
		};
		result: {
			property: IProperty;
		};
	};
	"player.card.gain": {
		payload: {
			card: IChanceCard;
		};
		result: {
			card: IChanceCard;
		};
	};
	"player.card.lose": {
		payload: {
			cardId: string;
		};
		result: {
			cardId: string;
		};
	};
	"player.money.gain": {
		payload: {
			money: number;
			source?: IPlayer;
		};
		result: {
			money: number;
			source?: IPlayer;
		};
	};
	"player.money.lose": {
		payload: {
			money: number;
			target?: IPlayer;
		};
		result: {
			money: number;
			target?: IPlayer;
		};
	};
	"player.stop": {
		payload: {
			stop: number;
		};
		result: {
			stop: number;
		};
	};
	"player.walk": {
		payload: {
			steps: number;
		};
		result: {
			steps: number;
		};
	};
	"player.tp": {
		payload: {
			positionIndex: number;
		};
		result: {
			positionIndex: number;
		};
	};
	"player.bankrupted.set": {
		payload: {
			bankrupted: boolean;
		};
		result: {
			bankrupted: boolean;
		};
	};
	"player.dice.roll": {
		payload: {
			dices: IDice[];
		};
		result: {
			diceResult: number[];
		};
	};
}
type ModifierTiming = "before" | "after";
interface ModifierDescriptor<C extends ICommandMap, K extends keyof C = keyof C> {
	id: string;
	timing: ModifierTiming;
	commandType: K;
	remainingTriggers: number;
	priority?: number;
	meta?: {
		name: string;
		timingName: string;
		description: string;
		source: string;
	};
}
interface IModifier<C extends ICommandMap, K extends keyof C = keyof C> {
	descriptor: ModifierDescriptor<C, K>;
	fn(command: ICommand<C, K>, context: ICommandContext<C, K>): Promise<void> | void;
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
	gameSettingForm: FormSchema[];
	phases: {
		gameOverRule: GamePhaseInfo[];
		gameInited: GamePhaseInfo[];
		gameRoundStart: GamePhaseInfo[];
		playerRound: GamePhaseInfo[];
		gameRoundEnd: GamePhaseInfo[];
	};
	buildingModelIdList: string[];
	customUIs: CustomUI[];
}
declare const enum SocketMsgType {
	Heart = "Heart",//心跳信息
	MsgNotify = "MsgNotify",//纯信息广播
	GameLog = "GameLog",//游戏过程信息广播
	UserList = "UserList",//大厅玩家信息广播
	RoomList = "RoomList",//房间列表广播
	JoinRoom = "JoinRoom",//加入房间
	LeaveRoom = "LeaveRoom",//离开房间
	RoomInfo = "RoomInfo",//房间信息广播
	RoomChat = "RoomChat",//房间聊天
	ReadyToggle = "ReadyToggle",//准备状态切换
	ChangeColor = "ChangeColor",//切换颜色
	KickOut = "KickOut",//踢出房间
	ChangeMap = "ChangeMap",//切换地图
	ChangeRole = "ChangeRole",//切换角色
	ChangeGameSetting = "ChangeGameSetting",//修改游戏设置信息
	GameStart = "GameStart",//游戏开始
	GameInit = "GameInit",//游戏初始化
	GameInitFinished = "GameInitFinished",//游戏初始化完成
	GameData = "GameData",//游戏信息广播
	GainMoney = "GainMoney",//玩家获得金钱
	CostMoney = "CostMoney",//玩家花费金钱
	RoundTurn = "RoundTurn",//更新当前回合轮到的玩家
	RollDiceStart = "RollDiceStart",//开始摇骰子
	RollDiceResult = "RollDiceResult",//掷骰子
	UseChanceCard = "UseChanceCard",//使用机会卡
	RemainingTime = "RemainingTime",//回合剩余时间
	RoundTimeOut = "RoundTimeOut",//回合超时
	PlayerWalk = "PlayerWalk",//位置移动方式1：玩家角色走路
	PlayerTp = "PlayerTp",//位置移动方式2：传送
	Operation = "Operation",//玩家操作
	Bankrupt = "Bankrupt",//破产
	GameOver = "GameOver",//游戏结束
	PauseGame = "PauseGame",//房主暂停游戏
	ResumeGame = "ResumeGame",//房主恢复游戏
	ConfirmDialog = "ConfirmDialog",//在客户端唤起确认dialog
	TargetSelectDialog = "TargetSelectDialog",//在客户端唤起目标选择dialog
	UI = "UI"
}
declare enum SocketMsgSource {
	Client = "client",
	Server = "server"
}
declare enum ChatMessageType {
	Emoticon = 0,//表情
	Text = 1
}
type Base64String = string;
type RoomMapInfo = {
	from: "server";
	data: string;
} | {
	from: "custom";
	data: Base64String;
};
interface SocketMessage<T extends SocketMsgType = SocketMsgType, S extends SocketMsgSource = SocketMsgSource> {
	type: T;
	source: S;
	data: SocketMessageDataType[T][S];
	msg?: {
		type: "info" | "success" | "warning" | "error";
		content: string;
	};
	extra?: any;
	roomId?: string;
}
type ServerSocketMessage = {
	[K in SocketMsgType]: SocketMessage<K, SocketMsgSource.Server>;
}[SocketMsgType];
type OperationMessage = {
	[T in OperateType]: {
		operateType: T;
		data: PlayerOperationResult[T];
	};
}[OperateType];
interface SocketMessageDataType {
	[SocketMsgType.Heart]: {
		client: undefined;
		server: undefined;
	};
	[SocketMsgType.MsgNotify]: {
		client: never;
		server: undefined;
	};
	[SocketMsgType.GameLog]: {
		client: never;
		server: GameLog;
	};
	[SocketMsgType.UserList]: {
		client: never;
		server: User[];
	};
	[SocketMsgType.RoomList]: {
		client: never;
		server: Room[];
	};
	[SocketMsgType.JoinRoom]: {
		client: User;
		server: {
			roomId: string;
		};
	};
	[SocketMsgType.LeaveRoom]: {
		client: undefined;
		server: undefined;
	};
	[SocketMsgType.RoomInfo]: {
		client: never;
		server: RoomInfo;
	};
	[SocketMsgType.RoomChat]: {
		client: string;
		server: ChatMessage;
	};
	[SocketMsgType.ReadyToggle]: {
		client: undefined;
		server: undefined;
	};
	[SocketMsgType.ChangeColor]: {
		client: string;
		server: never;
	};
	[SocketMsgType.KickOut]: {
		client: string;
		server: undefined;
	};
	[SocketMsgType.ChangeMap]: {
		client: RoomMapInfo;
		server: RoomMapInfo;
	};
	[SocketMsgType.ChangeRole]: {
		client: string;
		server: string;
	};
	[SocketMsgType.ChangeGameSetting]: {
		client: GameSetting;
		server: never;
	};
	[SocketMsgType.GameStart]: {
		client: undefined;
		server: undefined;
	};
	[SocketMsgType.GameInit]: {
		client: never;
		server: GameData;
	};
	[SocketMsgType.GameInitFinished]: {
		client: undefined;
		server: undefined;
	};
	[SocketMsgType.GameData]: {
		client: never;
		server: GameData;
	};
	[SocketMsgType.GainMoney]: {
		client: never;
		server: {
			player: PlayerInfo;
			money: number;
			source: PlayerInfo | undefined;
		};
	};
	[SocketMsgType.CostMoney]: {
		client: never;
		server: {
			player: PlayerInfo;
			money: number;
			target: PlayerInfo | undefined;
		};
	};
	[SocketMsgType.RoundTurn]: {
		client: never;
		server: undefined;
	};
	[SocketMsgType.RollDiceStart]: {
		client: never;
		server: string;
	};
	[SocketMsgType.RollDiceResult]: {
		client: never;
		server: {
			rollDiceResult: number[];
			rollDicePlayerId: string;
		};
	};
	[SocketMsgType.UseChanceCard]: {
		client: never;
		server: {
			error: boolean;
		};
	};
	[SocketMsgType.RemainingTime]: {
		client: never;
		server: {
			eventMsg: string;
			remainingTime: number;
		};
	};
	[SocketMsgType.RoundTimeOut]: {
		client: never;
		server: never;
	};
	[SocketMsgType.PlayerWalk]: {
		client: never;
		server: {
			playerId: string;
			step: number;
			walkId: string;
		};
	};
	[SocketMsgType.PlayerTp]: {
		client: never;
		server: {
			playerId: string;
			positionIndex: number;
			walkId: string;
		};
	};
	[SocketMsgType.Operation]: {
		client: OperationMessage;
		server: never;
	};
	[SocketMsgType.Bankrupt]: {
		client: never;
		server: never;
	};
	[SocketMsgType.GameOver]: {
		client: never;
		server: undefined;
	};
	[SocketMsgType.PauseGame]: {
		client: undefined;
		server: undefined;
	};
	[SocketMsgType.ResumeGame]: {
		client: undefined;
		server: undefined;
	};
	[SocketMsgType.ConfirmDialog]: {
		client: undefined;
		server: {
			playerId: string;
			option: ConfirmDialogOption<InputOptionItem<string, any>[]>;
		};
	};
	[SocketMsgType.TargetSelectDialog]: {
		client: undefined;
		server: {
			playerId: string;
			option: SelectDialogOption<TargetSelectType>;
		};
	};
	[SocketMsgType.UI]: {
		client: undefined;
		server: undefined;
	};
}
interface Room {
	roomId: string;
	ownerId: string;
	ownerName: string;
	userNum: number;
}
interface RoomInfo {
	roomId: string;
	userList: Array<User>;
	isStarted: boolean;
	ownerId: string;
	ownerName: string;
	gameSetting: GameSetting;
}
interface ChatMessage {
	id: string;
	type: ChatMessageType;
	user: User;
	content: string;
	time: number;
}
interface GameLog {
	id: string;
	time: number;
	content: string;
}
interface GameData {
	extra: {
		[key: string]: any;
	};
	currentPlayerIdInRound: string;
	currentRound: number;
	currentMultiplier: number;
	playersList: PlayerInfo[];
	propertiesList: PropertyInfo[];
	isGameOver: boolean;
}
type GameContext = {
	cancel?: boolean;
} & Record<string, any>;
interface GameSetting {
	[key: string]: {
		label: string;
		value: any;
		displayValue: any;
	};
}
interface IGameProcess {
	extraData: Record<string, any>;
	mapData: GameMap;
	gameSetting: GameSetting;
	players: Map<string, IPlayer>;
	properties: Map<string, IProperty>;
	chanceCardInfos: Map<string, ChanceCardInfo>;
	currentRoundPlayer: IPlayer | null;
	currentRound: number;
	gameRuntimeStack: IGameRuntimeStack<GameContext>;
	roundTimeTimer: IRoundTimeTimer;
	gameOverRuleFunction: () => Promise<boolean>;
	handlePlayerBuyProperty(player: IPlayer, property: IProperty): Promise<void>;
	handlePlayerBuildUp(player: IPlayer, property: IProperty): Promise<void>;
	handleArriveEvent(arrivedPlayer: IPlayer): Promise<void>;
	handleUseChanceCard(sourcePlayer: IPlayer, chanceCardId: string, targetIdList: string[]): Promise<boolean>;
	roundTurnNotify(playerId: string): void;
	emitPlayerOperation<T extends OperateType>(playerId: string, operationType: T, data: PlayerOperationResult[T]): void;
	oncePlayerOperationAsync<T extends OperateType>(playerId: string, operationType: T): Promise<PlayerOperationResult[T]>;
	onPlayerOperationAsync<T extends OperateType>(playerId: string, operationType: T): Promise<PlayerOperationResult[T]>;
	oncePlayerOperation<T extends OperateType>(playerId: string, operationType: T, callback: (res: PlayerOperationResult[T]) => void): void;
	onPlayerOperation<T extends OperateType>(playerId: string, operationType: T, callback: (res: PlayerOperationResult[T]) => void): void;
	removePlayerOperationListener<T extends OperateType>(playerId: string, operationType: T, listener: (...args: any[]) => PlayerOperationResult[T]): void;
	removePlayerAllOperationListener<T extends OperateType>(playerId: string, operationType?: T): void;
	pushEventToStack(gameEvent: GameEvent<GameContext>): void;
	generateNewChanceCard(sourceId: string): IChanceCard;
	createGameLinkItem(type: GameLinkItem, id: string): void;
	sendToPlayer(id: string, msg: ServerSocketMessage): void;
	gameDataBroadcast(): void;
	gameMsgNotifyBroadcast(type: "success" | "warning" | "error" | "info", msg: string): void;
	gameLogBroadcast(log: string): void;
	gameBroadcast(msg: ServerSocketMessage): void;
	showConfirmDialog<I extends InputOptionItem<string, any>[]>(playerId: string, option: ConfirmDialogOption<I>): Promise<ConfirmDialogResult<I>>;
	showTargetSelectDialog<I extends TargetSelectType>(playerId: string, option: SelectDialogOption<I>): Promise<SelectDialogResult<I>>;
	checkGameOver(): Promise<void>;
}
interface DialogOption {
	title: string;
	content: string;
	confirmText?: string;
	cancelText?: string;
}
interface SelectDialogOption<I extends TargetSelectType> extends DialogOption {
	type: I;
}
interface SelectDialogResult<I extends TargetSelectType> {
	target: TargetSelectResult[I];
}
interface TargetSelectResult {
	[TargetSelectType.ToMapItem]: string[];
	[TargetSelectType.ToPlayer]: string[];
	[TargetSelectType.ToOtherPlayer]: string[];
	[TargetSelectType.ToSelf]: string[];
	[TargetSelectType.ToProperty]: string[];
}
interface ConfirmDialogOption<I extends readonly InputOptionItem<string, any>[]> extends DialogOption {
	inputOptions?: I;
}
type InputOptionItem<K extends string, D> = {
	key: K;
	label: string;
	initData: D;
};
type ConfirmDialogResult<I extends readonly InputOptionItem<string, any>[]> = {
	[P in I[number] as P["key"]]: P["initData"];
} & {
	confirm: boolean;
};
interface IGameRuntimeStack<Context extends GameContext> {
	stack: GameEvent<Context>[];
	run(context: Context, gameProcess: IGameProcess): Promise<void>;
	isEmpty(): boolean;
	push(...gameEvents: GameEvent<Context>[]): void;
	pop(): GameEvent<Context> | undefined;
}
type GameEventFunction<Context extends GameContext> = (ctx: Context, gameProcess: IGameProcess) => Promise<void> | void;
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
	use(tiggerTime: EventTiggerTime, fn: GameEventFunction<Context>, key?: string): void;
	getEventQueue(): GameEvent<Context>[];
}
interface IPlayer {
	id: string;
	name: string;
	roleId: string;
	money: number;
	properties: IProperty[];
	chanceCards: IChanceCard[];
	positionIndex: number;
	isStop: number;
	isBankrupted: boolean;
	isOffline: boolean;
	stop: number;
	extras: Record<string, any>;
	roundPhases: IGamePhase<GameContext>[];
	dices: IDice[];
	getUser: () => UserInRoomInfo;
	setPropertiesList: (newPropertiesList: IProperty[]) => void;
	gainProperty: (property: IProperty) => Promise<void>;
	loseProperty: (property: IProperty) => Promise<void>;
	setCardsList: (newChanceCardList: IChanceCard[]) => void;
	getCardById: (cardId: string) => IChanceCard | undefined;
	gainCard: (gainCard: IChanceCard) => Promise<void>;
	loseCard: (cardId: string) => Promise<void>;
	setMoney: (money: number) => void;
	cost: (money: number, target?: IPlayer) => Promise<void>;
	gain: (money: number, source?: IPlayer) => Promise<void>;
	setStop: (stop: number) => void;
	setPositionIndex: (newIndex: number) => void;
	setBankrupted: (isBankrupted: boolean) => void;
	walk: (step: number) => Promise<void>;
	tp: (positionIndex: number) => Promise<void>;
	rollDices: () => Promise<number[]>;
	commandBus: ICommandBus<PlayerCommandMap>;
	registerModifier<K extends keyof PlayerCommandMap>(modifier: IModifier<PlayerCommandMap, K>): void;
	getPlayerInfo: () => PlayerInfo;
	getRoundPhases: () => IGamePhase<GameContext>[];
}
interface IProperty {
	id: string;
	name: string;
	level: number;
	maxLevel: number;
	sellCost: number;
	buildCost: number;
	costList: number[];
	streetId: string;
	buildingModelIdList: string[] | undefined;
	custom: PropertyCustom | undefined;
	owner: IPlayer | undefined;
	getOriginalData: () => PropertyInfo;
	levelUp: () => Promise<void>;
	levelDown: () => Promise<void>;
	setOwner: (player: IPlayer | undefined) => Promise<void>;
	setLevel: (level: number) => Promise<void>;
	arrived: (player: IPlayer) => Promise<void>;
	getPropertyInfo: () => PropertyInfo;
	commandBus: ICommandBus<PropertyCommandMap>;
	registerModifier<K extends keyof PropertyCommandMap>(modifier: IModifier<PropertyCommandMap, K>): void;
}
interface IChanceCard {
	getId: () => string;
	getSourceId: () => string;
	getName: () => string;
	getDescribe: () => string;
	getIcon: () => string;
	getType: () => TargetSelectType;
	getColor: () => string;
	getEffectCode: () => string;
	use: (sourcePlayer: IPlayer, target: IPlayer | IProperty | IPlayer[] | IProperty[], gameProcess: IGameProcess) => Promise<void>;
	getChanceCardInfo: () => ChanceCardClientInfo;
}
interface PlayerInfo {
	id: string;
	user: UserInRoomInfo;
	dices: DiceInfo[];
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
	maxLevel: number;
	costList: number[];
	streetId: string;
	buildingModelIdList?: string[];
	owner?: UserInRoomInfo;
	custom?: PropertyCustom;
}
interface PropertyCustom {
	effectCode: string;
	description: string;
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
	type: TargetSelectType;
}
interface Buff {
	id: string;
	name: string;
	description: string;
	source: string;
	triggerTiming: string;
	triggerTimes: number;
}
interface PlayerOperationResult {
	[OperateType.GameInitFinished]: undefined;
	[OperateType.RollDice]: undefined;
	[OperateType.UseChanceCard]: {
		chanceCardId: string;
		targetIdList: string[];
	};
	[OperateType.Animation]: string;
	[OperateType.PauseGame]: undefined;
	[OperateType.ResumeGame]: undefined;
	[OperateType.ConfirmDialogResult]: {
		id: string;
		confirm: boolean;
		data: any;
	};
	[OperateType.SelectDialogResult]: SelectDialogResult<TargetSelectType>;
}
type SemVer = `${number}.${number}.${number}`;
interface GameMapInfo {
	name: string;
	author: string;
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
interface CustomUI {
	id: string;
	name: string;
	layout: {
		x: number;
		y: number;
		width: number;
		height: number;
	};
	initCode: string;
}
