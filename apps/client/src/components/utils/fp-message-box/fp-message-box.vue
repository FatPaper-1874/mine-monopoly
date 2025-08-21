<script setup lang="ts">
import { ref, onMounted, VNode, render, isVNode } from "vue";
import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";

export interface Props {
	title?: string;
	content?: any;
	confirmText?: string;
	cancelText?: string;
}
const props = withDefaults(defineProps<Props>(), {
	title: "Message Box",
	content: "test",
	confirmText: "确认",
	cancelText: "取消",
});

const ContentContainer = ref<HTMLElement | null>(null);
const visible = ref(false);
const isConfirm = ref(true);

function handleCancle(){
	isConfirm.value = false;
	visible.value = false;
};
function handleConfirm(){
	visible.value = false;
};

onMounted(() => {
	if (typeof props.content !== "string") {
		const vnode = props.content;

		if (isVNode(vnode) && ContentContainer.value) {
			render(vnode, ContentContainer.value);
		}
	}
});

defineExpose({
	visible,
	isConfirm,
});
</script>

<template>
	<div class="fp-message-box__overlay" v-show="visible">
		<div class="fp-message-box">
			<div class="fp-message-box__title">
				<span>{{ title }}</span>
				<!-- <FontAwesomeIcon @click="handleCancle" class="close__btn" icon="close"></FontAwesomeIcon> -->
			</div>
			<div ref="ContentContainer" class="fp-message-box__content"></div>
			<div class="fp-message-box__footer">
				<button class="confirm__btn" @click="handleConfirm">{{ confirmText }}</button>
				<button class="cancle__btn" @click="handleCancle">{{ cancelText }}</button>
			</div>
		</div>
	</div>
</template>

<style lang="scss" scoped>
.fp-message-box__overlay {
	position: fixed;
	top: 0;
	left: 0;
	width: 100%;
	height: 100%;
	z-index: 4000;
	background-color: rgba($color: #000000, $alpha: 0.3);

	& > .fp-message-box {
		position: absolute;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		min-width: 26rem;
		min-height: 16rem;
		background-color: var(--color-bg-light);
		display: flex;
		flex-direction: column;
		justify-content: space-between;
		border-radius: 0.6rem;
		box-shadow: var(--box-shadow);
		overflow: hidden;
		z-index: 4001;
	}
}

.fp-message-box__title {
	font-size: 1.4rem;
	height: 2.4rem;
	line-height: 2.4rem;
	background-color: var(--color-third);
	color: var(--color-text-white);
	padding: 0 0.5rem;
	display: flex;
	justify-content: space-between;
	align-items: center;
	text-shadow: var(--text-shadow);

	& > .close__btn {
		cursor: pointer;
	}
}

.fp-message-box__content {
	flex: 1;
	padding: 1.2rem 0.5rem;
}

.fp-message-box__footer {
	width: 100%;
	padding: 0.5rem;
	box-sizing: border-box;

	& > button {
		float: right;
		padding: 0.5rem 1rem;
		border-radius: 0.3rem;
		margin-left: 0.6rem;
	}
}
</style>
