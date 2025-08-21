export interface MapData {
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
	houseModel_lv0: Model | null;
	houseModel_lv1: Model | null;
	houseModel_lv2: Model | null;
}

export interface MapItem {
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

export interface ItemType {
	id: string;
	color: string;
	name: string;
	model: Model;
	effectCode?: string;
	hasEvent: boolean;
	size: number;
}

export interface Model {
	id: string;
	name: string;
	fileUrl: string;
	fileName: string;
}

export interface Music {
	id: string;
	name: string;
	url: string;
}

export interface Property {
	id: string;
	name: string;
	sellCost: number;
	buildCost: number;
	cost_lv0: number;
	cost_lv1: number;
	cost_lv2: number;
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
}

export interface GameMap {
	id: string;
	name: string;
	mapItems: MapItem[];
	properties: Property[];
	chanceCards: ChanceCard[];
	itemTypes: ItemType[];
}

export interface User {
	id: string;
	username: string;
	avatar: string;
	color: string;
}

export interface Role {
	id: string;
	baseUrl: string;
	roleName: string;
	fileName: string;
	color: string;
}

export interface ArrivedEvent {
	id: string;
	name: string;
	describe: string;
	iconUrl: string;
	effectCode: string;
	mapItem: MapItem[];
}

export type RoomMapItem = {
	roomId: string;
	hostName: string;
	hostId: string;
	hostPeerId: string | null;
	createTime: number;
	deleteTime: number;
	lastHeartTime: number;
	isPrivate: boolean;
	isStarted: boolean;
};
