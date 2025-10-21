<script setup lang="ts">
import FpDialog from "@src/components/utils/fp-dialog/fp-dialog.vue";
import { ChanceCardClientInfo, ChanceCardInfo } from "@fatpaper-monopoly/types";
import { useGameData, useMapData } from "@src/store/game";
import { computed, inject, onBeforeMount, onBeforeUnmount, onMounted, Ref, ref, watch } from "vue";
import PlayerCard from "@src/views/game/components/player-card.vue";

const selectedTargetIdList = inject<Ref<string[]>>("targetIdList", ref<string[]>([]));

const gameInfoStore = useGameData();

const targetPlayerList = computed(() => {
	return gameInfoStore.playersList.filter((p) => p.isBankrupted === false && p.id !== gameInfoStore.myGameInfo?.id);
});

function handlePlayerCardClick(playerId: string) {
	selectedTargetIdList.value[0] = playerId;
}
</script>

<template>
	<div class="target-selector-container">
		<div class="target-container">
			<div class="tips">选择目标（点击玩家卡片）</div>
			<div class="target-list">
				<PlayerCard
					:id="'player-' + player.id"
					@click="handlePlayerCardClick(player.id)"
					v-for="player in targetPlayerList"
					:key="player.id"
					:player="player"
					:round-mark="Boolean(selectedTargetIdList?.includes(player.id))"
				/>
			</div>
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
			margin-bottom: 1rem;
		}

		& > .target-list {
			display: grid;
			grid-template-rows: repeat(3, 1fr); /* 三行，等高 */
			grid-template-columns: repeat(2, 1fr); /* 两列，等宽 */
			gap: 1rem;

			& > div {
				box-shadow: var(--box-shadow);
			}
		}
	}
}
</style>
