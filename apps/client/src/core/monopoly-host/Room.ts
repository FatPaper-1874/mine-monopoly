import {
	Role,
	GameOverRule,
	ChatMessageType,
	SocketMsgType,
	ChangeRoleOperate,
	OperateType,
	SocketMsgSource,
	UserInRoomInfo,
	User,
} from "@fatpaper-monopoly/types";
import { WorkerCommType } from "@src/enums/worker";
import {
	GameSetting,
	ChatMessage,
	SocketMessage,
	RoomInfo,
	RoleInRoom,
	SocketMessageDataType,
	ServerSocketMessage,
} from "@src/interfaces/bace";
import { WorkerCommMsg } from "@src/interfaces/worker";
import { useLoading, useDeviceStatus } from "@src/store";
import { randomString } from "@src/utils";
import { getGameMapById } from "@src/utils/api/map";
import { setRoomStarted } from "@src/utils/api/room-router";
import { DataConnection } from "peerjs";
import GameProcessWorker from "@src/core/worker/GameProcessWorker?worker";
import { getGameMap } from "@src/utils/file/game-map";
import { useMapData } from "@src/store/game";
import { FPMessage } from "@fatpaper-monopoly/ui";

interface UserInRoom extends UserInRoomInfo {
	socketClient: DataConnection;
	isOffLine: boolean;
}

export class Room {
	private mapId: string;
	private roomId: string;
	private userList: Map<string, UserInRoom>;
	private ownerId: string = "";
	private gameSetting: GameSetting;
	private gameProcess: Worker | null = null;
	public isStarted: boolean;

	constructor(roomId: string) {
		this.roomId = roomId;
		this.mapId = "";
		this.ownerId = "";
		this.isStarted = false;
		this.userList = new Map();
		this.gameSetting = {
			gameOverRule: GameOverRule.Earn100000,
			initMoney: 20000,
			multiplier: 0.5,
			multiplierIncreaseRounds: 4,
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
			roleId: user.roleId,
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
			source: SocketMsgSource.Server,
		});
	}

	/**
	 * 将房间的信息广播到房间内的全部用户, 通常在房间界面会用到
	 */
	public roomInfoBroadcast() {
		const roomInfo = this.getRoomInfo();
		const msg: SocketMessage = {
			type: SocketMsgType.RoomInfo,
			source: SocketMsgSource.Server,
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
			mapId: this.mapId,
			roomId: this.roomId,
			userList: Array.from(this.userList.values()).map((user) => ({
				userId: user.userId,
				username: user.username,
				isReady: user.isReady,
				color: user.color,
				avatar: user.avatar,
				roleId: user.roleId,
			})),
			isStarted: this.isStarted,
			ownerId: this.getOwner().userId,
			ownerName: this.getOwner().username,
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
				roleId: "",
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
		const user = this.userList.get(userId);
		if (!user) return false;
		this.sendToClient(user.socketClient, SocketMsgType.LeaveRoom, undefined);
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

	public changeMap(id: string) {
		//换地图取消所有玩家准备状态
		this.userList.forEach((u) => (u.isReady = false));
		this.mapId = id;
		this.roomBroadcast({
			type: SocketMsgType.MsgNotify,
			source: SocketMsgSource.Server,
			data: "",
			msg: { type: "info", content: "地图有变更" },
		});
		this.roomInfoBroadcast();
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

	public changeRole(_userId: string, roleId: string): void {
		const user = this.userList.get(_userId);
		if (!user) return;
		user.roleId = roleId;
		this.roomInfoBroadcast();
	}

	public changeGameSetting(gameSetting: GameSetting): void {
		this.gameSetting = gameSetting;
		this.roomBroadcast({
			type: SocketMsgType.MsgNotify,
			source: SocketMsgSource.Server,
			data: "",
			msg: { type: "info", content: "地图设置有变更" },
		});
		this.roomInfoBroadcast();
	}

	public async startGame() {
		if (!Array.from(this.userList.values()).every((item) => item.userId == this.ownerId || item.isReady)) {
			this.roomBroadcast({
				type: SocketMsgType.MsgNotify,
				source: SocketMsgSource.Server,
				data: "error",
				msg: { type: "warning", content: "有玩家未准备" },
			});
			return;
		}
		if (this.isStarted || this.gameProcess) return;
		this.roomBroadcast({
			type: SocketMsgType.GameStart,
			source: SocketMsgSource.Server,
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
			if (!this.mapId || !this.gameProcess) return;
			useLoading().showLoading("正在获取地图信息...");
			const mapData = useMapData().$state;
			console.log("🚀 ~ Room ~ handleWorkerReady ~ mapData:", mapData)
			console.log("🚀 ~ Room ~ handleWorkerReady ~ this.mapId:", this.mapId)
			if (this.mapId !== mapData.id) {
				FPMessage({ type: "error", message: "地图缓存与游戏地图不符" });
			}
			useLoading().showLoading("正在加载地图...");
			this.gameProcess.postMessage(<WorkerCommMsg>{
				type: WorkerCommType.LoadGameInfo,
				data: {
					setting: this.gameSetting,
					mapInfo: mapData,
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

		const handleSendToUsers = (data: { userIdList: string[]; data: ServerSocketMessage }) => {
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

	public sendToClientById<T extends SocketMsgType>(
		id: string,
		type: T,
		data?: SocketMessageDataType[T][SocketMsgSource.Server],
		msg?: {
			type: "info" | "success" | "warning" | "error";
			content: string;
		},
		extra: any = undefined
	) {
		const user = this.userList.get(id);
		if (!user) return;
		this.sendToClient(user.socketClient, type, data, msg, extra);
	}

	public sendToClient<T extends SocketMsgType>(
		socketClient: DataConnection,
		type: T,
		data?: SocketMessageDataType[T][SocketMsgSource.Server],
		msg?: {
			type: "info" | "success" | "warning" | "error";
			content: string;
		},
		extra: any = undefined
	) {
		const msgToSend: SocketMessage = {
			type,
			source: SocketMsgSource.Server,
			data,
			roomId: this.roomId,
			msg,
			extra,
		};
		if (socketClient.open) socketClient.send(JSON.stringify(msgToSend));
	}

	public destory() {
		this.gameProcess && this.gameProcess.terminate();
	}
}
