import { FPMessage } from "@mine-monopoly/ui";
import { useChat, useGameLog, useLoading, useRoomInfo, useUserInfo, useUtil } from "@src/store";
import { useGameData } from "@src/store/game";
import { emitHostPeerId, joinRoomApi } from "@src/utils/api/room-router";
import { PeerClient } from "./PeerClient";
import { ReconnectionManager } from "./ReconnectionManager";
import { DataConnection } from "peerjs";
import {
	RoomMapInfo,
	ChangeRoleOperate,
	GameSetting,
	OperateType,
	Role,
	ServerSocketMessage,
	SocketMessage,
	SocketMessageDataType,
	SocketMsgSource,
	SocketMsgType,
	User,
	ClientSocketMessage,
} from "@mine-monopoly/types";
import { MonopolyHost } from "../monopoly-host/MonopolyHost";
import { handleServerSocketMessage } from "./host-message-handlers";
import router from "@src/router";
import { debounce } from "@src/utils";
import { arrayBufferToBase64 } from "@mine-monopoly/utils";
import { connectionDiagnostics } from "@src/utils/connection-diagnostics";

type MonopolyClientOptions = {
	iceServer: {
		host: string;
		port: number;
	};
};

export class MonopolyClient {
	private static instance: MonopolyClient | null;
	private options: MonopolyClientOptions;
	private iceServerHost: string;
	private iceServerPort: number;

	private gameHost: MonopolyHost | null = null;
	private peerClient: PeerClient | null = null;
	private conn: DataConnection | null = null;
	private isOnline = false;
	private currentIceServers: RTCIceServer[] = [];

	private sendHeartTime = 0;
	private intervalList: any[] = [];
	private handleNoHeartTimer: ReturnType<typeof debounce> | null = null;
	private heartBeatPaused = false;
	private reconnectionManager: ReconnectionManager | null = null;
	private currentHostPeerId: string | null = null; // 保存当前主机 PeerId 用于重连

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
		// 重置诊断数据
		connectionDiagnostics.reset();
		connectionDiagnostics.stageStart("joinRoom_Total");

