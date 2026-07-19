<template>
	<div class="game-buttons-panel">
		<div class="panel-title" v-if="title && !spectatorMode">{{ title }}</div>
		<div v-if="spectatorMode" class="panel-message">{{ spectatorMessage }}</div>
		<div class="panel-content" v-show="!spectatorMode">
			<DynamicButtonContainer :player-id="playerId" layout="vertical" />
			<Dices @click="$emit('rollDice')"></Dices>
		</div>
	</div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import DynamicButtonContainer from "./dynamic-button-container.vue";
import Dices from "./dices.vue";

interface Props {
	playerId: string;
	title?: string;
	spectatorMessage?: string;
}

const props = withDefaults(defineProps<Props>(), {
	title: "",
	spectatorMessage: "",
});
const spectatorMode = computed(() => !!props.spectatorMessage);
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
	background-image: var(--fp-texture-felt);
	background-repeat: repeat;
	border-radius: 1.5rem;

	/* 内边距 */
	padding: 1.2rem;
	padding-top: 1rem;
	box-shadow:
		var(--fp-shadow-depth),
		0 0 0 0.1875rem rgba(0, 0, 0, 0.05);
}

.panel-title {
	font-size: 0.9rem;
	color: var(--fp-color-text-secondary);
	text-align: center;
	margin-bottom: 0.6rem;
	white-space: nowrap;
}

.panel-content {
	display: inline-flex;
	flex-direction: row;
	gap: 0.8rem;
}

.panel-message {
	max-width: 14rem;
	line-height: 1.5;
	color: var(--fp-color-text-secondary);
	text-align: left;
}
</style>
