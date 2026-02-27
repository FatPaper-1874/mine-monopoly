<script setup lang="ts">
import { computed } from "vue";
import { useRoute } from "vue-router";
import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";
import useEventBus from "@src/utils/event-bus";
import { useSettig } from "@src/store";

const route = useRoute();
const eventBus = useEventBus();
const settingStore = useSettig();

// 只在游戏中显示
const visible = computed(() => route.name === "game");

const focusCamera = () => {
	eventBus.emit("camera:focus:self");
};
</script>

<template>
	<button v-if="visible" @click="focusCamera" class="camera-focus-button btn-small" title="回归视角">
		<FontAwesomeIcon icon="crosshairs" />
	</button>
</template>

<style lang="scss" scoped>
.camera-focus-button {
	height: 2.5rem;
	width: 2.5rem;
	border-radius: 0.5rem;
	font-size: 1.1rem;
	display: flex;
	justify-content: center;
	align-items: center;
	gap: 0.4rem;
}
</style>
