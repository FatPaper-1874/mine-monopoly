import { FPMessage } from "@fatpaper-monopoly/ui";
import { useChat, useGameLog, useLoading, useRoomInfo, useUserInfo, useUtil } from "@src/store";
import { emitHostPeerId, joinRoomApi } from "@src/utils/api/room-router";
import { PeerClient } from "./PeerClient";
import { DataConnection } from "peerjs";
import { GameSetting, ServerSocketMessage, SocketMessage, SocketMessageDataType, User } from "@src/interfaces/bace";
import { ChangeRoleOperate, OperateType, Role, SocketMsgSource, SocketMsgType } from "@fatpaper-monopoly/types";
import { MonopolyHost } from "../monopoly-host/MonopolyHost";
import { handleServerSocketMessage } from "./host-message-handlers";
import { useRouter } from "vue-router";
import router from "@src/router";
import { debounce } from "@src/utils";
import { useGameData } from "@src/store/game";

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

			// 发送心跳
			this.intervalList.push(
				setInterval(() => {
					this.sendHeartTime = Date.now();
					this.sendMsg(SocketMsgType.Heart);
				}, 3000)
			);

			this.conn.on("data", (_data: any) => {
				const data: ServerSocketMessage = JSON.parse(_data);
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
							useRouter().replace("room-router");
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
							useRouter().replace("room-router");
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
		useGameData().ping = Math.round((Date.now() - this.sendHeartTime) / 2);
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
		5000,
		true
	);

	public sendRoomChatMessage(message: string, roomId: string) {
		this.sendMsg(SocketMsgType.RoomChat, message, roomId);
	}

	public async leaveRoom() {
		this.isOnline = false;
		await this.sendMsg(SocketMsgType.LeaveRoom);
	}

	public readyToggle() {
		this.sendMsg(SocketMsgType.ReadyToggle);
	}

	public changeColor(newColor: string) {
		this.sendMsg(SocketMsgType.ChangeColor, newColor);
	}

	public kickOut(playerId: string) {
		this.sendMsg(SocketMsgType.KickOut, playerId);
	}

	public changeRole(roleId: string) {
		this.sendMsg(SocketMsgType.ChangeRole, roleId);
	}

	public changeGameMap(mapId: string) {
		this.sendMsg(SocketMsgType.ChangeMap, mapId);
	}

	public changeGameSetting(gameSetting: GameSetting) {
		this.sendMsg(SocketMsgType.ChangeGameSetting, gameSetting);
	}

	public startGame() {
		this.sendMsg(SocketMsgType.GameStart);
	}

	public gameInitFinished() {
		this.sendMsg(SocketMsgType.GameInitFinished);
	}

	public rollDice() {
		this.sendMsg(SocketMsgType.RollDiceResult);
		const utilStore = useUtil();
		utilStore.canRoll = false;
		utilStore.canUseCard = false;
	}

	public useChanceCard(cardId: string, target: string | string[]) {
		const utilStore = useUtil();
		utilStore.canRoll = false;
		utilStore.canUseCard = false;
		this.sendMsg(SocketMsgType.UseChanceCard, { chanceCardId: cardId, targetId: target });
	}

	public AnimationComplete(animationId: string) {
		this.sendMsg(SocketMsgType.Animation, { operateType: OperateType.Animation, animationId });
	}

	public async sendMsg<T extends SocketMsgType>(
		type: T,
		data?: SocketMessageDataType[T][SocketMsgSource.Client],
		roomId: string = useRoomInfo().roomId,
		extra: any = undefined
	) {
		const msgToSend: SocketMessage = {
			type,
			source: SocketMsgSource.Client,
			roomId,
			data,
			extra,
		};
		// this.conn && this.conn.send(JSON.stringify(msgToSend));
		if (this.conn) {
			await this.conn.send(JSON.stringify(msgToSend));
		}
	}

	public destory() {
		this.conn = null;
		this.peerClient && this.peerClient.destory();
		this.peerClient = null;
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
