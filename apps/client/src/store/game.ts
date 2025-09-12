import { ResourcesType, GameMap, PlayerInfo, PropertyInfo } from "@fatpaper-monopoly/types";
import { defineStore } from "pinia";
import { useUserInfo } from ".";

export const useResourceStore = defineStore("temp-resource", {
	state: () => {
		return {
			recourceMap: new Map<string, ResourcesType>(),
		};
	},
	actions: {
		add(recource: ResourcesType) {
			this.recourceMap.set(recource.id, recource);
		},
		remove(id: string) {
			const recource = this.recourceMap.get(id);
			if (!recource) return;
			URL.revokeObjectURL(recource.url);
			this.recourceMap.delete(id);
		},
		getRecourceById(id: string) {
			return this.recourceMap.get(id);
		},
		clear() {
			Array.from(this.recourceMap.values()).forEach((r) => {
				URL.revokeObjectURL(r.url);
			});
			this.recourceMap.clear();
		},
	},
});

export const useMapData = defineStore("map-data", {
	state: (): Omit<GameMap, 'phases'> => ({
		id: crypto.randomUUID(),
		info: {
			name: "",
			version: "0.0.0",
			backgroundImageId: "",
			coverImageId: "",
		},
		mapItems: [],
		chanceCards: [],
		mapItemTypes: [],
		mapIndex: [],
		streets: [],
		roles: [],
		inUse: false,
		mapEvents: [],
		buildingModelIdList: ["", "", ""],
	}),
	actions: {
		getMapEventByMapItemId(mapItemId: string) {
			const mapEventId = this.findMapItemById(mapItemId)?.mapEventId;
			if (!mapEventId) throw Error("查找MapEvent的Id失败");
			return this.findMapEventById(mapEventId);
		},

		// MapItem
		findMapItemByIndex(index: number) {
			return this.findMapItemById(this.mapIndex[index]);
		},
		findMapItemById(id: string) {
			return this.mapItems.find((m) => m.id === id);
		},

		// MapItemType
		findMapItemTypeById(id: string) {
			return this.mapItemTypes.find((m) => m.id === id);
		},

		// MapEvent
		findMapEventById(id: string) {
			return this.mapEvents.find((e) => e.id === id);
		},

		// ChanceCard
		findChanceCardById(id: string) {
			return this.chanceCards.find((c) => c.id === id);
		},

		// Role
		findRoleById(id: string) {
			return this.roles.find((r) => r.id === id);
		},
	},
});

export const useGameData = defineStore("game-data", {
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
			const _this = useGameData();
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
