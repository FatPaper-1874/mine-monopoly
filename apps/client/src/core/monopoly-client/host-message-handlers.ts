import { ChatMessage, GameLog, RoomInfo, ServerSocketMessage, SocketMessage } from "@src/interfaces/bace";
import { MonopolyClient } from "./MonopolyClient";
import { GameEventType, OperateType, PlayerInfo, PropertyInfo, SocketMsgType } from "@fatpaper-monopoly/types";
import {
	useChat,
	useGameLog,
	useLoading,
	useRoomInfo,
	useRoomList,
	useUserInfo,
	useUserList,
	useUtil,
} from "@src/store";
import { debounce } from "@src/utils";
import { SocketMsgSource } from "@fatpaper-monopoly/types";
import { FPMessage } from "@fatpaper-monopoly/ui";
import { FPMessageBox } from "@src/components/utils/fp-message-box";
import router from "@src/router";
import useEventBus from "@src/utils/event-bus";
import { createVNode } from "vue";
import PropertyInfoVue from "@src/components/common/property-card.vue";
import { useGameData } from "@src/store/game";

type ServerMessageHandler<T extends SocketMsgType> = (
	msg: SocketMessage<T, SocketMsgSource.Server>,
	client: MonopolyClient
) => void;

export function handleServerSocketMessage(msg: ServerSocketMessage, client: MonopolyClient) {
	switch (msg.type) {
		case SocketMsgType.Heart:
			handleHeartReply(msg, client);
			break;
		case SocketMsgType.UserList:
			handleUserListReply(msg, client);
			break;
		case SocketMsgType.RoomList:
			handleRoomListReply(msg, client);
			break;
		case SocketMsgType.JoinRoom:
			handleJoinRoomReply(msg, client);
			break;
		case SocketMsgType.LeaveRoom:
			handleLeaveRoomReply(msg, client);
			break;
		case SocketMsgType.KickOut:
			handleKickOutReply(msg, client);
			break;
		case SocketMsgType.RoomInfo:
			handleRoomInfoReply(msg, client);
			break;
		case SocketMsgType.RoomChat:
			handleRoomChatReply(msg, client);
			break;
		case SocketMsgType.GameStart:
			handleGameStartReply(msg, client);
			break;
		case SocketMsgType.GameInit:
			handleGameInit(msg, client);
			break;
		case SocketMsgType.GameInitFinished:
			handleGameInitFinished(msg, client);
			break;
		case SocketMsgType.GameData:
			handleGameData(msg, client);
			break;
		case SocketMsgType.GameLog:
			handleGameLog(msg, client);
			break;
		case SocketMsgType.GainMoney:
			handleGainMoney(msg, client);
			break;
		case SocketMsgType.CostMoney:
			handleCostMoney(msg, client);
			break;
		case SocketMsgType.RemainingTime:
			handleRemainingTime(msg, client);
			break;
		case SocketMsgType.RoundTurn:
			handleRoundTurn(msg, client);
			break;
		case SocketMsgType.RollDiceStart:
			handleRollDiceAnimationPlay(msg, client);
			break;
		case SocketMsgType.RollDiceResult:
			handleRollDiceResult(msg, client);
			break;
		case SocketMsgType.UseChanceCard:
			handleUsedChanceCard(msg, client);
			break;
		case SocketMsgType.PlayerWalk:
			handlePlayerWalk(msg, client);
			break;
		case SocketMsgType.PlayerTp:
			handlePlayerTp(msg, client);
			break;
		case SocketMsgType.BuyProperty:
			handleBuyProperty(msg, client);
			break;
		case SocketMsgType.BuildHouse:
			handleBuildHouse(msg, client);
			break;
		case SocketMsgType.GameOver:
			handleGameOver(msg, client);
			break;
		case SocketMsgType.PauseGame:
			handleGamePause(msg, client);
			break;
		case SocketMsgType.ResumeGame:
			handleGameResume(msg, client);
			break;
		default:
			break;
	}
}

const handleHeartReply: ServerMessageHandler<SocketMsgType.Heart> = (msg, client) => {
	client.handleHeartReply();
};

