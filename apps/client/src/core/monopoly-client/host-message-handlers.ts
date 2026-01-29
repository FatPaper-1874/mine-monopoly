import { MonopolyClient, useMonopolyClient } from "./MonopolyClient";
import {
	GameEventType,
	GameSetting,
	OperateType,
	PlayerInfo,
	PropertyInfo,
	RoleInRoom,
	ServerSocketMessage,
	SocketMessage,
	SocketMsgType,
} from "@mine-monopoly/types";
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
import { debounce, getDisplayValueByFormSchema } from "@src/utils";
import { SocketMsgSource } from "@mine-monopoly/types";
import { FPMessage } from "@mine-monopoly/ui";
import { FPMessageBox } from "@src/components/utils/fp-message-box";
import router from "@src/router";
import useEventBus from "@src/utils/event-bus";
import { createVNode } from "vue";
import PropertyInfoVue from "@src/components/common/property-card.vue";
import { useGameData, useMapData, useResourceStore } from "@src/store/game";
import { GameMap } from "@mine-monopoly/utils/protos/game-map";
import { loadGameMapFromFile, loadGameMapFromServer } from "@src/utils/file/game-map";
import { base64ToArrayBuffer } from "@mine-monopoly/utils";
import { showTargetSelector } from "@src/components/common/target-seletor";
import { showItemSelector } from "@src/components/utils/item-selector";
import { FPMessageCard } from "../../components/utils/fp-message-card/index";

type ServerMessageHandler<T extends SocketMsgType> = (
	msg: SocketMessage<T, SocketMsgSource.Server>,
	client: MonopolyClient,
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
		case SocketMsgType.ChangeMap:
			handleChangeMap(msg, client);
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
		case SocketMsgType.GameOver:
			handleGameOver(msg, client);
			break;
		case SocketMsgType.PauseGame:
			handleGamePause(msg, client);
			break;
		case SocketMsgType.ResumeGame:
			handleGameResume(msg, client);
			break;
		case SocketMsgType.ConfirmDialog:
			handleConfirmDialog(msg, client);
			break;
		case SocketMsgType.TargetSelectDialog:
			handleTargetSelect(msg, client);
			break;
		case SocketMsgType.ItemSelectDialog:
			handleItemSelectDialog(msg, client);
			break;
		case SocketMsgType.MessageCard:
			handleMessageCardDialog(msg, client);
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
	const roomInfoStore = useRoomInfo();
	roomInfoData && roomInfoStore.$patch(roomInfoData);
};

