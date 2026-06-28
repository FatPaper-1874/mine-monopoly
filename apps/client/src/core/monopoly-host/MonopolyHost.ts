import Peer, { DataConnection } from "peerjs";
import { ClientSocketMessage, SocketMessage, SocketMsgType, UserInRoomInfo } from "@mine-monopoly/types";
import { deleteRoom, emitRoomHeart } from "@src/utils/api/room-router";
import { __ICE_SERVER_PATH__, __ICE_USE_PREFIX__, __FATPAPER_HOST__ } from "@src/../global.config";
import { handleClientSocketMessage } from "./client-message-handlers";
import { Room } from "./Room";
import { connectionDiagnostics } from "@src/utils/connection-diagnostics";

export class MonopolyHost {
	private peer: Peer;
	private room: Room;

	private clientList: Map<string, DataConnection> = new Map<string, DataConnection>();

	private intervalList: any[] = [];

	private heartbeatTimeoutMap: Map<string, NodeJS.Timeout> = new Map();

	private clientHeartCheckFns: Map<
		string,
		{
			clear: () => void;
			reset: () => void;
		}
	> = new Map();

	private connectionVersionMap: Map<string, number> = new Map();

	private destoryHandler: Function | undefined;

	private constructor(peer: Peer, room: Room, heartContinuationTimeMs: number) {
		this.peer = peer;
		this.room = room;

		this.init(this.peer);

		const heartInterval = setInterval(() => {
			emitRoomHeart(this.room.getRoomId());
		}, heartContinuationTimeMs);
		this.intervalList.push(heartInterval);

		window.addEventListener("beforeunload", this.destory);
	}

	private init(peer: Peer) {
		const _this = this;
		// this.startHeartCheck();
		peer.on("connection", (conn) => {
			let clientUserId = "";
			let isOnline = false;
			let connectionVersion = 0; // 当前连接的版本号
			let heartbeatTimeoutId: NodeJS.Timeout | null = null;

			// 清除心跳超时计时器
			const clearHeartbeatTimeout = () => {
				if (heartbeatTimeoutId) {
					clearTimeout(heartbeatTimeoutId);
					heartbeatTimeoutId = null;
				}
				if (clientUserId) {
					const existingTimeout = _this.heartbeatTimeoutMap.get(clientUserId);
					if (existingTimeout) {
						clearTimeout(existingTimeout);
						_this.heartbeatTimeoutMap.delete(clientUserId);
					}
				}
			};

			// 设置心跳超时检测
			const resetHeartbeatTimeout = () => {
				clearHeartbeatTimeout();
				if (!clientUserId) return;

				// 10秒无心跳视为断线
				const timeoutId = setTimeout(() => {
					const currentVersion = _this.connectionVersionMap.get(clientUserId);
					if (clientUserId && isOnline && connectionVersion === currentVersion) {
						isOnline = false;
						_this.room.leave(clientUserId);
						_this.clientList.delete(clientUserId);
						clearHeartbeatTimeout();
					}
				}, 10000);

				heartbeatTimeoutId = timeoutId;
				_this.heartbeatTimeoutMap.set(clientUserId, timeoutId);
			};

			conn.once("data", (_data: any) => {
				const msg: ClientSocketMessage = JSON.parse(_data, (key, value) => {
					if (value === "Infinity") return Infinity;
					if (value === "-Infinity") return -Infinity;
					return value;
				});
				if (msg.type !== SocketMsgType.JoinRoom) return;
				const user = msg.data;
				if (this.room.isStarted) {
					// 房间已经开始游戏
					if (this.room.isUserInRoom(user.userId)) {
						clientUserId = user.userId;
						// 更新连接版本号
						connectionVersion = (_this.connectionVersionMap.get(user.userId) || 0) + 1;
						_this.connectionVersionMap.set(user.userId, connectionVersion);

						// 如果是断线的玩家, 处理重连
						this.room.handleUserReconnect(user.userId, conn, connectionVersion);
						if (!this.room) throw Error("在房间没创建时加入了房间");
						this.clientList.set(user.userId, conn);
						// this.room.join(user, conn);
						isOnline = true;
						// 重连后立即启动心跳检测
						resetHeartbeatTimeout();
						_this.clientHeartCheckFns.set(clientUserId, {
							clear: clearHeartbeatTimeout,
							reset: resetHeartbeatTimeout,
						});
					} else {
						conn.send(
							JSON.stringify(<SocketMessage>{
								type: SocketMsgType.MsgNotify,
								data: "",
								msg: {
									type: "error",
									content: "该房间已经开始游戏了!",
								},
								source: "server",
							}),
						);
						conn.close();
						return;
					}
				} else {
					if (this.room.getUserList().length >= 6) {
						conn.send(
							JSON.stringify(<SocketMessage>{
								type: SocketMsgType.MsgNotify,
								data: "",
								msg: {
									type: "error",
									content: "该房间已经满人了!",
								},
								source: "server",
							}),
						);
						conn.close();
					} else {
						if (msg.type === SocketMsgType.JoinRoom) {
							if (!this.room) throw Error("在房间没创建时加入了房间");
							clientUserId = user.userId;
							// 首次连接,设置版本号为 1
							connectionVersion = (_this.connectionVersionMap.get(user.userId) || 0) + 1;
							_this.connectionVersionMap.set(user.userId, connectionVersion);

							this.clientList.set(user.userId, conn);
							this.room.join(user, conn);
							isOnline = true;
							// 首次连接后启动心跳检测
							resetHeartbeatTimeout();
							_this.clientHeartCheckFns.set(clientUserId, {
								clear: clearHeartbeatTimeout,
								reset: resetHeartbeatTimeout,
							});
						}
					}
				}
			});

			conn.on("data", function (data: any) {
				const socketMessage: ClientSocketMessage = JSON.parse(data.toString(), (key, value) => {
					if (value === "Infinity") return Infinity;
					if (value === "-Infinity") return -Infinity;
					return value;
				});

				// 处理心跳消息
				if (socketMessage.type === SocketMsgType.Heart) {
					if (clientUserId) {
						resetHeartbeatTimeout();
					}
				}

				handleClientSocketMessage(conn, socketMessage, _this, clientUserId);
			});

			conn.on("close", () => {
				// 清除心跳超时计时器
				clearHeartbeatTimeout();
				_this.clientHeartCheckFns.delete(clientUserId);

				// 只有当前版本号的连接才能触发断线
				const currentVersion = _this.connectionVersionMap.get(clientUserId);
				if (clientUserId && isOnline && connectionVersion === currentVersion) {
					isOnline = false;
					this.room.leave(clientUserId);
					this.clientList.delete(clientUserId);
				}
			});

			conn.on("error", (err) => {
				// 清除心跳超时计时器
				clearHeartbeatTimeout();
				_this.clientHeartCheckFns.delete(clientUserId);

				// 只有当前版本号的连接才能触发断线
				const currentVersion = _this.connectionVersionMap.get(clientUserId);
				if (clientUserId && isOnline && connectionVersion === currentVersion && err.type === "not-open-yet") {
					isOnline = false;
					this.room.leave(clientUserId);
					this.clientList.delete(clientUserId);
				}
			});

			// conn.on("iceStateChanged", (state) => {
			// 	console.log("🚀 ~ MonopolyHost ~ conn.on ~ iceStateChanged:");
			// 	if (clientUserId && (state === "closed" || state === "disconnected")) {
			// 		this.room.leave(clientUserId);
			// 		this.clientList.delete(clientUserId);
			// 		// noHeartHandler.cancel();
			// 	}
			// });
		});
	}

