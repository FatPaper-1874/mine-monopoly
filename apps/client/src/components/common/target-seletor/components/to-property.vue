<script setup lang="ts">
import { computed, inject, Ref, ref } from "vue";
import { useGameData, useMapData } from "@src/store/game";
import MiniMap from "./mini-map.vue";
import PropertyInfoCard from "@src/views/game/utils/components/property-info-card.vue";

const selectedTargetIdList = inject<Ref<string[]>>("targetIdList", ref<string[]>([]));

const mapDataStore = useMapData();
const gameDataStore = useGameData();
const highLightMapItemIds = computed(() => {
	return mapDataStore.mapItems.filter((item) => item.property).map((item) => item.id);
});

const currentSelectedMapId = computed({
	get: () => {
		if (!selectedTargetIdList.value || !selectedTargetIdList.value.length) return "";

		const targetPropId = selectedTargetIdList.value[0];

		const mapItem = mapDataStore.mapItems.find((item) => item.property?.id === targetPropId);
		return mapItem ? mapItem.id : "";
	},

	set: (newMapItemId: string) => {
		const mapItem = mapDataStore.mapItems.find((i) => i.id === newMapItemId);
		if (mapItem && mapItem.property) {
			selectedTargetIdList.value = [mapItem.property.id];
		}
	},
});

const currentSelectedProperty = computed(() => {
	if (!selectedTargetIdList.value || !selectedTargetIdList.value.length) return null;
	const pid = selectedTargetIdList.value[0];
	return gameDataStore.properties.find((p) => p.id === pid);
});
</script>

<template>
	<div class="target-selector-container">
		<div class="target-container">
			<div class="tips">请在地图上选择目标地皮</div>

			<MiniMap :high-light-list="highLightMapItemIds" v-model:selected-id="currentSelectedMapId" />
		</div>

		<div class="preview-container">
			<div v-if="currentSelectedProperty" class="preview-content">
				<div class="preview-title">已选地皮详情</div>
				<PropertyInfoCard :property="currentSelectedProperty" />
			</div>

			<div v-else class="preview-placeholder">
				<div class="text">
					点击左侧
					<span class="highlight-text">高亮格子</span>
					查看详情
				</div>
			</div>
		</div>
	</div>
</template>

<style lang="scss" scoped>
.target-selector-container {
	display: flex;
	justify-content: space-between;
	align-items: flex-start;
	gap: 2rem;
	padding: 1rem;
	min-height: 450px;

	.target-container {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;

		.tips {
			color: var(--color-primary);
			text-align: center;
			margin-bottom: 1rem;
			font-size: 1.1rem;
		}
	}

	.preview-container {
		width: 320px;
		min-height: 400px;
		display: flex;
		flex-direction: column;
		border-left: 2px dashed #e0e0e0;
		padding-left: 2rem;
		margin-top: 2.5rem;

		// 选中状态内容
		.preview-content {
			display: flex;
			flex-direction: column;
			align-items: center;
			animation: fade-in 0.3s ease-out;

			.preview-title {
				margin-bottom: 1rem;
				color: #666;
				font-size: 0.9rem;
			}
		}

		.preview-placeholder {
			flex: 1;
			display: flex;
			justify-content: center;
			align-items: center;
			color: #ccc;

			.text {
				text-align: center;
				line-height: 1.6;
				font-size: 1.1rem;

				.highlight-text {
					color: var(--color-primary);
				}
			}
		}
	}
}

@keyframes fade-in {
	from {
		opacity: 0;
		transform: translateY(10px);
	}
	to {
		opacity: 1;
		transform: translateY(0);
	}
}
</style>
