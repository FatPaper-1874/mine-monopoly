import {
	ChanceCardType,
	ChangeRoleOperate,
	GameData,
	GameMap,
	GameMapInDb,
	GameOverRule,
	OperateType,
	PlayerInfo,
	PropertyInfo,
	Role,
	SocketMsgSource,
	SocketMsgType,
	User,
} from "@fatpaper-monopoly/types";
import { ChatMessageType, MonopolyWebSocketMsgType } from "@fatpaper-monopoly/types";
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

export interface SocketMessage<T extends SocketMsgType = SocketMsgType, S extends SocketMsgSource = SocketMsgSource> {
	type: T;
	source: S;
	data: SocketMessageDataType[T][S];
	msg?: {
		type: "info" | "success" | "warning" | "error";
		content: string;
	};
	extra?: any;
	roomId?: string;
}

export type ClientSocketMessage = {
	[K in SocketMsgType]: SocketMessage<K, SocketMsgSource.Client>;
}[SocketMsgType];

export type ServerSocketMessage = {
	[K in SocketMsgType]: SocketMessage<K, SocketMsgSource.Server>;
}[SocketMsgType];

export interface SocketMessageDataType {
	[SocketMsgType.Heart]: {
		client: undefined;
		server: undefined;
	};
	[SocketMsgType.MsgNotify]: {
		client: never;
		server: undefined;
	};
	[SocketMsgType.GameLog]: {
		client: never;
		server: GameLog;
	};
	[SocketMsgType.UserList]: {
		client: never;
		server: User[];
	};
	[SocketMsgType.RoomList]: {
		client: never;
		server: Room[];
	};
	[SocketMsgType.JoinRoom]: {
		client: User;
		server: { roomId: string };
	};
	[SocketMsgType.LeaveRoom]: {
		client: undefined;
		server: undefined;
	};
	[SocketMsgType.RoomInfo]: {
		client: never;
		server: RoomInfo;
	};
	[SocketMsgType.RoomChat]: {
		client: string;
		server: ChatMessage;
	};
	[SocketMsgType.ReadyToggle]: {
		client: undefined;
		server: undefined;
	};
	[SocketMsgType.ChangeColor]: {
		client: string;
		server: never;
	};
	[SocketMsgType.KickOut]: {
		client: string;
		server: undefined;
	};
	[SocketMsgType.ChangeMap]: {
		client: string;
		server: string;
	};
	[SocketMsgType.ChangeRole]: {
		client: string;
		server: string;
	};
	[SocketMsgType.ChangeGameSetting]: {
		client: GameSetting;
		server: never;
	};
	[SocketMsgType.GameStart]: {
		client: undefined;
		server: undefined;
	};
	[SocketMsgType.GameInit]: {
		client: never;
		server: GameMapInDb;
	};
	[SocketMsgType.GameInitFinished]: {
		client: undefined;
		server: undefined;
	};
	[SocketMsgType.GameData]: {
		client: never;
		server: GameData;
	};
	[SocketMsgType.GainMoney]: {
		client: never;
		server: {
			player: PlayerInfo;
			money: number;
			source: PlayerInfo | undefined;
		};
	};
	[SocketMsgType.CostMoney]: {
		client: never;
		server: {
			player: PlayerInfo;
			money: number;
			target: PlayerInfo | undefined;
		};
	};
	[SocketMsgType.RoundTurn]: {
		client: never;
		server: undefined;
	};
	[SocketMsgType.RollDiceStart]: {
		//TODO
		client: never;
		server: string;
	};
	[SocketMsgType.RollDiceResult]: {
		client: never;
		server: number[];
	};
	[SocketMsgType.UseChanceCard]: {
		client: { chanceCardId: string; targetId: string | string[] };
		server: { error: boolean };
	};
	[SocketMsgType.RemainingTime]: {
		client: never;
		server: { eventMsg: string; remainingTime: number };
	};
	[SocketMsgType.RoundTimeOut]: {
		//TODO
		client: never;
		server: never;
	};
	[SocketMsgType.PlayerWalk]: {
		client: never;
		server: { playerId: string; step: number; walkId: string };
	};
	[SocketMsgType.PlayerTp]: {
		client: never;
		server: { playerId: string; positionIndex: number; walkId: string };
	};
	[SocketMsgType.Animation]: {
		client: { operateType: OperateType; animationId: string };
		server: never;
	};
	[SocketMsgType.BuyProperty]: {
		client: { operateType: OperateType; res: boolean };
		server: PropertyInfo;
	};
	[SocketMsgType.BuildHouse]: {
		client: { operateType: OperateType; res: boolean };
		server: PropertyInfo;
	};
	[SocketMsgType.Bankrupt]: {
		client: never;
		server: never;
	};
	[SocketMsgType.GameOver]: {
		client: never;
		server: undefined;
	};
	[SocketMsgType.PauseGame]: {
		client: undefined;
		server: undefined;
	};
	[SocketMsgType.ResumeGame]: {
		client: undefined;
		server: undefined;
	};
}

export interface Room {
	roomId: string;
	ownerId: string;
	ownerName: string;
	userNum: number;
}

export interface RoomInfo {
	mapId: string;
	roomId: string;
	userList: Array<User>;
	isStarted: boolean;
	ownerId: string;
	ownerName: string;
	gameSetting: GameSetting;
}

export interface RoleInRoom extends Role {
	imageUrl: string;
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
