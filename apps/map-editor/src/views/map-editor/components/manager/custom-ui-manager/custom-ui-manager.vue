<script setup lang="ts">
import { ref } from "vue";
import uiSelector from "./ui-selector.vue";
import { CustomUI } from "@fatpaper-monopoly/types";
import customUiEditor from "./form/custom-ui-editor.vue";
import { useMapDataStore } from "@src/stores";
import { message } from "ant-design-vue";

const model = defineModel({ default: false });

const createCustomUIFormVisible = ref(false);

const currentCustomUI = ref<CustomUI | null>(null);

function handleCreate(layout: { x: number; y: number; width: number; height: number }) {
	const tempCustomUI: CustomUI = {
		id: crypto.randomUUID(),
		name: "",
		layout,
		initCode: "",
	};
	currentCustomUI.value = tempCustomUI;
	createCustomUIFormVisible.value = true;
}

function handleSelect(ui: CustomUI) {
	currentCustomUI.value = ui;
	createCustomUIFormVisible.value = true;
}

function handleSave(ui: CustomUI) {
	useMapDataStore().saveCustomUI(ui);
	message.success("保存自定义UI成功", 1);
	currentCustomUI.value = null;
	createCustomUIFormVisible.value = false;
}

function handleDelete(id: string) {
	useMapDataStore().removeCustomUI(id);
	message.success("删除自定义UI成功", 1);
	currentCustomUI.value = null;
	createCustomUIFormVisible.value = false;
}
</script>

<template>
	<a-modal
		destroyOnClose
		wrap-class-name="custom-ui-manager-container"
		width="100%"
		v-model:open="model"
		:footer="null"
		title="自定义UI"
	>
		<ui-selector @select="handleSelect" @create="handleCreate"></ui-selector>
	</a-modal>
	<a-modal
		width="100%"
		destroyOnClose
		title="编辑自定义UI"
		:footer="null"
		v-model:open="createCustomUIFormVisible"
		centered
	>
		<custom-ui-editor @save="handleSave" @delete="handleDelete" :custom-u-i="currentCustomUI!" />
	</a-modal>
</template>

<style lang="scss">
.custom-ui-manager-container {
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
}
</style>
