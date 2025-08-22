import { defineStore } from "pinia";
import { GameMap } from "@fatpaper-monopoly/types";
import { CameraMode, OperationMode } from "@src/enums";
import {
	MapItem,
	MapItemType,
	Street,
	MapEvent,
	ChanceCard,
	IProperty,
	Role,
} from "@fatpaper-monopoly/types/interfaces/game/item";
import { eventBus } from "@src/utils/event-bus";
import { message } from "ant-design-vue";
import { getInitPhase } from "./utils/init-phase";
import { computed, ComputedRef } from "vue";

export const useMapDataStore = defineStore("MapData", {
	state: (): GameMap => ({
		id: crypto.randomUUID(),
		name: "",
		background: "",
		mapItems: [],
		properties: [],
		chanceCards: [],
		mapItemTypes: [],
		mapIndex: [],
		streets: [],
		roles: [],
		inUse: false,
		mapEvents: [],
		phases: getInitPhase(),
		houseModel_lv0_id: "",
		houseModel_lv1_id: "",
		houseModel_lv2_id: "",
	}),
	actions: {
		// MapItem
		addMapItem(mapItem: MapItem) {
			this.mapItems.push(mapItem);
		},
		removeMapItem(id: string) {
			console.log("🚀 ~ removeMapItem ~ id:", id);
			const index = this.mapItems.findIndex((m) => m.id === id);
			if (index === -1) throw Error("寻找MapItem失败");
			this.unLinkMapItem(id);
			//级联删除Property
			const property = this.mapItems[index].property;
			if (property) {
				this.reomveProperty(property.id);
			}
			this.mapItems.splice(index, 1);
			eventBus.emit("map-item-deleted", id);
			this.updateMapIndex([]);
		},
		findMapItemById(id: string) {
			return this.mapItems.find((m) => m.id === id);
		},
		hasMapItemRepeatCoord(x: number, y: number) {
			return this.mapItems.some((m) => m.x === x && m.y === y);
		},
		linkToMapItem(sourceId: string, targetId: string) {
			if (sourceId === targetId) throw Error("你不能绑定自己");
			const source = this.findMapItemById(sourceId);
			const target = this.findMapItemById(targetId);
			if (!source) throw Error("绑定地皮时找不到源头MapItem");
			if (!target) throw Error("绑定地皮时找不到目标MapItem");
			if (target.beLinked || target.linkto) throw Error("目标MapItem已经处于绑定状态了");
			source.linkto = targetId;
			target.beLinked = sourceId;
			eventBus.emit("map-item-link", sourceId);
		},
		unLinkMapItem(id: string) {
			const mapItem = this.findMapItemById(id);
			if (!mapItem) throw Error("解绑地皮找不到MapItem");
			if (mapItem.linkto) {
				const taget = this.findMapItemById(mapItem.linkto);
				if (!taget) return;
				eventBus.emit("map-item-unlink", id);
				taget.beLinked = undefined;
				mapItem.linkto = undefined;
			}
			if (mapItem.beLinked) {
				const taget = this.findMapItemById(mapItem.beLinked);
				if (!taget) return;
				eventBus.emit("map-item-unlink", mapItem.beLinked);
				taget.linkto = undefined;
				mapItem.beLinked = undefined;
			}
		},

		// MapItemType
		addMapItemType(mapItemType: MapItemType) {
			this.mapItemTypes.push(mapItemType);
		},
		findMapItemTypeById(id: string) {
			return this.mapItemTypes.find((m) => m.id === id);
		},
		removeMapItemType(id: string) {
			const index = this.mapItemTypes.findIndex((s) => s.id === id);
			if (index < 0) throw Error("找不到目标MapItem类型");
			const mapItemIds = this.mapItems.filter((m) => m.type.id === id).map((m) => m.id);
			//级联删除MapItem
			mapItemIds.forEach((mapItemId) => {
				this.removeMapItem(mapItemId);
			});
			this.mapItemTypes.splice(index, 1);
		},

		// Street
		addStreet(street: Street) {
			this.streets.push(street);
		},
		editStreet(street: Street) {
			const index = this.streets.findIndex((s) => s.id === street.id);
			if (index < 0) throw Error("找不到目标街道");
			Object.assign(this.streets[index], street);
		},
		reomveStreet(id: string) {
			const deleteIndex = this.streets.findIndex((s) => s.id === id);
			if (deleteIndex < 0) throw Error("找不到目标街道");
			this.streets.splice(deleteIndex, 1);
		},

		// MapEvent
		addMapEvent(mapEvent: MapEvent) {
			this.mapEvents.push(mapEvent);
		},
		editMapEvent(mapEvent: MapEvent) {
			const index = this.mapEvents.findIndex((s) => s.id === mapEvent.id);
			if (index < 0) throw Error("找不到目标地图事件");
			const old = this.mapEvents[index];
			useResourceStore().removeImage(old.iconId);
			Object.assign(this.mapEvents[index], mapEvent);
		},
		reomveMapEvent(id: string) {
			const deleteIndex = this.mapEvents.findIndex((s) => s.id === id);
			if (deleteIndex < 0) throw Error("找不到目标地图事件");
			this.mapEvents.splice(deleteIndex, 1);
		},
		linkMapEvent(mapItemId: string, mapEventId: string | undefined) {
			const mapItem = this.findMapItemById(mapItemId);
			if (!mapItem) throw Error("找不到MapItem");
			if (mapEventId) {
				mapItem.mapEventId = mapEventId;
				eventBus.emit("map-event-link", mapItemId);
			} else {
				mapItem.mapEventId = undefined;
				eventBus.emit("map-event-unlink", mapItemId);
			}
		},
		findMapEventById(id: string) {
			return this.mapEvents.find((e) => e.id === id);
		},

		// ChanceCard
		addChanceCard(chanceCard: ChanceCard) {
			this.chanceCards.push(chanceCard);
		},
		editChanceCard(chanceCard: ChanceCard) {
			const index = this.chanceCards.findIndex((s) => s.id === chanceCard.id);
			if (index < 0) throw Error("找不到目标机会卡");
			const old = this.chanceCards[index];
			useResourceStore().removeImage(old.iconId);
			Object.assign(this.chanceCards[index], chanceCard);
		},
		reomveChanceCard(id: string) {
			const deleteIndex = this.chanceCards.findIndex((s) => s.id === id);
			if (deleteIndex < 0) throw Error("找不到目标机会卡");
			this.chanceCards.splice(deleteIndex, 1);
		},

		// Property
		addProperty(mapItemId: string, property: IProperty) {
			const mapItem = this.mapItems.find((m) => m.id === mapItemId);
			if (!mapItem) throw Error("找不到目标地块");
			mapItem.property = property;
			this.properties.push(property);
		},
		editProperty(mapItemId: string, property: IProperty) {
			const mapItem = this.mapItems.find((m) => m.id === mapItemId);
			if (!mapItem) throw Error("找不到目标地块");
			const index = this.properties.findIndex((p) => p.id === property.id);
			if (index < 0) throw Error("找不到目标地皮");
			Object.assign(this.properties[index], property);
			mapItem.property = property;
		},
		reomveProperty(id: string) {
			const deleteIndex = this.properties.findIndex((p) => p.id === id);
			if (deleteIndex < 0) throw Error("找不到目标地皮");
			this.properties.splice(deleteIndex, 1);
		},

		// Role
		addRole(role: Role) {
			this.roles.push(role);
		},
		editRole(role: Role) {
			const index = this.roles.findIndex((s) => s.id === role.id);
			if (index < 0) throw Error("找不到目标角色");
			const old = this.roles[index];
			useResourceStore().removeImage(old.imageId);
			Object.assign(this.roles[index], role);
		},
		reomveRole(id: string) {
			const deleteIndex = this.roles.findIndex((s) => s.id === id);
			if (deleteIndex < 0) throw Error("找不到目标角色");
			this.roles.splice(deleteIndex, 1);
		},

		//mapIndex
		updateMapIndex(indexs: string[]) {
			this.mapIndex = indexs;
			eventBus.emit("map-index-update", indexs);
		},
	},
});