const handleChangeMap: ServerMessageHandler<SocketMsgType.ChangeMap> = async (msg, client) => {
	try {
		const data = msg.data;
		useLoading().showLoading("地图加载中...");
		let gameMap, mapInfo;
		switch (data.from) {
			case "server": {
				const res = await loadGameMapFromServer(data.data);
				gameMap = res.gameMap;
				mapInfo = res.mapInfo;
				break;
			}
			case "custom": {
				const dataArrayBuffer = base64ToArrayBuffer(data.data);
				const res = await loadGameMapFromFile(dataArrayBuffer);
				gameMap = res.gameMap;
				mapInfo = res.mapInfo;
				break;
			}
		}

		//版本校验
		const mapVersion = gameMap.info.editorVersion.split(".").slice(0, 2).join("."); //获取前两位版本号
		const clientVersion = __COMPATIBLE_VERSION__;
		if (mapVersion !== clientVersion) {
			throw Error(`版本不匹配！地图编辑器版本: ${mapVersion}, 客户端版本: ${clientVersion}`);
		}

		const tempRoleList: RoleInRoom[] = [];
		const roles = gameMap.roles;
		const resourceStore = useResourceStore();
		for (const role of roles) {
			const imageResource = resourceStore.getRecourceById(role.imageId);
			if (!imageResource) {
				useLoading().hideLoading();
				FPMessage({ type: "error", message: "获取角色资源错误" });
				throw Error("获取角色资源错误");
			}
			tempRoleList.push({ ...role, imageUrl: imageResource.url });
		}
		useRoomInfo().roleList = tempRoleList;
		useRoomInfo().gameSettingForm = gameMap.gameSettingForm;
		// 初始随机选择一个角色
		useMonopolyClient().changeRole(roles[Math.floor(Math.random() * roles.length)].id);
		// 如果自己是房主,提交默认游戏设置(房间类里不解析游戏数据, 只能靠房主来传)
		if (useRoomInfo().amIRoomOwner) {
			const setting: GameSetting = {};
			gameMap.gameSettingForm.forEach((formSchema) => {
				setting[formSchema.key] = {
					label: formSchema.label,
					value: formSchema.defaultValue,
					displayValue: getDisplayValueByFormSchema(formSchema, formSchema.defaultValue),
				};
			});
			client.changeGameSetting(setting);
		}
		FPMessage({ type: "info", message: `地图加载成功: ${mapInfo.name} v${mapInfo.version}` });
		useRoomInfo().mapInfo = mapInfo;
		//地图加载完毕后发送信号
		client.sendMsg({
			type: SocketMsgType.Operation,
			source: SocketMsgSource.Client,
			data: { operateType: OperateType.MapResourceLoaded, data: undefined },
		});
		useLoading().hideLoading();
	} catch (e: any) {
		FPMessage({ type: "error", message: e.message });
		useLoading().hideLoading();
	}
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

const handleGameInit: ServerMessageHandler<SocketMsgType.GameInit> = (msg) => {
	const gameDataStore = useGameData();
	const gameData = msg.data;
	if (gameData) {
		gameDataStore.$patch({
			currentPlayerIdInRound: gameData.currentPlayerIdInRound,
			currentRound: gameData.currentRound,
			currentMultiplier: gameData.currentMultiplier,
			players: gameData.players,
			properties: gameData.properties,
		});
		const me = gameData.players.find((p) => p.id === useUserInfo().userId);
		if (me && me.isBankrupted) {
			const utilStore = useUtil();
			utilStore.canRoll = false;
			utilStore.canUseCard = false;
		}
	}
	const loadingStore = useLoading();
	loadingStore.text = "获取数据成功，加载中...";
	router.replace({ name: "game" });
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
	console.log("🚀 ~ handleGameData ~ gameData:", gameData);
	if (gameData) {
		gameDataStore.updateGameData(gameData);
		const me = gameData.players.find((p) => p.id === useUserInfo().userId);
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

const handleRoundTurn: ServerMessageHandler<SocketMsgType.RoundTurn> = (msg) => {
	const utilStore = useUtil();
	utilStore.canRoll = true;
	utilStore.canUseCard = true;
	useEventBus().emit("round-turn");
};

const handleRollDiceAnimationPlay: ServerMessageHandler<SocketMsgType.RollDiceStart> = () => {
	const utilStore = useUtil();
	utilStore.canRoll = false;
	utilStore.canUseCard = false;
	utilStore.isRollDiceAnimationPlay = true;
};

const handleRollDiceResult: ServerMessageHandler<SocketMsgType.RollDiceResult> = (msg) => {
	const res = msg.data;
	const utilStore = useUtil();
	useEventBus().emit("dice-roll", res.rollDiceResult);
	// utilStore.rollDiceResult = res.rollDiceResult;
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

const handleConfirmDialog: ServerMessageHandler<SocketMsgType.ConfirmDialog> = (msg, client) => {
	const data = msg.data;
	FPMessageBox(data.option)
		.then(() => {
			client.sendMsg({
				type: SocketMsgType.Operation,
				source: SocketMsgSource.Client,
				data: {
					operateType: OperateType.ConfirmDialogResult,
					data: { id: data.playerId, confirm: true, data: undefined },
				},
			});
		})
		.catch(() => {
			client.sendMsg({
				type: SocketMsgType.Operation,
				source: SocketMsgSource.Client,
				data: {
					operateType: OperateType.ConfirmDialogResult,
					data: { id: data.playerId, confirm: false, data: undefined },
				},
			});
		});
};

const handleTargetSelect: ServerMessageHandler<SocketMsgType.TargetSelectDialog> = (msg, client) => {
	const data = msg.data;
	showTargetSelector(data.option.type)
		.then((res) => {
			client.sendMsg({
				type: SocketMsgType.Operation,
				source: SocketMsgSource.Client,
				data: {
					operateType: OperateType.TargetSelectDialogResult,
					data: { target: res },
				},
			});
		})
		.catch(() => {
			client.sendMsg({
				type: SocketMsgType.Operation,
				source: SocketMsgSource.Client,
				data: {
					operateType: OperateType.TargetSelectDialogResult,
					data: { target: [] },
				},
			});
		});
};

const handleItemSelectDialog: ServerMessageHandler<SocketMsgType.ItemSelectDialog> = (msg, client) => {
	const data = msg.data;
	showItemSelector(data.option)
		.then((res) => {
			client.sendMsg({
				type: SocketMsgType.Operation,
				source: SocketMsgSource.Client,
				data: {
					operateType: OperateType.ItemSelectDialogResult,
					data: { selected: res },
				},
			});
		})
		.catch(() => {
			client.sendMsg({
				type: SocketMsgType.Operation,
				source: SocketMsgSource.Client,
				data: {
					operateType: OperateType.ItemSelectDialogResult,
					data: { selected: [] },
				},
			});
		});
};

const handleMessageCardDialog: ServerMessageHandler<SocketMsgType.MessageCard> = (msg, client) => {
	const data = msg.data;
	FPMessageCard(data.option);
};
