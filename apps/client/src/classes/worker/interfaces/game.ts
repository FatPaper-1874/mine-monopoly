import { ChanceCardType } from "@src/enums/game";
import { User } from "@src/interfaces/bace";
import { Buff, ChanceCardInfo, PlayerInfo, PropertyInfo } from "@src/interfaces/game";
import { GameProcess } from "../GameProcessWorker";
import { PlayerEvents } from "../enums/game";

export interface PlayerEventsCallback {
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

export interface PropertyInterface {
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

export interface ChanceCardInterface {
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

	getChanceCardInfo: () => ChanceCardInfo;
}
