<script setup lang="ts">
import { ResourcesType, useResourceStore } from "@src/stores";
import { eventBus } from "@src/utils/event-bus";
import { ModelPreviewerRenderer } from "@src/utils/three/ModelPreviewerRenderer";
import { message } from "ant-design-vue";
import { onBeforeUnmount, onMounted, onUpdated, watch } from "vue";

const props = defineProps<{ model: ResourcesType }>();
// 1. 定义事件
const emit = defineEmits<{ (e: "edit", id: string): void; (e: "delete", id: string): void }>();

let modelPreviewer: ModelPreviewerRenderer | null;

onMounted(loadModel);

eventBus.on("change-model", (modelId: string) => {
	if (modelId === props.model.id) {
		loadModel();
	}
});

function loadModel() {
	if (!modelPreviewer) {
		const canvasContainer = document.querySelector(`#${props.model.id}`) as HTMLDivElement;
		modelPreviewer = new ModelPreviewerRenderer(canvasContainer);
	}
	modelPreviewer.loadModel(props.model.url, true);
}

watch(
	() => props.model.url,
	async (newUrl) => {
		if (modelPreviewer && newUrl) {
			await modelPreviewer.loadModel(newUrl, true);
		}
	}
);

onBeforeUnmount(() => {
	modelPreviewer?.destroy();
	modelPreviewer = null;
});
</script>

<template>
	<a-card class="model-previewer" size="small" :title="props.model.name" :bodyStyle="{ flex: '1' }">
		<template #extra>
			<a-button size="small" type="link" primary @click="emit('edit', props.model.id)">编辑</a-button>
			<a-popconfirm
				title="你确定删除这个模型吗, 和它相关的MapItem会一并删除"
				ok-text="确定"
				cancel-text="取消"
				@confirm="emit('delete', props.model.id)"
			>
				<a-button size="small" type="link" danger>删除</a-button>
			</a-popconfirm>
		</template>
		<div :id="props.model.id" class="model-preview-canvas-container"></div>
	</a-card>
</template>

<style lang="scss" scoped>
.model-previewer {
	display: flex;
	flex-direction: column;
}
.model-preview-canvas-container {
	width: 100%;
	height: 100%;
	border-radius: 5px;
	background-color: #f3f3f3;
	overflow: hidden;
}
</style>
