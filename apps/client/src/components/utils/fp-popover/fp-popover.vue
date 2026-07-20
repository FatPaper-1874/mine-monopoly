<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from "vue";

/**
 * FpPopover — 标准气泡弹出组件
 *
 * 特性：
 * - v-model:visible 受控/非受控显隐
 * - hover / click 两种触发方式
 * - 12 个方向 placement
 * - offset 控制间距、showDelay/hideDelay 延迟
 * - 可选箭头、CSS 过渡动画、点击外部关闭
 * - expose: show() / hide() / toggle()
 */
const props = withDefaults(
	defineProps<{
		/** 弹出方向 */
		placement?: "top" | "top-start" | "top-end" | "bottom" | "bottom-start" | "bottom-end" | "left" | "left-start" | "left-end" | "right" | "right-start" | "right-end";
		/** 触发方式 */
		trigger?: "hover" | "click";
		/** 弹出层与触发器的间距 (px) */
		offset?: number;
		/** 显示延迟 (ms) */
		showDelay?: number;
		/** 隐藏延迟 (ms) */
		hideDelay?: number;
		/** 是否禁用 */
		disabled?: boolean;
		/** 是否显示小箭头 */
		showArrow?: boolean;
		/** 弹出层宽度，不设则自适应 */
		width?: number | string;
	}>(),
	{
		placement: "top",
		trigger: "hover",
		offset: 8,
		showDelay: 0,
		hideDelay: 200,
		disabled: false,
		showArrow: true,
	},
);

const visible = defineModel<boolean>("visible", { default: false });

// ---- DOM refs ----
const triggerRef = ref<HTMLElement | null>(null);

// ---- 定时器 ----
let showTimer: ReturnType<typeof setTimeout> | null = null;
let hideTimer: ReturnType<typeof setTimeout> | null = null;

function clearTimers() {
	if (showTimer) {
		clearTimeout(showTimer);
		showTimer = null;
	}
	if (hideTimer) {
		clearTimeout(hideTimer);
		hideTimer = null;
	}
}

// ---- 显隐控制 ----
function show() {
	if (props.disabled) return;
	clearTimers();
	if (props.showDelay > 0) {
		showTimer = setTimeout(() => {
			visible.value = true;
		}, props.showDelay);
	} else {
		visible.value = true;
	}
}

function hide() {
	clearTimers();
	if (props.hideDelay > 0) {
		hideTimer = setTimeout(() => {
			visible.value = false;
		}, props.hideDelay);
	} else {
		visible.value = false;
	}
}

function toggle() {
	if (visible.value) {
		hide();
	} else {
		show();
	}
}

function handleTriggerClick() {
	if (props.trigger === "click") {
		toggle();
	}
}

// ---- 点击外部关闭 (click 模式) ----
function onDocumentClick(event: MouseEvent) {
	if (props.trigger !== "click" || !visible.value) return;
	const target = event.target as Node;
	if (triggerRef.value && !triggerRef.value.contains(target)) {
		hide();
	}
}

onMounted(() => {
	document.addEventListener("click", onDocumentClick, true);
});

onBeforeUnmount(() => {
	document.removeEventListener("click", onDocumentClick, true);
	clearTimers();
});

defineExpose({ show, hide, toggle });

// ---- 位置计算 ----
type Align = "center" | "start" | "end";

interface PlacementInfo {
	side: "top" | "bottom" | "left" | "right";
	align: Align;
}

function parsePlacement(p: typeof props.placement): PlacementInfo {
	const [side, align = "center"] = p.split("-") as [PlacementInfo["side"], Align | undefined];
	return { side, align };
}

const placementInfo = computed(() => parsePlacement(props.placement));

const contentStyle = computed(() => {
	const { side } = placementInfo.value;
	const o = `${props.offset}px`;
	const style: Record<string, string> = {};

	// 主轴定位 (side) — 只用 top/right/bottom/left + margin，不用 transform
	switch (side) {
		case "top":
			style.bottom = "100%";
			style.marginBottom = o;
			break;
		case "bottom":
			style.top = "100%";
			style.marginTop = o;
			break;
		case "left":
			style.right = "100%";
			style.marginRight = o;
			break;
		case "right":
			style.left = "100%";
			style.marginLeft = o;
			break;
	}

	// 副轴对齐 (align) — 对齐锚点，最终居中由 inner 的 transform 完成
	if (side === "top" || side === "bottom") {
		switch (placementInfo.value.align) {
			case "start":
				style.left = "0";
				break;
			case "end":
				style.right = "0";
				break;
			default:
				style.left = "50%";
				break;
		}
	} else {
		switch (placementInfo.value.align) {
			case "start":
				style.top = "0";
				break;
			case "end":
				style.bottom = "0";
				break;
			default:
				style.top = "50%";
				break;
		}
	}

	if (props.width != null) {
		style.width = typeof props.width === "number" ? `${props.width}px` : props.width;
	}

	return style;
});

/** 内容内层的居中 transform（不干扰 wrapper 上的 Transition 动画） */
const innerTransform = computed(() => {
	const { side, align } = placementInfo.value;

	if (side === "top" || side === "bottom") {
		return align === "center" ? "translateX(-50%)" : "";
	}
	return align === "center" ? "translateY(-50%)" : "";
});