		try {
			connectionDiagnostics.stageStart("HTTP_JoinRequest");
			const res = await joinRoomApi(roomId);
			connectionDiagnostics.stageEnd("HTTP_JoinRequest", {
				roomId,
				needCreate: res.data.needCreate,
				hasHostPeerId: !!res.data.hostPeerId,
				iceServerCount: res.data.iceServers?.length || 0,
			});

			const data = res.data;
			const userStore = useUserInfo();
			let hostPeerId = data.hostPeerId;

			this.currentIceServers = data.iceServers;

			if (data.needCreate) {
				connectionDiagnostics.stageStart("Host_Create");
				useLoading().showLoading("正在创建主机...");
				if (this.gameHost) throw Error("你已经是主机了,为什么要再次创建房间!!!");
				this.gameHost = await MonopolyHost.create(
					roomId,
					this.iceServerHost,
					this.iceServerPort,
					data.deleteIntervalMs,
					this.currentIceServers,
				);
				this.gameHost.addDestoryListener(() => {
					this.gameHost = null;
					this.peerClient = null;
				});
				hostPeerId = this.gameHost.getPeerId();
				connectionDiagnostics.stageEnd("Host_Create", { hostPeerId });

				connectionDiagnostics.stageStart("HTTP_EmitHost");
				useLoading().showLoading("主机创建成功，正在和服务器报喜...");
				await emitHostPeerId(roomId, hostPeerId, userStore.username, userStore.userId);
				connectionDiagnostics.stageEnd("HTTP_EmitHost", { roomId, hostPeerId });
			}
			if (hostPeerId) {
				connectionDiagnostics.stageStart("Client_LinkToHost");
				useLoading().showLoading("连接主机中...");
				await this.linkToGameHost(hostPeerId);
				connectionDiagnostics.stageEnd("Client_LinkToHost", { hostPeerId });
			}

			connectionDiagnostics.stageEnd("joinRoom_Total");
		} catch (e: any) {
			const errMsg = e?.message || "服务器连接失败";
			connectionDiagnostics.stageFail("joinRoom_Total", errMsg);
			connectionDiagnostics.printSummary();
			FPMessage({ type: "error", message: errMsg });
		}
	}

	private async linkToGameHost(hostPeerId: string) {
		try {
			// 保存主机 PeerId 用于重连
			this.currentHostPeerId = hostPeerId;

			// 清理旧的连接和事件监听器
			if (this.conn) {
				this.conn.removeAllListeners();
				this.conn.close();
				this.conn = null;
			}

			// 停止旧的重连管理器
			if (this.reconnectionManager) {
				this.reconnectionManager.destroy();
				this.reconnectionManager = null;
			}

			// 清理所有定时器
			this.intervalList.forEach((timer) => clearInterval(timer));
			this.intervalList = [];

			if (!this.peerClient) {
				connectionDiagnostics.stageStart("PeerClient_Create");
				this.peerClient = await PeerClient.create(this.iceServerHost, this.iceServerPort, this.currentIceServers);
				connectionDiagnostics.stageEnd("PeerClient_Create");
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

			connectionDiagnostics.stageStart("Send_JoinRoom");
			this.sendMsg({ type: SocketMsgType.JoinRoom, source: SocketMsgSource.Client, data: user });
			connectionDiagnostics.stageEnd("Send_JoinRoom");

			FPMessage({
				type: "success",
				message: "主机连接成功🤗",
			});
			this.isOnline = true;

			// 初始化心跳超时定时器
			this.initHeartBeat();

			// 启动心跳发送定时器
			this.intervalList.push(
				setInterval(() => {
					if (this.heartBeatPaused) return;
					this.sendHeartTime = Date.now();
					this.sendMsg({ type: SocketMsgType.Heart, source: SocketMsgSource.Client, data: undefined });
				}, 3000),
			);

			this.conn.on("data", (_data: any) => {
					let data: ServerSocketMessage;
					try {
						data = JSON.parse(_data, (key, value) => {
							if (value === "Infinity") return Infinity;
							if (value === "-Infinity") return -Infinity;
							return value;
						});
					} catch {
						console.error("Failed to parse server message:", _data);
						connectionDiagnostics.warn("收到无法解析的主机消息");
						return;
					}
					if (data.msg) {
					// 在显示通知消息时，隐藏任何正在显示的 loading
					useLoading().hideLoading();
					FPMessage({
						type: data.msg.type,
						message: data.msg.content,
					});
				}
				// console.log("Client Receive: ", data);

				handleServerSocketMessage(data, this);
			});

			this.conn.on("close", () => {
				connectionDiagnostics.logPeerEvent("DataConnection.close", "连接关闭");
				if (this.isOnline) {
					this.isOnline = false;
					this.startReconnection();
				}
			});

			this.conn.on("error", (err) => {
				connectionDiagnostics.logPeerEvent("DataConnection.error", `type=${err.type} message=${err.message}`);
				if (this.isOnline && err.type === "not-open-yet") {
					this.isOnline = false;
					this.startReconnection();
				}
			});
		} catch (e: any) {
			if (this.peerClient) {
				this.peerClient.destory();
				this.peerClient = null;
			}
			connectionDiagnostics.checkRelayCandidates();
			connectionDiagnostics.error(`linkToGameHost 异常: ${e?.message || e}`);
			connectionDiagnostics.printSummary();
			FPMessage({ type: "error", message: e?.message || e });
		}
	}

	/**
	 * 启动自动重连
	 */
	private startReconnection() {
		// 如果没有主机 PeerId，无法重连
		if (!this.currentHostPeerId) {
			this.handleDisconnect();
			return;
		}

		// 停止心跳
		this.pauseHeartBeat();

		// 创建重连管理器
		this.reconnectionManager = new ReconnectionManager(
			async () => {
				// 重连函数：尝试重新连接主机
				await this.performReconnect();
			},
			{
				retryInterval: 3000,
				maxRetries: Number.POSITIVE_INFINITY, // 无限重试
				showCountdown: true,
				onRetry: (attempt, maxRetries) => {
					console.log(`[MonopolyClient] 重连尝试 ${attempt}/${maxRetries === Number.POSITIVE_INFINITY ? '∞' : maxRetries}`);
				},
				onSuccess: () => {
					console.log('[MonopolyClient] 重连成功');
					// isOnline 状态已由 ReconnectionManager 管理
					this.resumeHeartBeat();
				},
				onFail: (error) => {
					console.error('[MonopolyClient] 重连失败:', error);
					FPMessage({
						type: "error",
						message: `重连失败: ${error.message}`,
						onClosed: () => {
							this.handleDisconnect();
						},
					});
				},
				onCancel: () => {
					console.log('[MonopolyClient] 用户取消重连');
					this.handleDisconnect();
				}
			}
		);

		// 开始重连
		this.reconnectionManager.start();
	}

	/**
	 * 执行重连操作
	 */
	private async performReconnect(): Promise<void> {
		if (!this.currentHostPeerId) {
			throw new Error('无法重连：主机 PeerId 丢失');
		}

		// 清理旧连接
		if (this.conn) {
			this.conn.removeAllListeners();
			this.conn.close();
			this.conn = null;
		}

		// 使用现有的 peerClient 重新连接
		if (!this.peerClient) {
			throw new Error('无法重连：PeerClient 不存在');
		}

		const { conn } = await this.peerClient.linkToHost(this.currentHostPeerId);
		this.conn = conn;

		// 重新发送加入房间消息
		const { userId, username, color, avatar } = useUserInfo();
		const user: User = {
			userId,
			username,
			color,
			avatar,
			isReady: useRoomInfo().isReady, // 恢复准备状态
		};
		this.sendMsg({ type: SocketMsgType.JoinRoom, source: SocketMsgSource.Client, data: user });
	}

	/**
	 * 取消重连
	 */
	public cancelReconnection(): void {
		if (this.reconnectionManager) {
			this.reconnectionManager.cancel();
			this.reconnectionManager = null;
		}
	}

	/**
	 * 是否正在重连
	 */
	public isReconnecting(): boolean {
		return this.reconnectionManager?.isReconnecting() ?? false;
	}

	public handleHeartReply() {
		useUtil().ping = Math.round((Date.now() - this.sendHeartTime) / 2);
		this.handleNoHeartTimer?.fn();
	}

	private handleNoHeart = debounce(
		() => {
			this.isOnline = false;
			this.startReconnection();
		},
		5000,
		true,
	);

	public initHeartBeat() {
		// 在首次发送心跳时初始化心跳超时定时器
		this.handleNoHeartTimer = this.handleNoHeart;
	}

	public pauseHeartBeat() {
		this.heartBeatPaused = true;
		this.handleNoHeartTimer?.cancel();
	}

	public resumeHeartBeat() {
		this.heartBeatPaused = false;
		this.handleNoHeartTimer?.fn();
	}

	public sendLoadingStarted() {
		this.sendMsg({
			type: SocketMsgType.Operation,
			source: SocketMsgSource.Client,
			data: { operateType: OperateType.LoadingStarted, data: undefined },
		});
	}

	private handleDisconnect() {
		useGameData().$reset();
		useRoomInfo().$reset();
		useChat().$reset();
		useGameLog().$reset();
		router.replace({ name: "room-router" });
		this.destory();
	}

	public sendRoomChatMessage(message: string, roomId: string) {
		this.sendMsg({ type: SocketMsgType.RoomChat, source: SocketMsgSource.Client, data: message });
	}

	public async leaveRoom() {
		// 1. 立即设置离线状态，防止心跳超时处理程序触发
		this.isOnline = false;

		// 2. 向服务器发送退出房间消息
		await this.sendMsg({ type: SocketMsgType.LeaveRoom, source: SocketMsgSource.Client, data: undefined });

		// 3. 立即清理所有心跳定时器，但保留连接让服务器处理退出逻辑
		this.intervalList.forEach((timer) => clearInterval(timer));
		this.intervalList = [];

		// 4. 取消心跳超时的 debounce 定时器
		if (this.handleNoHeartTimer) {
			this.handleNoHeartTimer.cancel();
			this.handleNoHeartTimer = null;
		}
	}

	public readyToggle() {
		this.sendMsg({ type: SocketMsgType.ReadyToggle, source: SocketMsgSource.Client, data: undefined });
	}

	public changeColor(newColor: string) {
		this.sendMsg({ type: SocketMsgType.ChangeColor, source: SocketMsgSource.Client, data: newColor });
	}

	public kickOut(playerId: string) {
		this.sendMsg({ type: SocketMsgType.KickOut, source: SocketMsgSource.Client, data: playerId });
	}

	public changeRole(roleId: string) {
		this.sendMsg({ type: SocketMsgType.ChangeRole, source: SocketMsgSource.Client, data: roleId });
	}

	public changeGameMap(msg: RoomMapInfo) {
		console.log("[ChangeMap] 3.MonopolyClient.changeGameMap: 调用 sendMsg, from=", msg.from, "dataLen=", (msg.data as string)?.length);
		// 如果自己是房主，直接调用 Room.changeMap 走本地，避免大消息被 DataChannel 丢弃
		if (this.gameHost) {
			console.log("[ChangeMap] 3a.MonopolyClient.changeGameMap: 房主模式, 直接调用 Room.changeMap");
			this.gameHost.getRoom().changeMap(msg);
			return;
		}
		this.sendMsg({ type: SocketMsgType.ChangeMap, source: SocketMsgSource.Client, data: msg });
	}

	public changeGameSetting(gameSetting: GameSetting) {
		this.sendMsg({ type: SocketMsgType.ChangeGameSetting, source: SocketMsgSource.Client, data: gameSetting });
	}

	public startGame() {
		this.sendMsg({ type: SocketMsgType.GameStart, source: SocketMsgSource.Client, data: undefined });
	}

	public requestSave(): void {
		if (this.gameHost) {
			this.gameHost.getRoom().requestSave();
		}
	}

	public async loadSave(record: any, usePrevious: boolean = false): Promise<{ success: boolean; error?: string }> {
		if (this.gameHost) {
			return this.gameHost.getRoom().loadSave(record, usePrevious);
		}
		return { success: false, error: "未连接到主机" };
	}

	public gameInitFinished() {
		this.sendMsg({
			type: SocketMsgType.Operation,
			source: SocketMsgSource.Client,
			data: { operateType: OperateType.GameInitFinished, data: undefined },
		});
	}

	public rollDice() {
		// 客户端立即锁定，防止重复点击
		const utilStore = useUtil();
		utilStore.startAnimation();

		this.sendMsg({
			type: SocketMsgType.Operation,
			source: SocketMsgSource.Client,
			data: { operateType: OperateType.RollDice, data: undefined },
		});
	}

	public useChanceCard(chanceCardId: string, targetIdList: string[]) {
		// 客户端立即锁定，防止重复点击
		const utilStore = useUtil();
		utilStore.startAnimation();

		this.sendMsg({
			type: SocketMsgType.Operation,
			source: SocketMsgSource.Client,
			data: {
				operateType: OperateType.UseChanceCard,
				data: { chanceCardId, targetIdList },
			},
		});
	}

	public sendDynamicButtonClick(buttonId: string) {
		this.sendMsg({
			type: SocketMsgType.Operation,
			source: SocketMsgSource.Client,
			data: {
				operateType: OperateType.DynamicButtonClick,
				data: { buttonId, success: true },
			},
		});
	}

	public AnimationComplete(animationId: string) {
		this.sendMsg({
			type: SocketMsgType.Operation,
			source: SocketMsgSource.Client,
			data: {
				operateType: OperateType.Animation,
				data: animationId,
			},
		});

		// 动画完成后解锁状态
		const utilStore = useUtil();
		utilStore.endAnimation();
	}

	public async sendMsg(msg: ClientSocketMessage) {
		if (this.conn?.open) {
			try {
				console.log("[ChangeMap] 4.sendMsg: conn.open=true, 开始发送 type=", msg.type);
				await this.conn.send(
					JSON.stringify(msg, (key, value) => {
						if (value === Infinity) return "Infinity";
						if (value === -Infinity) return "-Infinity";
						return value;
					}),
				);
				console.log("[ChangeMap] 5.sendMsg: 发送完成 type=", msg.type);
			} catch (e) {
				console.error("[ChangeMap] 5.sendMsg FAILED:", msg.type, e);
				console.error("Failed to send message:", msg.type);
			}
		} else {
			console.warn("[ChangeMap] 4.sendMsg: conn 不可用! open=", this.conn?.open, "conn=", !!this.conn);
		}
	}

	public destory() {
		// 1. 防止竞态条件，先设置离线状态
		this.isOnline = false;

		// 2. 清理重连管理器
		if (this.reconnectionManager) {
			this.reconnectionManager.destroy();
			this.reconnectionManager = null;
		}

		// 3. 清理所有心跳定时器
		this.intervalList.forEach((timer) => clearInterval(timer));
		this.intervalList = [];

		// 4. 取消心跳超时的 debounce 定时器
		if (this.handleNoHeartTimer) {
			this.handleNoHeartTimer.cancel();
			this.handleNoHeartTimer = null;
		}

		// 5. 移除连接事件监听器并关闭连接
		if (this.conn) {
			this.conn.removeAllListeners();
			this.conn.close();
			this.conn = null;
		}

		// 6. 销毁 Peer 客户端
		if (this.peerClient) {
			this.peerClient.destory();
			this.peerClient = null;
		}

		// 7. 清理游戏主机（如果存在）
		if (this.gameHost) {
			this.gameHost.destory();
			this.gameHost = null;
		}
	}

	public static destoryInstance() {
		if (this.instance) {
			this.instance.destory();
			this.instance = null;
		}
		// 移除 beforeunload 事件监听器
		window.removeEventListener("beforeunload", destoryMonopolyClient);
	}
}

function useMonopolyClient(): MonopolyClient;
function useMonopolyClient(options: MonopolyClientOptions): Promise<MonopolyClient>;
function useMonopolyClient(options?: MonopolyClientOptions) {
	window.addEventListener("beforeunload", destoryMonopolyClient, { once: true });
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
