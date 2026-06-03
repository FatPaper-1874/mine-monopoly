<script setup lang="ts">
import { computed } from "vue";
import playerCard from "./player-card.vue";
import { useRouter } from "vue-router";
import { useGameData } from "@src/store/game";
import type { PlayerInfo } from "@mine-monopoly/types";
import FpDialog from "@src/components/utils/fp-dialog/fp-dialog.vue";

const router = useRouter();
const gameData = useGameData();
const isGameOver = computed(() => gameData.isGameOver);
const playerListSorted = computed(() => {
	const ranking = gameData.rankedPlayerIds;
	if (ranking.length > 0) {
		const rankedIds = new Set(ranking);
		const ranked = ranking
			.map((id) => gameData.players.find((p) => p.id === id))
			.filter((p): p is PlayerInfo => p !== undefined);
		const unranked = gameData.players.filter((p) => !rankedIds.has(p.id));
		return [...ranked, ...unranked];
	}
	return [...gameData.players].sort((playerA, playerB) => playerB.money - playerA.money);
});

function rankClass(index: number) {
	if (index === 0) return "rank-gold";
	if (index === 1) return "rank-silver";
	if (index === 2) return "rank-bronze";
	return "";
}

function toRoomList() {
	useGameData().$reset();
	router.replace("/room");
}
</script>

<template>
	<FpDialog
		:visible="isGameOver"
		:closable="false"
		confirm-text="返回大厅"
		:style="{ width: '32rem' }"
		@submit="toRoomList"
	>
		<template #title>
			<span class="dialog-title">游戏结束</span>
		</template>
		<div class="player-list-container">
			<div
				class="player-row"
				v-for="(player, index) in playerListSorted"
				:key="player.id"
			>
				<div class="rank-badge" :class="rankClass(index)">{{ index + 1 }}</div>
				<playerCard :player="player" :round-mark="false" />
			</div>
		</div>
	</FpDialog>
</template>

<style lang="scss" scoped>
.dialog-title {
	font-size: 1.4rem;
}

.player-list-container {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 0.6rem;
	padding: 0.3rem 0;
}

.player-row {
	display: flex;
	align-items: center;
	justify-content: center;
	gap: 0.8rem;
}

.rank-badge {
	width: 2.6rem;
	height: 2.6rem;
	border-radius: 50%;
	text-align: center;
	line-height: 2.6rem;
	font-size: 1.3rem;
	font-weight: 700;
	color: #fff;
	text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
	background-color: var(--fp-color-primary);
	flex-shrink: 0;

	&.rank-gold {
		background: linear-gradient(135deg, #f9d423, #e8a400);
		box-shadow: 0 0 8px rgba(249, 212, 35, 0.6);
	}

	&.rank-silver {
		background: linear-gradient(135deg, #c9ced3, #8e9aab);
		box-shadow: 0 0 6px rgba(169, 179, 191, 0.5);
	}

	&.rank-bronze {
		background: linear-gradient(135deg, #da9b6a, #a0643a);
		box-shadow: 0 0 6px rgba(205, 127, 50, 0.5);
	}
}
</style>