const handleUserListReply: ServerMessageHandler<SocketMsgType.UserList> = (msg) => {
	const userListStore = useUserList();
	userListStore.userList = msg.data;
};

const handleRoomListReply: ServerMessageHandler<SocketMsgType.RoomList> = (msg) => {
	const roomListStore = useRoomList();
	roomListStore.roomList = msg.data;
};

const handleJoinRoomReply: ServerMessageHandler<SocketMsgType.JoinRoom> = (msg) => {
	const roomId = msg.data.roomId;
	console.log("🚀 ~ handleJoinRoomReply ~ roomId:", roomId);
	if (roomId) {
		useRoomInfo().roomId = roomId;
		router.replace({ name: "room" });
	}
};

const handleLeaveRoomReply: ServerMessageHandler<SocketMsgType.LeaveRoom> = (msg, client) => {
	FPMessage({ type: "success", message: "退出房间" });
	useRoomInfo().$reset();
	useChat().$reset();
	useGameLog().$reset();
	client.destory();
	router.replace({ name: "room-router" });
};

const handleKickOutReply: ServerMessageHandler<SocketMsgType.KickOut> = (msg, client) => {
	FPMessage({ type: "error", message: "你已被踢出房间" });
	useRoomInfo().$reset();
	useChat().$reset();
	useGameLog().$reset();
	client.destory();
	router.replace({ name: "room-router" });
};

const handleRoomInfoReply: ServerMessageHandler<SocketMsgType.RoomInfo> = (msg) => {
	const roomInfoData = msg.data;
	console.log("🚀 ~ handleRoomInfoReply ~ roomInfoData:", roomInfoData);
	const roomInfoStore = useRoomInfo();
	roomInfoData && roomInfoStore.$patch(roomInfoData);
};

const handleRoomChatReply: ServerMessageHandler<SocketMsgType.RoomChat> = (msg) => {
	useChat().addNewMessage(msg.data);
};

const handleGameStartReply: ServerMessageHandler<SocketMsgType.GameStart> = () => {
	useLoading().$patch({
		loading: true,
		text: "正在进入游戏...",
	});
};

const handleGameInit: ServerMessageHandler<SocketMsgType.GameInit> = () => {
	const loadingStore = useLoading();
	loadingStore.text = "获取数据成功，加载中...";
	//TODO
	// const gameInitInfo = data.data as GameInitInfo;

	// const mapDataStore = useMapData();
	// mapDataStore.$patch(gameInitInfo);

	// const gameInfoStore = useGameData();
	// gameInitInfo &&
	// 	gameInfoStore.$patch({
	// 		currentRound: gameInitInfo.currentRound,
	// 		currentPlayerIdInRound: gameInitInfo.currentPlayerInRound,
	// 		currentMultiplier: gameInitInfo.currentMultiplier,
	// 	});

	// router.replace({ name: "game" });
};

const handleGameInitFinished: ServerMessageHandler<SocketMsgType.GameInitFinished> = () => {
	useLoading().hideLoading();
};

const handleGainMoney: ServerMessageHandler<SocketMsgType.GainMoney> = (msg) => {
	const { player, money, source } = msg.data;
	useEventBus().emit(GameEventType.GainMoney + player.id, player, money, source);
};

const handleCostMoney: ServerMessageHandler<SocketMsgType.CostMoney> = (msg) => {
	const { player, money, target } = msg.data;
	useEventBus().emit(GameEventType.CostMoney + player.id, player, money, target);
};

const handleGameData: ServerMessageHandler<SocketMsgType.GameData> = (msg) => {
	const gameDataStore = useGameData();
	const gameData = msg.data;
	if (gameData) {
		gameDataStore.$patch({
			currentPlayerIdInRound: gameData.currentPlayerIdInRound,
			currentRound: gameData.currentRound,
			currentMultiplier: gameData.currentMultiplier,
			playersList: gameData.playersList,
			propertiesList: gameData.propertiesList,
		});
		const me = gameData.playersList.find((p) => p.id === useUserInfo().userId);
		if (me && me.isBankrupted) {
			const utilStore = useUtil();
			utilStore.canRoll = false;
			utilStore.canUseCard = false;
		}
	}
};

