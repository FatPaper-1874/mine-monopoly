<script setup lang="ts">
import { useEditorStore, useMapDataStore, useResourceStore } from "@src/stores";
import { computed, onMounted, ref, watch } from "vue";
import { ModelPreviewerRenderer } from "@src/utils/three/ModelPreviewerRenderer";
import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";
import itemTypeCreator from "./item-type-creator.vue";
import { eventBus } from "@src/utils/event-bus";
import { Select, message } from 'ant-design-vue';

const mapDataStroe = useMapDataStore();
const editorStore = useEditorStore();
const resourcesStore = useResourceStore();

const selectRef = ref<typeof Select | null>(null);

const mapItemTypes = computed(() => mapDataStroe.mapItemTypes);

let modelPreviewerRenderer: ModelPreviewerRenderer | null = null;

onMounted(() => {
	const containerEl = document.getElementById("item-type-model-preview-canvas-container") as HTMLDivElement;
	modelPreviewerRenderer = new ModelPreviewerRenderer(containerEl);
});

watch(
	() => editorStore.currentMapItemTypeId,
	(newId) => {
		const currentType = mapItemTypes.value.find((type) => type.id === newId);
		if (modelPreviewerRenderer) {
			if (currentType) {
				const model = resourcesStore.findModelById(currentType.modelId);
				if (model) modelPreviewerRenderer.loadModel(model.url, true);
			} else {
				modelPreviewerRenderer.clear();
			}
		}
	}
);

const createFormVisible = ref(false);

function handleMapItemTypeSelected(id: string | undefined) {
	useEditorStore().currentMapItemTypeId = id || "";
	eventBus.emit("map-item-type-selected", id);
	selectRef.value && selectRef.value.blur();
}
</script>

<template>
	<a-card :bodyStyle="{ padding: '10px' }">
		<a-space direction="vertical">
			<span class="title">创建/选择一个物块类型编辑地图</span>
			<a-alert banner type="info">
				<template #message>
					<span class="title" style="font-size: 0.8em">“R”键旋转 “Q”键取消选中物块类型</span>
				</template>
			</a-alert>
			<a-space align="center">
				<a-button @click="createFormVisible = true" type="primary">
					<font-awesome-icon :icon="['fas', 'plus']" />
				</a-button>
				<a-select
					@change="handleMapItemTypeSelected"
					allowClear
					ref="selectRef"
					v-model:value="editorStore.currentMapItemTypeId"
					style="width: 160px"
				>
					<a-select-option v-for="mapItemType in mapItemTypes" :value="mapItemType.id">
						<span :style="mapItemType.color">{{ mapItemType.name }}</span>
					</a-select-option>
				</a-select>
			</a-space>
			<div id="item-type-model-preview-canvas-container"></div>
		</a-space>
	</a-card>
	<item-type-creator v-model="createFormVisible" />
</template>

<style lang="scss" scoped>
.title {
	font-size: 0.9em;
	color: #555555;
	width: 100%;
	display: block;
	text-align: center;
}
#item-type-model-preview-canvas-container {
	width: 100%;
	height: 160px;
	border-radius: 5px;
	overflow: hidden;
}
</style>
