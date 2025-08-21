<script setup lang="ts">
import { handleNewModel } from "@src/utils/file";
import { ModelPreviewerRenderer } from "@src/utils/three/ModelPreviewerRenderer";
import { ref, reactive, onMounted, onUpdated } from "vue";

interface FormState {
	name: string;
	fileUrl: string;
}
const createModelFrom = reactive<FormState>({
	name: "",
	fileUrl: "",
});

const visible = defineModel({ default: false });
let modelPreviewer: ModelPreviewerRenderer | null;

function handleCreateModel() {
	handleNewModel(createModelFrom.fileUrl, createModelFrom.name);
	handleClose();
	visible.value = false;
}

async function handleAddModel() {
	const res = await window.electronAPI.showOpenDialog({
		filters: [{ name: "3D Model", extensions: ["gltf", "glb"] }],
		properties: ["openFile"],
	});
	if (res.filePaths.length > 0) {
		createModelFrom.fileUrl = res.filePaths[0];
		if (!modelPreviewer) {
			const canvasContainer = document.querySelector("#form-preview-canvas-container") as HTMLDivElement;
			modelPreviewer = new ModelPreviewerRenderer(canvasContainer);
		}
		await modelPreviewer.loadModel(createModelFrom.fileUrl, true);
	} else {
		createModelFrom.fileUrl = "";
	}
}

function handleClose() {
	createModelFrom.name = "";
	createModelFrom.fileUrl = "";
	modelPreviewer?.destroy();
	modelPreviewer = null;
}
</script>

<template>
	<a-modal destroyOnClose @cancel="handleClose" :footer="null" width="30%" v-model:open="visible" title="添加模型">
		<a-form @finish="handleCreateModel" :model="createModelFrom" name="basic" autocomplete="off">
			<a-form-item label="模型名称" name="name" :rules="[{ required: true, message: '请输入模型名称' }]">
				<a-input v-model:value="createModelFrom.name" />
			</a-form-item>

			<a-form-item label="模型地址" name="fileUrl" :rules="[{ required: true, message: '请选择模型' }]">
				<span class="model-url" v-if="createModelFrom.fileUrl">{{ createModelFrom.fileUrl }}</span>
				<div id="form-preview-canvas-container" class="model-preview-canvas-container"></div>
				<a-button @click="handleAddModel" type="primary">选择模型</a-button>
			</a-form-item>

			<a-form-item>
				<a-button style="float: right" type="primary" html-type="submit">添加</a-button>
			</a-form-item>
		</a-form>
	</a-modal>
</template>

<style lang="scss" scoped>
.model-url {
	display: block;
	margin-bottom: 10px;
	padding: 5px;
	border: 1px solid #ccc;
	border-radius: 5px;
	background-color: #f3f3f3;
}
.model-preview-canvas-container {
	display: block;
	margin-bottom: 10px;
	border-radius: 10px;
	width: 100%;
	height: 150px;
	border-radius: 5px;
	background-color: #f3f3f3;
	overflow: hidden;
}
</style>
