<script setup lang="ts">
import { MapEvent } from "@fatpaper-monopoly/types";
import { useMapDataStore } from "@src/stores";
import { computed, ref } from "vue";
import MapEventForm from "./forms/map-event-form/index.vue";
import mapEventCard from "./components/map-event-card.vue";

const model = defineModel({ default: false });

const mapDataStroe = useMapDataStore();

const mapEventCount = computed(() => mapDataStroe.mapEvents.length);
const mapEventToShow = computed(() => {
	return mapDataStroe.mapEvents.slice((currentPage.value - 1) * pageSize.value, currentPage.value * pageSize.value);
});

const currentPage = ref(1);
const pageSize = ref(6);

const createMapEventFormVisible = ref(false);
const currentMapEvent = ref<MapEvent | undefined>(undefined);

function handleAdd() {
	currentMapEvent.value = undefined;
	createMapEventFormVisible.value = true;
}

function handleEdit(id: string) {
	currentMapEvent.value = mapDataStroe.mapEvents.find((s) => s.id === id);
	createMapEventFormVisible.value = true;
}

function handleDelete(id: string) {
	mapDataStroe.reomveMapEvent(id);
}
</script>

<template>
	<a-modal
		destroyOnClose
		wrap-class-name="event-manager-container"
		width="100%"
		v-model:open="model"
		:footer="null"
		title="地图事件管理"
	>
		<div class="operation-container">
			<a-button style="float: right" @click="handleAdd" type="primary">新建地图事件</a-button>
		</div>

		<a-empty v-if="mapEventCount === 0" description="没有数据" />
		<div class="preview-container">
			<map-event-card
				@edit="handleEdit"
				@delete="handleDelete"
				v-for="mapEvent in mapEventToShow"
				:map-event="mapEvent"
			/>
		</div>
		<a-pagination
			v-model:current="currentPage"
			:show-total="() => `${mapEventCount} 个地图事件`"
			:total="mapEventCount"
			:pageSize="pageSize"
			show-less-items
		/>
	</a-modal>
	<a-modal
		width="100%"
		destroyOnClose
		title="编辑地图事件"
		:footer="null"
		v-model:open="createMapEventFormVisible"
		centered
	>
		<map-event-form @close="createMapEventFormVisible = false" :map-event="currentMapEvent" />
	</a-modal>
</template>

<style lang="scss">
.event-manager-container {
	.ant-modal {
		max-width: 96vw;
		top: 10vh;
		left: 2vw;
		padding-bottom: 0;
		margin: 0;
	}
	.ant-modal-content {
		display: flex;
		flex-direction: column;
		height: calc(85vh);
	}
	.ant-modal-body {
		flex: 1;
		display: flex;
		flex-direction: column;
	}

	.preview-container {
		flex: 1;
		display: grid;
		grid-template-columns: repeat(3, 1fr); /* 3列，等宽 */
		grid-template-rows: repeat(2, 1fr); /* 2行，等高 */
		gap: 20px; /* 网格间隙 */
		padding: 10px;
	}
}
</style>
