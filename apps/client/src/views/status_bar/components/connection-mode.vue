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
	const lines = [
		`链路模式：${utilStore.connectionMode === "relay" ? "TURN 中继" : utilStore.connectionMode === "p2p" ? "P2P 直连" : "连接中"}`,
		`连接策略：${utilStore.connectionPolicy === "relay" ? "强制 TURN 中继" : "优先 P2P 直连"}`,
		`连接状态：${utilStore.connectionStatusText}`,
	];
	if (utilStore.connectionStatusReason) {
		lines.push(`最近原因：${utilStore.connectionStatusReason}`);
	}
	if (utilStore.connectionReconnectAttempt > 0) {
		lines.push(`重连次数：第 ${utilStore.connectionReconnectAttempt} 次`);
	}
	return lines.join("\n");
});

const detailText = computed(() => {
	if (utilStore.connectionReconnectAttempt > 0) {
		return `重连 ${utilStore.connectionReconnectAttempt}`;
	}
	return utilStore.connectionPolicy === "relay" ? "稳定优先" : "";
});
</script>

<template>
	<div
		class="connection-mode-container"
		:style="{ color: modeColor }"
		:title="modeTitle"
	>
		<FontAwesomeIcon icon="server" />
		<span>{{ modeText }}</span>
		<span v-if="detailText" class="connection-mode-detail">{{ detailText }}</span>
	</div>
</template>

<style lang="scss" scoped>
.connection-mode-container {
	display: inline-flex;
	align-items: center;
	gap: 0.3rem;
	padding: 0.2rem;
	font-size: 1rem;
	user-select: none;
	white-space: nowrap;
}

.connection-mode-detail {
	font-size: 0.75rem;
	opacity: 0.8;
}
</style>
