<script setup lang="ts">
import { ResourcesType } from "@src/stores";
import { ModelPreviewerRenderer } from "@src/utils/three/ModelPreviewerRenderer";
import { onBeforeUnmount, onMounted, watch } from "vue";

const props = defineProps<{ model: ResourcesType }>();

let modelPreviewer: ModelPreviewerRenderer | null;

onMounted(() => {
	if (!modelPreviewer) {
		const canvasContainer = document.querySelector(`#${props.model.id}`) as HTMLDivElement;
		modelPreviewer = new ModelPreviewerRenderer(canvasContainer);
	}
	modelPreviewer.loadModel(props.model.url, true);
});

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
			<a-button size="small" type="link" primary>编辑</a-button>
			<a-button size="small" type="link" danger>删除</a-button>
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
