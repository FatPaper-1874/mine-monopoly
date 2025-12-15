<script setup lang="ts">
import { addNewModel, updateExistingModel } from "@src/utils/file";
import { ModelPreviewerRenderer } from "@src/utils/three/ModelPreviewerRenderer";
import { reactive, watch, ref, nextTick } from "vue"; // 引入 watch, nextTick
import { useResourceStore } from "@src/stores"; // 引入 store 获取回显数据
import { message } from "ant-design-vue";

interface FormState {
	name: string;
	fileUrl: string;
}

// 接收一个可选的 editModelId，如果有值则是编辑模式
const props = defineProps<{
	editModelId?: string;
}>();

const createModelFrom = reactive<FormState>({
	name: "",
	fileUrl: "",
});

const visible = defineModel({ default: false });
let modelPreviewer: ModelPreviewerRenderer | null;
const resourceStore = useResourceStore();

// 监听弹窗打开，处理回显
watch(visible, async (isOpen) => {
	if (isOpen) {
		if (props.editModelId) {
			// --- 编辑模式：回填数据 ---
			const target = resourceStore.findModelById(props.editModelId);
			if (target) {
				createModelFrom.name = target.name;
				createModelFrom.fileUrl = target.url;
				// 等待 DOM 渲染后加载预览
				await nextTick();
				initPreviewer();
				await modelPreviewer?.loadModel(target.url, true);
			}
		} else {
			// --- 新增模式：重置 ---
			resetForm();
		}
	} else {
		handleClose();
	}
});

function initPreviewer() {
	if (!modelPreviewer) {
		const canvasContainer = document.querySelector("#form-preview-canvas-container") as HTMLDivElement;
		if (canvasContainer) {
			modelPreviewer = new ModelPreviewerRenderer(canvasContainer);
		}
	}
}

async function handleConfirm() {
	if (props.editModelId) {
		await updateExistingModel(props.editModelId, createModelFrom.name, createModelFrom.fileUrl);
	} else {
		await addNewModel(createModelFrom.fileUrl, createModelFrom.name);
		message.success(`添加模型 "${createModelFrom.name}" 成功`, 1);
	}
	visible.value = false;
}

async function handleSelectFile() {
	const res = await window.electronAPI.showOpenDialog({
		filters: [{ name: "3D Model", extensions: ["gltf", "glb"] }],
		properties: ["openFile"],
	});

	if (res.filePaths.length > 0) {
		createModelFrom.fileUrl = res.filePaths[0];
		initPreviewer();
		await modelPreviewer?.loadModel(createModelFrom.fileUrl, true);
	}
}

function resetForm() {
	createModelFrom.name = "";
	createModelFrom.fileUrl = "";
}

function handleClose() {
	resetForm();
	modelPreviewer?.destroy();
	modelPreviewer = null;
}
</script>

<template>
	<a-modal
		destroyOnClose
		:footer="null"
		width="30%"
		v-model:open="visible"
		:title="props.editModelId ? '编辑模型' : '添加模型'"
	>
		<a-form @finish="handleConfirm" :model="createModelFrom" name="basic" autocomplete="off">
			<a-form-item label="模型名称" name="name" :rules="[{ required: true, message: '请输入模型名称' }]">
				<a-input v-model:value="createModelFrom.name" />
			</a-form-item>

			<a-form-item label="模型地址" name="fileUrl" :rules="[{ required: true, message: '请选择模型' }]">
				<span class="model-url" v-if="createModelFrom.fileUrl">
					{{ createModelFrom.fileUrl }}
				</span>
				<div id="form-preview-canvas-container" class="model-preview-canvas-container"></div>
				<a-button @click="handleSelectFile" type="primary">
					{{ props.editModelId ? "更换模型文件" : "选择模型" }}
				</a-button>
			</a-form-item>

			<a-form-item>
				<a-button style="float: right" type="primary" html-type="submit">
					{{ props.editModelId ? "保存修改" : "添加" }}
				</a-button>
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
	word-break: break-all; /* 防止路径过长撑开 */
	font-size: 12px;
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
	position: relative; /* 确保 canvas 能够正确适应 */
}
</style>
