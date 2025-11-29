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
} from "@fatpaper-monopoly/types";
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
			gameSettingForm: new Array<FormSchema>,
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
			isRollDiceAnimationPlay: false,
			rollDiceResult: new Array<number>(),
			waitingFor: { eventMsg: "", remainingTime: 0 },
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
			musicVolume: 1,
			lockRole: true,
		};
	},
});
