<script setup lang="ts">
import { useGameData, useMapData } from "@src/store/game";
import { computed, onBeforeMount, onBeforeUnmount, onMounted, ref, watch } from "vue";
import ChanceCard from "@src/views/game/components/chance-card.vue";
import MiniMap from "./mini-map.vue";
import PropertyInfoCard from "@src/views/game/utils/components/property-info-card.vue";

const emits = defineEmits(["targetSelected"]);

const mapDataStore = useMapData();

const currentSelectedTargetId = ref("");

watch(currentSelectedTargetId, (newValue) => {
	const targetMapItem = mapDataStore.mapItems.find((i) => i.id === newValue);
	if (!targetMapItem) return;
	const targetPropertyId = targetMapItem.property?.id;
	emits("targetSelected", [targetPropertyId]);
});

const currentSelectedProperty = computed(() => {
	const targetMapItem = mapDataStore.mapItems.find((i) => i.id === currentSelectedTargetId.value);
	if (!targetMapItem) return;
	const targetPropertyId = targetMapItem.property?.id;
	if (!targetPropertyId) return;
	const targetProperty = useGameData().propertiesList.find((p) => p.id === targetPropertyId);
	return targetProperty;
});

const containerEl = ref<HTMLElement | null>(null);
const highLightItemsId = computed(() => {
	return mapDataStore.mapItems
		.map((i) => {
			if (i.property) return i.id;
		})
		.filter((i) => i !== undefined);
});
</script>

<template>
	<div ref="containerEl" class="target-selector-container">
		<div class="target-container">
			<MiniMap :high-light-list="highLightItemsId" v-model:selected-id="currentSelectedTargetId" />
		</div>
		<div v-if="currentSelectedProperty" class="preview">
			<PropertyInfoCard :property="currentSelectedProperty" />
		</div>
	</div>
</template>

<style lang="scss" scoped>
.target-selector-container {
	display: flex;
	justify-content: space-between;
	align-items: center;

	& > .chance-card-container {
		padding: 4rem 2rem;

		& > #chance-card {
			scale: 1.2;
		}
	}

	& > .preview {
		margin: 2rem;
	}

	& > .target-container {
		flex: 1;

		& > .tips {
			color: var(--color-primary);
			text-align: center;
			margin-bottom: 1rem;
		}
	}
}
</style>
