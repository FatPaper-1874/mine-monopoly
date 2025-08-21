import Peer, { DataConnection } from "peerjs";
import { ChangeRoleOperate, MonopolyWebSocketMsgType, SocketMsgType } from "@src/enums/bace";
import {
	ChatMessage,
	GameLog,
	GameSetting,
	MonopolyWebSocketMsg,
	Room,
	RoomInfo,
	SocketMessage,
	User,
} from "@src/interfaces/bace";
import { base64ToFileUrl, debounce, throttle } from "@src/utils";
import { asyncMissionQueue } from "@src/utils/async-mission-queue";
import { MonopolyHost } from "@src/classes/monopoly-host/MonopolyHost";
import { PeerClient } from "@src/classes/monopoly-client/PeerClient";
import { FPMessage } from "@fatpaper-monopoly/ui";
import {
	useChat,
	useGameInfo,
	useGameLog,
	useLoading,
	useMapData,
	useRoomInfo,
	useRoomList,
	useUserInfo,
	useUserList,
	useUtil,
} from "@src/store";
import router from "@src/router";
import { GameInfo, GameInitInfo, PropertyInfo, PlayerInfo } from "@src/interfaces/game";
import useEventBus from "@src/utils/event-bus";
import { createVNode } from "vue";
import PropertyInfoVue from "@src/components/common/property-card.vue";
import { FPMessageBox } from "@src/components/utils/fp-message-box";
import { OperateType } from "@src/enums/game";
import { emitHostPeerId, emitRoomHeart, joinRoomApi } from "@src/utils/api/room-router";
import { GameEvents } from "../../enums/game";

type MonopolyClientOptions = {
	iceServer: {
		host: string;
		port: number;
	};
};

export class MonopolyClient {
	private userId: string | undefined;
	private peerId: string | undefined;
	private roomId: string | undefined;

	private options: MonopolyClientOptions;
	private iceServerHost: string;
	private iceServerPort: number;

	private peerClient: PeerClient | null = null;
	private conn: DataConnection | null = null;
	private gameHost: MonopolyHost | null = null;
	private isOnline = false;

	private intervalList: any[] = [];

	private static instance: MonopolyClient | null;

	private sendHeartTime = 0;

	public static getInstance(): MonopolyClient;
	public static getInstance(options: MonopolyClientOptions): Promise<MonopolyClient>;
	public static getInstance(options?: MonopolyClientOptions) {
		if (this.instance) {
			return this.instance;
		}
		if (options) {
			return (async () => {
				this.instance = new MonopolyClient(options);

				return this.instance;
			})();
		} else {
			// if (!this.instance) {
			// 	throw Error("在调用MonopolyClient之前应该先对其初始化, 使用useMonopolyClient时提供options以初始化");
			// }
			return this.instance;
		}
	}

	private constructor(options: MonopolyClientOptions) {
		const {
			iceServer: { host: iceHost, port: icePort },
		} = options;

		this.options = options;
		this.iceServerHost = iceHost;
		this.iceServerPort = icePort;
	}

	public async joinRoom(roomId: string) {
		console.log("🚀 ~ MonopolyClient ~ joinRoom ~ roomId:", roomId);
		try {
			const data = await joinRoomApi(roomId);
			const userStore = useUserInfo();
			let hostPeerId = data.hostPeerId;

			if (data.needCreate) {
				useLoading().showLoading("正在创建主机...");
				if (this.gameHost) throw Error("你已经是主机了,为什么要再次创建房间!!!");
				// 创建一个临时的 URL 指向 Blob 数据
				this.gameHost = await MonopolyHost.create(
					roomId,
					this.iceServerHost,
					this.iceServerPort,
					data.deleteIntervalMs
				);
				this.gameHost.addDestoryListener(() => {
					this.gameHost = null;
					this.peerClient = null;
				});
				hostPeerId = this.gameHost.getPeerId();
				useLoading().showLoading("主机创建成功，正在和服务器报喜...");
				await emitHostPeerId(roomId, hostPeerId, userStore.username, userStore.userId);
			}
			if (hostPeerId) {
				useLoading().showLoading("连接主机中...");
				await this.linkToGameHost(hostPeerId);
			}
		} catch (e) {
			FPMessage({ type: "error", message: "服务器连接失败" });
		}
	}

