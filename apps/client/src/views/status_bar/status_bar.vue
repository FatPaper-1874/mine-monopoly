<script setup lang="ts">
import { computed } from "vue";
import { useRoute } from "vue-router";
import Ping from "./components/ping.vue";
import Fps from "./components/fps.vue";
import FullScreenButton from "./components/full-screen-button.vue";
import SettingButton from "./components/setting-button.vue";
import Help from "./components/help.vue";
import CameraFocusButton from "./components/camera-focus-button.vue";
import MapInfoButton from "./components/map-info-button.vue";

const router = useRoute();
const canChat = computed(() => router.name === "room" || router.name === "game");
</script>

<template>
	<div class="status-bar">
		<Ping v-if="canChat" />
		<Fps v-if="canChat" />
		<!-- <FullScreenButton /> -->
		<CameraFocusButton />
		<MapInfoButton />
		<Help />
		<SettingButton />
	</div>
</template>

<style lang="scss" scoped>
.status-bar {
	position: absolute;
	top: 0;
	right: 0;
	display: flex;
	align-items: center;
	justify-content: space-around;
  padding: .4rem;
  gap: .6rem;
	z-index: var(--z-ui);
}
</style>
