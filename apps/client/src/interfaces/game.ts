import { User, UserInRoomInfo } from "@src/interfaces/bace";
import { ChanceCardType, GameOverRule } from "@src/enums/game";
import { PlayerEvents } from "@src/classes/worker/enums/game";

export interface Property {
	id: string;
	name: string;
	sellCost: number;
	buildCost: number;
	cost_lv0: number;
	cost_lv1: number;
	cost_lv2: number;
	mapItem: MapItem;
	street: Street;
}

export interface Street {
	id: string;
	name: string;
	increase: number;
}

export interface ChanceCard {
	id: string;
	name: string;
	describe: string;
	icon: string;
	color: string;
	effectCode: string;
	type: ChanceCardType;
}

export interface GameMap {
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

export interface MapItem {
	id: string;
	x: number;
	y: number;
	rotation: 0 | 1 | 2 | 3;
	arrivedEvent?: ArrivedEvent;
	type: TypeItem;
	linkto?: MapItem;
	property?: PropertyInfo;
}

export interface ArrivedEvent {
	id: string;
	name: string;
	describe: string;
	iconUrl: string;
	effectCode: string;
	mapItem: MapItem[];
}

export interface TypeItem {
	id: string;
	color: string;
	name: string;
	model: string;
	size: number;
}

export interface PropertyInfo {
	id: string;
	name: string;
	buildingLevel: number;
	buildCost: number;
	sellCost: number;
	cost_lv0: number;
	cost_lv1: number;
	cost_lv2: number;
	owner?: {
		id: string;
		name: string;
		color: string;
		avatar: string;
	};
}

export interface PlayerInfo {
	id: string;
	user: UserInRoomInfo;
	money: number;
	properties: PropertyInfo[];
	chanceCards: ChanceCardInfo[];
	buff: Buff[];
	positionIndex: number;
	stop: number;
	isBankrupted: boolean;
	isOffline: boolean;
}

export interface Buff {
	id: string;
	name: string;
	describe: string;
	source: string;
	type: PlayerEvents;
	triggerTimes: number;
}

export interface ChanceCardInfo {
	id: string;
	name: string;
	describe: string;
	color: string;
	type: ChanceCardType;
	icon: string;
}

export interface ChanceCardInstanceInfo {
	id: string;
	sourceId: string;
	name: string;
	describe: string;
	color: string;
	type: ChanceCardType;
	icon: string;
}

export interface GameInitInfo {
	mapId: string;
	mapName: string;
	mapBackground: string;
	mapItemsList: MapItem[];
	mapIndexList: string[];
	itemTypesList: ItemType[];
	playerList: PlayerInfo[];
	properties: PropertyInfo[];
	chanceCards: ChanceCardInfo[];
	streetsList: Street[];
	currentPlayerInRound: string;
	currentRound: number;
	currentMultiplier: number;
	houseModels: { lv0: Model; lv1: Model; lv2: Model };
}

export interface GameInfo {
	currentPlayerInRound: string;
	currentRound: number;
	currentMultiplier: number;
	playerList: PlayerInfo[];
	properties: PropertyInfo[];
}

export interface ItemType {
	id: string;
	color: string;
	name: string;
	model: Model;
	size: number;
}

export interface Model {
	id: string;
	name: string;
	fileUrl: string;
	fileName: string;
}

export interface Street {
	id: string;
	name: string;
	increase: number;
}
