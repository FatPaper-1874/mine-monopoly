<script setup lang="ts">
import FpDialog from "@src/components/utils/fp-dialog/fp-dialog.vue";
import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";
import { computed, ref } from "vue";
import { useRoute } from "vue-router";
import { useMapData } from "@src/store/game";
import { useRoomInfo } from "@src/store";

const mapInfoVisible = ref(false);
const router = useRoute();
const mapData = useMapData();
const roomInfoStore = useRoomInfo();

// 在房间页面和游戏页面显示
const canShow = computed(() => router.name === "room" || router.name === "game");

// 地图信息：优先使用 roomInfoStore.mapInfo（数据库中的信息，包含 description）
const mapInfoFromRoom = computed(() => roomInfoStore.mapInfo);

// 完整地图数据：仅在游戏加载后可用
const mapInfoFromData = computed(() => mapData.info);

// 最终使用的地图信息
const displayMapInfo = computed(() => {
	// 在房间页面使用 roomInfoStore.mapInfo（包含数据库中的 description）
	// 在游戏页面使用 mapData.info（完整地图数据）
	if (router.name === "room") {
		return mapInfoFromRoom.value;
	}
	return mapInfoFromData.value;
});

// 只在地图有说明时显示按钮
const hasMapDescription = computed(() => {
	// 优先从 displayMapInfo 获取 description
	// 如果为空且在房间页面，回退到 useMapData().info（自定义地图的情况）
	let desc = displayMapInfo.value?.description;
	if (!desc?.trim() && router.name === "room") {
		desc = mapData.info?.description;
	}
	return Boolean(desc?.trim());
});

// 地图名称
const mapName = computed(() => {
	return displayMapInfo.value?.name || mapData.info?.name || "";
});

// 地图作者
const mapAuthor = computed(() => {
	return displayMapInfo.value?.author || mapData.info?.author || "";
});

// 地图版本
const mapVersion = computed(() => {
	return displayMapInfo.value?.version || mapData.info?.version || "";
});

// 地图说明内容
const mapDescription = computed(() => {
	// 优先从 displayMapInfo 获取 description
	// 如果为空且在房间页面，回退到 useMapData().info（自定义地图的情况）
	let desc = displayMapInfo.value?.description;
	if (!desc?.trim() && router.name === "room") {
		desc = mapData.info?.description;
	}
	return desc || "暂无说明";
});
</script>

<template>
	<button
		v-if="canShow && hasMapDescription"
		@click="mapInfoVisible = true"
		class="map-info-button btn-small"
		title="查看地图说明"
	>
		<FontAwesomeIcon icon="book" />
	</button>
	<FpDialog
		:style="'width: 60%; max-width: 600px;'"
		v-model:visible="mapInfoVisible"
		:cancel-text="undefined"
		confirm-text="关闭"
	>
		<template #title>“{{ mapName }}”地图说明</template>
		<div class="map-info-container">
			<div class="map-meta">
				<span>作者: {{ mapAuthor }}</span>
				<span>版本: {{ mapVersion }}</span>
			</div>
			<div class="map-description">{{ mapDescription }}</div>
		</div>
	</FpDialog>
</template>

<style lang="scss" scoped>
.map-info-button {
	height: 2.5rem;
	width: 2.5rem;
	border-radius: 0.5rem;
	font-size: 1.1rem;
	display: flex;
	justify-content: center;
	align-items: center;
	gap: 0.4rem;
}

.map-info-container {
	display: flex;
	flex-direction: column;
	gap: 1rem;

	.map-meta {
		display: flex;
		justify-content: flex-start;
		gap: 1.5rem;
		color: #5e5e5e;
		font-size: 0.9rem;

		span {
			background-color: rgba(255, 255, 255, 0.6);
			padding: 0.3rem 0.8rem;
			border-radius: 4px;
		}
	}

	.map-description {
		line-height: 1.8;
		color: #3e3e3e;
		white-space: pre-wrap;
		word-wrap: break-word;
	}
}
</style>
