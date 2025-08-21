<script setup lang="ts">
import { useDeviceStatus } from "@src/store";
import { exitFullScreen, requestFullScreen } from "@src/utils";
import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";
import { computed } from "vue";

const deviceStatusStore = useDeviceStatus();
const isFullScreen = computed(() => deviceStatusStore.isFullScreen);

function handleFullScreen() {
	isFullScreen.value ? exitFullScreen() : requestFullScreen();
}
</script>

<template>
	<button @click="handleFullScreen" class="full-screen-button">
		<span>{{ isFullScreen ? "退出全屏" : "全屏" }}</span>
		<FontAwesomeIcon :icon="isFullScreen ? 'compress' : 'expand'" />
	</button>
</template>

<style lang="scss" scoped>
.full-screen-button {
	height: 2.5rem;
	border: 0.2rem solid rgba($color: #fff, $alpha: 0.75);
	border-radius: 0.5rem;
	font-size: 1.1rem;
	display: flex;
	justify-content: center;
	align-items: center;
	gap: 0.4rem;
}
</style>
