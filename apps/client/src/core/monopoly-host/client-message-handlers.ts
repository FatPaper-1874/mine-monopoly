import { MonopolyHost } from "./MonopolyHost";
import {
	ClientSocketMessage,
	GameEventType,
	OperateType,
	PlayerInfo,
	PropertyInfo,
	SocketMessage,
	SocketMsgType,
} from "@mine-monopoly/types";
import { debounce } from "@src/utils";
import { SocketMsgSource } from "@mine-monopoly/types";
import { FPMessage } from "@mine-monopoly/ui";
import { FPMessageBox } from "@src/components/utils/fp-message-box";
import router from "@src/router";
import useEventBus from "@src/utils/event-bus";
import { createVNode } from "vue";
import PropertyInfoVue from "@src/components/common/property-card.vue";
import { DataConnection } from "peerjs";

type ClientMessageHandler<T extends SocketMsgType> = (
	conn: DataConnection,
	msg: SocketMessage<T, SocketMsgSource.Client>,
	host: MonopolyHost,
	clientId: string,
) => void;

export function handleClientSocketMessage(
	conn: DataConnection,
	msg: ClientSocketMessage,
	host: MonopolyHost,
	clientId: string,
) {
	switch (msg.type) {
		case SocketMsgType.Heart:
			// noHeartHandler.fn();
			handleHeart(conn, msg, host, clientId);
			break;
		case SocketMsgType.RoomChat:
			handleRoomChat(conn, msg, host, clientId);
			break;
		case SocketMsgType.ReadyToggle:
			handleReadyToggle(conn, msg, host, clientId);
			break;
		case SocketMsgType.KickOut:
			handleKickOut(conn, msg, host, clientId);
			break;
		case SocketMsgType.ChangeColor:
			handleChangeColor(conn, msg, host, clientId);
			break;
		case SocketMsgType.ChangeMap:
			handleChangeMap(conn, msg, host, clientId);
			break;
		case SocketMsgType.ChangeRole:
			handleChangeRole(conn, msg, host, clientId);
			break;
		case SocketMsgType.ChangeGameSetting:
			handleChangeGameSetting(conn, msg, host, clientId);
			break;
		case SocketMsgType.GameStart:
			handleGameStart(conn, msg, host, clientId);
			break;
		case SocketMsgType.Operation:
			handleOperation(conn, msg, host, clientId);
			break;
		case SocketMsgType.LeaveRoom:
			handleLeaveRoom(conn, msg, host, clientId);
			break;
		default:
			break;
	}
}

const handleHeart: ClientMessageHandler<SocketMsgType.Heart> = (conn, msg, host, clientId) => {
	host.getRoom().sendToClient(conn, SocketMsgType.Heart);
};
const handleRoomChat: ClientMessageHandler<SocketMsgType.RoomChat> = (conn, msg, host, clientId) => {
	const message = msg.data;
	host.getRoom().chatBroadcast(message, clientId);
};
const handleReadyToggle: ClientMessageHandler<SocketMsgType.ReadyToggle> = (conn, msg, host, clientId) => {
	host.getRoom().readyToggle(clientId);
};
const handleKickOut: ClientMessageHandler<SocketMsgType.KickOut> = (conn, msg, host, clientId) => {
	const playerId = msg.data;
	host.getRoom().sendToClientById(playerId, SocketMsgType.KickOut);
	host.getRoom().leave(playerId);
	host.deleteClient(playerId);
};
const handleChangeColor: ClientMessageHandler<SocketMsgType.ChangeColor> = (conn, msg, host, clientId) => {
	host.getRoom().changeColor(clientId, msg.data);
};
const handleChangeMap: ClientMessageHandler<SocketMsgType.ChangeMap> = (conn, msg, host, clientId) => {
	host.getRoom().changeMap(msg.data);
};
const handleChangeRole: ClientMessageHandler<SocketMsgType.ChangeRole> = (conn, msg, host, clientId) => {
	host.getRoom().changeRole(clientId, msg.data);
};
const handleChangeGameSetting: ClientMessageHandler<SocketMsgType.ChangeGameSetting> = (conn, msg, host, clientId) => {
	host.getRoom().changeGameSetting(msg.data);
};
const handleGameStart: ClientMessageHandler<SocketMsgType.GameStart> = (conn, msg, host, clientId) => {
	host.getRoom().startGame();
};
const handleOperation: ClientMessageHandler<SocketMsgType.Operation> = (conn, msg, host, clientId) => {
	const { operateType, data } = msg.data;
	host.getRoom().emitOperation(clientId, operateType, data);
};
const handleLeaveRoom: ClientMessageHandler<SocketMsgType.LeaveRoom> = (conn, msg, host, clientId) => {
	if (host.getRoom().leave(clientId)) {
		//没人了
		host.destory();
	}
	conn.close();
	host.deleteClient(clientId);
};
