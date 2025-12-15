<script setup lang="ts">
import { useMapDataStore, useResourceStore } from "@src/stores";
import { computed, reactive, ref } from "vue";
import ModelEditFrom from "./forms/model-edit-form.vue";
import modelPreviewer from "./components/model-previewer.vue";
import { message } from "ant-design-vue";
import { addNewModel, getFileNameWithoutExt } from "@src/utils/file";

const mapDataStroe = useMapDataStore();
const resourcesStore = useResourceStore();

const modelCount = computed(() => resourcesStore.models.length);
const modelToShow = computed(() => {
	return resourcesStore.models.slice((currentPage.value - 1) * pageSize.value, currentPage.value * pageSize.value);
});

const model = defineModel({ default: false });
const currentPage = ref(1);
const pageSize = ref(6);

const createModelFromVisible = ref(false);
// 1. 新增：记录当前正在编辑的模型ID
const currentEditId = ref<string | undefined>(undefined);

// 2. 处理添加：清空 ID 并打开弹窗
function handleAddModel() {
	currentEditId.value = undefined;
	createModelFromVisible.value = true;
}

async function handleAddMultipleModels() {
	const res = await window.electronAPI.showOpenDialog({
		filters: [{ name: "3D Model", extensions: ["gltf", "glb"] }],
		properties: ["openFile", "multiSelections"],
	});
	if (res.canceled) return;
	try {
		const filePaths = res.filePaths as string[];
		for (const filePath of filePaths) {
			const fileName = getFileNameWithoutExt(filePath);
			await addNewModel(filePath, fileName);
		}
		message.success(`成功添加${filePaths.length}个模型`);
	} catch (e: any) {
		message.error(e.message, 1);
	}
}

// 3. 处理编辑：设置 ID 并打开弹窗
function handleEditModel(id: string) {
	currentEditId.value = id;
	createModelFromVisible.value = true;
}

function handleDeleteModel(id: string) {
	try {
		useResourceStore().removeModel(id);
		message.success(`删除模型成功`);
	} catch (e: any) {
		message.error(e.message);
	}
}
</script>

<template>
	<a-modal
		destroyOnClose
		wrap-class-name="model-manager-container"
		width="100%"
		v-model:open="model"
		:footer="null"
		title="模型管理"
	>
		<div class="operation-container">
			<a-button style="float: right" @click="handleAddModel" type="primary">添加模型</a-button>
			<a-button style="float: right; margin-right: 10px" @click="handleAddMultipleModels" type="primary"
				>批量添加模型</a-button
			>
		</div>
		<a-empty v-if="modelCount === 0" description="没有数据" />
		<div class="preview-container">
			<model-previewer
				v-for="model in modelToShow"
				:model="model"
				@edit="handleEditModel"
				@delete="handleDeleteModel"
			/>
		</div>
		<a-pagination
			v-model:current="currentPage"
			:show-total="() => `${modelCount} 个模型`"
			:total="modelCount"
			:pageSize="pageSize"
			show-less-items
		/>
	</a-modal>
	<model-edit-from v-model="createModelFromVisible" :edit-model-id="currentEditId" />
</template>

<style lang="scss">
.model-manager-container {
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
