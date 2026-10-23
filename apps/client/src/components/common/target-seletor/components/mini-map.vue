<script setup lang="ts">
import { MapItem, PlayerInfo, PropertyInfo } from "@mine-monopoly/types";
import { useGameData, useMapData } from "@src/store/game";
import { computed, toRaw } from "vue";

const props = defineProps<{
	highLightList: string[];
	selectedId: string;
}>();

const emits = defineEmits(["update:selectedId"]);

const mapDataStore = useMapData();
const gameDataStore = useGameData();

// 获取基础数据
const properties = gameDataStore.properties;
const playerList = gameDataStore.players;
const mapPathNodeIds = computed(() => {
	const nodeIds = new Set<string>();
	for (const path of mapDataStore.mapPaths) {
		nodeIds.add(path.fromMapItemId);
		nodeIds.add(path.toMapItemId);
	}
	if (nodeIds.size === 0) {
		for (const mapItemId of mapDataStore.mapIndex) nodeIds.add(mapItemId);
	}
	return nodeIds;
});

// 创建 mapItemId -> PropertyInfo 的映射，用于快速查找实时数据
const propertyMap = computed(() => {
	const map = new Map<string, PropertyInfo>();
	for (const prop of properties) {
		// 通过 mapDataStore 找到对应的 mapItemId
		const mapItem = mapDataStore.mapItems.find((item) => item.property?.id === prop.id);
		if (mapItem) {
			map.set(mapItem.id, prop);
		}
	}
	return map;
});

const mapBounds = computed(() => {
	const items = mapDataStore.mapItems;
	if (!items.length) return { minX: 0, maxX: 0, minY: 0, maxY: 0, width: 0, height: 0 };

	const xs = items.map((i) => i.x);
	const ys = items.map((i) => i.y);
	const minX = Math.min(...xs);
	const maxX = Math.max(...xs);
	const minY = Math.min(...ys);
	const maxY = Math.max(...ys);

	return {
		minX,
		maxX,
		minY,
		maxY,
		width: maxX - minX + 1,
		height: maxY - minY + 1,
	};
});

const gridStyle = computed(() => {
	const { width, height } = mapBounds.value;
	const size = width > 12 || height > 12 ? "2.2rem" : "3rem";

	return {
		gridTemplateColumns: `repeat(${width}, ${size})`,
		gridTemplateRows: `repeat(${height}, ${size})`,
	};
});

type MapItemWithContext = MapItem & {
	players: PlayerInfo[];
	normalizedX: number;
	normalizedY: number;
	isDisabled: boolean;
	property?: PropertyInfo;
};

const processedMapItems = computed<MapItemWithContext[]>(() => {
	const rawItems = toRaw(mapDataStore.mapItems);
	if (!rawItems.length) return [];

	const { minX, minY } = mapBounds.value;
	const propMap = propertyMap.value;

	return rawItems.map((item) => {
		const newItem = { ...item } as MapItemWithContext;

		newItem.normalizedX = item.x - minX;
		newItem.normalizedY = item.y - minY;

		newItem.isDisabled = !props.highLightList.includes(item.id);
		newItem.players = [];

		// 使用实时数据：从 propertyMap 获取最新的 PropertyInfo（包含 owner）
		const liveProperty = propMap.get(item.id);
		if (liveProperty) {
			newItem.property = { ...liveProperty };
		} else if (item.property) {
			newItem.property = { ...item.property };
		}

		// 绑定玩家位置
		for (const player of playerList) {
			const playerMapItemId = player.positionMapItemId ?? mapDataStore.mapIndex[player.positionIndex];
			if (item.id === playerMapItemId) {
				newItem.players.push(player);
			}
		}

		return newItem;
	});
});

function handleMapItemClick(item: MapItemWithContext) {
	if (item.isDisabled) return;
	emits("update:selectedId", item.id);
}
</script>

