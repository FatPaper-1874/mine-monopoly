import { defineStore } from "pinia";
import {
	ChatMessage,
	FormSchema,
	GameLog,
	GameMapInDb,
	GameOverRule,
	GameSetting,
	RoleInRoom,
	Room,
	User,
	UserInRoomInfo,
} from "@mine-monopoly/types";
import { isFullScreen, isLandscape, setTimeOutAsync } from "@src/utils";
import { getUserByToken } from "@src/utils/api/user";
import { useGameData } from "./game";

export const useLoading = defineStore("loading", {
	state: () => {
		return {
			loading: false,
			text: "",
		};
	},
	actions: {
		showLoading(text: string) {
			this.text = text;
			this.loading = true;
		},
		hideLoading() {
			this.loading = false;
		},
	},
});

export const useUserInfo = defineStore("userInfo", {
	state: () => {
		return {
			userId: "",
			useraccount: "",
			username: "",
			avatar: "",
			color: "",
		};
	},
	actions: {
		hasUserInfo() {
			return Boolean(this.userId);
		},
	},
});

export const useUserList = defineStore("userList", {
	state: () => {
		return {
			userList: new Array<User>(),
		};
	},
});

export const useRoomList = defineStore("roomList", {
	state: () => {
		return {
			roomList: new Array<Room>(),
		};
	},
});

export const useRoomInfo = defineStore("roomInfo", {
	state: () => {
		return {
			mapId: "",
			mapInfo: null as GameMapInDb | null,
			roomId: "",
			ownerId: "",
			ownerName: "",
			userList: new Array<UserInRoomInfo>(),
			roleList: new Array<RoleInRoom>(),
			gameSettingForm: new Array<FormSchema>(),
			gameSetting: {} as GameSetting,
		};
	},
	actions: {},
	getters: {
		amIRoomOwner: (state) => useUserInfo().userId === state.ownerId,
	},
});

export const useUtil = defineStore("util", {
	state: () => {
		return {
			ping: 0,
			fps: 0,
			isRollDiceAnimationPlay: false,
			rollDiceResult: new Array<number>(),
			currentEventName: "", // 新增：独立的事件名称状态
			waitingFor: { remainingTime: 0, totalTime: 0 }, // 移除 eventMsg
			showCountdown: false, // 是否显示倒计时（由服务端控制）
			timeOut: false,
			canUseCard: useGameData().canIOperate,
			canRoll: useGameData().canIOperate,
		};
	},
});

export const useChat = defineStore("chat", {
	state: (): {
		visible: boolean;
		messageLimit: number;
		chatMessageQueue: Array<ChatMessage>;
		newMessage: ChatMessage | undefined;
		newMessageNum: number;
	} => {
		return {
			visible: false,
			messageLimit: 30,
			chatMessageQueue: new Array<ChatMessage>(),
			newMessage: undefined,
			newMessageNum: 0,
		};
	},
	actions: {
		addNewMessage(_newMessage: ChatMessage) {
			this.chatMessageQueue.push(_newMessage);
			this.newMessage = _newMessage;
			if (!this.visible) this.newMessageNum += 1;
			if (this.chatMessageQueue.length > this.messageLimit) {
				this.chatMessageQueue.shift();
			}
		},
		resetNewMessageNum() {
			this.newMessageNum = 0;
		},
	},
});

export const useGameLog = defineStore("gameLog", {
	state: (): {
		visible: boolean;
		logLimit: number;
		gameLogQueue: Array<GameLog>;
	} => {
		return {
			visible: false,
			logLimit: 30,
			gameLogQueue: new Array<GameLog>(),
		};
	},
	actions: {
		addNewLog(_newLog: GameLog) {
			this.gameLogQueue.push(_newLog);
			if (this.gameLogQueue.length > this.logLimit) {
				this.gameLogQueue.shift();
			}
		},
	},
});

export const useDeviceStatus = defineStore("deviceStatus", {
	state: () => {
		return {
			isFullScreen: false,
			isLandscape: false,
			isMobile: false,
			isFocus: false,
		};
	},
});

export const useSettig = defineStore("setting", {
	state: () => {
		return {
			autoMusic: true,
			musicVolume: 0.3,
			sfxVolume: 0.5,
			masterVolume: 1,
			masterMuted: false,
			sfxMuted: false,
			musicMuted: false,
			lockRole: true,
			// 画面质量设置：低/中/高三档
			graphicQuality: "medium" as "low" | "medium" | "high",
			// 阴影开关
			enableShadow: false,
		};
	},
	actions: {
		// 初始化画质设置（从 localStorage 读取或自动检测）
		initGraphicQuality() {
			try {
				const saved = localStorage.getItem("graphicQuality");
				if (saved && (saved === "low" || saved === "medium" || saved === "high")) {
					this.graphicQuality = saved;
					console.log("[画质设置] 从 localStorage 读取画质设置:", saved);
				} else {
					// 自动检测：根据 CPU 核心数
					const cores = navigator.hardwareConcurrency || 4;
					this.graphicQuality = cores <= 4 ? "low" : "medium";
					console.log("[画质设置] 自动检测画质:", this.graphicQuality, "(CPU 核心数:", cores, ")");
				}
			} catch (e) {
				// localStorage 失败，回退到自动检测
				const cores = navigator.hardwareConcurrency || 4;
				this.graphicQuality = cores <= 4 ? "low" : "medium";
				console.warn("[画质设置] localStorage 读取失败，使用自动检测:", this.graphicQuality);
			}
		},
		// 获取实际像素比
		getPixelRatio(): number {
			const ratioMap = { low: 0.85, medium: 1.0, high: 2.0 };
			return window.devicePixelRatio * ratioMap[this.graphicQuality];
		},
	},
});
