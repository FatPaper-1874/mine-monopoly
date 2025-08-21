<script setup lang="ts">
import FpDialog from "@src/components/utils/fp-dialog/fp-dialog.vue";
import { ChanceCardInfo } from "@src/interfaces/game";
import { useGameInfo, useMapData } from "@src/store";
import { computed, onBeforeMount, onBeforeUnmount, onMounted, ref, watch } from "vue";
import ChanceCard from "@src/views/game/components/chance-card.vue";
import MiniMap from "./mini-map.vue";
import PropertyInfoCard from "@src/views/game/utils/components/property-info-card.vue";

const props = defineProps<{ chanceCard: ChanceCardInfo; onUseCard: Function; onCancel: Function }>();
const emit = defineEmits<{ (e: "useCard", targetId: string): void; (e: "cancel"): void }>();

const mapDataStore = useMapData();

const currentSelectedTargetId = ref("");

const currentSelectedProperty = computed(() => {
	const targetMapItem = mapDataStore.mapItemsList.find((i) => i.id === currentSelectedTargetId.value);
	if (!targetMapItem) return;
	const targetPropertyId = targetMapItem.property?.id;
	if (!targetPropertyId) return;
	const targetProperty = useGameInfo().propertiesList.find((p) => p.id === targetPropertyId);
	return targetProperty;
});

const tips = computed(() => {
	const targetMapItem = mapDataStore.mapItemsList.find((i) => i.id === currentSelectedTargetId.value);
	if (!targetMapItem) return "选择机会卡的目标（高亮的地方）";
	const targetProperty = targetMapItem.property;
	const targetPropertyName = targetProperty?.name;
	if (targetPropertyName) {
		return `要对地皮"${targetPropertyName}"使用机会卡吗`;
	} else {
		return "选择机会卡的目标（高亮的地方）";
	}
});

const containerEl = ref<HTMLElement | null>(null);
const highLightItemsId = computed(() => {
	return mapDataStore.mapItemsList
		.map((i) => {
			if (i.property) return i.id;
		})
		.filter((i) => i !== undefined);
});
function handleTargetSelected() {
	if (currentSelectedTargetId.value !== "") {
		const targetMapItem = mapDataStore.mapItemsList.find((i) => i.id === currentSelectedTargetId.value);
		if (!targetMapItem) return;
		const targetProperty = targetMapItem.property;
		if (!targetProperty) return;
		emit("useCard", targetProperty.id);
	} else emit("cancel");
}

function handleCancel() {
	emit("cancel");
}
</script>

<template>
	<FpDialog visible @submit="handleTargetSelected" @cancel="handleCancel">
		<template #title> 使用机会卡: {{ chanceCard.name }} </template>
		<div ref="containerEl" class="target-selector-container">
			<div class="chance-card-container">
				<ChanceCard id="chance-card" :chance-card="chanceCard" :disable="false" />
			</div>
			<div v-if="currentSelectedProperty" class="preview">
				<PropertyInfoCard :property="currentSelectedProperty"></PropertyInfoCard>
			</div>
			<div class="target-container">
				<div class="tips">{{ tips }}</div>
				<MiniMap :high-light-list="highLightItemsId" v-model:selected-id="currentSelectedTargetId" />
			</div>
		</div>
	</FpDialog>
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