export type ResourcesType = {
	id: string;
	name: string;
	fileType: string;
	url: string;
};

export const useResourceStore = defineStore("Resources", {
	state: (): { models: ResourcesType[]; images: ResourcesType[] } => ({
		models: [],
		images: [],
	}),
	actions: {
		addModel(model: ResourcesType) {
			this.models.push(model);
		},
		addImage(image: ResourcesType) {
			this.images.push(image);
		},
		removeModel(id: string) {
			const deleteIndex = this.models.findIndex((m) => m.id === id);
			if (deleteIndex < 0) throw Error("找不到目标模型资源");
			//级联删除MapItemType
			const mapItemTypeIds = useMapDataStore()
				.mapItemTypes.filter((m) => m.modelId === id)
				.map((m) => m.id);
			console.log("🚀 ~ removeModel ~ mapItemTypeIds:", mapItemTypeIds);
			mapItemTypeIds.forEach((mapItemTypeId) => {
				useMapDataStore().removeMapItemType(mapItemTypeId);
			});
			this.models.splice(deleteIndex, 1);
		},
		removeImage(id: string) {
			const deleteIndex = this.images.findIndex((i) => i.id === id);
			if (deleteIndex < 0) throw Error("找不到目标图片资源");
			this.images.splice(deleteIndex, 1);
		},
		findModelById(id: string) {
			return this.models.find((m) => m.id === id);
		},
		findImageById(id: string) {
			return this.images.find((i) => i.id === id);
		},
	},
});