	private async linkToGameHost(hostPeerId: string) {
		try {
			if (!this.peerClient) {
				this.peerClient = await PeerClient.create(this.iceServerHost, this.iceServerPort);
			}
			const { conn, peer } = await this.peerClient.linkToHost(hostPeerId);
			this.conn = conn;
			const { userId, username, color, avatar } = useUserInfo();
			const user: User = {
				userId,
				username,
				color,
				avatar,
				isReady: false,
			};
			this.sendMsg(SocketMsgType.JoinRoom, user);

			FPMessage({
				type: "success",
				message: "主机连接成功🤗",
			});
			this.isOnline = true;

			this.intervalList.push(
				setInterval(() => {
					this.sendHeartTime = Date.now();
					this.sendMsg(SocketMsgType.Heart, "");
				}, 3000)
			);

			this.conn.on("data", (_data: any) => {
				// const data = JSON.parse(_data as string);
				const data: SocketMessage = JSON.parse(_data);
				if (data.msg) {
					FPMessage({
						type: data.msg.type as "info" | "success" | "warning" | "error",
						message: data.msg.content,
					});
				}
				// console.log("Client Receive: ", data);

				switch (data.type) {
					case SocketMsgType.Heart:
						this.handleHeart(data);
						break;
					case SocketMsgType.ConfirmIdentity:
						this.handleConfirmIdentity();
						break;
					case SocketMsgType.UserList:
						this.handleUserListReply(data.data);
						break;
					case SocketMsgType.RoomList:
						this.handleRoomListReply(data.data);
						break;
					case SocketMsgType.JoinRoom:
						this.handleJoinRoomReply(data);
						break;
					case SocketMsgType.LeaveRoom:
						this.handleLeaveRoomReply(data);
						break;
					case SocketMsgType.KickOut:
						this.handleKickOutReply();
						break;
					case SocketMsgType.RoomInfo:
						this.handleRoomInfoReply(data);
						break;
					case SocketMsgType.RoomChat:
						this.handleRoomChatReply(data);
						break;
					case SocketMsgType.GameStart:
						this.handleGameStartReply(data);
						break;
					case SocketMsgType.GameInit:
						this.handleGameInit(data);
						break;
					case SocketMsgType.GameInitFinished:
						this.handleGameInitFinished();
						break;
					case SocketMsgType.GameInfo:
						this.handleGameInfo(data);
						break;
					case SocketMsgType.GameLog:
						this.handleGameLog(data);
						break;
					case SocketMsgType.GainMoney:
						this.handleGainMoney(data);
						break;
					case SocketMsgType.CostMoney:
						this.handleCostMoney(data);
						break;
					case SocketMsgType.RemainingTime:
						this.handleRemainingTime(data);
						break;
					case SocketMsgType.RoundTurn:
						this.handleRoundTurn();
						break;
					case SocketMsgType.RollDiceStart:
						this.handleRollDiceAnimationPlay();
						break;
					case SocketMsgType.RollDiceResult:
						this.handleRollDiceResult(data);
						break;
					case SocketMsgType.UseChanceCard:
						this.handleUsedChanceCard(data);
						break;
					case SocketMsgType.PlayerWalk:
						this.handlePlayerWalk(data);
						break;
					case SocketMsgType.PlayerTp:
						this.handlePlayerTp(data);
						break;
					case SocketMsgType.BuyProperty:
						this.handleBuyProperty(data);
						break;
					case SocketMsgType.BuildHouse:
						this.handleBuildHouse(data);
						break;
					case SocketMsgType.GameOver:
						this.handleGameOver(data);
						break;
					case SocketMsgType.PauseGame:
						this.handleGamePause();
						break;
					case SocketMsgType.ResumeGame:
						this.handleGameResume();
						break;
					default:
						break;
				}
			});

			this.conn.on("close", () => {
				console.log("🚀 ~ MonopolyHost ~ conn.on ~ close:");
				if (this.isOnline) {
					this.isOnline = false;
					FPMessage({
						type: "error",
						message: "与主机断开连接, 即将返回主页, 输入id进入房间即可重新连接",
						onClosed: () => {
							router.replace("room-router");
							this.destory();
						},
					});
				}
			});

			this.conn.on("error", (err) => {
				console.log("🚀 ~ MonopolyHost ~ conn.on ~ error:", err.type);
				if (this.isOnline && err.type === "not-open-yet") {
					this.isOnline = false;
					FPMessage({
						type: "error",
						message: "与主机断开连接, 即将返回主页, 输入id进入房间即可重新连接",
						onClosed: () => {
							router.replace("room-router");
							this.destory();
						},
					});
				}
			});
		} catch (e: any) {
			FPMessage({ type: "error", message: e });
		}
	}

