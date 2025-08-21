<script setup lang="ts">
import { useEditorStore, useMapDataStore } from "@src/stores";
import { message, Select } from "ant-design-vue";
import { computed, ref, watch } from "vue";

const selectRef = ref<typeof Select | null>(null);
const currentMapItem = computed(() => useEditorStore().currentMapItem);
const currentMapItemId = computed(() => useEditorStore().currentMapItemId);
const selectedMapEventId = ref(currentMapItem.value?.mapEventId || "");
const mapEvents = computed(() => useMapDataStore().mapEvents);

watch(currentMapItem, (newMapItem) => {
	selectedMapEventId.value = newMapItem?.mapEventId || "";
});

function handleMapEventAdd() {
	if (currentMapItemId.value) {
		try {
			useMapDataStore().linkMapEvent(currentMapItemId.value, selectedMapEventId.value);
			message.success(selectedMapEventId.value ? `绑定事件成功` : `解除绑定成功`);
		} catch (e: any) {
			message.error(e.message);
		}
	}
}
</script>

<template>
	<a-card :bodyStyle="{ padding: '10px' }" :title="null" class="map-event-selector">
		<h4>绑定地图事件</h4>
		<div class="form-conatiner">
			<a-space>
				<a-select allowClear ref="selectRef" v-model:value="selectedMapEventId" style="width: 160px">
					<a-select-option v-for="mapEvent in mapEvents" :value="mapEvent.id">
						<span>{{ mapEvent.name }}</span>
					</a-select-option>
				</a-select>
				<a-button @click="handleMapEventAdd" type="primary">绑定</a-button>
			</a-space>
		</div>
	</a-card>
</template>

<style lang="scss" scoped>
.map-event-selector {
	h4 {
		margin-bottom: 10px;
	}
}
</style>
