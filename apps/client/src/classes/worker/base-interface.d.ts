enum ChanceCardType {
	ToSelf = "ToSelf",
	ToOtherPlayer = "ToOtherPlayer",
	ToProperty = "ToProperty",
	ToMapItem = "ToMapItem",
}

enum GameOverRule {
	OnePlayerGoBroke, //一位玩家破产
	LeftOnePlayer, //只剩一位玩家
	Earn100000, //挣100000块钱
}

enum GameLinkItem {
	Player = "Player",
	ChanceCard = "ChanceCard",
	Property = "Property",
	ArrivedEvent = "ArrivedEvent",
}

interface GameProcess {
	mapInfo: GameMap;
	gameSetting: GameSetting;
	playerList: Player[];
	propertyList: Map<string, PropertyInterface>;
	chanceCardInfoList: ChanceCardFromDB[];
	mapItemList: Map<string, MapItem>;
	startTime: number;

	//Dynamic Data
	isGameOver: boolean = false;
	currentPlayerInRound: Player | null = null;
	currentRound: number = 0; //当前回合
	currentMultiplier: number = 1; //当前过路费倍数
	timeoutList: any[]; //计时器列表
	intervalTimerList: any[]; //计时器列表
	roundTimeTimer: RoundTimeTimer; //倒计时
	eventMsg: string = ""; //等待事件的信息

	//Utils
	dice: Dice;

	handleArriveEvent(arrivedPlayer: Player): Promise<void>;
	getRandomChanceCard(num: number): ChanceCardInterface[];
	getNewChanceCard(id: string): ChanceCardInterface;
	gameInfoBroadcast(): void;
	gameBroadcast(msg: SocketMessage): void;
	gameMsgNotifyBroadcast(type: "success" | "warning" | "error" | "info", msg: string);
	gameLogBroadcast(log: string): void;
	createGameLinkItem(type: GameLinkItem, id: string): string;
	getPlayerById(id: string): Player | undefined;
}

interface GameSetting {
	gameOverRule: GameOverRule; //游戏结束的判定规则
	initMoney: number; //初始金钱
	multiplier: number; //倍率涨幅
	multiplierIncreaseRounds: number; //上涨的回合数(隔x个回合上涨一次倍率)
	roundTime: number;
	mapId: string;
	diceNum: number;
}

enum PlayerEvents {
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
	AfterSetBankrupted = "AfterSetBankrupted",
}

interface PlayerEventsCallback {
	[PlayerEvents.GetPropertiesList]: () => PropertyInterface[];
	[PlayerEvents.GetCardsList]: () => ChanceCardInterface[];
	[PlayerEvents.GetMoney]: () => number;
	[PlayerEvents.GetStop]: () => number;
	[PlayerEvents.GetIsBankrupted]: () => boolean;
	[PlayerEvents.AnimationFinished]: (value: void | PromiseLike<void>) => void;
	[PlayerEvents.Walk]: (walkValue: number) => Promise<number>;
	[PlayerEvents.Tp]: (tpValue: number) => Promise<number>;

	[PlayerEvents.BeforeSetPropertiesList]: (newPropertiesList: PropertyInterface[]) => PropertyInterface[] | undefined;
	[PlayerEvents.AfterSetPropertiesList]: (newPropertiesList: PropertyInterface[]) => undefined;

	[PlayerEvents.BeforeRound]: (
		player: PlayerInterface
	) => Promise<PlayerInterface | undefined | void> | PlayerInterface | undefined | void;
	[PlayerEvents.AfterRound]: (player: PlayerInterface) => Promise<PlayerInterface | undefined | void> | void;

	[PlayerEvents.BeforeGainProperty]: (
		newProperty: PropertyInterface
	) => Promise<PropertyInterface | undefined | void> | PropertyInterface | undefined | void;
	[PlayerEvents.AfterGainProperty]: (
		newProperty: PropertyInterface
	) => Promise<PropertyInterface | undefined | void> | void;

