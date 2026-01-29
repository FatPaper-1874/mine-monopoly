<script setup lang="ts">
import { MapItem, PlayerInfo } from "@mine-monopoly/types";
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
const indexList = mapDataStore.mapIndex;

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
};

const processedMapItems = computed<MapItemWithContext[]>(() => {
	const rawItems = toRaw(mapDataStore.mapItems);
	if (!rawItems.length) return [];

	const { minX, minY } = mapBounds.value;

	return rawItems.map((item) => {
		const newItem = { ...item } as MapItemWithContext;

		newItem.normalizedX = item.x - minX;
		newItem.normalizedY = item.y - minY;

		newItem.isDisabled = !props.highLightList.includes(item.id);
		newItem.players = [];

		// 绑定地皮信息
		if (item.property) {
			const clonedProperty = { ...item.property };

			const liveProperty = properties.find((p) => p.id === item.property?.id);
			if (liveProperty && liveProperty.owner) {
				clonedProperty.owner = liveProperty.owner;
			}

			newItem.property = clonedProperty;
		}

		for (const player of playerList) {
			if (item.id === indexList[player.positionIndex]) {
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
					'is-road': indexList.includes(mapItem.id),
				}"
				:style="{
					gridColumnStart: mapItem.normalizedX + 1,
					gridRowStart: mapItem.normalizedY + 1,
					color: mapItem.property?.owner?.color || '#ccc',
				}"
			>
				<span class="owner-initial" v-if="mapItem.property?.owner">
					{{ mapItem.property.owner.username?.[0] || "" }}
				</span>

				<div
					v-for="(player, index) in mapItem.players"
					:key="player.id"
					class="player-block"
					:style="{
						backgroundColor: player.user.color,
						transform: mapItem.players.length > 1 ? `translate(${index * 4 - 2}px, ${index * 4 - 2}px)` : 'none',
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
	gap: 4px;
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

	// 【关键修改】默认无边框 (透明)，不再显示地皮颜色的边框
	border: 2px solid transparent;

	&.is-road {
		background-color: #5a5a5a;
	}

	&.is-disabled {
		opacity: 0.3;
		cursor: not-allowed;
		filter: grayscale(100%);
	}

	&.is-highlight {
		cursor: pointer;
		background-color: #fff;
		border-color: #fff;
		color: #333 !important;
		font-weight: bold;
		animation: pulse 1.5s infinite alternate;

		&:hover {
			transform: scale(1.1);
			z-index: 50;
			box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
		}
	}

	&.is-selected {
		z-index: 60;

		// 选中框：绝对居中
		&::after {
			content: "";
			position: absolute;
			top: 50%;
			left: 50%;
			transform: translate(-50%, -50%);
			width: 120%;
			height: 120%;
			border: 3px solid var(--color-primary, #409eff);
			border-radius: 20%;
			pointer-events: none;
			animation: select-pulse 1s infinite alternate;
		}
	}

	.owner-initial {
		z-index: 1;
		font-family: monospace;
		font-weight: bold;
		text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
	}

	.player-block {
		position: absolute;
		width: 60%;
		height: 60%;
		border-radius: 50%;
		display: flex;
		justify-content: center;
		align-items: center;
		color: white; // 玩家字母始终白色
		font-size: 0.6rem;
		font-weight: bold;

		border: 1.5px solid rgba(255, 255, 255, 0.8);
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.6);
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
