<script setup lang="ts">
import { type CSSProperties } from "vue";
import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";
import gsap from "gsap";
import { vStagger } from "@src/directives";

/**
 * Props 定义
 * 使用 defineModel 实现 visible 的双向绑定
 */
const visible = defineModel<boolean>("visible", { default: false });

const props = withDefaults(
	defineProps<{
		title?: string;
		closable?: boolean;
		submitDisable?: boolean;
		hiddenFooter?: boolean;
		style?: CSSProperties | string; // 兼容字符串和对象写法
		appendToBody?: boolean; // 可选：是否传送到 body
		confirmText?: string; // 确认按钮文本
		cancelText?: string; // 取消按钮文本（如果提供，则显示取消按钮）
	}>(),
	{
		closable: true,
		submitDisable: false,
		hiddenFooter: false,
		style: "",
		appendToBody: true,
		confirmText: "确认",
	}
);

const emits = defineEmits<{
	(e: "submit"): void;
	(e: "cancel"): void;
}>();

function handleSubmit() {
	emits("submit");
	visible.value = false;
}

function closeDialog() {
	if (!props.closable) return;
	emits("cancel");
	visible.value = false;
}

function onEnter(el: Element, done: () => void) {
	const modal = el.querySelector(".fp-dialog-modal") as HTMLElement;
	const main = el.querySelector(".fp-dialog-main") as HTMLElement;
	gsap.set([modal, main], { willChange: "transform, opacity" });
	const tl = gsap.timeline({
		onComplete: () => {
			gsap.set([modal, main], { clearProps: "willChange" });
			done();
		},
	});
	tl.fromTo(modal, { opacity: 0 }, { opacity: 1, duration: 0.06 });
	tl.fromTo(
		main,
		{ scale: 0.85, opacity: 0 },
		{ scale: 1, opacity: 1, duration: 0.12, ease: "power2.out" },
		"<",
	);
}

function onLeave(el: Element, done: () => void) {
	const tl = gsap.timeline({
		onComplete: () => {
			gsap.set(el, { clearProps: "willChange" });
			done();
		},
	});
	tl.to(el, { opacity: 0, duration: 0.08, willChange: "opacity" });
}
</script>

<template>
	<Teleport to="body" :disabled="!appendToBody">
		<Transition :css="false" @enter="onEnter" @leave="onLeave">
			<div class="fp-dialog" v-if="visible">
				<div class="fp-dialog-modal" @click="closeDialog"></div>

				<div class="fp-dialog-main" :style="props.style" v-stagger.sound="50">
					<div class="fp-dialog-header">
						<div class="title">
							<span v-if="title">{{ title }}</span>
							<slot v-else name="title">默认标题</slot>
						</div>
						<button v-if="closable" class="close-button btn-small" @click="closeDialog">
							<FontAwesomeIcon icon="close" />
						</button>
					</div>

					<div class="fp-dialog-body">
						<slot></slot>
					</div>

					<div class="fp-dialog-footer" v-if="!hiddenFooter">
						<button v-if="cancelText" class="btn-gray" @click="closeDialog">{{ cancelText }}</button>
						<button :disabled="submitDisable" @click="handleSubmit">{{ confirmText }}</button>
					</div>
				</div>
			</div>
		</Transition>
	</Teleport>
</template>

<style lang="scss" scoped>
@use "@src/assets/variables" as *;
@use "@mine-monopoly/style/variables" as fp;

.fp-dialog {
	position: fixed;
	top: 0;
	left: 0;
	width: 100%;
	height: 100%;
	z-index: var(--z-dialog, 2000); // 给个默认值防止变量未定义
	display: flex;
	align-items: center;
	justify-content: center;
	// 移除 transition: 0.3s; 应该由 Vue Transition 组件控制
	pointer-events: initial;
	box-sizing: border-box;

	.fp-dialog-modal {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%; // 改为 100% 适应 Teleport 后的视口
		background-color: rgba(0, 0, 0, 0.5); //稍微加深一点遮罩
		user-select: none;
		pointer-events: auto;
	}

	.fp-dialog-main {
		@include felt-patch(var(--fp-color-bg-light));

		min-width: 30em;
		// min-height: 20em;
		max-width: 90vw;
		max-height: 80vh;
		position: relative;
		display: flex;
		flex-direction: column;
		justify-content: space-between;
		z-index: 1; // 只需要比 modal 高即可
		pointer-events: initial;
	}

	.fp-dialog-header {
		min-height: 2rem;
		position: relative;
		margin-bottom: 0.5rem;
		z-index: 10;

		.title {
			@include felt-patch(var(--fp-color-tertiary));
			position: absolute;
			top: -1.6rem;
			color: var(--fp-color-text-white);
			text-shadow: var(--fp-text-shadow);
			position: absolute;
			z-index: 10;
			transform: rotate(-1.8deg);
		}

		.close-button {
			width: 2rem;
			height: 2rem;
			font-size: 1rem;
			position: absolute;
			right: 0;
			display: flex;
			justify-content: center;
			align-items: center;
			background-color: var(--fp-color-tertiary);
		}
	}

	.fp-dialog-body {
		flex: 1;
		padding: 0.5rem 1.2em;
		overflow-y: auto;
	}

	.fp-dialog-footer {
		display: flex;
		justify-content: flex-end;
		gap: 0.75rem;
		padding: 0.6rem;

		button {
			padding: 0.5em 1.2em;
			border-radius: 6px;
			font-size: 1rem;
			cursor: pointer;
			border: none;
			transition: filter 0.2s;

		}
	}
}

</style>
