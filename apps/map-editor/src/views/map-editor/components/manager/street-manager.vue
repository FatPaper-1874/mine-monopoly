<script setup lang="ts">
import { useMapDataStore, useResourceStore } from "@src/stores";
import { computed, nextTick, ref } from "vue";
import StreetCard from "./components/street-card.vue";
import StreetForm from "./forms/street-form/index.vue";
import { Street } from "@fatpaper-monopoly/types";

const model = defineModel({ default: false });

const mapDataStroe = useMapDataStore();

const streetCount = computed(() => mapDataStroe.streets.length);
const streetToShow = computed(() => {
	return mapDataStroe.streets.slice((currentPage.value - 1) * pageSize.value, currentPage.value * pageSize.value);
});

const currentPage = ref(1);
const pageSize = ref(9);

const createStreetFormVisible = ref(false);
const currentStreet = ref<Street | undefined>(undefined);

function handleAdd() {
	currentStreet.value = undefined;
	createStreetFormVisible.value = true;
}

function handleEdit(id: string) {
	currentStreet.value = mapDataStroe.streets.find((s) => s.id === id);
	createStreetFormVisible.value = true;
}

function handleDelete(id: string) {
	mapDataStroe.reomveStreet(id);
}
</script>

<template>
	<a-modal
		destroyOnClose
		wrap-class-name="street-manager-container"
		width="100%"
		v-model:open="model"
		:footer="null"
		title="街道管理"
	>
		<div class="operation-container">
			<a-button style="float: right" @click="handleAdd" type="primary">新建街道</a-button>
		</div>
		<a-empty v-if="streetCount === 0" description="没有数据" />
		<div class="preview-container">
			<street-card @edit="handleEdit" @delete="handleDelete" v-for="street in streetToShow" :street="street" />
		</div>
		<a-pagination
			v-model:current="currentPage"
			:show-total="() => `${streetCount} 个街道`"
			:total="streetCount"
			:pageSize="pageSize"
			show-less-items
		/>
	</a-modal>
	<a-modal width="100%" destroyOnClose title="编辑街道" :footer="null" v-model:open="createStreetFormVisible" centered>
		<street-form @close="createStreetFormVisible = false" :street="currentStreet" />
	</a-modal>
</template>

<style lang="scss">
.street-manager-container {
	.ant-modal {
		max-width: 80vw;
		top: 10vh;
		left: 10vw;
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
		grid-template-rows: repeat(3, 1fr); /* 2行，等高 */
		gap: 20px; /* 网格间隙 */
		padding: 10px;
	}
}
</style>
