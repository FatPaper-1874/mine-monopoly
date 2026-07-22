import { FPMessage } from "@mine-monopoly/ui";
import { useChat, useGameLog, useLoading, useRoomInfo, useUserInfo, useUtil } from "@src/store";
import { useGameData } from "@src/store/game";
import { emitHostPeerId, joinRoomApi } from "@src/utils/api/room-router";
import { PeerClient } from "./PeerClient";
import { ReconnectionManager } from "./ReconnectionManager";
import { DataConnection } from "peerjs";
import {
	AIDecisionConfig,
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

type ConnectionStrategy = "prefer-p2p" | "force-relay";
type ConnectionIssueReason = "initial_connect" | "connection_closed" | "connection_error" | "heartbeat_timeout" | "high_latency";

export class MonopolyClient {
	private static instance: MonopolyClient | null;
	private static readonly HIGH_LATENCY_THRESHOLD_MS = 800;
	private static readonly HIGH_LATENCY_STREAK_LIMIT = 3;
	private static readonly RELAY_ESCALATION_ATTEMPT = 3;
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
	private connectionStrategy: ConnectionStrategy = "prefer-p2p";
	private peerClientStrategy: ConnectionStrategy | null = null;
	private lastIssueReason: ConnectionIssueReason = "initial_connect";
	private consecutiveHighLatencyCount = 0;

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
		this.resetConnectionRecoveryState();
		this.updateConnectionPresentation("正在连接房间", "正在向房主查询连接信息");

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
					this.peerClientStrategy = null;
				});
				hostPeerId = this.gameHost.getPeerId();
				connectionDiagnostics.stageEnd("Host_Create", { hostPeerId });

				connectionDiagnostics.stageStart("HTTP_EmitHost");
				useLoading().showLoading("正在向服务器注册主机...");
				await emitHostPeerId(roomId, hostPeerId, userStore.username, userStore.userId);
				connectionDiagnostics.stageEnd("HTTP_EmitHost", { roomId, hostPeerId });
			}
			if (hostPeerId) {
				connectionDiagnostics.stageStart("Client_LinkToHost");
				useLoading().showLoading("正在建立连接...");
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
			this.currentHostPeerId = hostPeerId;

			if (this.conn) {
				this.conn.removeAllListeners();
				this.conn.close();
				this.conn = null;
			}

			if (this.reconnectionManager) {
				this.reconnectionManager.destroy();
				this.reconnectionManager = null;
			}

			this.intervalList.forEach((timer) => clearInterval(timer));
			this.intervalList = [];

			await this.ensurePeerClient();
			useLoading().showLoading(this.connectionStrategy === "force-relay" ? "正在通过 TURN 中继建立连接..." : "正在建立 P2P 通道...");
			this.updateConnectionPresentation(
				this.connectionStrategy === "force-relay" ? "正在通过 TURN 中继连接房主" : "正在建立 P2P 连接",
				this.connectionStrategy === "force-relay" ? "系统已改用稳定性优先的中继链路" : "当前优先尝试 P2P 直连",
			);

			const { conn } = await this.peerClient!.linkToHost(hostPeerId);
			this.bindConnection(conn);
			await this.sendJoinRoomMessage(false);
			this.markConnectionEstablished(false);
		} catch (e: any) {
			if (this.peerClient) {
				this.peerClient.destory();
				this.peerClient = null;
				this.peerClientStrategy = null;
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
	private startReconnection(reason: ConnectionIssueReason = "connection_closed") {
		if (!this.currentHostPeerId) {
			this.handleDisconnect();
			return;
		}

		this.pauseHeartBeat();
		this.lastIssueReason = reason;
		this.consecutiveHighLatencyCount = 0;
		useUtil().connectionMode = "unknown";
		this.updateConnectionPresentation("准备重新连接房主", this.getReasonText(reason), 0);

		this.reconnectionManager = new ReconnectionManager(
			async () => {
				await this.performReconnect();
			},
			{
				retryInterval: 3000,
				maxRetries: Number.POSITIVE_INFINITY,
				showCountdown: true,
				getDisplayState: (attempt, maxRetries) => ({
					title: this.connectionStrategy === "force-relay" ? "切换到 TURN 中继中" : "正在恢复连接",
					message: `正在第 ${attempt} 次恢复房间连接`,
					detail: `原因：${this.getReasonText(this.lastIssueReason)}；当前策略：${this.getStrategyText()}；最大重试：${maxRetries === Number.POSITIVE_INFINITY ? "无限" : maxRetries}`,
					actionLabel: "离开房间",
				}),
				onRetry: (attempt, maxRetries) => {
					if (this.shouldEscalateToRelay(this.lastIssueReason, attempt)) {
						this.promoteToRelay(this.lastIssueReason);
					}
					this.updateConnectionPresentation(
						this.connectionStrategy === "force-relay" ? "正在通过 TURN 中继恢复连接" : "正在尝试重新连接房主",
						`${this.getReasonText(this.lastIssueReason)}；当前策略：${this.getStrategyText()}`,
						attempt,
					);
					console.log(`[MonopolyClient] 重连尝试 ${attempt}/${maxRetries === Number.POSITIVE_INFINITY ? "∞" : maxRetries}`);
				},
				onSuccess: () => {
					console.log("[MonopolyClient] 重连成功");
					this.markConnectionEstablished(true);
					this.resumeHeartBeat();
				},
				onFail: (error) => {
					console.error("[MonopolyClient] 重连失败:", error);
					this.updateConnectionPresentation("重连失败", error.message);
					FPMessage({
						type: "error",
						message: `重连失败: ${error.message}`,
						onClosed: () => {
							this.handleDisconnect();
						},
					});
				},
				onCancel: () => {
					console.log("[MonopolyClient] 用户取消重连");
					this.updateConnectionPresentation("已放弃重连", this.getReasonText(this.lastIssueReason));
					this.handleDisconnect();
				},
			},
		);

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

		await this.ensurePeerClient();
		const { conn } = await this.peerClient!.linkToHost(this.currentHostPeerId);
		this.bindConnection(conn);
		await this.sendJoinRoomMessage(useRoomInfo().isReady);
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
		const ping = Math.round((Date.now() - this.sendHeartTime) / 2);
		useUtil().ping = ping;
		this.trackNetworkHealth(ping);
		this.handleNoHeartTimer?.fn();
	}

	private handleNoHeart = debounce(
		() => {
			this.isOnline = false;
			this.startReconnection("heartbeat_timeout");
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

	private async ensurePeerClient(): Promise<void> {
		if (this.peerClient && this.peerClientStrategy === this.connectionStrategy) {
			return;
		}

		if (this.peerClient) {
			this.peerClient.destory();
			this.peerClient = null;
			this.peerClientStrategy = null;
		}

		connectionDiagnostics.stageStart("PeerClient_Create");
		useLoading().showLoading(this.connectionStrategy === "force-relay" ? "正在切换到 TURN 中继..." : "正在连接信令服务器...");
		const rtcConfig = this.buildRtcConfig();
		this.peerClient = await PeerClient.create(this.iceServerHost, this.iceServerPort, rtcConfig);
		this.peerClientStrategy = this.connectionStrategy;
		connectionDiagnostics.stageEnd("PeerClient_Create", {
			strategy: this.connectionStrategy,
			iceTransportPolicy: rtcConfig.iceTransportPolicy || "all",
		});
	}

	private buildRtcConfig(): RTCConfiguration {
		const rtcConfig: RTCConfiguration = {
			iceServers: this.currentIceServers,
		};
		if (this.connectionStrategy === "force-relay") {
			rtcConfig.iceTransportPolicy = "relay";
		}
		return rtcConfig;
	}

	private bindConnection(conn: DataConnection): void {
		this.conn = conn;
		this.initHeartBeat();
		this.intervalList.forEach((timer) => clearInterval(timer));
		this.intervalList = [];
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
				useLoading().hideLoading();
				FPMessage({
					type: data.msg.type,
					message: data.msg.content,
				});
			}

			handleServerSocketMessage(data, this);
		});

		this.conn.on("close", () => {
			connectionDiagnostics.logPeerEvent("DataConnection.close", "连接关闭");
			if (this.isOnline) {
				this.isOnline = false;
				this.startReconnection("connection_closed");
			}
		});

		this.conn.on("error", (err) => {
			connectionDiagnostics.logPeerEvent("DataConnection.error", `type=${err.type} message=${err.message}`);
			if (this.isOnline) {
				this.isOnline = false;
				this.startReconnection("connection_error");
			}
		});
	}

	private async sendJoinRoomMessage(isReady: boolean): Promise<void> {
		const { userId, username, color, avatar } = useUserInfo();
		const user: User = {
			userId,
			username,
			color,
			avatar,
			isReady,
		};

		connectionDiagnostics.stageStart("Send_JoinRoom");
		await this.sendMsg({ type: SocketMsgType.JoinRoom, source: SocketMsgSource.Client, data: user });
		connectionDiagnostics.stageEnd("Send_JoinRoom");
	}

	private markConnectionEstablished(isReconnect: boolean): void {
		this.isOnline = true;
		this.consecutiveHighLatencyCount = 0;
		useUtil().connectionPolicy = this.connectionStrategy === "force-relay" ? "relay" : "auto";
		useUtil().connectionReconnectAttempt = 0;
		useUtil().connectionMode = this.connectionStrategy === "force-relay" ? "relay" : "p2p";
		this.updateConnectionPresentation(
			this.connectionStrategy === "force-relay" ? "已通过 TURN 中继恢复连接" : "已通过 P2P 直连连接",
			this.connectionStrategy === "force-relay" ? "当前使用稳定性优先的服务器中继链路" : "当前使用点对点直连链路",
		);

		FPMessage({
			type: "success",
			message: isReconnect
				? (this.connectionStrategy === "force-relay" ? "网络已切换到 TURN 中继并恢复连接" : "房间连接已恢复")
				: (this.connectionStrategy === "force-relay" ? "已通过 TURN 中继连接到主机" : "主机连接成功🤗"),
		});
	}

	private trackNetworkHealth(ping: number): void {
		if (this.connectionStrategy === "force-relay" || this.isReconnecting()) {
			if (ping < MonopolyClient.HIGH_LATENCY_THRESHOLD_MS) {
				this.consecutiveHighLatencyCount = 0;
			}
			return;
		}

		if (ping >= MonopolyClient.HIGH_LATENCY_THRESHOLD_MS) {
			this.consecutiveHighLatencyCount++;
		} else {
			this.consecutiveHighLatencyCount = 0;
		}

		if (this.isOnline && this.consecutiveHighLatencyCount >= MonopolyClient.HIGH_LATENCY_STREAK_LIMIT) {
			this.consecutiveHighLatencyCount = 0;
			this.isOnline = false;
			FPMessage({
				type: "warning",
				message: "检测到连接延迟持续偏高，正在切换到 TURN 中继以提升稳定性",
			});
			this.startReconnection("high_latency");
		}
	}

	private shouldEscalateToRelay(reason: ConnectionIssueReason, attempt: number): boolean {
		if (this.connectionStrategy === "force-relay") {
			return false;
		}

		if (reason === "high_latency" || reason === "heartbeat_timeout") {
			return true;
		}

		return attempt >= MonopolyClient.RELAY_ESCALATION_ATTEMPT;
	}

	private promoteToRelay(reason: ConnectionIssueReason): void {
		if (this.connectionStrategy === "force-relay") {
			return;
		}

		this.connectionStrategy = "force-relay";
		useUtil().connectionPolicy = "relay";
		useUtil().connectionMode = "unknown";
		this.updateConnectionPresentation("正在切换到 TURN 中继", `触发原因：${this.getReasonText(reason)}`);
		FPMessage({
			type: "warning",
			message: "检测到当前链路不稳定，系统将改用 TURN 中继继续重连",
		});
	}

	private getStrategyText(): string {
		return this.connectionStrategy === "force-relay" ? "TURN 中继优先" : "优先 P2P 直连";
	}

	private getReasonText(reason: ConnectionIssueReason): string {
		switch (reason) {
			case "high_latency":
				return "连续高延迟";
			case "heartbeat_timeout":
				return "心跳超时";
			case "connection_error":
				return "连接异常";
			case "connection_closed":
				return "连接关闭";
			default:
				return "正在建立连接";
		}
	}

	private updateConnectionPresentation(statusText: string, reasonText = "", reconnectAttempt = useUtil().connectionReconnectAttempt): void {
		const utilStore = useUtil();
		utilStore.connectionPolicy = this.connectionStrategy === "force-relay" ? "relay" : "auto";
		utilStore.connectionStatusText = statusText;
		utilStore.connectionStatusReason = reasonText;
		utilStore.connectionReconnectAttempt = reconnectAttempt;
	}

	private resetConnectionRecoveryState(): void {
		this.connectionStrategy = "prefer-p2p";
		this.peerClientStrategy = null;
		this.lastIssueReason = "initial_connect";
		this.consecutiveHighLatencyCount = 0;
		this.resetConnectionPresentation();
	}

	private resetConnectionPresentation(): void {
		const utilStore = useUtil();
		utilStore.connectionMode = "unknown";
		utilStore.connectionPolicy = "auto";
		utilStore.connectionStatusText = "等待连接";
		utilStore.connectionStatusReason = "";
		utilStore.connectionReconnectAttempt = 0;
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

	public changeColorForUser(userId: string, newColor: string): { success: boolean; error?: string } {
		if (this.gameHost && this.gameHost.getRoom().isAiPlayer(userId)) {
			this.gameHost.getRoom().changeColor(userId, newColor);
			return { success: true };
		}
		if (userId === useUserInfo().userId) {
			this.changeColor(newColor);
			return { success: true };
		}
		return { success: false, error: "当前只支持房主修改 AI 玩家颜色" };
	}

	public kickOut(playerId: string) {
		if (this.gameHost && this.gameHost.getRoom().isAiPlayer(playerId)) {
			this.gameHost.getRoom().removeAiPlayer(playerId);
			return;
		}
		this.sendMsg({ type: SocketMsgType.KickOut, source: SocketMsgSource.Client, data: playerId });
	}

	public addAIPlayer(): { success: boolean; error?: string } {
		if (!this.gameHost) {
			return { success: false, error: "只有房主才能添加 AI 玩家" };
		}
		return this.gameHost.getRoom().addAiPlayer();
	}

	public randomizeAIRoles(): { success: boolean; error?: string } {
		if (!this.gameHost) {
			return { success: false, error: "只有房主才能调整 AI 角色" };
		}
		const success = this.gameHost.getRoom().randomizeAiRoles();
		return success ? { success: true } : { success: false, error: "当前没有可随机分配的 AI 玩家或地图没有角色" };
	}

	public setSpectatorMode(enabled: boolean): { success: boolean; error?: string } {
		if (!this.gameHost) {
			return { success: false, error: "只有房主才能切换旁观模式" };
		}
		return this.gameHost.getRoom().setOwnerSpectatorMode(enabled);
	}

	public changeRoleForUser(userId: string, roleId: string): { success: boolean; error?: string } {
		if (this.gameHost && this.gameHost.getRoom().isAiPlayer(userId)) {
			this.gameHost.getRoom().changeRole(userId, roleId);
			return { success: true };
		}
		if (userId === useUserInfo().userId) {
			this.changeRole(roleId);
			return { success: true };
		}
		return { success: false, error: "当前只支持房主修改 AI 玩家角色" };
	}

	public changeRole(roleId: string) {
		this.sendMsg({ type: SocketMsgType.ChangeRole, source: SocketMsgSource.Client, data: roleId });
	}

	public updateAIPlayerName(userId: string, username: string): { success: boolean; error?: string } {
		if (!this.gameHost || !this.gameHost.getRoom().isAiPlayer(userId)) {
			return { success: false, error: "当前只支持房主修改 AI 玩家名称" };
		}
		return this.gameHost.getRoom().updateAIPlayerName(userId, username);
	}

	public changeGameMap(msg: RoomMapInfo) {
		// 如果自己是房主，直接调用 Room.changeMap 走本地，避免大消息被 DataChannel 丢弃
		if (this.gameHost) {
			this.gameHost.getRoom().changeMap(msg);
			return;
		}
		this.sendMsg({ type: SocketMsgType.ChangeMap, source: SocketMsgSource.Client, data: msg });
	}

	public changeGameSetting(gameSetting: GameSetting) {
		this.sendMsg({ type: SocketMsgType.ChangeGameSetting, source: SocketMsgSource.Client, data: gameSetting });
	}

	public updateAIDecisionConfig(config: AIDecisionConfig): { success: boolean; error?: string } {
		if (!this.gameHost) {
			return { success: false, error: "只有房主才能同步房间 AI 配置" };
		}
		this.gameHost.getRoom().updateAIDecisionConfig(config);
		return { success: true };
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
				await this.conn.send(
					JSON.stringify(msg, (key, value) => {
						if (value === Infinity) return "Infinity";
						if (value === -Infinity) return "-Infinity";
						return value;
					}),
				);
			} catch (e) {
				console.error("Failed to send message:", msg.type);
			}
		} else {
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
			this.peerClientStrategy = null;
		}

		// 7. 清理游戏主机（如果存在）
		if (this.gameHost) {
			this.gameHost.destory();
			this.gameHost = null;
		}

		this.resetConnectionPresentation();
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
