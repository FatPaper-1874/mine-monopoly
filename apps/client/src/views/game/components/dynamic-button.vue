<template>
	<div
		v-sound.hover
		class="dynamic-button btn-small"
		:class="{ enabled: localConfig.enabled, disabled: !localConfig.enabled }"
		@click="handleClick"
	>
		{{ localConfig.text }}
	</div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { ButtonConfig } from "@mine-monopoly/types";

interface Props {
	config: ButtonConfig;
}

const props = defineProps<Props>();
const emit = defineEmits(["click"]);

const localConfig = computed(() => props.config);

const handleClick = () => {
	if (!localConfig.value.enabled) {
		return;
	}
	emit("click", localConfig.value.id);
};
</script>

<style scoped>
.dynamic-button {
	padding: 0.5rem 1rem;
	font-size: 0.9rem;
	font-weight: 600;
	border-radius: .8rem;
	cursor: pointer;
	transition: all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
	font-family: inherit;
	white-space: normal;
	text-align: center;
	word-break: break-word;
	max-width: 100%;
	z-index: var(--z-ui);
	position: relative;
	display: flex;
	align-items: center;
	justify-content: center;

	/* 视觉基础样式 */
	background: rgba(255, 255, 255, 0.65);
  box-shadow:
    var(--shadow-depth);
	user-select: none;
	color: #555;
}

.dynamic-button.enabled {
	background: var(--color-second);
	border-color: rgba(255, 255, 255, 0.8);
	color: #fff;
}

.dynamic-button.enabled:hover {
	background: var(--color-third);
}

.dynamic-button.enabled:active {
	transform: translateY(0) scale(0.96);
}

.dynamic-button.disabled {
	opacity: 0.85;
	cursor: not-allowed;
	background: rgba(240, 240, 240, 0.7);
}

.dynamic-button.disabled:hover {
	background: rgba(240, 240, 240, 0.8);
	transform: none;
}
</style>
