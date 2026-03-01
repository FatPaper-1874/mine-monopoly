<script setup lang="ts">
import { ChanceCardInfo } from "@mine-monopoly/types";
import { useMapDataStore } from "@src/stores";
import { computed, ref } from "vue";
import ChanceCardForm from "./forms/chance-card-form/index.vue";
import ChanceCardCard from "./components/chance-card-card.vue";

const model = defineModel({ default: false });

// 修正：mapDataStroe -> mapDataStore
const mapDataStore = useMapDataStore();

const chanceCardCount = computed(() => mapDataStore.chanceCards.length);

// 优化：Computed 分页
const chanceCardToShow = computed(() => {
	const start = (currentPage.value - 1) * pageSize.value;
	const end = start + pageSize.value;
	return mapDataStore.chanceCards.slice(start, end);
});

const currentPage = ref(1);
const pageSize = ref(6);

const createChanceCardFormVisible = ref(false);
const currentChanceCard = ref<ChanceCardInfo | undefined>(undefined);

function handleAdd() {
	currentChanceCard.value = undefined;
	createChanceCardFormVisible.value = true;
}

function handleEdit(id: string) {
	currentChanceCard.value = mapDataStore.chanceCards.find((s) => s.id === id);
	createChanceCardFormVisible.value = true;
}

function handleDelete(id: string) {
	mapDataStore.reomveChanceCard(id);

	// 优化：页码自动回退
	if (chanceCardToShow.value.length === 0 && currentPage.value > 1) {
		currentPage.value--;
	}
}
</script>

<template>
	<a-modal
		destroyOnClose
		wrap-class-name="chancecard-manager-container"
		width="100%"
		v-model:open="model"
		:footer="null"
		title="机会卡管理"
		centered
	>
		<div class="operation-container">
			<span class="stats">共 {{ chanceCardCount }} 张机会卡</span>
			<a-button @click="handleAdd" type="primary">新建机会卡</a-button>
		</div>

		<a-empty v-if="chanceCardCount === 0" description="暂无数据" style="margin-top: 100px" />

		<div v-else class="preview-container">
			<ChanceCardCard
				v-for="chanceCard in chanceCardToShow"
				:key="chanceCard.id"
				:chance-card="chanceCard"
				@edit="handleEdit"
				@delete="handleDelete"
			/>
		</div>

		<div class="pagination-wrapper">
			<a-pagination
				v-model:current="currentPage"
				:show-total="() => `共 ${chanceCardCount} 条`"
				:total="chanceCardCount"
				:pageSize="pageSize"
				show-less-items
			/>
		</div>
	</a-modal>

	<a-modal
		width="100%"
		destroyOnClose
		:title="currentChanceCard ? '编辑机会卡' : '新建机会卡'"
		:footer="null"
		v-model:open="createChanceCardFormVisible"
		centered
	>
		<ChanceCardForm @close="createChanceCardFormVisible = false" :chance-card="currentChanceCard" />
	</a-modal>
</template>

<style lang="scss">
/* 复用 event-manager-container 的样式，保持统一 */
.chancecard-manager-container {
	.ant-modal {
		max-width: 90vw;
		padding-bottom: 0;
	}
	.ant-modal-content {
		display: flex;
		flex-direction: column;
		height: 85vh;
	}
	.ant-modal-body {
		flex: 1;
		display: flex;
		flex-direction: column;
		overflow: hidden;
		padding: 24px;
	}

	.operation-container {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 16px;
		.stats {
			color: #888;
		}
	}

	.preview-container {
		flex: 1;
		overflow-y: auto;
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		grid-template-rows: repeat(2, 1fr);
		gap: 20px;
		padding: 4px;
	}

	.pagination-wrapper {
		margin-top: 16px;
		display: flex;
		justify-content: flex-end;
	}
}
</style>
