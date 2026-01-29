<script setup lang="ts">
import { PropertyInfo } from "@mine-monopoly/types";
import UiRenderer from "@src/components/utils/ui-renderer/ui-renderer.vue";
import { useMapData } from "@src/store/game";

const { property } = defineProps<{ property: PropertyInfo | null }>();

function getUiTemplateById(id: string) {
	return (
		useMapData().getUITempolateById(id)?.template || { id: "404", type: "text", content: `找不到ID为: ${id} 的UI组件` }
	);
}
</script>

<template>
	<div class="property-info" v-if="property">
		<template v-if="property.customUI">
			<UiRenderer :schema="getUiTemplateById(property.customUI)" :context="{ property }" />
		</template>
		<template v-else>
			<div class="name">
				<span class="data">{{ property.name }}</span>
			</div>

			<div class="buildingLevel">
				<span class="label">当前建筑等级</span><span class="data">LV {{ property.level }}</span>
			</div>
			<div class="buildCost">
				<span class="label">升级费用</span><span class="data">{{ property.buildCost }}</span>
			</div>
			<div class="sellCost">
				<span class="label">空地价格</span><span class="data">{{ property.sellCost }}</span>
			</div>
			<div class="cost_item" v-for="(cost, index) in property.costList">
				<span class="label">LV{{ index }} 过路费</span><span class="data">{{ cost }}</span>
			</div>
		</template>
	</div>
</template>

<style lang="scss" scoped>
.property-info {
	width: 100%;
	display: flex;
	flex-direction: column;
	justify-content: space-around;
	align-items: center;

	& > .name > .data {
		text-align: center;
		font-size: 1.5rem;
		color: var(--color-primary);
	}

	& > div {
		display: flex;
		justify-content: space-between;
		align-items: center;
		font-size: 1.1rem;
		width: 70%;
		margin-bottom: 1rem;

		& > .label {
			flex: 1;
			text-align: center;
		}

		& > .data {
			flex: 1;
			text-align: center;
			color: var(--color-second);
			text-shadow: var(--text-shadow);
		}
	}
}
</style>
