import Peer, { DataConnection } from "peerjs";
import { SocketMessage, ClientSocketMessage } from "@src/interfaces/bace";
import { SocketMsgType, UserInRoomInfo } from "@fatpaper-monopoly/types";
import { deleteRoom, emitRoomHeart } from "@src/utils/api/room-router";
import { __ICE_SERVER_PATH__, __PROTOCOL__ } from "@src/../global.config";
import { handleClientSocketMessage } from "./client-message-handlers";
import { Room } from "./Room";

export class MonopolyHost {
	private peer: Peer;
	private room: Room;

	private clientList: Map<string, DataConnection> = new Map<string, DataConnection>();

	private intervalList: any[] = [];

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
			conn.once("data", (_data: any) => {
				const msg: ClientSocketMessage = JSON.parse(_data);
				if (msg.type !== SocketMsgType.JoinRoom) return;
				const user = msg.data;
				if (this.room.isStarted) {
					// 房间已经开始游戏
					if (this.room.isUserInRoom(user.userId)) {
						// 如果是断线的玩家, 处理重连
						this.room.handleUserReconnect(user.userId, conn);
						if (_data.type === SocketMsgType.JoinRoom) {
							if (!this.room) throw Error("在房间没创建时加入了房间");
							clientUserId = user.userId;
							this.clientList.set(user.userId, conn);
							// this.room.join(user, conn);
							isOnline = true;
						}
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
							})
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
							})
						);
						conn.close();
					} else {
						if (msg.type === SocketMsgType.JoinRoom) {
							if (!this.room) throw Error("在房间没创建时加入了房间");
							clientUserId = user.userId;
							this.clientList.set(user.userId, conn);
							this.room.join(user, conn);
							isOnline = true;
						}
					}
				}
			});

			// const noHeartHandler = debounce(
			// 	() => {
			// 		console.log("🚀 ~ MonopolyHost ~ peer.on ~ noHeartHandler:", clientUserId);
			// 		if (!clientUserId) return;
			// 		_this.room.leave(clientUserId);
			// 		_this.clientList.delete(clientUserId);
			// 	},
			// 	20000,
			// 	true
			// );

			conn.on("data", function (data: any) {
				const socketMessage: ClientSocketMessage = JSON.parse(data.toString());
				handleClientSocketMessage(conn, socketMessage, _this, clientUserId);
			});

			conn.on("close", () => {
				console.log("🚀 ~ MonopolyHost ~ conn.on ~ close:");
				if (clientUserId && isOnline) {
					isOnline = false;
					this.room.leave(clientUserId);
					this.clientList.delete(clientUserId);
					// noHeartHandler.cancel();
				}
			});

			conn.on("error", (err) => {
				console.log("🚀 ~ MonopolyHost ~ conn.on ~ error:", err.type);
				if (clientUserId && isOnline && err.type === "not-open-yet") {
					isOnline = false;
					this.room.leave(clientUserId);
					this.clientList.delete(clientUserId);
					// noHeartHandler.cancel();
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

	public static async create(roomId: string, host: string, port: number, heartContinuationTimeMs: number) {
		const peer = await new Promise<Peer>((resolve) => {
			const isHTTP = __PROTOCOL__ === "http";
			const peer = new Peer(
				isHTTP
					? { host, port }
					: {
							host,
							path: `/${__ICE_SERVER_PATH__}`,
							secure: true,
							config: {
								iceServers: [
									{
										urls: "stun:fatpaper.site:3478", // STUN 服务器
									},
									{
										urls: "turn:fatpaper.site:5349", // TURN 服务器
										username: "fatpaper",
										credential: "turn_password",
									},
								],
							},
					  }
			);
			peer.on("open", () => {
				console.info("MonopolyHost开启成功");
				resolve(peer);
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

	public destory() {
		deleteRoom(this.room.getRoomId());
		this.room.destory();
		this.peer.destroy();
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
