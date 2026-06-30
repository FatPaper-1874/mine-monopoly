<script setup lang="ts">
import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";
import { useUtil } from "@src/store";
import { computed } from "vue";

const utilStore = useUtil();

const modeText = computed(() => {
	switch (utilStore.connectionMode) {
		case "p2p": return "P2P";
		case "relay": return "中继";
		default: return "…";
	}
});

const modeColor = computed(() => {
	switch (utilStore.connectionMode) {
		case "p2p": return "var(--fp-color-text-success)";
		case "relay": return "var(--fp-color-text-warning)";
		default: return "var(--fp-color-text-secondary)";
	}
});

const modeTitle = computed(() => {
	switch (utilStore.connectionMode) {
		case "p2p": return "P2P 直连";
		case "relay": return "TURN 中继模式（P2P 直连失败）";
		default: return "连接中…";
	}
});
</script>

<template>
	<div
		class="connection-mode-container"
		:style="{ color: modeColor }"
		:title="modeTitle"
	>
		<FontAwesomeIcon icon="server" /> {{ modeText }}
	</div>
</template>

<style lang="scss" scoped>
.connection-mode-container {
	padding: 0.2rem;
	font-size: 1rem;
	user-select: none;
	white-space: nowrap;
}
</style>
