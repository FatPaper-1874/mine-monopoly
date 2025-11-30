<script setup lang="ts">
import { computed } from "vue";
import { useUtil } from "@src/store/index";

const utilStore = useUtil();
const canRoll = computed(() => utilStore.canRoll);

const emit = defineEmits(["roll"]);

function handleRollDice() {
	if (canRoll.value) {
		emit("roll");
	}
}
</script>

<template>
	<div
		id="game_dice_canvas"
		class="dice-button"
		:disabled="!canRoll"
		:class="{ canroll: canRoll }"
		@click="handleRollDice"
	>
		我是骰子
	</div>
</template>

<style lang="scss" scoped>
.dice-button {
	width: 10rem;
	height: 10rem;
	cursor: pointer;
	border-radius: 2rem;
	border: 0.5rem solid rgba(255, 255, 255, 0.6);
	background-color: rgba(255, 255, 255, 0.5);
	transition: background-color 0.15s ease-in-out;
	position: absolute;
	right: 0.4rem;
	bottom: 0.4rem;
	z-index: var(--z-ui);

	display: flex;
	justify-content: center;
	align-items: center;
	color: #ffffff;

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