const handleGameLog: ServerMessageHandler<SocketMsgType.GameLog> = (msg) => {
	useGameLog().addNewLog(msg.data);
};

const handleRemainingTime: ServerMessageHandler<SocketMsgType.RemainingTime> = (msg) => {
	const waitingFor = msg.data;
	const utilStore = useUtil();
	utilStore.waitingFor = waitingFor;
	utilStore.timeOut = waitingFor.remainingTime <= 0;
	if (waitingFor.remainingTime <= 0) {
		utilStore.canRoll = false;
		useEventBus().emit(GameEventType.TimeOut);
	}
};

const handleRoundTurn: ServerMessageHandler<SocketMsgType.RoundTurn> = () => {
	const utilStore = useUtil();
	utilStore.canRoll = true;
	utilStore.canUseCard = true;
	useEventBus().emit("RoundTurn");
};

const handleRollDiceAnimationPlay: ServerMessageHandler<SocketMsgType.RollDiceStart> = () => {
	const utilStore = useUtil();
	utilStore.canRoll = false;
	utilStore.canUseCard = false;
	utilStore.isRollDiceAnimationPlay = true;
};

const handleRollDiceResult: ServerMessageHandler<SocketMsgType.RollDiceResult> = (msg) => {
	const rollDiceResult: number[] = msg.data;

	const utilStore = useUtil();
	utilStore.rollDiceResult = rollDiceResult;
	utilStore.isRollDiceAnimationPlay = false;
};

const handleUsedChanceCard: ServerMessageHandler<SocketMsgType.UseChanceCard> = (msg) => {
	const utilStore = useUtil();
	if (msg.data.error) {
		utilStore.canUseCard = true;
	}
	utilStore.canRoll = true;
};

const handlePlayerWalk: ServerMessageHandler<SocketMsgType.PlayerWalk> = (msg) => {
	const { playerId, step, walkId } = msg.data;
	useEventBus().emit("player-walk", playerId, step, walkId);
};

const handlePlayerTp: ServerMessageHandler<SocketMsgType.PlayerTp> = (msg) => {
	const { playerId, positionIndex, walkId } = msg.data;
	useEventBus().emit("player-tp", playerId, positionIndex, walkId);
};

const handleBuyProperty: ServerMessageHandler<SocketMsgType.BuyProperty> = (msg, client) => {
	const property = msg.data;
	const vnode = createVNode(PropertyInfoVue, { property });
	FPMessageBox({
		title: "购买地皮",
		content: vnode,
		cancelText: "不买",
		confirmText: "买！",
	})
		.then(() => {
			client.sendMsg(SocketMsgType.BuyProperty, { operateType: OperateType.BuyProperty, res: true });
		})
		.catch(() => {
			client.sendMsg(SocketMsgType.BuyProperty, { operateType: OperateType.BuyProperty, res: false });
		});
};

const handleBuildHouse: ServerMessageHandler<SocketMsgType.BuildHouse> = (msg, client) => {
	const property = msg.data;
	const vnode = createVNode(PropertyInfoVue, { property });
	FPMessageBox({
		title: "升级房子",
		content: vnode,
		cancelText: "不升级",
		confirmText: "升级！",
	})
		.then(() => {
			client.sendMsg(SocketMsgType.BuildHouse, { operateType: OperateType.BuildHouse, res: true });
		})
		.catch(() => {
			client.sendMsg(SocketMsgType.BuildHouse, { operateType: OperateType.BuildHouse, res: false });
		});
};

const handleGameOver: ServerMessageHandler<SocketMsgType.GameOver> = () => {
	const gameInfoStore = useGameData();
	gameInfoStore.isGameOver = true;
};

const handleGamePause: ServerMessageHandler<SocketMsgType.PauseGame> = () => {
	useLoading().showLoading("房主摸鱼被发现了，游戏暂停，等待房主回来");
};

const handleGameResume: ServerMessageHandler<SocketMsgType.ResumeGame> = () => {
	useLoading().hideLoading();
};