	private handleHeart(data: SocketMessage) {
		const gameInfoStore = useGameInfo();
		gameInfoStore.ping = Math.round((Date.now() - this.sendHeartTime) / 2);
		// this.sendMsg(SocketMsgType.Heart, "");
		this.handleNoHeart.fn();
	}

	private handleNoHeart = debounce(
		() => {
			FPMessage({
				type: "error",
				message: "与主机断开连接, 即将返回主页, 输入id进入房间即可重新连接",
				onClosed: () => {
					router.replace("room-router");
					this.destory();
				},
			});
		},
		20000,
		true
	);

	private handleConfirmIdentity() {}

	private handleUserListReply(data: User[]) {
		const userListStore = useUserList();
		userListStore.userList = data;
	}

	private handleRoomListReply(data: Room[]) {
		const roomListStore = useRoomList();
		roomListStore.roomList = data;
	}

	private handleJoinRoomReply(data: SocketMessage) {
		if (data.roomId) {
			useRoomInfo().roomId = data.roomId;
			router.replace({ name: "room" });
		}
	}

	private handleLeaveRoomReply(data: SocketMessage) {}

	private handleKickOutReply() {
		FPMessage({ type: "error", message: "你已被踢出房间" });
		this.destory();
		router.replace({ name: "room-router" });
	}

	private handleRoomInfoReply(data: SocketMessage) {
		const roomInfoData = data.data as RoomInfo;
		const roomInfoStore = useRoomInfo();
		roomInfoData &&
			roomInfoStore.$patch({
				roomId: roomInfoData.roomId,
				ownerId: roomInfoData.ownerId,
				ownerName: roomInfoData.ownerName,
				userList: roomInfoData.userList,
				roleList: roomInfoData.roleList,
				gameSetting: roomInfoData.gameSetting,
			});
	}

	private handleRoomChatReply(res: SocketMessage) {
		const message = res.data as ChatMessage;
		useChat().addNewMessage(message);
	}

	private handleGameStartReply(data: SocketMessage) {
		useLoading().$patch({
			loading: true,
			text: "正在进入游戏...",
		});
	}

	private handleGameInit(data: SocketMessage) {
		if (data.data) {
			const loadingStore = useLoading();
			loadingStore.text = "获取数据成功，加载中...";

			const gameInitInfo = data.data as GameInitInfo;

			const mapDataStore = useMapData();
			mapDataStore.$patch(gameInitInfo);

			const gameInfoStore = useGameInfo();
			gameInitInfo &&
				gameInfoStore.$patch({
					currentRound: gameInitInfo.currentRound,
					currentPlayerIdInRound: gameInitInfo.currentPlayerInRound,
					currentMultiplier: gameInitInfo.currentMultiplier,
				});

			router.replace({ name: "game" });
		} else {
			FPMessage({ type: "error", message: "获取地图初始数据失败" });
		}
	}

	private handleGameInitFinished() {
		useLoading().hideLoading();
	}

	private handleGainMoney(data: SocketMessage) {
		const { player, money, source } = data.data as {
			player: PlayerInfo;
			money: number;
			source: PlayerInfo | undefined;
		};
		useEventBus().emit(GameEvents.GainMoney + player.id, player, money, source);
	}

