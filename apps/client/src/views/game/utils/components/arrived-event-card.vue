<script setup lang="ts">
import { ArrivedEvent, PropertyInfo } from "@src/interfaces/game";
import { ref } from "vue";
import { __PROTOCOL__ } from "@src/../global.config";

const props = defineProps<{ arrivedEvent: ArrivedEvent | null }>();

const arrivedEvent = ref<ArrivedEvent | null>(props.arrivedEvent);

function updateArrivedEvent(newArrivedEvent: ArrivedEvent) {
	arrivedEvent.value = newArrivedEvent;
}

defineExpose({ updateArrivedEvent });
</script>

<template>
	<div class="arrived-event-info" v-if="arrivedEvent">
		<div class="info">
			<img :src="`${__PROTOCOL__}://${arrivedEvent.iconUrl}`" alt="" />
			<span>{{ arrivedEvent.name }}</span>
		</div>
		<div class="describe">
			{{ arrivedEvent.describe }}
		</div>
	</div>
</template>

<style scoped lang="scss">
.arrived-event-info {
	display: flex;
	flex-direction: column;
	justify-content: space-around;
	align-items: center;
	padding: 0.6rem;
	background-color: rgba(255, 255, 255, 0.65);
	border-radius: 0.8rem;
	border: 0.2rem solid var(--color-primary);

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

	.describe {
		color: #2b2b2b;
		text-shadow: #fff -1px 0 0, #fff 1px 0 0, #fff 0 1px 0, #fff 0 -1px 0;
	}
}
</style>
