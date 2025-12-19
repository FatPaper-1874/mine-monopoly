import { TargetSelectType } from "../../../../types/enums/game/game";
import { UserInRoomInfo } from "../item";
import { DiceInfo } from "../util";
import { UISchema } from "./ui";

export interface GameData {
	exportData: { [key: string]: any };
	currentPlayerIdInRound: string;
	currentRound: number;
	currentMultiplier: number;
	players: PlayerInfo[];
	properties: PropertyInfo[];
	isGameOver: boolean;
}

export interface PlayerInfo {
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
	infoDisplay: UISchema;
	customData: Record<string, any>;
}

export interface PropertyInfo {
	id: string;
	name: string;
	sellCost: number;
	buildCost: number;
	level: number;
	maxLevel: number;
	costList: number[];
	buildingModelIdList?: string[];
	owner?: UserInRoomInfo;
	custom?: PropertyCustom;
	customData: Record<string, any>;
}

export interface PropertyCustom {
	effectCode: string;
	description: string;
}

export interface ChanceCardClientInfo extends Omit<ChanceCardInstanceInfo, "effectCode"> {}

export interface ChanceCardInstanceInfo extends ChanceCardInfo {
	sourceId: string;
}

export interface ChanceCardInfo {
	id: string;
	name: string;
	description: string;
	iconId: string;
	color: string;
	effectCode: string;
	type: TargetSelectType;
}

export interface Buff {
	id: string;
	name: string;
	description: string;
	source: string;
	triggerTiming: string;
	triggerTimes: number;
}
