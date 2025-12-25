<script setup lang="ts">
// 移除不再需要的 FpDialog 引用（如果此组件只是内容部分）
import { computed, inject, ref, Ref, watch } from "vue";
import { useGameData } from "@src/store/game";
import PlayerCard from "@src/views/game/components/player-card.vue";
import ItemSelector from "@src/components/utils/item-selector/item-selector.vue";

// 注入选中的 ID 列表
const selectedTargetIdList = inject<Ref<string[]>>("targetIdList", ref<string[]>([]));

const gameInfoStore = useGameData();

// 计算目标玩家列表
const targetPlayerList = computed(() => {
	return gameInfoStore.players.filter((p) => p.isBankrupted === false && p.id !== gameInfoStore.myGameInfo?.id);
});
</script>

<template>
	<div class="target-selector-container">
		<div class="target-container">
			<div class="tips">选择目标（点击玩家卡片）</div>

			<ItemSelector
				:column="3"
				:item-list="targetPlayerList"
				key-name="id"
				:multiple="false"
				v-model:selected-key="selectedTargetIdList"
			>
				<template #item="player">
					<PlayerCard :player="player" :round-mark="false" class="target-player-card" />
				</template>
			</ItemSelector>
		</div>
	</div>
</template>

<style lang="scss" scoped>
.target-selector-container {
	display: flex;
	justify-content: space-between;

	& > .target-container {
		flex: 1;

		& > .tips {
			color: var(--color-primary);
			text-align: center;
		}

		.target-player-card {
			width: 100%;
			height: 100%;
			box-shadow: none;
		}
	}
}
</style>
