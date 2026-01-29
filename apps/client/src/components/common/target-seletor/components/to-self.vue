<script setup lang="ts">
import { ChanceCardClientInfo, ChanceCardInfo } from "@mine-monopoly/types";
import { useGameData, useMapData } from "@src/store/game";
import { computed, nextTick, onBeforeMount, onBeforeUnmount, onMounted, ref, watch } from "vue";
import PlayerCard from "@src/views/game/components/player-card.vue";

const gameInfoStore = useGameData();
const emits = defineEmits(["target-selected"]);

const props = defineProps<{ chanceCard: ChanceCardClientInfo }>();

const myPlayer = computed(() => {
	return gameInfoStore.myGameInfo;
});
const myId = computed(() => (myPlayer.value ? myPlayer.value.id : ""));

emits("target-selected", myId.value);

const containerEl = ref<HTMLElement | null>(null);
</script>

<template>
	<div ref="containerEl" class="target-selector-container">
		<div class="target-container">
			<div class="tips">要选择自己为目标吗</div>
			<div class="target-list">
				<PlayerCard v-if="myPlayer" :id="'player-' + myPlayer.id" :player="myPlayer" :round-mark="true" />
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
		display: flex;
		justify-content: center;
		align-items: center;
		flex-direction: column;

		& > .target-list {
			display: flex;
			justify-content: center;
			align-items: center;
			gap: 1rem;
			margin-bottom: 2rem;

			& > div {
				box-shadow: var(--box-shadow);
			}
		}
	}
}
</style>
