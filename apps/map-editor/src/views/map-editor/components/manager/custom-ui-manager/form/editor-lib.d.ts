declare enum TargetSelectType {
	ToSelf = "ToSelf",
	ToOtherPlayer = "ToOtherPlayer",
	ToPlayer = "ToPlayer",
	ToProperty = "ToProperty",
	ToMapItem = "ToMapItem"
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
	type: TargetSelectType;
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
