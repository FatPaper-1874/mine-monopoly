<script setup lang="ts">
import { ref, VNode, isVNode, onUnmounted } from "vue";
import FpDialog from "../fp-dialog/fp-dialog.vue";
import { UISchema } from "@mine-monopoly/types";
import UiRenderer from "../ui-renderer/ui-renderer.vue";
import { useGameData } from "@src/store/game";

export interface Props {
	title?: string;
	content?: string | VNode | UISchema;
	duration?: number;
}

const emit = defineEmits<{
	(e: "closed"): void;
}>();

const props = withDefaults(defineProps<Props>(), {
	title: "提示",
	duration: 3000,
});

const visible = ref(false);
let timer: number | null = null;

const open = () => {
	visible.value = true;
	if (props.duration > 0) {
		timer = window.setTimeout(() => {
			close();
		}, props.duration);
	}
};

const close = () => {
	visible.value = false;
	if (timer) {
		clearTimeout(timer);
		timer = null;
	}

	setTimeout(() => {
		emit("closed");
	}, 350);
};

onUnmounted(() => {
	if (timer) clearTimeout(timer);
});

defineExpose({ open, close });
</script>

<template>
	<FpDialog
		v-model:visible="visible"
		:title="title"
		:closable="false"
		:hidden-footer="true"
		:append-to-body="true"
		style="min-width: 26rem; max-width: 90vw"
	>
		<div class="message-content">
			<component v-if="isVNode(content)" :is="content" />
			<div v-else-if="typeof content === 'string'" v-html="content"></div>
			<UiRenderer v-else :context="useGameData().$state" :schema="content as UISchema" />
		</div>

		<div v-if="visible && duration > 0" class="duration-bar" :style="{ animationDuration: `${duration}ms` }"></div>
	</FpDialog>
</template>

<style lang="scss" scoped>
.message-content {
	padding: 10px 0 20px 0;
	font-size: 1rem;
	color: #333;
	line-height: 1.5;
}
.duration-bar {
	height: 0.3rem;
	background-color: var(--color-second);
	border-radius: 0.2rem;
	animation-name: progress-shrink;
	animation-timing-function: linear;
	animation-fill-mode: forwards;
	margin-top: 0.3rem;
	width: 100%;
	transform-origin: left;
}
@keyframes progress-shrink {
	from {
		width: 100%;
	}
	to {
		width: 0%;
	}
}
</style>
