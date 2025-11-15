<script setup lang="ts">
import { ref, computed, watch } from "vue";
import { PropertyInfo } from "@fatpaper-monopoly/types";

const props = defineProps<{ property: PropertyInfo | null }>();

const _property = ref<PropertyInfo | null>(props.property);

watch(
	() => props.property,
	(newProperty) => {
		updateProperty(newProperty);
	}
);

const _playerNameColor = computed(() => {
	if (_property.value && _property.value.owner) {
		return _property.value.owner.color;
	} else {
		return "var(--color-primary)";
	}
});

function updateProperty(newProperty: PropertyInfo | null) {
	_property.value = newProperty;
}

defineExpose({ updateProperty });
</script>

<template>
	<div
		class="property-info"
		:style="{
			border: `0.2rem solid ${_playerNameColor}`,
		}"
		v-if="_property"
	>
		<div class="name">
			<span class="data">{{ _property.name }}</span>
		</div>

		<div class="buildingLevel">
			<span class="label">当前建筑等级</span><span class="data level">LV {{ _property.level }}</span>
		</div>
		<div class="buildCost">
			<span class="label">升级费用</span><span class="data">{{ _property.buildCost }}</span>
		</div>
		<div class="sellCost">
			<span class="label">空地价格</span><span class="data">{{ _property.sellCost }}</span>
		</div>
		<div class="cost_item" v-for="(cost, index) in _property.costList">
			<span class="label">LV{{ index }} 过路费</span><span class="data">{{ cost }}</span>
		</div>
		<div class="owner">
			<span class="label">拥有人</span
			><span class="data" :style="{ color: _playerNameColor }">{{
				_property.owner ? _property.owner.username : "无"
			}}</span>
		</div>
	</div>
</template>

<style lang="scss" scoped>
.property-info {
	min-width: 15rem;
	display: flex;
	flex-direction: column;
	justify-content: space-around;
	align-items: center;
	padding: 0.6rem 0.4rem;
	background-color: rgba(255, 255, 255, 0.75);
	border-radius: 0.8rem;

	& > .name > .data {
		text-align: center;
		font-size: 1.2rem;
		color: var(--color-primary);
	}

	& > div {
		display: flex;
		justify-content: space-between;
		align-items: center;
		font-size: 0.8rem;
		width: 70%;
		margin-bottom: 0.6rem;
		text-shadow: #fff -1px 0 0, #fff 1px 0 0, #fff 0 1px 0, #fff 0 -1px 0;

		& > .label {
			flex: 1;
			text-align: center;
			white-space: nowrap;
		}

		& > .data {
			flex: 1;
			text-align: center;
			color: var(--color-second);

			&.level {
				color: #1947e0;
			}
			// text-shadow: var(--text-shadow);
		}
	}
}
</style>
