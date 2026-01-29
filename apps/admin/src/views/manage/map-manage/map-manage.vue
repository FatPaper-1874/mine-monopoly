<script setup lang="ts">
import { onMounted, ref } from "vue";
import MapForm from "./components/map-form.vue";
import { GameMapInDb } from "@mine-monopoly/types";
import { getGameMapInfo, getGameMapList } from "@/utils/api/game-map";
import MapItem from "./components/map-item.vue";

const formVisible = ref(false);
const currentGameMap = ref<GameMapInDb | undefined>();
const gameMapList = ref<GameMapInDb[]>([]);

const total = ref(0);
const currentPage = ref(1);
const pageSize = ref(6);

async function updateList() {
	const { gameMapList: list, total: _total } = await getGameMapList(currentPage.value, pageSize.value);
	gameMapList.value = list;
	total.value = _total;
}

async function handleGameMapCreated() {
	formVisible.value = false;
	await updateList();
}

async function handleGameMapEdit(mapInfo: GameMapInDb) {
	currentGameMap.value = mapInfo;
	formVisible.value = true;
}

function handleFormClose() {
	currentGameMap.value = undefined;
}

onMounted(async () => {
	updateList();
});
</script>

<template>
	<div class="map-manager">
		<div class="top-bar">
			<div class="left">
				<h4>地图管理</h4>
			</div>
			<div class="right">
				<a-button @click="formVisible = true" type="primary">上传地图</a-button>
			</div>
		</div>

		<a-empty style="flex: 1" v-if="total === 0" description="没有数据" />
		<div v-else class="map-item-container">
			<map-item
				@edit="handleGameMapEdit"
				@deleted="updateList"
				:map-info="mapInfo"
				v-for="mapInfo in gameMapList"
				:key="mapInfo.id"
			/>
		</div>

		<a-pagination
			v-model:current="currentPage"
			:show-total="() => `${total} 个地图`"
			:total="total"
			:pageSize="pageSize"
			show-less-items
		/>
	</div>

	<a-modal
		@close="handleFormClose"
		destroyOnClose
		title="上传地图"
		style="width: 30vw"
		v-model:open="formVisible"
		:footer="null"
	>
		<map-form @finish="handleGameMapCreated" :game-map="currentGameMap" />
	</a-modal>
</template>

<style lang="scss" scoped>
.map-manager {
	padding: 10px;
	display: flex;
	flex-direction: column;
	height: 100%;

	.top-bar {
		width: 100%;
		display: flex;
		justify-content: space-between;
		align-items: center;
		background-color: #fff;
		padding: 10px 20px;
		border-radius: 5px;
	}

	.map-item-container {
		flex: 1;
		display: grid;
		grid-template-columns: repeat(3, 1fr); /* 3列，等宽 */
		grid-template-rows: repeat(2, 1fr); /* 2行，等高 */
		gap: 20px; /* 网格间隙 */
		padding: 10px;
	}
}
</style>
