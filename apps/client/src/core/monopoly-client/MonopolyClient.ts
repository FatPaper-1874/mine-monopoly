import { FPMessage } from "@mine-monopoly/ui";
import { useChat, useGameLog, useLoading, useRoomInfo, useUserInfo, useUtil } from "@src/store";
import { emitHostPeerId, joinRoomApi } from "@src/utils/api/room-router";
import { PeerClient } from "./PeerClient";
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
import { useGameData } from "@src/store/game";
import { arrayBufferToBase64 } from "@mine-monopoly/utils";

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

	private sendHeartTime = 0;
	private intervalList: any[] = [];
	private handleNoHeartTimer: ReturnType<typeof debounce> | null = null;

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
					data.deleteIntervalMs,
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
			// 清理旧的连接和事件监听器
			if (this.conn) {
				this.conn.removeAllListeners();
				this.conn.close();
				this.conn = null;
			}

			// 清理所有定时器
			this.intervalList.forEach((timer) => clearInterval(timer));
			this.intervalList = [];

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
			this.sendMsg({ type: SocketMsgType.JoinRoom, source: SocketMsgSource.Client, data: user });

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
					this.sendHeartTime = Date.now();
					this.sendMsg({ type: SocketMsgType.Heart, source: SocketMsgSource.Client, data: undefined });
				}, 3000),
			);

			this.conn.on("data", (_data: any) => {
				const data: ServerSocketMessage = JSON.parse(_data, (key, value) => {
					if (value === "Infinity") return Infinity;
					if (value === "-Infinity") return -Infinity;
					return value;
				});
				if (data.msg) {
					FPMessage({
						type: data.msg.type,
						message: data.msg.content,
					});
				}
				// console.log("Client Receive: ", data);

				handleServerSocketMessage(data, this);
			});

			this.conn.on("close", () => {
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

	public handleHeartReply() {
		useUtil().ping = Math.round((Date.now() - this.sendHeartTime) / 2);
		this.handleNoHeartTimer?.fn();
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
		5000,
		true,
	);

	public initHeartBeat() {
		// 在首次发送心跳时初始化心跳超时定时器
		this.handleNoHeartTimer = this.handleNoHeart;
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
		this.sendMsg({ type: SocketMsgType.ChangeMap, source: SocketMsgSource.Client, data: msg });
	}

	public changeGameSetting(gameSetting: GameSetting) {
		this.sendMsg({ type: SocketMsgType.ChangeGameSetting, source: SocketMsgSource.Client, data: gameSetting });
	}

	public startGame() {
		this.sendMsg({ type: SocketMsgType.GameStart, source: SocketMsgSource.Client, data: undefined });
	}

	public gameInitFinished() {
		this.sendMsg({
			type: SocketMsgType.Operation,
			source: SocketMsgSource.Client,
			data: { operateType: OperateType.GameInitFinished, data: undefined },
		});
	}

	public rollDice() {
		this.sendMsg({
			type: SocketMsgType.Operation,
			source: SocketMsgSource.Client,
			data: { operateType: OperateType.RollDice, data: undefined },
		});
		const utilStore = useUtil();
		utilStore.canRoll = false;
		utilStore.canUseCard = false;
	}

	public useChanceCard(chanceCardId: string, targetIdList: string[]) {
		const utilStore = useUtil();
		utilStore.canRoll = false;
		utilStore.canUseCard = false;
		this.sendMsg({
			type: SocketMsgType.Operation,
			source: SocketMsgSource.Client,
			data: {
				operateType: OperateType.UseChanceCard,
				data: { chanceCardId, targetIdList },
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
	}

	public async sendMsg(msg: ClientSocketMessage) {
		if (this.conn) {
			await this.conn.send(
				JSON.stringify(msg, (key, value) => {
					if (value === Infinity) return "Infinity";
					if (value === -Infinity) return "-Infinity";
					return value;
				}),
			);
		}
	}

	public destory() {
		// 1. 防止竞态条件，先设置离线状态
		this.isOnline = false;

		// 2. 清理所有心跳定时器
		this.intervalList.forEach((timer) => clearInterval(timer));
		this.intervalList = [];

		// 3. 取消心跳超时的 debounce 定时器
		if (this.handleNoHeartTimer) {
			this.handleNoHeartTimer.cancel();
			this.handleNoHeartTimer = null;
		}

		// 4. 移除连接事件监听器并关闭连接
		if (this.conn) {
			this.conn.removeAllListeners();
			this.conn.close();
			this.conn = null;
		}

		// 5. 销毁 Peer 客户端
		if (this.peerClient) {
			this.peerClient.destory();
			this.peerClient = null;
		}

		// 6. 清理游戏主机（如果存在）
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