	[PlayerEvents.BeforeLoseProperty]: (
		lostProperty: PropertyInterface
	) => Promise<PropertyInterface | undefined | void> | PropertyInterface | undefined | void;
	[PlayerEvents.AfterLoseProperty]: (
		lostProperty: PropertyInterface
	) => Promise<PropertyInterface | undefined | void> | void;

	[PlayerEvents.BeforeSetCardsList]: (
		newCardList: ChanceCardInterface[]
	) => Promise<ChanceCardInterface[] | undefined | void> | ChanceCardInterface[] | undefined | void;
	[PlayerEvents.AfterSetCardsList]: (
		newCardList: ChanceCardInterface[]
	) => Promise<ChanceCardInterface[] | undefined | void> | void;

	[PlayerEvents.BeforeGainCard]: (
		gainCard: ChanceCardInterface
	) => Promise<ChanceCardInterface | undefined | void> | ChanceCardInterface | undefined | void;
	[PlayerEvents.AfterGainCard]: (
		gainCard: ChanceCardInterface
	) => Promise<ChanceCardInterface | undefined | void> | void;

	[PlayerEvents.BeforeLoseCard]: (
		lostCard: ChanceCardInterface
	) => Promise<ChanceCardInterface | undefined | void> | ChanceCardInterface | undefined | void;
	[PlayerEvents.AfterLoseCard]: (
		lostCard: ChanceCardInterface
	) => Promise<ChanceCardInterface | undefined | void> | void;

	[PlayerEvents.BeforeSetMoney]: (moneyValue: number) => Promise<number | undefined | void> | number | undefined | void;
	[PlayerEvents.AfterSetMoney]: (moneyValue: number) => Promise<number | undefined | void> | void;

	[PlayerEvents.BeforeGain]: (
		gainMoney: number,
		source?: PlayerInterface
	) => Promise<number | undefined | void> | number | undefined | void;
	[PlayerEvents.AfterGain]: (gainMoney: number, source?: PlayerInterface) => Promise<number | undefined | void> | void;

	[PlayerEvents.BeforeCost]: (
		costMoney: number,
		target?: PlayerInterface
	) => Promise<number | undefined | void> | number | undefined | void;
	[PlayerEvents.AfterCost]: (costMoney: number, target?: PlayerInterface) => Promise<number | undefined | void> | void;

	[PlayerEvents.BeforeStop]: (stopValue: number) => Promise<number | undefined | void> | number | undefined | void;
	[PlayerEvents.AfterStop]: (stopValue: number) => Promise<number | undefined | void> | void;

	[PlayerEvents.BeforeTp]: (tpValue: number) => Promise<number | undefined | void> | number | undefined | void;
	[PlayerEvents.AfterTp]: (tpValue: number) => Promise<number | undefined | void> | void;

	[PlayerEvents.BeforeWalk]: (walkValue: number) => Promise<number | undefined | void> | number | undefined | void;
	[PlayerEvents.AfterWalk]: (walkValue: number) => Promise<number | undefined | void> | void;

	[PlayerEvents.BeforeSetBankrupted]: (isBankrupted: boolean) => Promise<boolean> | boolean;
	[PlayerEvents.AfterSetBankrupted]: (isBankrupted: boolean) => Promise<boolean | undefined | void> | void;
}

interface PropertyInterface {
	//房产信息
	getId: () => string;
	getName: () => string;
	getBuildingLevel: () => number;
	getBuildCost: () => number;
	getSellCost: () => number;
	getCost_lv0: () => number;
	getCost_lv1: () => number;
	getCost_lv2: () => number;
	getOwner: () => PlayerInterface | undefined;
	getPassCost: () => number;

	//设置房产信息
	setOwner: (player: PlayerInterface | undefined) => Promise<void>;
	setBuildingLevel: (level: 0 | 1 | 2) => void;

	getPropertyInfo: () => PropertyInfo;
}

interface PlayerInterface {
	//自定义参数
	extras: Record<string, any>;

