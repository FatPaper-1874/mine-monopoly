<script setup lang="ts">
import { Music } from "@src/interfaces/bace";
import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";

const props = defineProps<{ music: Music; isPlaying: boolean }>();
</script>

<template>
	<div class="music_list-item">
		<div class="container">
			<span class="name">{{ music.name }}</span>
			<FontAwesomeIcon class="icon" v-if="isPlaying" spin icon="compact-disc" />
		</div>
	</div>
</template>

<style scoped lang="scss">
.music_list-item {
	width: 100%;
	height: 1.5rem;
	border-radius: 0.3rem;
	margin: 0.4rem 0;
	display: flex;
	justify-self: center;
	padding: 0 0.4rem;
	box-sizing: border-box;
	background-color: rgba(255, 255, 255, 0.75);
	color: var(--color-primary);
	cursor: pointer;

	&:hover {
		background-color: var(--color-third);
		color: var(--color-text-white);
	}

	& > .container {
		height: 100%;
		width: 100%;
		display: flex;
		justify-content: space-between;
		align-items: center;
		vertical-align: top;
		overflow: hidden;
		white-space: nowrap;
		line-height: 1.5rem;
	}
}

@keyframes scroll {
	0% {
		margin-left: 0;
		transform: translateX(0);
	}

	10% {
		margin-left: 0;
		transform: translateX(0);
	}

	90% {
		margin-left: 100%;
		transform: translateX(-100%);
	}

	100% {
		margin-left: 100%;
		transform: translateX(-100%);
	}
}
</style>
