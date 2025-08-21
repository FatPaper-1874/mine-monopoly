import { defineStore } from "pinia";
import { User, Room, Role, ChatMessage, UserInRoomInfo, GameLog } from "@src/interfaces/bace";
import { MapItem, PlayerInfo, PropertyInfo, ItemType, ChanceCardInfo, Street, Model } from "@src/interfaces/game";
import { GameOverRule } from "@src/enums/game";
import { isFullScreen, isLandscape, setTimeOutAsync } from "@src/utils";
import { getUserByToken } from "@src/utils/api/user";
import { CardUseMode } from "@src/enums/bace";

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
			roomId: "",
			ownerId: "",
			ownerName: "",
			userList: new Array<UserInRoomInfo>(),
			roleList: new Array<Role>(),
			gameSetting: {
				gameOverRule: GameOverRule.LeftOnePlayer,
				initMoney: 20000,
				multiplier: 1,
				multiplierIncreaseRounds: 2,
				mapId: "",
				roundTime: 15,
				diceNum: 2,
				chanceCardVisible: true,
				overMoney: 100000,
			},
		};
	},
	getters: {
		iAmRoomOwner: (state) => useUserInfo().userId === state.ownerId,
	},
});

export const useMapData = defineStore("map", {
	state: () => {
		return {
			mapId: "",
			mapName: "",
			mapBackground: "",
			mapItemsList: new Array<MapItem>(),
			mapIndexList: new Array<string>(),
			itemTypesList: new Array<ItemType>(),
			playerList: new Array<PlayerInfo>(),
			properties: new Array<PropertyInfo>(),
			chanceCards: new Array<ChanceCardInfo>(),
			streetsList: new Array<Street>(),
			houseModels: {
				lv0: undefined as Model | undefined,
				lv1: undefined as Model | undefined,
				lv2: undefined as Model | undefined,
			},
		};
	},
	actions: {
		getChanceCardInfoById(id: string) {
			return this.$state.chanceCards.find((p) => p.id === id);
		},
		getArrivedItemInfoById(id: string) {
			return this.$state.mapItemsList.filter((i) => Boolean(i.arrivedEvent)).find((p) => p.arrivedEvent!.id === id)
				?.arrivedEvent;
		},
	},
});

export const useGameInfo = defineStore("gameInfo", {
	state: () => {
		return {
			ping: 0,
			currentPlayerIdInRound: "",
			currentRound: 0,
			currentMultiplier: 0,
			playersList: new Array<PlayerInfo>(),
			propertiesList: new Array<PropertyInfo>(),
			isGameOver: false,
		};
	},
	getters: {
		isMyTurn: (state) => useUserInfo().userId === state.currentPlayerIdInRound,
		getMyInfo: (state) => state.playersList.find((p) => p.id === useUserInfo().userId),
		canIOperate: (state) => {
			const _this = useGameInfo();
			const amIBankrupted = _this.getMyInfo && _this.getMyInfo.isBankrupted;
			return !amIBankrupted && _this.isMyTurn;
		},
	},
	actions: {
		getPlayerInfoById(id: string) {
			return this.$state.playersList.find((p) => p.id === id);
		},
		getPropertyById(id: string) {
			return this.$state.propertiesList.find((p) => p.id === id);
		},
	},
});

export const useUtil = defineStore("util", {
	state: () => {
		return {
			isRollDiceAnimationPlay: false,
			rollDiceResult: new Array<number>(),
			waitingFor: { eventMsg: "", remainingTime: 0 },
			timeOut: false,
			canUseCard: useGameInfo().canIOperate,
			canRoll: useGameInfo().canIOperate,
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
			cardUseMode: CardUseMode.Click,
			autoMusic: true,
			musicVolume: 1,
			lockRole: true,
		};
	},
});
