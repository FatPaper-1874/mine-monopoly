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
	FormField,
	UISchema,
	FormSchema,
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
		case SocketMsgType.RoundTimeOut:
			handleRoundTimeOut(msg, client);
			break;
		case SocketMsgType.CurrentEventName:
			handleCurrentEventName(msg, client);
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
		case SocketMsgType.FormDialog:
			handleFormDialog(msg, client);
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
		case SocketMsgType.LoadingControl:
			handleLoadingControl(msg, client);
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
		gameDataStore.$patch((state) => {
			state.currentPlayerIdInRound = gameData.currentPlayerIdInRound;
			state.currentRound = gameData.currentRound;
			state.currentMultiplier = gameData.currentMultiplier;
			state.players = gameData.players;
			state.properties = gameData.properties;
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

/**
 * 处理倒计时剩余时间
 */
const handleRemainingTime: ServerMessageHandler<SocketMsgType.RemainingTime> = (msg) => {
	const { remainingTime, totalTime } = msg.data;
	const utilStore = useUtil();

	utilStore.waitingFor = { remainingTime, totalTime };
	utilStore.showCountdown = remainingTime > 0; // 服务端控制是否显示倒计时

	// 当有新的倒计时开始时，复位超时状态
	if (remainingTime > 0) {
		utilStore.timeOut = false;
	}
};

/**
 * 处理回合超时事件
 */
const handleRoundTimeOut: ServerMessageHandler<SocketMsgType.RoundTimeOut> = (msg) => {
	const { playerId } = msg.data;
	const utilStore = useUtil();
	const currentUserId = useUserInfo().userId;

	// 只有当前玩家的超时才触发
	if (playerId === currentUserId) {
		utilStore.timeOut = true;
		utilStore.canRoll = false;
		utilStore.showCountdown = false; // 超时后不显示倒计时
		// 将剩余时间设置为 0，确保 UI 正确更新
		utilStore.waitingFor = { ...utilStore.waitingFor, remainingTime: 0 };
		useEventBus().emit(GameEventType.TimeOut);
	}
};

/**
 * 处理当前事件名称
 */
const handleCurrentEventName: ServerMessageHandler<SocketMsgType.CurrentEventName> = (msg) => {
	const { eventName, showCountdown = false } = msg.data;
	const utilStore = useUtil();
	utilStore.currentEventName = eventName;
	// 服务端控制是否显示倒计时
	if (showCountdown !== undefined) {
		utilStore.showCountdown = showCountdown;
	}
};

const handleRoundTurn: ServerMessageHandler<SocketMsgType.RoundTurn> = (msg) => {
	const currentRoundPlayerId = msg.data;
	const utilStore = useUtil();
	const isMyTurn = currentRoundPlayerId === useUserInfo().userId;

	// 只有当前回合玩家才能操作
	if (isMyTurn) {
		utilStore.canRoll = true;
		utilStore.canUseCard = true;
		// 只在是自己的回合时显示提示
		FPMessage({
			type: "info",
			message: "现在是你的回合啦！",
		});
	} else {
		utilStore.canRoll = false;
		utilStore.canUseCard = false;
	}

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
	const { error, animationId, chanceCard, sourcePlayerId, targetIdList } = msg.data;
	const utilStore = useUtil();
	if (error) {
		utilStore.canUseCard = true;
		return; // 使用失败，不播放动画
	}

	// 如果有动画信息，触发机会卡使用事件
	if (animationId && chanceCard && sourcePlayerId && targetIdList) {
		useEventBus().emit("chance-card-use", {
			animationId,
			chanceCard,
			sourcePlayerId,
			targetIdList,
		});
	}
};

const handlePlayerWalk: ServerMessageHandler<SocketMsgType.PlayerWalk> = (msg) => {
	const { playerId, step, walkId, totalSteps, startStep } = msg.data;
	useEventBus().emit("player-walk", playerId, step, walkId, totalSteps, startStep);
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
					data: { id: data.playerId, confirm: true },
				},
			});
		})
		.catch(() => {
			client.sendMsg({
				type: SocketMsgType.Operation,
				source: SocketMsgSource.Client,
				data: {
					operateType: OperateType.ConfirmDialogResult,
					data: { id: data.playerId, confirm: false },
				},
			});
		});
};

const handleFormDialog: ServerMessageHandler<SocketMsgType.FormDialog> = (msg, client) => {
	const data = msg.data;

	// 将 FormDialogOption 转换为 FormSchema 格式
	const formSchema: FormSchema[] = data.option.fields.map((field) => ({
		id: crypto.randomUUID(),
		key: field.key,
		type: typeof field.defaultValue === "number" ? "number-input" : "select",
		label: field.label,
		defaultValue: field.defaultValue,
		min: field.min,
		max: field.max,
	}));

	// 显示表单对话框，同时显示 content 和表单
	FPMessageBox({
		title: data.option.title,
		content: data.option.content,
		form: formSchema,
		confirmText: data.option.confirmText || "提交",
		cancelText: data.option.cancelText || "取消",
	})
		.then((formData) => {
			// 用户提交，formData 包含表单数据
			client.sendMsg({
				type: SocketMsgType.Operation,
				source: SocketMsgSource.Client,
				data: {
					operateType: OperateType.FormDialogResult,
					data: {
						id: data.playerId,
						submitted: true,
						...formData,
					},
				},
			});
		})
		.catch(() => {
			// 用户取消，发送默认值
			const defaultData = buildDefaultFormData(data.option.fields);

			client.sendMsg({
				type: SocketMsgType.Operation,
				source: SocketMsgSource.Client,
				data: {
					operateType: OperateType.FormDialogResult,
					data: {
						id: data.playerId,
						submitted: false,
						...defaultData,
					},
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

const handleLoadingControl: ServerMessageHandler<SocketMsgType.LoadingControl> = (msg, client) => {
	const { show, text } = msg.data;
	if (show) {
		useLoading().showLoading(text || "加载中...");
	} else {
		useLoading().hideLoading();
	}
};

function buildDefaultFormData(fields: FormField<string, any>[]): Record<string, any> {
	const result: Record<string, any> = {};
	for (const field of fields) {
		result[field.key] = field.defaultValue;
	}
	return result;
}
