<template>
	<div class="game-buttons-panel">
		<div class="panel-title" v-if="title">{{ title }}</div>
		<div class="panel-content">
			<DynamicButtonContainer :player-id="playerId" layout="vertical" />
			<Dices @click="$emit('rollDice')"></Dices>
		</div>
	</div>
</template>

<script setup lang="ts">
import DynamicButtonContainer from "./dynamic-button-container.vue";
import Dices from "./dices.vue";

interface Props {
	playerId: string;
	title?: string;
}

withDefaults(defineProps<Props>(), {
	title: "",
});
defineEmits<{
	rollDice: [];
}>();
</script>

<style lang="scss" scoped>
.game-buttons-panel {
	position: absolute;
	right: 1rem;
	bottom: 1rem;
	z-index: var(--z-ui);
	display: flex;
	flex-direction: column;
	gap: 0.5rem;

	/* 使用纹理背景 + 颜色 */
	background-color: #ffffff;
	background-image: var(--texture-felt);
	background-repeat: repeat;
	border-radius: 1.5rem;

	/* 内边距 */
	padding: 1.2rem;
	padding-top: 1rem;
	box-shadow:
		var(--shadow-depth),
		0 0 0 3px rgba(0, 0, 0, 0.05);
}

.panel-title {
	font-size: 0.9rem;
	font-weight: 600;
	color: var(--color-text-second);
	text-align: center;
	margin-bottom: 0.6rem;
	white-space: nowrap;
}

.panel-content {
	display: inline-flex;
	flex-direction: row;
	gap: 0.8rem;
}
</style>
