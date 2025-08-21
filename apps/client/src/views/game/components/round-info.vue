<script setup lang="ts">
import { computed } from "vue";
import { useGameInfo } from "@src/store";
import PlayerCard from "@src/views/game/components/player-card.vue";

const gameInfoStore = useGameInfo();

const _currentRound = computed(() => gameInfoStore.currentRound);
const _currentMultiplier = computed(() => gameInfoStore.currentMultiplier);
</script>

<template>
	<div class="round-info">
		<span class="round">第{{ _currentRound }}回合</span>
		<span class="multiplier">当前倍率：{{ _currentMultiplier }}倍</span>
	</div>
</template>

<style scoped lang="scss">
.round-info {
	color: var(--color-text-white);
	background-color: var(--color-second);
	text-shadow: var(--text-shadow);
	display: flex;
	justify-content: space-around;
	align-items: center;
	padding: 0.4rem 1.2rem;
	border: 0.4rem solid rgba($color: #ffffff, $alpha: 0.5);
	border-top: 0;
	border-radius: 0 0 1rem 1rem;

	& > .round {
		font-size: 1.5rem;
		margin-right: 2rem;
	}

	& > .multiplier {
		font-size: 1rem;
	}
}
</style>
