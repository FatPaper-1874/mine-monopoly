<script setup lang="ts">
import { computed, ref } from "vue";
import { __PROTOCOL__ } from "@src/../global.config";
import { MapEvent } from "@fatpaper-monopoly/types";
import { useResourceStore } from "@src/store/game";

const props = defineProps<{ mapEvent: MapEvent | null }>();

const arrivedEvent = ref<MapEvent | null>(props.mapEvent);

function updateArrivedEvent(newArrivedEvent: MapEvent) {
	arrivedEvent.value = newArrivedEvent;
}

defineExpose({ updateArrivedEvent });

const iconUrl = computed(() => {
	if (!arrivedEvent.value) return "qwe";
	return useResourceStore().getRecourceById(arrivedEvent.value.iconId)?.url || "asd";
});
</script>

<template>
	<div class="arrived-event-info felt-card" v-if="arrivedEvent">
		<div class="info">
			<img :src="iconUrl" alt="" />
			<span>{{ arrivedEvent.name }}</span>
		</div>
		<div class="description">
			{{ arrivedEvent.description }}
		</div>
	</div>
</template>

<style scoped lang="scss">
.arrived-event-info {
	display: flex;
	flex-direction: column;
	justify-content: space-around;
	align-items: center;

	.info {
		display: flex;
		justify-content: center;
		align-items: center;
		box-shadow: var(--el-box-shadow);
		font-size: 1.2rem;
		font-weight: bold;
		border-radius: 8px;
		color: var(--color-primary);
		margin-bottom: 0.6rem;
		text-shadow: #fff -1px 0 0, #fff 1px 0 0, #fff 0 1px 0, #fff 0 -1px 0;

		$icon_size: 1.6em;

		img {
			width: $icon_size;
			height: $icon_size;
			margin-right: 0.3rem;
		}
	}

	.description {
		color: #2b2b2b;
		text-shadow: #fff -1px 0 0, #fff 1px 0 0, #fff 0 1px 0, #fff 0 -1px 0;
	}
}
</style>
