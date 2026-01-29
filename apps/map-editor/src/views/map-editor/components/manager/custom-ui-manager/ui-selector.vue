<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch, nextTick } from "vue";
import { PixiUISelector } from "./pixi-ui-selector";
import { useMapDataStore } from "@src/stores";
import { CustomUI } from "@mine-monopoly/types";

const mapStore = useMapDataStore();
const uiSelectorContainer = ref<HTMLDivElement | null>(null);

let uiSelector: PixiUISelector | null = null;
let resizeObserver: ResizeObserver | null = null;
let isInitialized = false; // 标记是否已初始化

const emits = defineEmits<{
	(e: "select", ui: CustomUI): void;
	(e: "create", layout: { x: number; y: number; width: number; height: number }): void;
}>();

// 初始化核心逻辑
const initPixi = async () => {
	if (isInitialized || !uiSelectorContainer.value) return;

	// 再次检查尺寸，双重保险
	const { clientWidth, clientHeight } = uiSelectorContainer.value;
	if (clientWidth === 0 || clientHeight === 0) return;

	// 1. 实例化
	uiSelector = new PixiUISelector({
		rows: 20,
		cols: 32,
		container: uiSelectorContainer.value,
		onSelect: (ui) => emits("select", ui),
		onCreate: (layout) => emits("create", layout),
	});

	// 2. 初始化
	await uiSelector.init();
	isInitialized = true;

	// 3. 渲染现有数据
	render();
};

onMounted(() => {
	if (!uiSelectorContainer.value) return;

	// 使用 ResizeObserver 监听容器大小变化
	// 这可以完美解决 v-show 从 display:none 变为 block 的时刻
	resizeObserver = new ResizeObserver((entries) => {
		for (const entry of entries) {
			const { width, height } = entry.contentRect;
			if (width > 0 && height > 0 && !isInitialized) {
				initPixi();
			}
		}
	});

	resizeObserver.observe(uiSelectorContainer.value);
});

watch(
	() => mapStore.customUIs,
	() => {
		if (isInitialized) render();
	},
	{ deep: true },
);

function render() {
	if (uiSelector && mapStore.customUIs) {
		const rawData = JSON.parse(JSON.stringify(mapStore.customUIs));
		uiSelector.renderExistingUIs(rawData);
	}
}

onBeforeUnmount(() => {
	if (resizeObserver) resizeObserver.disconnect();
	if (uiSelector) {
		uiSelector.destroy();
		uiSelector = null;
	}
});
</script>

<template>
	<div class="selector-wrapper">
		<div class="selector-container" ref="uiSelectorContainer"></div>
	</div>
</template>

<style lang="scss" scoped>
.selector-wrapper {
	width: 100%;
	height: 100%;
	position: relative;
	background: #1e1e1e; /* 确保背景色，方便调试 */
	overflow: hidden;
	border-radius: 8px;
}

.selector-container {
	width: 100%;
	height: 100%;

	:deep(canvas) {
		display: block;
	}
}
</style>
