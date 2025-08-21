<script setup lang="ts">
import { useMapDataStore, useResourceStore } from "@src/stores";
import { computed, reactive, ref } from "vue";
import CreateModelFrom from "./forms/model-create-form.vue";
import modelPreviewer from "./components/model-previewer.vue";

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
			<a-button style="float: right" @click="createModelFromVisible = true" type="primary">添加模型</a-button>
		</div>
		<a-empty v-if="modelCount === 0" description="没有数据" />
		<div class="preview-container">
			<model-previewer v-for="model in modelToShow" :model="model" />
		</div>
		<a-pagination
			v-model:current="currentPage"
			:show-total="() => `${modelCount} 个模型`"
			:total="modelCount"
			:pageSize="pageSize"
			show-less-items
		/>
	</a-modal>
	<create-model-from v-model="createModelFromVisible" />
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
