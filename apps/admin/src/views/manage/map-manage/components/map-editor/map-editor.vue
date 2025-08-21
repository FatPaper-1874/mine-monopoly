<script setup lang="ts">
import router from "@/router/index";
import {
	getChanceCardsListByMapId,
	getItemTypesListByMapId,
	getMapIndexsByMapId,
	getMapInfoById,
	getMapItemsListByMapId,
	getPropertyListByMapId,
} from "@/utils/api/map";
import { createMapItem, deleteMapItem } from "@/utils/api/mapItem";
import { ChanceCard, ItemType, MapData, MapItem, Property, Street } from "@/interfaces/interfaces";
import { ElButton, ElSwitch } from "element-plus";
import { computed, onBeforeUnmount, onMounted, provide, reactive, ref, toRaw, watch } from "vue";
import { useRoute } from "vue-router";
import backgroundUploader from "./components/background-uploader.vue";
import itemTypeSelector from "./components/item-type-selector.vue";
import mapitemInfo from "./components/mapitem-info.vue";
import modeSwitcher from "./components/mode-switcher.vue";
import propertyForm from "./components/property-form.vue";
import indexCreator from "./components/index-creator.vue";
import streetCreator from "./components/street-creator.vue";
import { OperationMode } from "./enum/OperationMode";
import { MapEditor } from "./map-editor";
import { isMapItemBeLinked } from "./utils/index";
import ChanceCardSelector from "./components/chance-card-selector.vue";
import { updateChanceCardInMap } from "@/utils/api/chanceCard";
import ArrivedEventSelector from "@/views/manage/map-manage/components/map-editor/components/arrived-event-selector.vue";
import mapName from "./components/map-name.vue";
import inUseState from "./components/in-use-state.vue";
import { getStreetListByMapId } from "@/utils/api/map";
import houseModelSelector from "./components/house-model-selector.vue";

let mapEditor: MapEditor;

const route = useRoute();
const mapId = route.query.mapId as string;
const isLoading = ref(true);

function handleBgUploadSuccess(res: any) {
	if (res.data && mapEditor) {
		mapEditor.setBackground(res.data);
	}
}

//地图数据
const mapInfo = reactive<MapData>({
	id: mapId,
	name: "",
	itemTypes: [],
	mapItems: [],
	properties: [],
	chanceCards: [],
	streets: [],
	indexList: [],
	background: "",
	inUse: false,
	houseModel_lv0: null,
	houseModel_lv1: null,
	houseModel_lv2: null,
});

provide("mapInfo", mapInfo);

//动态数据
const focusData = reactive<{
	mapItem: MapItem | undefined;
	itemType: ItemType | undefined;
	operationMode: OperationMode;
	currentXY: { x: number; y: number };
	property: Property | undefined;
}>({
	mapItem: undefined,
	itemType: undefined,
	operationMode: OperationMode.MOVE,
	currentXY: { x: -1, y: -1 },
	property: undefined,
});

watch(
	() => mapInfo.mapItems,
	(newItemsList) => {
		if (focusData) {
			focusData.mapItem = newItemsList.find((i) => i.id === focusData.mapItem?.id);
		}
		if (mapEditor) mapEditor.setMapItemsList(newItemsList);
	}
);

watch(
	() => mapInfo.itemTypes,
	(newItemTypesList) => {
		if (mapEditor) mapEditor.setItemTypesList(newItemTypesList);
	}
);

watch(
	() => focusData.operationMode,
	(newMode) => {
		if (mapEditor) mapEditor.setMode(newMode);
		if (newMode != OperationMode.SELECT) focusData.mapItem = undefined;
	}
);

watch(
	() => focusData.itemType,
	(newItemType) => {
		if (mapEditor) mapEditor.setCurrentItemType(newItemType);
	}
);

//加载地图数据
const loadMapInfo = async () => {
	if (mapId) {
		const {
			name,
			mapItems,
			properties,
			chanceCards,
			itemTypes,
			streets,
			indexList,
			background,
			inUse,
			houseModel_lv0,
			houseModel_lv1,
			houseModel_lv2,
		} = await getMapInfoById(mapId);
		const resObj = {
			name,
			mapItems,
			properties,
			chanceCards,
			itemTypes,
			streets,
			indexList,
			background,
			inUse,
			houseModel_lv0,
			houseModel_lv1,
			houseModel_lv2,
		};
		Object.assign(mapInfo, resObj);
	} else {
		router.replace({ path: "/map" });
	}
};

const loadMapItems = async () => {
	mapInfo.mapItems = (await getMapItemsListByMapId(mapId)) as MapItem[];
	mapEditor && mapEditor.setMapItemsList(mapInfo.mapItems);
};

const loadProperties = async () => {
	mapInfo.properties = await getPropertyListByMapId(mapId);
};

const loadItemTypes = async () => {
	mapInfo.itemTypes = await getItemTypesListByMapId(mapId);
	mapEditor && mapEditor.setItemTypesList(mapInfo.itemTypes);
};

