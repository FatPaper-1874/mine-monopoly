<script setup lang="ts">
import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";
import { useUtil } from "@src/store";
import { computed } from "vue";
const utilStore = useUtil();
const pingTextColor = computed(() => {
	const ping = utilStore.ping;
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
	<div class="ping-container" :style="{ color: `var(--color-text-${pingTextColor})` }" title="网络延迟">
		<FontAwesomeIcon icon="wifi" /> {{ utilStore.ping }}ms
	</div>
</template>

<style lang="scss" scoped>
.ping-container {
	padding: 0.2rem;
	font-size: 1rem;
	user-select: none;
}
</style>