<template>
	<div class="mini-map-wrapper">
		<div class="mini-map-container" :style="gridStyle">
			<div
				v-for="mapItem in processedMapItems"
				:key="mapItem.id"
				class="map-item"
				@click="handleMapItemClick(mapItem)"
				:class="{
					'is-disabled': mapItem.isDisabled,
					'is-highlight': !mapItem.isDisabled,
					'is-selected': props.selectedId === mapItem.id,
					'is-road': mapPathNodeIds.has(mapItem.id),
					'has-owner': !!mapItem.property?.owner,
				}"
				:style="{
					gridColumnStart: mapItem.normalizedX + 1,
					gridRowStart: mapItem.normalizedY + 1,
					...(mapItem.property?.owner
						? { backgroundColor: mapItem.property.owner.color, color: '#fff' }
						: { color: '#ccc' }),
				}"
			>
				<span class="owner-initial" v-if="mapItem.property?.owner && mapItem.property.owner.username">
					{{ mapItem.property.owner.username[0] }}
				</span>
			</div>

			<!-- 玩家图标单独渲染层，不受 is-disabled 影响 -->
			<div
				v-for="mapItem in processedMapItems"
				:key="'player-' + mapItem.id"
				class="player-placeholder"
				:style="{
					gridColumnStart: mapItem.normalizedX + 1,
					gridRowStart: mapItem.normalizedY + 1,
				}"
			>
				<div
					v-for="(player, index) in mapItem.players"
					:key="player.id"
					class="player-block"
					@click.stop="handleMapItemClick(mapItem)"
					:style="{
						backgroundColor: player.user.color,
						transform: mapItem.players.length > 1 ? `translate(calc(-50% + ${index * 4 - 2}px), calc(-50% + ${index * 4 - 2}px))` : 'translate(-50%, -50%)',
						zIndex: 10 + index,
					}"
				>
					{{ player.user.username[0] }}
				</div>
			</div>
		</div>
	</div>
</template>

<style lang="scss" scoped>
.mini-map-wrapper {
	width: 100%;
	height: 100%;
	overflow: auto;
	display: flex;
	justify-content: center;
	align-items: center;
	background-color: #3b3b3b;
	border-radius: 0.8rem;
	padding: 1rem;
}

.mini-map-container {
	display: grid;
	gap: 0.25rem;
}

.player-placeholder {
	width: 100%;
	height: 100%;
	position: relative;
	pointer-events: none;

	.player-block {
		position: absolute;
		pointer-events: auto;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		width: 70%;
		height: 70%;
		border-radius: 50%;
		display: flex;
		justify-content: center;
		align-items: center;
		color: white;
		font-size: 0.6rem;

		border: 0.0938rem solid rgba(255, 255, 255, 0.8);
		box-shadow: 0 0.125rem 0.25rem rgba(0, 0, 0, 0.6);
	}
}

.map-item {
	width: 100%;
	height: 100%;
	border-radius: 15%;
	background-color: #414141;
	box-sizing: border-box;
	display: flex;
	justify-content: center;
	align-items: center;
	font-size: 0.9rem;
	position: relative;
	transition: transform 0.2s;

	border: 0.125rem solid transparent;

	&.is-road {
		background-color: #5a5a5a;
	}

	&.is-disabled {
		opacity: 0.3;
		cursor: not-allowed;
		filter: grayscale(100%);
	}

	&.has-owner {
		// 背景色由内联样式设置（拥有者颜色）
	}

	&.is-highlight:not(.has-owner) {
		cursor: pointer;
		background-color: #fff;
		border-color: #fff;
		color: #333 !important;
		font-weight: bold;
		animation: pulse 1.5s infinite alternate;

		&:hover {
			transform: scale(1.1);
			z-index: 50;
			box-shadow: 0 0.25rem 0.75rem rgba(0, 0, 0, 0.3);
		}
	}

	&.is-highlight.has-owner {
		cursor: pointer;
		font-weight: bold;
		animation: pulse 1.5s infinite alternate;

		&:hover {
			transform: scale(1.1);
			z-index: 50;
			box-shadow: 0 0.25rem 0.75rem rgba(0, 0, 0, 0.3);
		}
	}

	&.is-selected {
		z-index: 60;

		&::after {
			content: "";
			position: absolute;
			top: 50%;
			left: 50%;
			transform: translate(-50%, -50%);
			width: 120%;
			height: 120%;
			border: 0.1875rem solid var(--fp-color-primary, #409eff);
			border-radius: 20%;
			pointer-events: none;
			animation: select-pulse 1s infinite alternate;
		}
	}

	.owner-initial {
		z-index: 1;
		font-weight: bold;
		text-shadow: 0 0.0625rem 0.125rem rgba(0, 0, 0, 0.5);
		font-size: 1rem;
	}
}

@keyframes pulse {
	from {
		transform: scale(1);
		opacity: 0.85;
	}
	to {
		transform: scale(1.05);
		opacity: 1;
	}
}

@keyframes select-pulse {
	from {
		transform: translate(-50%, -50%) scale(1);
	}
	to {
		transform: translate(-50%, -50%) scale(1.1);
	}
}
</style>
