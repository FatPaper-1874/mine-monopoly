import { TargetSelectType, MapEventType } from "../../enums/game/game";
import { IPlayer, PlayerInfo, PropertyInfo, UISchema } from "./game-process";

export type SemVer = `${number}.${number}.${number}`;

export interface GameMapInfo {
	name: string;
	author: string;
	version: SemVer;
	description: string;
	editorVersion: string;
	backgroundImageId: string;
	coverImageId: string;
}

export interface User {
	userId: string;
	username: string;
	isReady: boolean;
	avatar: string;
	color: string;
}

export interface UserInGameInfo extends User {
	role: Role;
}

export interface UserInRoomInfo extends User {
	roleId: string;
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
	property?: PropertyInfo;
}

export interface Role {
	id: string;
	name: string;
	description: string;
	color: string;
	imageId: string;
	initCode: string;
}

export interface Street {
	id: string;
	name: string;
	description: string;
	effectCode: string;
	properties: string[];
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

export type ResourcesType = {
	id: string;
	name: string;
	fileType: string;
	url: string;
	type: "image" | "model";
};

export interface CustomUI {
	id: string;
	name: string;
	layout: {
		x: number;
		y: number;
		width: number;
		height: number;
	};
	uiSchema: UISchema;
}
