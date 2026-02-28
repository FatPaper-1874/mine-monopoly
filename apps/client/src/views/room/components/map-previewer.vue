<script setup lang="ts">
import { computed, onMounted, onUnmounted } from "vue";
import { GameMapInDb } from "@mine-monopoly/types";
import { env } from "@mine-monopoly/env";

const { map } = defineProps<{ map: GameMapInDb }>();

const coverImageUrl = computed(() => {
	const url = map.coverUrl;
	if (url.startsWith("http") || url.startsWith("blob")) return map.coverUrl;
	else return `${env("PROTOCOL")}://${map.coverUrl}`;
});
</script>

<template>
	<div class="map-preview">
		<div class="map-info">
			<div class="name">{{ map.name }}</div>
			<div class="bottom">
				<div class="version">版本: v{{ map.version }}</div>
				<div class="author">作者: {{ map.author }}</div>
			</div>
		</div>
		<div class="map-cover-container">
			<img class="map-cover" :src="coverImageUrl" />
		</div>
	</div>
</template>

<style lang="scss" scoped>
.map-preview {
	width: 100%;
	height: 100%;
	border: 0.4rem solid #ffffff;
	border-radius: 1rem;
	box-sizing: border-box;
	overflow: hidden;
	position: relative;
}
.map-info {
	width: 100%;
	height: 100%;
	z-index: 100;
	position: absolute;
	display: flex;
	flex-direction: column;
	justify-content: space-between;
	padding: 0.2rem;
	box-sizing: border-box;

	& .name {
		width: max-content;
		display: inline-block;
		padding: 0.3rem 0.5rem;
		border-radius: 0.6rem;
		background-color: var(--color-second);
		color: var(--color-text-white);
	}

	.bottom {
		display: flex;
		gap: 0.3rem;
		align-items: start;
		flex-direction: column;
	}

	& .author,
	& .version {
		width: max-content;
		padding: 0.2rem 0.3rem;
		border-radius: 0.4rem;
		font-size: 0.7rem;
		color: var(--color-text-regular);
		background-color: var(--color-bg-transparent);
	}
}
.map-cover-container {
	width: 100%;
	height: 100%;
	display: flex;
	justify-content: center;
	align-items: center;
	background-color: #ddd;
	padding: 0.5rem;
	box-sizing: border-box;
	position: absolute;
	left: 0;
	top: 0;

	.map-cover {
		display: block;
		width: auto;
		height: auto;
		object-fit: contain;
		max-width: 100%;
		max-height: 100%;
		object-fit: contain;
		margin: auto;
		border-radius: 0.6em;
	}
}
</style>