	public static async create(roomId: string, host: string, port: number, heartContinuationTimeMs: number, iceServers: RTCIceServer[]) {
		const peer = await new Promise<Peer>((resolve) => {
			const peerOptions = __ICE_USE_PREFIX__
				? {
						host: __FATPAPER_HOST__,
						path: __ICE_SERVER_PATH__,
						secure: true,
						debug: 3,
						config: { iceServers },
					}
				: { host, port, debug: 3, config: { iceServers } };

			connectionDiagnostics.logPeerEvent("Host.Peer.constructor", JSON.stringify({
				mode: __ICE_USE_PREFIX__ ? "prefix" : "port",
			}));

			const peer = new Peer(peerOptions);
			peer.on("open", () => {
				console.info("MonopolyHost开启成功");
				connectionDiagnostics.logPeerEvent("Host.Peer.open", `peerId=${peer.id}`);
				resolve(peer);
			});
			peer.on("error", (e) => {
				connectionDiagnostics.logPeerEvent("Host.Peer.error", `type=${e.type} message=${e.message}`);
			});
			peer.on("disconnected", () => {
				connectionDiagnostics.logPeerEvent("Host.Peer.disconnected", "主机的信令服务器断开");
			});
		});
		const room = new Room(roomId);

		return new MonopolyHost(peer, room, heartContinuationTimeMs);
	}

	public broadcast(msg: string) {
		Array.from(this.clientList.values()).forEach((c) => {
			c.send(msg);
		});
	}

	public getPeerId() {
		return this.peer.id;
	}

	public getRoom() {
		return this.room;
	}

	public deleteClient(id: string) {
		this.clientList.delete(id);
	}

	public addDestoryListener(fn: Function) {
		this.destoryHandler = fn;
	}

	public pauseClientHeartCheck(clientId: string) {
		this.clientHeartCheckFns.get(clientId)?.clear();
	}

	public resumeClientHeartCheck(clientId: string) {
		this.clientHeartCheckFns.get(clientId)?.reset();
	}

	public destory() {
		deleteRoom(this.room.getRoomId());
		this.room.destory();
		this.peer.destroy();
		this.clientHeartCheckFns.clear();
		this.intervalList.forEach((i) => {
			clearInterval(i);
		});
		window.removeEventListener("beforeunload", this.destory);
		this.destoryHandler && this.destoryHandler();
	}
}

interface UserInRoom extends UserInRoomInfo {
	socketClient: DataConnection;
	isOffLine: boolean;
}
