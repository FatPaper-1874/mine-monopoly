<script setup lang="ts">
import { computed, onMounted, onUnmounted } from "vue";
import { PROTOCOL } from "@fatpaper-monopoly/config";
import { RoleInRoom } from "@fatpaper-monopoly/types";

const { role } = defineProps<{ role: RoleInRoom }>();

const roleImageUrl = computed(() => `${role.imageUrl}`);
</script>

<template>
	<div class="role-preview">
		<div class="role-info">
			<div class="name" :style="{ 'background-color': role.color }">{{ role.name }}</div>
		</div>
		<div class="role-image-container">
			<img class="role-image" :src="roleImageUrl" />
		</div>
	</div>
</template>

<style lang="scss" scoped>
.role-preview {
	width: 100%;
	aspect-ratio: 0.75;
	border: 0.4rem solid #ffffff;
	border-radius: 1rem;
	box-sizing: border-box;
	overflow: hidden;
	position: relative;
	cursor: pointer;
}
.role-info {
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
		border-radius: 0 0.6em 0.6em 0.6em;
		background-color: var(--color-second);
		color: var(--color-text-white);
	}
}
.role-image-container {
	width: 100%;
	height: 100%;
	display: flex;
	justify-content: center;
	align-items: center;
	background-color: #e4e4e4;
	padding: 0.5rem;
	box-sizing: border-box;

	.role-image {
		display: block;
		width: auto;
		height: auto;
		object-fit: contain;
		max-width: 100%;
		max-height: 100%;
		object-fit: contain;
		margin: auto;
	}
}
</style>