	//玩家信息
	getUser: () => User;
	getId: () => string;
	getName: () => string;

	//地产相关
	getPropertiesList: () => PropertyInterface[];
	setPropertiesList: (newPropertiesList: PropertyInterface[]) => void;
	gainProperty: (property: PropertyInterface) => Promise<void>;
	loseProperty: (property: PropertyInterface) => Promise<void>;

	//机会卡相关
	getCardsList: () => ChanceCardInterface[];
	setCardsList: (newChanceCardList: ChanceCardInterface[]) => void;
	getCardById: (cardId: string) => ChanceCardInterface | undefined;
	gainCard: (gainCard: ChanceCardInterface) => void;
	loseCard: (cardId: string) => void;

	//钱相关
	setMoney: (money: number) => void;
	getMoney: () => number;
	cost: (money: number, target?: PlayerInterface) => boolean;
	gain: (money: number, source?: PlayerInterface) => number;

	//游戏相关
	setStop: (stop: number) => void;
	getStop: () => number;
	setPositionIndex: (newIndex: number) => void;
	getPositionIndex: () => number;
	setBankrupted: (isBankrupted: boolean) => void;
	getIsBankrupted: () => boolean;
	walk: (step: number) => Promise<void>;
	tp: (positionIndex: number) => Promise<void>;

	addEventListener: <K extends PlayerEvents>(
		eventName: K,
		fn: PlayerEventsCallback[K],
		triggerTimes?: number,
		buff?: Buff
	) => void;
	removeListener(eventName: PlayerEvents, id: string): void;
	removeAllListeners(eventName: PlayerEvents): void;
	updateBuff(buffId: string, newBuff: Buff): void;

	getPlayerInfo: () => PlayerInfo;
}

interface ChanceCardInterface {
	getId: () => string;
	getSourceId: () => string;
	getName: () => string;
	getDescribe: () => string;
	getIcon: () => string;
	getType: () => ChanceCardType;
	getColor: () => string;
	getEffectCode: () => string;
	use: (
		sourcePlayer: PlayerInterface,
		target: PlayerInterface | PropertyInterface | PlayerInterface[] | PropertyInterface[],
		gameProcess: GameProcess
	) => Promise<void>;

	getChanceCardInfo: () => ChanceCardInstanceInfo;
}

interface GameMap {
	id: string;
	name: string;
	background: string;
	mapItems: MapItem[];
	properties: Property[];
	chanceCards: ChanceCard[];
	itemTypes: ItemType[];
	indexList: string[];
	streets: Street[];
	inUse: boolean;
	houseModel_lv0: Model;
	houseModel_lv1: Model;
	houseModel_lv2: Model;
}

interface ChanceCardFromDB {
	id: string;
	name: string;
	describe: string;
	icon: string;
	color: string;
	type: ChanceCardType;
	effectCode: string;
}

interface ChanceCardInstanceInfo {
	id: string;
	sourceId: string;
	name: string;
	describe: string;
	color: string;
	type: ChanceCardType;
	icon: string;
}

interface Street {
	id: string;
	name: string;
	increase: number;
}

interface MapItem {
	_id: string;
	id: string;
	x: number;
	y: number;
	rotation: 0 | 1 | 2 | 3;
	type: ItemType;
	linkto?: MapItem;
	arrivedEvent?: ArrivedEvent;
	property?: Property;
}

interface ItemType {
	id: string;
	color: string;
	name: string;
	model: Model;
	effectCode?: string;
	hasEvent: boolean;
	size: number;
}

interface Street {
	id: string;
	name: string;
	increase: number;
}

interface Model {
	id: string;
	name: string;
	fileUrl: string;
	fileName: string;
}

interface User {
	userId: string;
	username: string;
	socketClient: WebSocket;
	avatar: string;
	color: string;
}

interface Buff {
	id?: string;
	name: string;
	describe: string;
	source: string;
}

type Utils = {
	randomString: (length: number) => string;
	randomInRange: (min: number, max: number) => number;
};
