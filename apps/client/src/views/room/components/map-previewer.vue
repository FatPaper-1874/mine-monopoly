<script setup lang="ts">
import { computed, onMounted, onUnmounted } from "vue";
import { MapPreviewerRenderer } from "@src/views/room/utils/MapPreviewerRenderer";
import { GameMapInDb } from "@fatpaper-monopoly/types";
import { PROTOCOL } from "@fatpaper-monopoly/config";

const { map } = defineProps<{ map: GameMapInDb }>();

const coverImageUrl = computed(()=> `${PROTOCOL}://${map.coverUrl}`)
</script>

<template>
	<div class="map-preview">
		<div class="map-info">
			<div class="name">{{ map.name }}</div>
		</div>
		<img class="map-cover" :src="coverImageUrl"></img>
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
.map-cover {
	display: block;
	width: 100%;
	height: 100%;
	object-fit: contain;
		background-color: #ddd;
}
</style>
