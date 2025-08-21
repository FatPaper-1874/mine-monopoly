<script setup lang="ts">
import { ref, computed, watch, onMounted } from "vue";
import { useUtil } from "@src/store/index";
import { DiceRenderer } from "@src/classes/three/DiceRenderer";
import { useRoomInfo } from "../../../store/index";

const utilStore = useUtil();
const rollDiceResult = computed(() => utilStore.rollDiceResult);
const isRollDiceAnimationPlay = computed(() => utilStore.isRollDiceAnimationPlay);
const canRoll = computed(() => utilStore.canRoll);
const roomInfoStore = useRoomInfo();

let diceRenderer: DiceRenderer | undefined;

watch(rollDiceResult, (newRollResult) => {
	diceRenderer && diceRenderer.stopRotate(newRollResult);
});

watch(isRollDiceAnimationPlay, (animationPlay) => {
	if (!diceRenderer) return;
	if (animationPlay) {
		diceRenderer.startRotate();
	}
});

onMounted(async () => {
	const canvasEl = document.getElementById("game_dice_canvas") as HTMLCanvasElement;
	diceRenderer = new DiceRenderer(canvasEl, false, roomInfoStore.gameSetting.diceNum, 1.1, false, 2.1);
	await diceRenderer.initDice();
});

const emit = defineEmits(["roll"]);

function handleRollDice() {
	if (canRoll.value) {
		emit("roll");
	}
}
</script>

<template>
	<canvas
		id="game_dice_canvas"
		class="dice-button"
		:disabled="!canRoll"
		:class="{ canroll: canRoll }"
		@click="handleRollDice"
	/>
</template>

<style lang="scss" scoped>
.dice-button {
	width: 16rem !important;
	height: 10rem !important;
	cursor: pointer;
	border-radius: 2rem;
	border: 0.5rem solid rgba(255, 255, 255, 0.6);
	background-color: rgba(255, 255, 255, 0.5);
	transition: background-color 0.15s ease-in-out;

	&.canroll {
		background-color: var(--color-second);
		animation: identifier 1.5s infinite ease-in-out;

		&:hover {
			background-color: var(--color-third);
		}

		@keyframes identifier {
			50% {
				background-color: var(--color-third);
			}
		}
	}
}
</style>
