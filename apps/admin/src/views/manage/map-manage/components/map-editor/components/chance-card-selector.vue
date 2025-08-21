<script setup lang="ts">
import chanceCardVue from "@/components/sample/chance-card.vue";
import ItemSelector from "@/components/sample/item-selector.vue";
import { getChanceCardsList, updateChanceCardInMap } from "@/utils/api/chanceCard";
import { getChanceCardsListByMapId } from "@/utils/api/map";
import { ChanceCard, MapData } from "@/interfaces/interfaces";
import { inject, nextTick, onUpdated, ref, toRaw } from "vue";

const mapInfo = inject<MapData>("mapInfo")!;

const emit = defineEmits(["close", "confirm"]);

const _chanceCardList = ref<ChanceCard[]>([]);
const isLoading = ref(false);
const _selectedIdList = ref<string[]>([]);

//机会卡
const visible = ref(false);

async function handleChanCardSelect(chanceCardIdList: string[]) {
	await updateChanceCardInMap(toRaw(chanceCardIdList), mapInfo.id);
	visible.value = false;
}

onUpdated(async () => {
	isLoading.value = true;
	const currentCardList = (await getChanceCardsListByMapId(mapInfo.id)) as any;
	_selectedIdList.value = currentCardList.map((item: any) => item.id);
	const { chanceCardsList } = await getChanceCardsList(1, 10000);
	_chanceCardList.value = chanceCardsList;
	isLoading.value = false;
});

function handleSelected(selectedList: string[]) {
	_selectedIdList.value = selectedList;
}

function handleClose() {
	visible.value = false;
}

function handleConfirm() {
	handleChanCardSelect(_selectedIdList.value);
}
</script>

<template>
	<div class="chance-card-selector-button">
		<el-button type="primary" @click="visible = true">地图的机会卡</el-button>
		<el-dialog
			destroy-on-close
			@close="handleClose"
			class="chance-card-selector"
			:model-value="visible"
			title="选择地图包含的机会卡"
			width="80%"
		>
			<div v-if="isLoading" style="text-align: center; font-size: 2em">加载中</div>
			<ItemSelector
				@select="handleSelected"
				:item-list="_chanceCardList"
				key-name="id"
				:selected-key-list="_selectedIdList"
        class="item-selector"
			>
				<template #item="{ id, name, describe, icon, color }">
					<chanceCardVue :id="id" :name="name" :describe="describe" :icon="icon" :color="color" />
				</template>
			</ItemSelector>
			<template #footer>
				<span class="dialog-footer">
					<el-button @click="handleClose">取消</el-button>
					<el-button type="primary" @click="handleConfirm">确定</el-button>
				</span>
			</template>
		</el-dialog>
	</div>
</template>

<style lang="scss" scoped>
.chance-card-selector-button {
  margin-bottom: 10px;
}
.item-selector {
	max-height: 50vh;
	overflow-y: scroll;
}
</style>
