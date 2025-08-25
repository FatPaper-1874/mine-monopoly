import { ChanceCardType, MapEventType } from "../../enums/game/game";
import { IPlayer, PlayerInfo } from "./game-process";

export type SemVer = `${number}.${number}.${number}`;

export interface GameMapInfo {
	name: string;
	version: SemVer;
	backgroundImageId: string;
	coverImageId: string;
}

export interface MapItem {
	id: string;
	type: MapItemType;
	x: number;
	y: number;
	rotation: 0 | 1 | 2 | 3;
	mapEventId?: string;
	linkto?: string;
	beLinked?: string;
	property?: IProperty;
}

export interface IProperty {
	id: string;
	name: string;
	sellCost: number;
	buildCost: number;
	cost_lv0: number;
	cost_lv1: number;
	cost_lv2: number;
	streetId: string;
}

export interface Role {
	id: string;
	name: string;
	color: string;
	imageId: string;
}

export interface Street {
	id: string;
	name: string;
	description: string;
	effectCode: string;
	properties: string[];
}

export interface IChanceCard extends ChanceCard {
	sourceId: string;
}

export interface ChanceCard {
	id: string;
	name: string;
	description: string;
	iconId: string;
	color: string;
	effectCode: string;
	type: ChanceCardType;
}

export interface Buff {
	id: string;
	name: string;
	describe: string;
	source: string;
	triggerTiming: string; //TODO
	triggerTimes: number;
}

export interface MapItemType {
	id: string;
	color: string;
	name: string;
	modelId: string;
	size: number;
}

export interface MapEvent {
	id: string;
	type: MapEventType;
	name: string;
	description: string;
	iconId: string;
	effectCode: string;
}
