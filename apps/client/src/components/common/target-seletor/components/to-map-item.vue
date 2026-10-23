<script setup lang="ts">
import { computed, inject, ref, type Ref } from "vue";
import { useMapData } from "@src/store/game";
import MiniMap from "./mini-map.vue";

const selectedTargetIdList = inject<Ref<string[]>>("targetIdList", ref<string[]>([]));
const mapDataStore = useMapData();

/** 机会卡目标只允许选择路径图中的节点。旧地图由 mapIndex 兼容生成节点集合。 */
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

const highLightMapItemIds = computed(() => [...mapPathNodeIds.value]);

const currentSelectedMapId = computed({
	get: () => selectedTargetIdList.value[0] || "",
	set: (mapItemId: string) => {
		if (mapPathNodeIds.value.has(mapItemId)) {
			selectedTargetIdList.value = [mapItemId];
		}
	},
});
</script>

<template>
	<div class="target-selector-container">
		<div class="tips">请在地图上选择目标地图格</div>
		<MiniMap :high-light-list="highLightMapItemIds" v-model:selected-id="currentSelectedMapId" />
	</div>
</template>

<style lang="scss" scoped>
.target-selector-container {
	display: flex;
	flex-direction: column;
	align-items: center;
	padding: 1rem;
	min-height: 28.125rem;

	.tips {
		color: var(--fp-color-primary);
		text-align: center;
		margin-bottom: 1rem;
		font-size: 1.1rem;
	}
}
</style>
