<script setup lang="ts">
import FpDialog from "@src/components/utils/fp-dialog/fp-dialog.vue";
import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";
import { computed, ref } from "vue";
import { useRoute } from "vue-router";
import { useMapData } from "@src/store/game";
import { useRoomInfo } from "@src/store";
import { marked } from "marked";

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

// Markdown 渲染的地图说明
const mapDescriptionHtml = computed(() => {
	let desc = displayMapInfo.value?.description;
	if (!desc?.trim() && router.name === "room") {
		desc = mapData.info?.description;
	}
	if (!desc?.trim()) return "<p>暂无说明</p>";
	return marked.parse(desc) as string;
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
		<template #title>"{{ mapName }}"地图说明</template>
		<div class="map-info-container">
			<div class="map-meta">
				<span>作者: {{ mapAuthor }}</span>
				<span>版本: {{ mapVersion }}</span>
			</div>
			<div class="map-description markdown-content" v-html="mapDescriptionHtml"></div>
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
		color: #3e3e3e;
		line-height: 1.8;
	}

	// Markdown 内容样式（参考 help.vue）
	.markdown-content {
		:deep(h2),
		:deep(h3) {
			color: var(--fp-color-primary);
			margin-top: 1rem;
			margin-bottom: 0.5rem;

			&:first-child {
				margin-top: 0;
			}
		}

		:deep(p) {
			margin-bottom: 0.8rem;
		}

		:deep(ul) {
			list-style: none;
			padding-left: 0;
			margin-bottom: 0.8rem;
		}

		:deep(li) {
			line-height: 1.6;
			margin-bottom: 0.3rem;
			padding-left: 1em;
			text-indent: -1em;

			&::before {
				content: "- ";
				color: var(--fp-color-secondary);
			}
		}

		:deep(strong) {
			color: var(--fp-color-text-secondary);
			font-weight: 600;
		}

		:deep(code) {
			background-color: rgba(0, 0, 0, 0.05);
			padding: 0.1em 0.3em;
			border-radius: 3px;
			font-family: monospace;
			font-size: 0.9em;
		}

		:deep(a) {
			color: var(--fp-color-primary);
			text-decoration: underline;

			&:hover {
				opacity: 0.8;
			}
		}

		:deep(table) {
			border-collapse: collapse;
			width: 100%;
			margin-bottom: 1rem;
		}

		:deep(th),
		:deep(td) {
			border: 1px solid #ddd;
			padding: 0.5rem 0.8rem;
			text-align: left;
		}

		:deep(th) {
			background-color: rgba(0, 0, 0, 0.05);
			font-weight: 600;
		}

		:deep(tr:nth-child(even)) {
			background-color: rgba(0, 0, 0, 0.02);
		}
	}
}
</style>
