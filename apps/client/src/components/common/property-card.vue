<script setup lang="ts">
import { PropertyInfo } from "@fatpaper-monopoly/types";

const { property } = defineProps<{ property: PropertyInfo | null }>();
</script>

<template>
	<div class="property-info" v-if="property">
		<div class="name">
			<span class="data">{{ property.name }}</span>
		</div>

		<div class="buildingLevel">
			<span class="label">当前建筑等级</span
			><span class="data">LV {{ property.level }}</span>
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
