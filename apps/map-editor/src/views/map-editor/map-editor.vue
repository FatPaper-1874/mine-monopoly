<script setup lang="ts">
import { MapRenderer } from "@src/core/renderer/map-renderer";
import { useEditorStore } from "@src/stores";
import { computed, onMounted } from "vue";
import TopToolBar from "./components/ui/top-tool-bar.vue";
import EditModeUi from "./components/ui/edit-mode.vue";
import SelectModeUi from "./components/ui/select-mode.vue";
import { OperationMode } from "@src/enums";

const editorStore = useEditorStore();

onMounted(() => {
	const canvasEl = document.querySelector("#map-editor-canvas-container") as HTMLCanvasElement;
	const mapRenderer = new MapRenderer(canvasEl);
});

const modeUiMap: Record<OperationMode, any> = {
	[OperationMode.Edit]: EditModeUi,
	[OperationMode.Select]: SelectModeUi,
};

const uiContent = computed(() => modeUiMap[editorStore.currentEditMode]);
</script>

<template>
	<div class="map-editor-container">
		<div class="ui-container">
			<top-tool-bar />
			<component :is="uiContent" />
		</div>
		<canvas id="map-editor-canvas-container"> </canvas>
	</div>
</template>

<style lang="scss" scoped>
.map-editor-container {
	width: 100%;
	height: 100%;
	position: relative;

	& > .ui-container {
		width: 100%;
		height: 100%;
		position: absolute;
		left: 0;
		top: 0;
		z-index: 1000;
		display: flex;
		flex-direction: column;
		pointer-events: none;

		.mode-selector {
			margin: 10px;
		}

		& > *:last-child {
			flex: 1;
			padding: 0 10px;
		}
	}
}
#map-editor-canvas-container {
	width: 100%;
	height: 100%;
	display: block;
	pointer-events: initial;
}
</style>
