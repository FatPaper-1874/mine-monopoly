<script setup lang="ts">
import { computed } from "vue";
import { useRoute } from "vue-router";
import Ping from "./components/ping.vue";
import FullScreenButton from "./components/full-screen-button.vue";
import SettingButton from "./components/setting-button.vue";
import Help from "./components/help.vue";

const router = useRoute();
const canChat = computed(() => router.name === "room" || router.name === "game");
</script>

<template>
	<div class="status-bar">
		<Ping v-if="canChat" />
		<FullScreenButton />
		<Help />
		<SettingButton />
	</div>
</template>

<style lang="scss" scoped>
.status-bar {
	position: fixed;
	top: 0;
	right: 0;
	display: flex;
	align-items: center;
	justify-content: space-around;
  padding: .4rem;
  gap: .6rem;
	z-index: 10000;
}
</style>
