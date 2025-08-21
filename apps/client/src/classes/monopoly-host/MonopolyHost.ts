import Peer, { DataConnection, PeerError } from "peerjs";
import { ChatMessage, Role, RoomInfo, SocketMessage, User, UserInRoomInfo, GameSetting } from "@src/interfaces/bace";
import { GameOverRule, OperateType } from "@src/enums/game";
import { ChangeRoleOperate, ChatMessageType, SocketMsgType } from "@src/enums/bace";
import { debounce, randomString } from "@src/utils";
import { getRoleList } from "@src/utils/api/role";
import GameProcessWorker from "@src/classes/worker/GameProcessWorker?worker";
import { WorkerCommMsg } from "@src/interfaces/worker";
import { WorkerCommType } from "@src/enums/worker";
import { getMapById, getMapsList } from "@src/utils/api/map";
import { deleteRoom, emitRoomHeart, setRoomStarted } from "@src/utils/api/room-router";
import { asyncMission } from "@src/utils/async-mission-queue";
import { __ICE_SERVER_PATH__, __PROTOCOL__ } from "@src/../global.config";
import { useDeviceStatus, useLoading } from "@src/store";

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
			conn.once("data", (data: any) => {
				const _data: SocketMessage = JSON.parse(data);
				const user = _data.data as User;
				if (this.room.isStarted) {
					if (this.room.isUserInRoom(user.userId)) {
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
						if (_data.type === SocketMsgType.JoinRoom) {
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
				const socketMessage: SocketMessage = JSON.parse(data.toString());

				switch (socketMessage.type) {
					case SocketMsgType.Heart:
						// noHeartHandler.fn();
						_this.handleHeart(conn, socketMessage, clientUserId);
						break;
					case SocketMsgType.RoomChat:
						_this.handleRoomChat(conn, socketMessage, clientUserId);
						break;
					case SocketMsgType.ReadyToggle:
						_this.handleReadyToggle(conn, socketMessage, clientUserId);
						break;
					case SocketMsgType.KickOut:
						_this.handleKickOut(conn, socketMessage, clientUserId);
						break;
					case SocketMsgType.ChangeColor:
						_this.handleChangeColor(conn, socketMessage, clientUserId);
						break;
					case SocketMsgType.ChangeRole:
						_this.handleChangeRole(conn, socketMessage, clientUserId);
						break;
					case SocketMsgType.ChangeGameSetting:
						_this.handleChangeGameSetting(conn, socketMessage, clientUserId);
						break;
					case SocketMsgType.GameStart:
						_this.handleGameStart();
						break;
					case SocketMsgType.GameInitFinished:
						_this.handleGameInitFinished(conn, socketMessage, clientUserId);
						break;
					case SocketMsgType.RollDiceResult:
						_this.handleRollDiceResult(conn, socketMessage, clientUserId);
						break;
					case SocketMsgType.UseChanceCard:
						_this.handleUseChanceCard(conn, socketMessage, clientUserId);
						break;
					case SocketMsgType.Animation:
						_this.handleAnimationComplete(conn, socketMessage, clientUserId);
						break;
					case SocketMsgType.BuyProperty:
						_this.handleBuyProperty(conn, socketMessage, clientUserId);
						break;
					case SocketMsgType.BuildHouse:
						_this.handleBuildHouse(conn, socketMessage, clientUserId);
						break;
					case SocketMsgType.LeaveRoom:
						_this.handleLeaveRoom(conn, socketMessage, clientUserId);
						// noHeartHandler.cancel();
						break;
				}
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
		const { roleList } = await getRoleList();
		const room = new Room(roomId, roleList);

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

	private startHeartCheck() {
		this.intervalList.push(
			setInterval(() => {
				console.log("发送全局心跳广播");
				this.broadcast(
					JSON.stringify(<SocketMessage>{
						type: SocketMsgType.Heart,
						data: Date.now(),
					})
				);
			}, 3000)
		);
	}

	private handleHeart(socketClient: DataConnection, data: SocketMessage, clientUserId: string) {
		socketClient.send(
			JSON.stringify(<SocketMessage>{
				type: SocketMsgType.Heart,
				source: "server",
				data: "",
			})
		);
	}

	private handleRoomChat(socketClient: DataConnection, data: SocketMessage, clientUserId: string) {
		const message = data.data as string;
		this.room.chatBroadcast(message, clientUserId);
	}

	private handleReadyToggle(socketClient: DataConnection, data: SocketMessage, clientUserId: string) {
		this.room.readyToggle(clientUserId);
	}

	private handleKickOut(socketClient: DataConnection, data: SocketMessage, clientUserId: string) {
		const playerId = data.data;
		const player = this.clientList.get(playerId);
		if (player) {
			player.send(
				JSON.stringify(<SocketMessage>{
					type: SocketMsgType.KickOut,
					source: "server",
					data: "",
				})
			);
			this.room.leave(playerId);
			this.clientList.delete(playerId);
		}
	}

	private handleChangeColor(socketClient: DataConnection, data: SocketMessage, clientUserId: string) {
		this.room.changeColor(clientUserId, data.data);
	}

	private handleChangeRole(socketClient: DataConnection, data: SocketMessage, clientUserId: string) {
		this.room.changeRole(clientUserId, data.data);
	}

	private handleChangeGameSetting(socketClient: DataConnection, data: SocketMessage, clientUserId: string) {
		this.room.changeGameSetting(data.data);
	}

	private async handleGameStart() {
		await setRoomStarted(this.room.getRoomId(), true);
		this.room.startGame();
	}

	private handleGameInitFinished(socketClient: DataConnection, data: SocketMessage, clientUserId: string) {
		this.room.emitOperationToWorker(clientUserId, OperateType.GameInitFinished);
	}

	private handleRollDiceResult(socketClient: DataConnection, data: SocketMessage, clientUserId: string) {
		this.room.emitOperationToWorker(clientUserId, OperateType.RollDice);
	}

	private handleUseChanceCard(socketClient: DataConnection, data: SocketMessage, clientUserId: string) {
		const chanceCardId: string = data.data;
		const targetId: string | string[] = data.extra;
		if (targetId) {
			if (typeof targetId === "string") {
				this.room.emitOperationToWorker(clientUserId, OperateType.UseChanceCard, chanceCardId, [targetId]);
			} else {
				this.room.emitOperationToWorker(clientUserId, OperateType.UseChanceCard, chanceCardId, targetId);
			}
		} else {
			this.room.emitOperationToWorker(clientUserId, OperateType.UseChanceCard, chanceCardId);
		}
	}

	private handleAnimationComplete(socketClient: DataConnection, data: SocketMessage, clientUserId: string) {
		const operateType: OperateType | string = data.data;
		this.room.emitOperationToWorker(clientUserId, operateType);
	}

	private handleBuyProperty(socketClient: DataConnection, data: SocketMessage, clientUserId: string) {
		const operateType: OperateType = data.data;
		this.room.emitOperationToWorker(clientUserId, operateType, data.extra);
	}

	private handleBuildHouse(socketClient: DataConnection, data: SocketMessage, clientUserId: string) {
		const operateType: OperateType = data.data;
		this.room.emitOperationToWorker(clientUserId, operateType, data.extra);
	}

	private handleLeaveRoom(socketClient: DataConnection, data: SocketMessage, clientUserId: string) {
		socketClient.send(
			JSON.stringify(<SocketMessage>{
				type: SocketMsgType.LeaveRoom,
				source: "server",
			})
		);
		if (this.room.leave(clientUserId)) {
			//没人了
			this.destory();
		}
		socketClient.close();
		this.clientList.delete(clientUserId);
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

class Room {
	private roomId: string;
	private userList: Map<string, UserInRoom>;
	private ownerId: string = "";
	private gameSetting: GameSetting;
	private roleList: Role[];
	private gameProcess: Worker | null = null;
	public isStarted: boolean;

	constructor(roomId: string, roleList: Role[]) {
		this.roomId = roomId;
		this.ownerId = "";
		this.roleList = roleList;
		this.isStarted = false;
		this.userList = new Map();
		this.gameSetting = {
			gameOverRule: GameOverRule.Earn100000,
			initMoney: 20000,
			multiplier: 0.5,
			multiplierIncreaseRounds: 4,
			mapId: "",
			roundTime: 20,
			diceNum: 2,
			chanceCardVisible: true,
			overMoney: 100000,
			slackOffMode: false,
		};
	}

	public getRoomId() {
		return this.roomId;
	}

	public getOwner() {
		return {
			userId: this.ownerId,
			username: this.userList.get(this.ownerId)?.username || "",
		};
	}

	public getUserList(): UserInRoom[] {
		return Array.from(this.userList.values());
	}

	// public isUserOffLine(userId: string): boolean {
	//     let res = false;
	//     //没有这个用户以及游戏尚未开启均判断为不是断线 无需重连
	//     if (this.hasUser(userId) && this.gameProcess && this.gameProcess.getPlayerIsOffline(userId)) {
	//         res = true;
	//     }
	//     return res;
	// }

	public chatBroadcast(content: string, userId: string) {
		if (!content) return;
		const user = this.userList.get(userId);
		if (!user) return;
		const userInfo: UserInRoomInfo = {
			userId: user.userId,
			username: user.username,
			avatar: user.avatar,
			color: user.color,
			role: user.role,
			isReady: user.isReady,
		};
		const message: ChatMessage = {
			id: randomString(16),
			type: ChatMessageType.Text,
			content,
			user: userInfo,
			time: Date.now(),
		};
		this.roomBroadcast({
			type: SocketMsgType.RoomChat,
			data: message,
			source: "room",
		});
	}

	/**
	 * 将房间的信息广播到房间内的全部用户, 通常在房间界面会用到
	 */
	public roomInfoBroadcast() {
		const roomInfo = this.getRoomInfo();
		const msg: SocketMessage = {
			type: SocketMsgType.RoomInfo,
			source: "server",
			roomId: this.roomId,
			data: roomInfo,
		};
		this.roomBroadcast(msg);
	}

	/**
	 * 将信息广播到房间内的全部用户
	 */
	public roomBroadcast(msg: SocketMessage) {
		Array.from(this.userList.values()).forEach((user: UserInRoom) => {
			user.socketClient.send(JSON.stringify(msg));
		});
	}

	/**
	 * 获取房间的信息
	 * @returns 返回房间的信息
	 */
	private getRoomInfo(): RoomInfo {
		const roomInfo: RoomInfo = {
			roomId: this.roomId,
			userList: Array.from(this.userList.values()).map((user) => ({
				userId: user.userId,
				username: user.username,
				isReady: user.isReady,
				color: user.color,
				avatar: user.avatar,
				role: user.role,
			})),
			isStarted: this.isStarted,
			ownerId: this.getOwner().userId,
			ownerName: this.getOwner().username,
			roleList: this.roleList,
			gameSetting: this.gameSetting,
		};
		return roomInfo;
	}

	/**
	 * 转变某个用户的准备状态
	 * @param _user 要转变准备状态用户的id或实例
	 */
	readyToggle(_user: UserInRoomInfo): boolean;
	readyToggle(_user: string): boolean;
	public readyToggle(_user: UserInRoomInfo | string) {
		const user = this.userList.get(typeof _user === "string" ? _user : _user.userId);
		if (user) {
			user.isReady = !user.isReady;
			this.roomInfoBroadcast();
			return user.isReady;
		}
		return false;
	}

	/**
	 * 用户加入房间
	 * @param user 加入房间的用户的id或实例
	 * @param conn peer链接
	 * @returns 是否加入成功
	 */
	public join(user: User, conn: DataConnection) {
		if (this.userList.has(user.userId)) {
			//用户已在房间内
			this.sendToClient(
				conn,
				SocketMsgType.JoinRoom,
				{ roomId: this.roomId },
				{
					type: "warning",
					content: "你已在房间中",
				},
				this.roomId
			);
			return false;
		} else {
			const userInRoom: UserInRoom = {
				...user,
				socketClient: conn,
				isOffLine: false,
				role: this.roleList[Math.floor(Math.random() * this.roleList.length)],
				isReady: false,
			};
			if (Array.from(this.userList.values()).length === 0) this.ownerId = userInRoom.userId;
			this.userList.set(user.userId, userInRoom);
			this.sendToClient(
				conn,
				SocketMsgType.JoinRoom,
				{ roomId: this.roomId },
				{
					type: "success",
					content: "加入房间成功",
				},
				this.roomId
			);
			this.roomBroadcast(<SocketMessage>{
				type: SocketMsgType.MsgNotify,
				msg: { type: "success", content: `${userInRoom.username}加入了房间` },
			});
			this.roomInfoBroadcast();
			return true;
		}
	}

	/**
	 * 用户离开房间
	 * @param user 离开房间的用户的id
	 * @returns 玩家离开后房间是否为空
	 */
	public leave(userId: string): boolean {
		//房间中还有更多玩家的情况
		if (this.isStarted) {
			//游戏已经开始，处理断线
			this.handleUserOffline(userId);
			return Array.from(this.userList.values()).every((u) => u.isOffLine);
		} else {
			//游戏没有开始，仍在房间页面
			if (this.userList.size <= 1) {
				//房间最后一个人退出, 退出后解散房间
				this.userList.delete(userId);
				return true;
			} else {
				const user = this.userList.get(userId);
				if (user)
					this.roomBroadcast(<SocketMessage>{
						type: SocketMsgType.MsgNotify,
						msg: { type: "warning", content: `${user.username}离开了房间` },
					});
				this.userList.delete(userId);
				this.roomInfoBroadcast();
				return false;
			}
		}
	}

	private handleUserOffline(userId: string) {
		const user = this.userList.get(userId);
		if (!user) return;
		user.isOffLine = true;
		if (this.gameProcess) {
			this.gameProcess.postMessage(<WorkerCommMsg>{
				type: WorkerCommType.UserOffLine,
				data: { userId },
			});
		}
		this.roomBroadcast(<SocketMessage>{
			type: SocketMsgType.MsgNotify,
			msg: { type: "error", content: `${user.username}断开了连接` },
		});
		this.roomInfoBroadcast();
	}

	public handleUserReconnect(userId: string, newCoon: DataConnection) {
		const oldUser = this.userList.get(userId);
		if (oldUser) {
			oldUser.socketClient = newCoon;
			this.roomInfoBroadcast();
			if (this.gameProcess) {
				this.gameProcess.postMessage(<WorkerCommMsg>{
					type: WorkerCommType.UserReconnect,
					data: { userId: oldUser.userId },
				});

				this.roomBroadcast(<SocketMessage>{
					type: SocketMsgType.MsgNotify,
					msg: { type: "success", content: `${oldUser.username}重新连接` },
				});
			}
		} else {
			console.log("奇怪的玩家 in room");
		}
	}

	public changeColor(_userId: string, color: string): void {
		const user = this.userList.get(_userId);
		if (user) {
			user.color = color;
			this.roomInfoBroadcast();
		} else {
			return;
		}
	}

	public changeRole(_userId: string, operate: ChangeRoleOperate): void {
		const user = this.userList.get(_userId);
		if (user) {
			const roleIndex = this.roleList.findIndex((role) => role.id === user.role!.id);
			const newIndex =
				operate === ChangeRoleOperate.Next
					? roleIndex + 1 >= this.roleList.length
						? 0
						: roleIndex + 1
					: roleIndex - 1 < 0
					? this.roleList.length - 1
					: roleIndex - 1;
			user.role = this.roleList[newIndex];

			this.roomInfoBroadcast();
		} else {
			return;
		}
	}

	public changeGameSetting(gameSetting: GameSetting): void {
		this.gameSetting = gameSetting;
		this.roomBroadcast({
			type: SocketMsgType.MsgNotify,
			source: "server",
			data: "",
			msg: { type: "info", content: "地图设置有变更" },
		});
		this.roomInfoBroadcast();
	}

	public async startGame() {
		if (!Array.from(this.userList.values()).every((item) => item.userId == this.ownerId || item.isReady)) {
			this.roomBroadcast({
				type: SocketMsgType.MsgNotify,
				source: "server",
				data: "error",
				msg: { type: "warning", content: "有玩家未准备" },
			});
			return;
		}
		if (this.isStarted || this.gameProcess) return;
		this.roomBroadcast({
			type: SocketMsgType.GameStart,
			source: "server",
			data: "start",
		});
		this.isStarted = true;
		this.gameProcess = new GameProcessWorker();
		this.gameProcess.addEventListener("message", (ev) => {
			const msg: WorkerCommMsg = ev.data;
			switch (msg.type) {
				case WorkerCommType.WorkerReady:
					handleWorkerReady();
					break;
				case WorkerCommType.SendToUsers:
					handleSendToUsers(msg.data);
					break;
				case WorkerCommType.GameStart:
					handleGameStart();
					break;
				case WorkerCommType.GameOver:
					this.handleGameOver();
					break;
			}
		});

		window.addEventListener("beforeunload", () => {
			this.gameProcess && this.gameProcess.terminate();
		});

		const handleWorkerReady = async () => {
			if (!this.gameSetting.mapId || !this.gameProcess) return;
			useLoading().showLoading("正在向服务器获取地图信息...");
			const mapInfo = await getMapById(this.gameSetting.mapId);
			useLoading().showLoading("正在加载地图...");
			this.gameProcess.postMessage(<WorkerCommMsg>{
				type: WorkerCommType.LoadGameInfo,
				data: {
					setting: this.gameSetting,
					mapInfo,
					userList: Array.from(this.userList.values()).map((u) => {
						const { socketClient, ...userInfo } = u;
						return userInfo;
					}),
					roomOwnerId: this.ownerId,
				},
			});
			const deviceStatusStore = useDeviceStatus();
			deviceStatusStore.$subscribe((mutation, state) => {
				if (this.gameProcess)
					this.gameProcess.postMessage(<WorkerCommMsg>{
						type: WorkerCommType.EmitOperation,
						data: {
							userId: this.ownerId,
							operateType: state.isFocus ? OperateType.ResumeGame : OperateType.PauseGame,
						},
					});
			});
		};

		const handleSendToUsers = (data: { userIdList: string[]; data: SocketMessage }) => {
			for (let index = 0; index < data.userIdList.length; index++) {
				const userId = data.userIdList[index];
				const user = this.userList.get(userId);
				user && this.sendToClient(user.socketClient, data.data.type, data.data.data, data.data.msg);
			}
		};
		const handleGameStart = () => {};
	}

	private async handleGameOver() {
		await setRoomStarted(this.getRoomId(), false);
		Array.from(this.userList.values()).forEach((u) => {
			u.isReady = false;
		});
		this.roomInfoBroadcast();
		console.log("🚀 ~ Room ~ handleGameOver ~ 游戏结束啦:");
		this.gameProcess && this.gameProcess.terminate();
		this.gameProcess = null;
		this.isStarted = false;
	}

	/**
	 * 获取房间内用户数量
	 * @return  用户数量
	 */
	public getUserNum() {
		return this.userList.size;
	}

	public isUserInRoomAndOffline(userId: string) {
		const user = Array.from(this.userList.values()).find((u) => u.userId === userId);
		if (!user) return false;
		return user.isOffLine;
	}

	public isUserInRoom(userId: string) {
		return this.userList.has(userId);
	}

	public emitOperationToWorker(userId: string, operateType: OperateType | string, ...data: any) {
		if (!this.gameProcess) throw Error("在worker还没创建时给worker发信息");
		this.gameProcess.postMessage(<WorkerCommMsg>{
			type: WorkerCommType.EmitOperation,
			data: {
				userId,
				operateType,
				data,
			},
		});
	}

	/**
	 * 向指定客户端发送信息
	 * @param DataConnection 要发送信息的客户端/或者用户id
	 * @param type 发送的信息类型
	 * @param data 发送的信息本体
	 * @param msg 可以使客户端触发message组件的信息
	 * @param roomId 房间Id
	 */
	public sendToClient(
		socketClient: DataConnection,
		type: SocketMsgType,
		data: any,
		msg?: { type: "success" | "warning" | "error" | "info" | ""; content: string },
		roomId?: string
	) {
		const msgToSend: SocketMessage = {
			type,
			data,
			source: "server",
			roomId,
			msg,
		};
		if (socketClient.open) socketClient.send(JSON.stringify(msgToSend));
	}

	public destory() {
		this.gameProcess && this.gameProcess.terminate();
	}
}
