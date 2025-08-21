import { ChanceCardType, GameOverRule } from "@src/enums/game";
import { ChatMessageType, MonopolyWebSocketMsgType, SocketMsgType } from "@src/enums/bace";
import { DataConnection } from "peerjs";

export type MonopolyWebSocketMsg = {
	type: MonopolyWebSocketMsgType;
	data: any;
};

export interface GameSetting {
	gameOverRule: GameOverRule; //游戏结束的判定规则
	initMoney: number; //初始金钱
	multiplier: number; //倍率涨幅
	multiplierIncreaseRounds: number; //上涨的回合数(隔x个回合上涨一次倍率)
	roundTime: number;
	mapId: string;
	diceNum: number;
	chanceCardVisible: boolean;
	overMoney: number;
	slackOffMode: boolean;
}

export interface Music {
	id: string;
	name: string;
	url: string;
}

export interface SocketMessage {
	type: SocketMsgType;
	source: string;
	roomId?: string;
	data: any;
	msg?: {
		type: "info" | "success" | "warning" | "error" | "";
		content: string;
	};
	extra?: any;
}

export interface User {
	userId: string;
	username: string;
	isReady: boolean;
	avatar: string;
	color: string;
}

export interface UserInRoomInfo extends User {
	role: Role;
}

export interface Room {
	roomId: string;
	ownerId: string;
	ownerName: string;
	userNum: number;
}

export interface Role {
	id: string;
	baseUrl: string;
	roleName: string;
	fileName: string;
	color: string;
}

export interface RoomInfo {
	roomId: string;
	userList: Array<User>;
	isStarted: boolean;
	ownerId: string;
	ownerName: string;
	roleList: Role[];
	gameSetting: GameSetting;
}

export interface ChatMessage {
	id: string;
	type: ChatMessageType;
	user: User;
	content: string;
	time: number;
}

export interface GameLog {
	id: string;
	time: number;
	content: string;
}