type EditorState = {
	currentFilePath: string;
	currentEditMode: OperationMode;
	currentMapItemId: string | undefined;
	currentMapItemTypeId: string | undefined;
	currentCameraMode: CameraMode;
	isLinkMode: boolean;
	isLoading: boolean;
};

type EditorAlert = {
	type: "success" | "info" | "warning" | "error";
	message: string;
	visible: () => boolean;
};

const alertList: EditorAlert[] = [
	{
		type: "error",
		message: "没有设置地图索引路径",
		visible: () => useMapDataStore().mapIndex.length === 0,
	},
	{
		type: "error",
		message: "没有加入模型",
		visible: () => useResourceStore().models.length === 0,
	},
	{
		type: "error",
		message: "没有设置街道",
		visible: () => useMapDataStore().streets.length === 0,
	},
	{
		type: "error",
		message: "被绑定地皮没有设置地皮参数",
		visible: () => {
			return useMapDataStore().mapItems.some((m) => m.beLinked && !m.property);
		},
	},
	{
		type: "error",
		message: "没有角色",
		visible: () => useMapDataStore().roles.length === 0,
	},
	{
		type: "error",
		message: "空的地图",
		visible: () => {
			return useMapDataStore().mapItems.length === 0;
		},
	},
	{
		type: "warning",
		message: "没有机会卡",
		visible: () => useMapDataStore().chanceCards.length === 0,
	},
];

export const useEditorStore = defineStore("Editor", {
	state: (): EditorState => ({
		currentFilePath: "",
		currentEditMode: OperationMode.Select,
		currentMapItemId: undefined,
		currentMapItemTypeId: undefined,
		currentCameraMode: CameraMode.Perspective,
		isLinkMode: false,
		isLoading: false,
	}),
	actions: {
		setLoading(loading: boolean) {
			this.isLoading = loading;
		},
		setCurrentFilePath(path: string) {
			this.currentFilePath = path;
			localStorage.setItem("last-time-file-path", path);
		},
		setCameraMode(newMode: CameraMode) {
			this.currentCameraMode = newMode;
		},
	},
	getters: {
		currentMapItem: (state) => {
			return state.currentMapItemId ? useMapDataStore().findMapItemById(state.currentMapItemId) : undefined;
		},
		currentMapItemType: (state) => {
			return state.currentMapItemTypeId ? useMapDataStore().findMapItemTypeById(state.currentMapItemTypeId) : undefined;
		},
		alertList: (state) => {
			const res = alertList.filter((a) => a.visible());
			const alertLeverMap = {
				error: 3,
				warning: 2,
				info: 1,
				success: 0,
			};
			return res
				.map((a) => ({ type: a.type, message: a.message }))
				.sort((a, b) => alertLeverMap[a.type] - alertLeverMap[b.type]);
		},
	},
});