	private handleCostMoney(data: SocketMessage) {
		const { player, money, target } = data.data as {
			player: PlayerInfo;
			money: number;
			target: PlayerInfo | undefined;
		};
		useEventBus().emit(GameEvents.CostMoney + player.id, player, money, target);
	}

	private handleGameInfo(data: SocketMessage) {
		if (data.data == "error") return;
		const gameInfoStore = useGameInfo();
		const gameInfo: GameInfo = data.data;
		if (gameInfo) {
			gameInfoStore.$patch({
				currentPlayerIdInRound: gameInfo.currentPlayerInRound,
				currentRound: gameInfo.currentRound,
				currentMultiplier: gameInfo.currentMultiplier,
				playersList: gameInfo.playerList,
				propertiesList: gameInfo.properties,
			});
			const me = gameInfo.playerList.find((p) => p.id === useUserInfo().userId);
			if (me && me.isBankrupted) {
				const utilStore = useUtil();
				utilStore.canRoll = false;
				utilStore.canUseCard = false;
			}
		}
	}

	private handleGameLog(data: SocketMessage) {
		const log = data.data as GameLog;
		useGameLog().addNewLog(log);
	}

	private handleRemainingTime(data: SocketMessage) {
		const waitingFor = data.data;
		const utilStore = useUtil();
		utilStore.waitingFor = waitingFor;
		utilStore.timeOut = waitingFor.remainingTime <= 0;
		if (waitingFor.remainingTime <= 0) {
			utilStore.canRoll = false;
			useEventBus().emit(GameEvents.TimeOut);
		}
	}

	private handleRoundTurn() {
		const utilStore = useUtil();
		utilStore.canRoll = true;
		utilStore.canUseCard = true;
		useEventBus().emit("RoundTurn");
	}

	private handleRollDiceAnimationPlay() {
		const utilStore = useUtil();
		utilStore.canRoll = false;
		utilStore.canUseCard = false;
		utilStore.isRollDiceAnimationPlay = true;
	}

	private handleRollDiceResult(data: SocketMessage) {
		const rollDiceResult: number[] = data.data.rollDiceResult;

		const utilStore = useUtil();
		utilStore.rollDiceResult = rollDiceResult;
		utilStore.isRollDiceAnimationPlay = false;
	}

	private handleUsedChanceCard(data: SocketMessage) {
		const utilStore = useUtil();
		if (data.data === "error") {
			utilStore.canUseCard = true;
		}
		utilStore.canRoll = true;
	}

	private handlePlayerWalk(data: SocketMessage) {
		const { playerId, step, walkId } = data.data as { playerId: string; step: number; walkId: string };
		useEventBus().emit("player-walk", playerId, step, walkId);
	}

	private handlePlayerTp(data: SocketMessage) {
		const { playerId, positionIndex, walkId } = data.data as {
			playerId: string;
			positionIndex: number;
			walkId: string;
		};
		useEventBus().emit("player-tp", playerId, positionIndex, walkId);
	}

	private handleBuyProperty(data: SocketMessage) {
		const property: PropertyInfo = data.data;

		const vnode = createVNode(PropertyInfoVue, { property });

		FPMessageBox({
			title: "购买地皮",
			content: vnode,
			cancelText: "不买",
			confirmText: "买！",
		})
			.then(() => {
				this.sendMsg(SocketMsgType.BuyProperty, OperateType.BuyProperty, undefined, true);
			})
			.catch(() => {
				this.sendMsg(SocketMsgType.BuyProperty, OperateType.BuyProperty, undefined, false);
			});
	}

	private handleBuildHouse(data: SocketMessage) {
		const property: PropertyInfo = data.data;

		const vnode = createVNode(PropertyInfoVue, { property });

		FPMessageBox({
			title: "升级房子",
			content: vnode,
			cancelText: "不升级",
			confirmText: "升级！",
		})
			.then(() => {
				this.sendMsg(SocketMsgType.BuildHouse, OperateType.BuildHouse, undefined, true);
			})
			.catch(() => {
				this.sendMsg(SocketMsgType.BuildHouse, OperateType.BuildHouse, undefined, false);
			});
	}

