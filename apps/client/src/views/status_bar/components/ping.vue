<script setup lang="ts">
import { useGameInfo } from "@src/store";
import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";
import { computed } from "vue";
const gameInfoStore = useGameInfo();
const pingTextColor = computed(() => {
	const ping = gameInfoStore.ping;
	let colorName = "success";
	if (ping > 30) {
		colorName = "warning";
	} else if (ping > 50) {
		colorName = "error";
	}
	return colorName;
});
</script>

<template>
	<div class="ping-container" :style="{ color: `var(--color-text-${pingTextColor})` }">
		<FontAwesomeIcon icon="wifi" /> {{ gameInfoStore.ping }}ms
	</div>
</template>

<style lang="scss" scoped>
.ping-container {
	padding: 0.2rem;
	font-size: 1rem;
	user-select: none;
}
</style>