/**
 * 箭头的副轴对齐。
 *
 * 关键：wrapper 的副轴定位方式与 content 的居中 transform 配合后，
 * content 的副轴中心始终落在 wrapper 的 0 坐标处。
 * - center: wrapper left/top = 50%（相对 fp-popover），content translate(-50%) 将其中心拉回 wrapper 的 0 处
 * - start:  wrapper left/top = 0，content 无偏移，content 边缘在 wrapper 0 处
 * - end:    wrapper right/bottom = 0，content 无偏移，content 边缘在 wrapper 边缘
 *
 * 因此箭头在 wrapper 内的位置：
 * - center: 对齐 wrapper 的 0（即 content 中心）= left/top: 0
 * - start:  对齐 content 起始边 + 12px 内边距 = left/top: 12px
 * - end:    对齐 content 结束边 - 12px 内边距 = right/bottom: 12px
 */
const arrowAlignStyle = computed(() => {
	const { side, align } = placementInfo.value;
	const style: Record<string, string> = {};

	if (side === "top" || side === "bottom") {
		switch (align) {
			case "start":  style.left = "12px"; break;
			case "end":    style.right = "12px"; break;
			default:       style.left = "0"; break;
		}
	} else {
		switch (align) {
			case "start":  style.top = "12px"; break;
			case "end":    style.bottom = "12px"; break;
			default:       style.top = "0"; break;
		}
	}
	return style;
});

/** 箭头的 border 三角形 CSS 类 */
const arrowClass = computed(() => `fp-popover__arrow--${placementInfo.value.side}`);
</script>

<template>
	<div
		ref="triggerRef"
		class="fp-popover"
		@mouseenter="trigger === 'hover' ? show() : undefined"
		@mouseleave="trigger === 'hover' ? hide() : undefined"
		@click="handleTriggerClick"
	>
		<!-- 触发器（默认插槽） -->
		<slot />

		<!-- 弹出内容 -->
		<Transition name="fp-popover-fade">
			<div
				v-if="visible"
				class="fp-popover__content-wrapper"
				:style="contentStyle"
			>
				<!-- 箭头（border 三角形，放在 content 外层避免 felt 纹理遮挡） -->
				<div
					v-if="showArrow"
					:class="arrowClass"
					class="fp-popover__arrow"
					:style="arrowAlignStyle"
				/>
				<div
					class="fp-popover__content"
					:style="innerTransform ? { transform: innerTransform } : undefined"
				>
					<slot name="content" />
				</div>
			</div>
		</Transition>
	</div>
</template>

<style lang="scss" scoped>
@use "@src/assets/variables" as *;

.fp-popover {
	position: relative;
	display: inline-flex;

	// 如果希望默认插槽也有背景，可取消下方注释：
	// & > :slotted(*) {
	//   background-image: var(--fp-texture-felt);
	// }
}

/* ---- 弹出内容外层（定位用） ---- */
.fp-popover__content-wrapper {
	position: absolute;
	z-index: var(--z-popover, 1000);
	pointer-events: auto;
}

/* ---- 弹出内容内层（视觉 & 动画） ---- */
.fp-popover__content {
	// 标准 felt 纹理背景
	// @include felt-patch(var(--fp-color-bg-light));
  background-image: var(--fp-texture-felt);
  background-color: var(--fp-color-bg-light);
	padding: 0.5em 0.8em;
	border-radius: 0.5rem;
	box-shadow: 0 2px 12px rgba(0, 0, 0, 0.15);
	box-sizing: border-box;
	white-space: nowrap;
}

/* ---- 箭头（border 三角形，放在 wrapper 层避开 felt 纹理） ---- */
.fp-popover__arrow {
	position: absolute;
	width: 0;
	height: 0;
	border: 6px solid transparent;
	pointer-events: none;
}

/* 指向下方（popover 在触发器上方） */
.fp-popover__arrow--top {
	bottom: -6px;
	border-top-color: var(--fp-color-bg-light);
	border-bottom: none;
}

/* 指向上方（popover 在触发器下方） */
.fp-popover__arrow--bottom {
	top: -6px;
	border-bottom-color: var(--fp-color-bg-light);
	border-top: none;
}

/* 指向右方（popover 在触发器左侧） */
.fp-popover__arrow--left {
	right: -6px;
	border-left-color: var(--fp-color-bg-light);
	border-right: none;
}

/* 指向左方（popover 在触发器右侧） */
.fp-popover__arrow--right {
	left: -6px;
	border-right-color: var(--fp-color-bg-light);
	border-left: none;
}

/* ---- 过渡动画（作用于内层 .fp-popover__content，不干扰外层定位 transform） ---- */
.fp-popover-fade-enter-active,
.fp-popover-fade-leave-active {
	transition:
		opacity 0.15s ease,
		transform 0.15s ease;
}

.fp-popover-fade-enter-from,
.fp-popover-fade-leave-to {
	opacity: 0;
	transform: scale(0.92);
}
</style>
