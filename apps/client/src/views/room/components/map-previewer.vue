<script setup lang="ts">
import { GameMap } from "@src/interfaces/game";
import { onMounted, onUnmounted } from "vue";
import { MapPreviewerRenderer } from "@src/views/room/utils/MapPreviewerRenderer";

const { map } = defineProps<{ map: GameMap }>();

let mapPreview: MapPreviewerRenderer;

onMounted(async () => {
	const threeCanvas = document.getElementById(map.id) as HTMLCanvasElement;
	mapPreview = new MapPreviewerRenderer(threeCanvas);
	await mapPreview.loadModels(map.itemTypes);
	await mapPreview.loadMapItems(map.mapItems);
	mapPreview.lockCamera(true);
});

onUnmounted(() => {
	if (mapPreview) mapPreview.destroy();
});
</script>

<template>
	<div class="map-preview">
		<div class="map-info">
			<div class="name">{{ map.name }}</div>
		</div>
		<canvas class="map-preview__canvas" :id="map.id"></canvas>
	</div>
</template>

<style lang="scss" scoped>
.map-preview {
	width: 30rem;
	height: 20rem;
	border: 5px solid #ffffff;
	border-radius: 10px;
	overflow: hidden;
	position: relative;
}
.map-info {
	position: absolute;
	width: 100%;
	height: 100%;
	left: 0;
	top: 0;
	z-index: 100;

	& > .name {
		width: auto;
		display: inline-block;
		padding: 0.6em 1em;
		border-radius: 0 5px 5px 5px;
		background-color: var(--color-second);
		color: var(--color-text-white);
	}
}
.map-preview__canvas {
	display: block;
	width: 100%;
	height: 100%;
}
</style>
