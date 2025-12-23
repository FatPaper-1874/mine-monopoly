import { TargetSelectType } from "../../../../types/enums/game/game";
import { ICommandBus, IModifier, IModifierManager, PlayerCommandMap, PropertyCommandMap } from "../action-system";
import { UserInRoomInfo } from "../item";
import { DiceResult, IDice } from "../util";
import { GameContext, IGamePhase } from "./events"; // 引用 events
import { PlayerInfo, PropertyInfo, ChanceCardClientInfo, PropertyCustom } from "./infos"; // 引用 infos
import { IGameProcess } from "./core"; // 引用 core
import { UISchema } from "./ui";

export interface IPlayer {
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
	roundPhases: IGamePhase<GameContext>[];
	dices: IDice[];
	infoDisplay: UISchema;

	customData: Record<string, any>;

	getUser: () => UserInRoomInfo;

	// 地产相关
	setPropertiesList: (newPropertiesList: IProperty[]) => void;
	gainProperty: (property: IProperty) => Promise<void>;
	loseProperty: (property: IProperty) => Promise<void>;

	// 机会卡相关
	setCardsList: (newChanceCardList: IChanceCard[]) => void;
	getCardById: (cardId: string) => IChanceCard | undefined;
	gainCard: (gainCard: IChanceCard) => Promise<void>;
	loseCard: (cardId: string) => Promise<void>;

	// 钱相关
	setMoney: (money: number) => void;
	cost: (money: number, target?: IPlayer) => Promise<void>;
	gain: (money: number, source?: IPlayer) => Promise<void>;

	// 游戏相关
	setStop: (stop: number) => void;
	setPositionIndex: (newIndex: number) => void;
	setBankrupted: (isBankrupted: boolean) => void;
	walk: (step: number) => Promise<void>;
	tp: (positionIndex: number) => Promise<void>;
	rollDices: () => Promise<DiceResult[]>;
	addDice: (diceValue?: number[]) => Promise<IDice>;
	removeDice: (id: string) => Promise<IDice | undefined>;

	commandBus: ICommandBus<PlayerCommandMap>;
	modifierManager: IModifierManager<PlayerCommandMap>;

	getPlayerInfo: () => PlayerInfo;
	getRoundPhases: () => IGamePhase<GameContext>[];
}

export interface IProperty {
	id: string;
	name: string;
	level: number;
	maxLevel: number;
	sellCost: number;
	buildCost: number;
	costList: number[];
	buildingModelIdList: string[] | undefined;
	custom: PropertyCustom | undefined;
	owner: IPlayer | undefined;

	customData: Record<string, any>;

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
