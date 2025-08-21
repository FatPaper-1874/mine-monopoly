<script setup lang="ts">
import { ChanceCard } from "@fatpaper-monopoly/types";
import { useMapDataStore } from "@src/stores";
import { computed, ref } from "vue";
import ChanceCardForm from "./forms/chance-card-form/index.vue";
import chanceCardCard from "./components/chance-card-card.vue";

const model = defineModel({ default: false });

const mapDataStroe = useMapDataStore();

const chanceCardCount = computed(() => mapDataStroe.chanceCards.length);
const chanceCardToShow = computed(() => {
	return mapDataStroe.chanceCards.slice((currentPage.value - 1) * pageSize.value, currentPage.value * pageSize.value);
});

const currentPage = ref(1);
const pageSize = ref(6);

const createChanceCardFormVisible = ref(false);
const currentChanceCard = ref<ChanceCard | undefined>(undefined);

function handleAdd() {
	currentChanceCard.value = undefined;
	createChanceCardFormVisible.value = true;
}

function handleEdit(id: string) {
	currentChanceCard.value = mapDataStroe.chanceCards.find((s) => s.id === id);
	createChanceCardFormVisible.value = true;
}

function handleDelete(id: string) {
	mapDataStroe.reomveChanceCard(id);
}
</script>

<template>
	<a-modal
		destroyOnClose
		wrap-class-name="event-manager-container"
		width="100%"
		v-model:open="model"
		:footer="null"
		title="机会卡管理"
	>
		<div class="operation-container">
			<a-button style="float: right" @click="handleAdd" type="primary">新建机会卡</a-button>
		</div>

		<a-empty v-if="chanceCardCount === 0" description="没有数据" />
		<div class="preview-container">
			<chance-card-card
				@edit="handleEdit"
				@delete="handleDelete"
				v-for="chanceCard in chanceCardToShow"
				:chance-card="chanceCard"
			/>
		</div>
		<a-pagination
			v-model:current="currentPage"
			:show-total="() => `${chanceCardCount} 张机会卡`"
			:total="chanceCardCount"
			:pageSize="pageSize"
			show-less-items
		/>
	</a-modal>
	<a-modal
		width="100%"
		destroyOnClose
		title="编辑机会卡"
		:footer="null"
		v-model:open="createChanceCardFormVisible"
		centered
	>
		<chance-card-form @close="createChanceCardFormVisible = false" :chance-card="currentChanceCard" />
	</a-modal>
</template>

<style lang="scss">
.event-manager-container {
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