const loadChanceCardList = async () => {
	mapInfo.chanceCards = await getChanceCardsListByMapId(mapId);
};

const loadMapIndexs = async () => {
	mapInfo.indexList = await getMapIndexsByMapId(mapId);
	mapEditor && mapEditor.updateIndexPath(mapInfo.indexList);
};

const loadStreets = async () => {
	mapInfo.streets = await getStreetListByMapId(mapId);
};

function handleArrivedEventBindChange() {
	loadMapItems();
}

const handleCreateMapItem = async (x: number, y: number, rotation: 0 | 1 | 2 | 3, itemType: ItemType) => {
	const id = `item-${x}-${y}`;
	await createMapItem(id, x, y, rotation, itemType.id, mapId);
	await loadMapItems();
};

const handleDeleteMapItem = async (id: string) => {
	if (!id) return;
	await deleteMapItem(id);
	await loadMapItems();
	focusData.mapItem = undefined;
};

const isBelinked = computed(() => (focusData.mapItem ? isMapItemBeLinked(mapInfo.mapItems, focusData.mapItem) : false));

onMounted(async () => {
	await loadMapInfo();
	await loadItemTypes();
	const canvasEl = document.getElementById("map-editor-canvas") as HTMLCanvasElement;
	mapEditor = new MapEditor(canvasEl);

	mapEditor.setBackground(mapInfo.background);

	mapEditor.onCreateItem(handleCreateMapItem);

	mapEditor.onItemClick((x, y, id) => {
		const focusItem = toRaw(mapInfo.mapItems.find((item) => item.id == id));
		if (focusItem) focusData.mapItem = focusItem;
	});

	await mapEditor.setItemTypesList(toRaw(mapInfo.itemTypes));
	mapEditor.setMapItemsList(toRaw(mapInfo.mapItems));
	mapEditor.updateIndexPath(mapInfo.indexList);
	isLoading.value = false;
});

onBeforeUnmount(() => {
	if (mapEditor) mapEditor.destory();
});
</script>

<template>
	<div class="map-editor" v-loading="isLoading" element-loading-text="加载数据中...">
		<div class="map-editor-ui">
			<div class="ui-left ui-item">
				<mode-switcher v-model:operation-mode="focusData.operationMode" />
				<item-type-selector
					@created="loadItemTypes"
					v-model:current-type="focusData.itemType"
					:visible="focusData.operationMode === OperationMode.CREATE"
				/>
				<map-name />
				<index-creator :item-type-list="mapInfo.itemTypes" :map-itemslist="mapInfo.mapItems" @submit="loadMapIndexs" />
				<ChanceCardSelector />
				<background-uploader @success="handleBgUploadSuccess"></background-uploader>
				<house-model-selector />
				<street-creator @update-streets="loadStreets" />
				<in-use-state />
			</div>
			<div class="ui-right ui-item" v-if="focusData.mapItem">
				<arrived-event-selector
					v-if="!isBelinked"
					@bind-change="handleArrivedEventBindChange"
					:current-map-item-id="focusData.mapItem.id"
					:current-arrived-event="focusData.mapItem.arrivedEvent"
				/>
				<mapitem-info @linked="loadMapItems" :current-map-item="focusData.mapItem" :be-linked="isBelinked" />
				<div>
					<ElButton type="danger" @click="handleDeleteMapItem(focusData.mapItem?.id || '')">删除当前MapItem</ElButton>
				</div>
				<property-form
					@submit="loadMapItems"
					v-if="isBelinked"
					:current-map-item="focusData.mapItem"
					:street-list="mapInfo.streets"
				/>
			</div>
		</div>
		<canvas id="map-editor-canvas"></canvas>
	</div>
</template>

<style lang="scss" scoped>
.map-editor {
	width: 100%;
	height: 100%;
	position: relative;

	.map-editor-ui {
		width: 100%;
		height: 100%;
		position: absolute;
		top: 0;
		left: 0;
		z-index: 1000;
		user-select: none;
		pointer-events: none;
		display: flex;
		justify-content: space-between;
		align-items: start;
		padding: 10px;
		box-sizing: border-box;

		.ui-item {
			display: flex;
			flex-direction: column;
			justify-content: center;
			align-items: start;
		}

		.ui-item > * {
			border-radius: 6px;
			box-shadow: 0 2px 6px 0 rgba(0, 0, 0, 0.1);
			pointer-events: initial;
			margin-bottom: 10px;
			overflow: hidden;
		}

		.ui-right {
			border-radius: 6px;
			display: flex;
			flex-direction: column;
			justify-content: space-around;
			align-items: end;
			padding: 6px;

			& > * {
				background-color: #ffffff;
			}
		}
	}

	#map-editor-canvas {
		width: 100%;
		height: 100%;
		display: block;
		border-radius: 8px;
		// position: absolute;
		// top: 0;
		// left: 0;
		// user-select: none;
		// z-index: 0;
	}
}
</style>
