<script setup lang="ts">
import { ArrivedEvent } from "@/interfaces/interfaces";
import { onBeforeMount, ref } from "vue";
import {
	bindArrivedEventToMapItem,
	getArrivedEventList,
	unbindArrivedEventFromMapItem,
} from "@/utils/api/arrivedEvent";
import { __PROTOCOL__ } from "@G/global.config";

const props = defineProps<{ currentArrivedEvent: ArrivedEvent | undefined; currentMapItemId: string }>();
const emits = defineEmits(["bind-change"]);
const arrivedEventList = ref<ArrivedEvent[]>([]);
const selectedArrivedEventId = ref("");

onBeforeMount(async () => {
	const { arrivedEventsList: _arrivedEventList } = await getArrivedEventList(-1, 0);
	arrivedEventList.value = _arrivedEventList;
});

const handleBind = async () => {
	if (selectedArrivedEventId.value === "") return;
	await bindArrivedEventToMapItem(selectedArrivedEventId.value, props.currentMapItemId);
	emits("bind-change");
};

const handleUnBind = async () => {
	await unbindArrivedEventFromMapItem(props.currentMapItemId);
	emits("bind-change");
};
</script>

<template>
	<div class="arrived-event-selector">
		<div class="current-arrived-event-info">
			<div class="info-container" v-if="currentArrivedEvent">
				<div style="font-size: 0.9em; font-weight: bold" class="title">当前MapItem的到达事件：</div>
				<el-popover placement="left-start" :width="200" trigger="hover">
					<template #default>
						<div style="font-size: 0.9em; font-weight: bold; color: #000000">事件描述</div>
						<span>{{ currentArrivedEvent.describe }}</span>
					</template>
					<template #reference>
						<div class="info">
							<img
								style="width: 1.3em; height: 1.3em"
								:src="`${__PROTOCOL__}://${currentArrivedEvent.iconUrl}`"
								alt=""
							/>
							<span>{{ currentArrivedEvent.name }}</span>
						</div>
					</template>
				</el-popover>
				<el-button type="danger" @click="handleUnBind">解除事件绑定</el-button>
			</div>
			<div style="font-size: 0.9em; font-weight: bold" v-else>该MapItem没有绑定到达事件喔</div>
		</div>
		<div class="arrived-event-selector-form">
			<el-select
				class="selector"
				clearable
				v-model="selectedArrivedEventId"
				placeholder="选择到达事件"
				style="width: 240px"
			>
				<el-option
					v-for="arrivedEvent in arrivedEventList"
					:key="arrivedEvent.id"
					:label="arrivedEvent.name"
					:value="arrivedEvent.id"
				>
					<el-popover placement="left-start" :width="200" trigger="hover">
						<template #default>
							<div style="font-size: 0.9em; font-weight: bold; color: #000000">事件描述</div>
							<span>{{ arrivedEvent.describe }}</span>
						</template>
						<template #reference>
							<div class="options">
								<img style="width: 1.3em; height: 1.3em" :src="`${__PROTOCOL__}://${arrivedEvent.iconUrl}`" alt="" />
								<span style="margin-left: 10px">{{ arrivedEvent.name }}</span>
							</div>
						</template>
					</el-popover>
				</el-option>
			</el-select>
			<el-button :disabled="!selectedArrivedEventId" style="margin-left: 5px" type="primary" @click="handleBind"
				>绑定
			</el-button>
		</div>
	</div>
</template>

<style scoped lang="scss">
.arrived-event-selector {
	width: 100%;
	box-sizing: border-box;
	display: flex;
	flex-direction: column;
	justify-content: space-between;
	align-items: center;
	padding: 6px;
}

.current-arrived-event-info {
	width: 100%;
	margin-bottom: 6px;

	.info-container {
		display: flex;
		flex-direction: column;
		align-items: center;
	}

	.info {
		display: flex;
		justify-content: center;
		align-items: center;
		padding: 5px;
		margin: 10px;
		box-shadow: var(--el-box-shadow);
		border: solid 3px #7e7e7e;
		font-size: 1.5rem;
		font-weight: bold;
		border-radius: 8px;

		$icon_size: 1.4em;

		img {
			width: $icon_size;
			height: $icon_size;
		}

		span {
			margin-left: 5px;
		}
	}
}

.arrived-event-selector-form {
	.selector {
	}
}

.options {
	display: flex;
	align-items: center;
}
</style>
