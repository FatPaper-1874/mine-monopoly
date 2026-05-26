<script setup lang="ts">
import { useEditorStore, useMapDataStore, useResourceStore } from "@src/stores";
import { computed, onMounted, ref, watch } from "vue";
import { ModelPreviewerRenderer } from "@src/utils/three/ModelPreviewerRenderer";
import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";
import itemTypeCreator from "./item-type-creator.vue";
import { eventBus } from "@src/utils/event-bus";
import { Modal, Select, message } from "ant-design-vue";
import { h } from "vue";

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

const currentMapItemType = computed(() => editorStore.currentMapItemTypeId);

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
const showAllTypesVisible = ref(false);

const allTypesColumns = [
	{
		title: "颜色",
		dataIndex: "color",
		width: 60,
		customRender: ({ record }: { record: any }) => {
			return h("div", {
				style: {
					width: "24px",
					height: "24px",
					backgroundColor: record.color,
					borderRadius: "4px",
					border: "1px solid #d9d9d9"
				}
			});
		}
	},
	{ title: "名称", dataIndex: "name", width: 100 },
	{ title: "ID", dataIndex: "id", width: 180 },
];

function handleMapItemTypeSelected(id: string | undefined) {
	editorStore.currentMapItemTypeId = id || "";
	eventBus.emit("map-item-type-selected", id);
	selectRef.value && selectRef.value.blur();
}

function handleDeleteMapItemType() {
	Modal.confirm({
		title: "删除物块类型",
		content: "删除这个物块类型会导致基于这个类型的MapItem也一并删除",
		closable: true,
		onOk: () => {
			if (!currentMapItemType.value) return;
			useMapDataStore().removeMapItemType(currentMapItemType.value);
			editorStore.currentMapItemTypeId = undefined;
			eventBus.emit("map-item-type-selected", undefined);
		},
		okText: "确定",
		cancelText: "取消",
	});
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
						<span :style="{ color: mapItemType.color }">{{ mapItemType.name }}</span>
					</a-select-option>
				</a-select>
			</a-space>
			<a-button @click="showAllTypesVisible = true" size="small" style="width: 100%">查看所有类型</a-button>
			<div id="item-type-model-preview-canvas-container"></div>
			<a-button @click="handleDeleteMapItemType" v-if="currentMapItemType" style="width: 100%" type="primary" danger
				>删除这个物块类型</a-button
			>
		</a-space>
	</a-card>
	<item-type-creator v-model="createFormVisible" />

	<a-modal
		title="所有物块类型"
		v-model:open="showAllTypesVisible"
		:footer="null"
		width="500px"
	>
		<a-table
			:columns="allTypesColumns"
			:dataSource="mapItemTypes"
			:pagination="{ pageSize: 10 }"
			size="small"
			:scroll="{ y: 400 }"
		>
		</a-table>
	</a-modal>
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
