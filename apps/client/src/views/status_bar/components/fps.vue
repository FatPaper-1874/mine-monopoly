<script setup lang="ts">
import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";
import { useUtil } from "@src/store";
import { computed } from "vue";
const utilStore = useUtil();
const fpsTextColor = computed(() => {
	const fps = utilStore.fps;
	let colorName = "success";
	if (fps < 30) {
		colorName = "error";
	} else if (fps < 50) {
		colorName = "warning";
	}
	return colorName;
});
</script>

<template>
	<div class="fps-container" :style="{ color: `var(--color-text-${fpsTextColor})` }" title="帧率">
		<FontAwesomeIcon icon="gauge-high" /> {{ utilStore.fps }} FPS
	</div>
</template>

<style lang="scss" scoped>
.fps-container {
	padding: 0.2rem;
	font-size: 1rem;
	user-select: none;
}
</style>