	private handleGameOver(data: SocketMessage) {
		const gameInfoStore = useGameInfo();
		gameInfoStore.isGameOver = true;
	}

	private handleGamePause() {
		useLoading().showLoading("房主摸鱼被发现了，游戏暂停，等待房主回来");
	}

	private handleGameResume() {
		useLoading().hideLoading();
	}

	public sendRoomChatMessage(message: string, roomId: string) {
		this.sendMsg(SocketMsgType.RoomChat, message, roomId);
	}

	public async leaveRoom() {
		this.isOnline = false;
		await this.sendMsg(SocketMsgType.LeaveRoom, "");
		this.destory();
		const roomInfoStore = useRoomInfo();
		roomInfoStore.$reset();
		useChat().$reset();
		useGameLog().$reset();
		this.destory();
		router.replace({ name: "room-router" });
	}

	public readyToggle() {
		this.sendMsg(SocketMsgType.ReadyToggle, "");
	}

	public changeColor(newColor: string) {
		this.sendMsg(SocketMsgType.ChangeColor, newColor);
	}

	public kickOut(playerId: string) {
		this.sendMsg(SocketMsgType.KickOut, playerId);
	}

	public changeRole(operate: ChangeRoleOperate) {
		this.sendMsg(SocketMsgType.ChangeRole, operate);
	}

	public changeGameSetting(gameSetting: GameSetting) {
		this.sendMsg(SocketMsgType.ChangeGameSetting, gameSetting);
	}

	public startGame() {
		this.sendMsg(SocketMsgType.GameStart, "");
	}

	public gameInitFinished() {
		this.sendMsg(SocketMsgType.GameInitFinished, "");
	}

	public rollDice() {
		this.sendMsg(SocketMsgType.RollDiceResult, OperateType.RollDice);
		const utilStore = useUtil();
		utilStore.canRoll = false;
		utilStore.canUseCard = false;
	}

	public useChanceCard(cardId: string, target?: string | string[]) {
		const utilStore = useUtil();
		utilStore.canRoll = false;
		utilStore.canUseCard = false;
		this.sendMsg(SocketMsgType.UseChanceCard, cardId, undefined, target);
	}

	public AnimationComplete(animationId?: string) {
		this.sendMsg(SocketMsgType.Animation, OperateType.Animation + animationId);
	}

	public destory() {
		this.isOnline = false;
		this.handleNoHeart.cancel();
		this.intervalList.forEach((i) => {
			clearInterval(i);
		});
		this.conn = null;
		this.peerClient && this.peerClient.destory();
		this.peerClient = null;
		this.gameHost && this.gameHost.destory();
	}

	public disConnect() {
		this.conn && this.conn.close();
		this.destory();
	}

	private async sendMsg(type: SocketMsgType, data: any, roomId: string = useRoomInfo().roomId, extra: any = undefined) {
		const userInfo = useUserInfo();
		const msgToSend: SocketMessage = {
			type,
			source: userInfo.userId,
			roomId,
			data,
			extra,
		};
		// this.conn && this.conn.send(JSON.stringify(msgToSend));
		if (this.conn) {
			await this.conn.send(JSON.stringify(msgToSend));
		}
	}

	public static destoryInstance() {
		this.instance && this.instance.destory();
		this.instance = null;
	}
}

function useMonopolyClient(): MonopolyClient;
function useMonopolyClient(options: MonopolyClientOptions): Promise<MonopolyClient>;
function useMonopolyClient(options?: MonopolyClientOptions) {
	window.addEventListener("beforeunload", destoryMonopolyClient);
	return options ? MonopolyClient.getInstance(options) : MonopolyClient.getInstance();
}

function destoryMonopolyClient() {
	try {
		MonopolyClient.getInstance() && MonopolyClient.destoryInstance();
	} catch (e) {
		console.log(e);
	}
}

export { useMonopolyClient, destoryMonopolyClient };
