<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch, WatchStopHandle } from "vue";
import { PixiUISelector } from "./pixi-ui-selector";
import { useMapDataStore } from "@src/stores";

const uiSelectorContainer = ref<HTMLDivElement | null>(null);

let uiSelector: PixiUISelector | null = null;
let watchStopHandle: WatchStopHandle | null = null;

const emits = defineEmits(["select", "create"]);

onMounted(() => {
	uiSelector = new PixiUISelector({
		rows: 20,
		cols: 32,
		container: uiSelectorContainer.value!,
		onSelect: (ui) => {
			emits("select", ui);
		},
		onCreate: (layout) => {
			emits("create", layout);
		},
	});
	uiSelector.renderExistingUIs(useMapDataStore().customUIs);

	watchStopHandle = watch(useMapDataStore().customUIs, (newCustomUIs) => {
		uiSelector && uiSelector.renderExistingUIs(newCustomUIs);
	});
});

onBeforeUnmount(() => {
	watchStopHandle && watchStopHandle();
	uiSelector && uiSelector.destroy();
});
</script>

<template>
	<div class="selector-container" ref="uiSelectorContainer"></div>
</template>

<style lang="scss" scoped>
.selector-container {
	width: 100%;
	height: 100%;
	border-radius: 10px;
	overflow: hidden;

	& > canvas {
		display: block !important;
	}
}
</style>
