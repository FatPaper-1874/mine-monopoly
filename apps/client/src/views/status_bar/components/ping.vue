<script setup lang="ts">
import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";
import { useUtil } from "@src/store";
import { computed } from "vue";
const utilStore = useUtil();
const pingTextColor = computed(() => {
	const ping = utilStore.ping;
	let colorName = "success";
	if (ping > 500) {
		colorName = "error";
	} else if (ping > 150) {
		colorName = "warning";
	}
	return colorName;
});
</script>

<template>
	<div
		class="ping-container"
		:style="{ color: `var(--fp-color-text-${pingTextColor})` }"
		:title="`当前往返延迟：${utilStore.ping}ms`"
	>
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
