import { ChatMessageType, MonopolyWebSocketMsgType, SocketMsgSource, SocketMsgType } from "../../enums/game/base";
import { GameOverRule, TargetSelectType } from "../../enums/game/game";
import { OperateType } from "../../enums/game/game-process";
import { GameMapInDb } from "./db";
import {
	ConfirmDialogOption,
	GameData,
	GameSetting,
	InputOptionItem,
	ItemSelectDialogOption,
	ItemSelectDialogResult,
	MessageCardOption,
	PlayerInfo,
	PropertyInfo,
	TargetSelectDialogOption,
	TargetSelectDialogResult,
} from "./game-process";
import { Role, User } from "./item";

export type MonopolyWebSocketMsg = {
	type: MonopolyWebSocketMsgType;
	data: any;
};

export interface Music {
	id: string;
	name: string;
	url: string;
}

type Base64String = string;
export type RoomMapInfo = { from: "server"; data: string } | { from: "custom"; data: Base64String };

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

type OperationMessage = {
	[T in OperateType]: {
		operateType: T;
		data: PlayerOperationResult[T];
	};
}[OperateType];

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
		client: RoomMapInfo;
		server: RoomMapInfo;
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
		server: GameData;
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
		server: {
			rollDiceResult: number[];
			rollDicePlayerId: string;
		};
	};
	[SocketMsgType.UseChanceCard]: {
		client: never;
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
	[SocketMsgType.Operation]: {
		client: OperationMessage;
		server: never;
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
	[SocketMsgType.ConfirmDialog]: {
		client: undefined;
		server: {
			playerId: string;
			option: ConfirmDialogOption<InputOptionItem<string, any>[]>;
		};
	};
	[SocketMsgType.TargetSelectDialog]: {
		client: undefined;
		server: {
			playerId: string;
			option: TargetSelectDialogOption<TargetSelectType>;
		};
	};
	[SocketMsgType.ItemSelectDialog]: {
		client: undefined;
		server: {
			playerId: string;
			option: ItemSelectDialogOption;
		};
	};
	[SocketMsgType.MessageCard]: {
		client: undefined;
		server: {
			option: MessageCardOption;
		};
	};
	[SocketMsgType.UI]: {
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
	// mapInfo: RoomMapInfo | undefined;
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

export interface PlayerOperationResult {
	[OperateType.GameInitFinished]: undefined;
	[OperateType.RollDice]: undefined;
	[OperateType.UseChanceCard]: { chanceCardId: string; targetIdList: string[] };
	[OperateType.Animation]: string;
	[OperateType.PauseGame]: undefined;
	[OperateType.ResumeGame]: undefined;
	[OperateType.ConfirmDialogResult]: { id: string; confirm: boolean; data: any };
	[OperateType.TargetSelectDialogResult]: TargetSelectDialogResult<TargetSelectType>;
	[OperateType.ItemSelectDialogResult]: ItemSelectDialogResult;
}
