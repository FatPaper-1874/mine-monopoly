import { Buff, ChanceCardInfo, ChanceCardType, PlayerInfo, PropertyInfo, User } from "@fatpaper-monopoly/types";
import { GameProcess } from "../GameProcessWorker";
import { PlayerEvents } from "../enums/game";

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

	[PlayerEvents.BeforeRound]: (
		player: PlayerInterface
	) => Promise<PlayerInterface | undefined | void> | PlayerInterface | undefined | void;
	[PlayerEvents.AfterRound]: (player: PlayerInterface) => Promise<PlayerInterface | undefined | void> | void;

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
	getOwner: () => PlayerInterface | undefined;
	getPassCost: () => number;

	//设置房产信息
	setOwner: (player: PlayerInterface | undefined) => Promise<void>;
	setBuildingLevel: (level: 0 | 1 | 2) => void;

	getPropertyInfo: () => PropertyInfo;
}

export interface PlayerInterface {
	//自定义参数
	extras: Record<string, any>;

	//玩家信息
	getUser: () => User;
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
	gainCard: (gainCard: IChanceCard) => void;
	loseCard: (cardId: string) => void;

	//钱相关
	setMoney: (money: number) => void;
	getMoney: () => number;
	cost: (money: number, target?: PlayerInterface) => Promise<boolean>;
	gain: (money: number, source?: PlayerInterface) => Promise<number>;

	//游戏相关
	setStop: (stop: number) => void;
	getStop: () => number;
	setPositionIndex: (newIndex: number) => void;
	getPositionIndex: () => number;
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
		sourcePlayer: PlayerInterface,
		target: PlayerInterface | IProperty | PlayerInterface[] | IProperty[],
		gameProcess: GameProcess
	) => Promise<void>;

	getChanceCardInfo: () => ChanceCardInfo;
}
