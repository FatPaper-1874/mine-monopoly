<script setup lang="ts">
import { computed } from "vue";
import { useRoute } from "vue-router";
import useEventBus from "@src/utils/event-bus";
import { useSettig } from "@src/store";
import type { ViewMode } from "@src/core/renderer/CameraRig";

const route = useRoute();
const eventBus = useEventBus();
const settingStore = useSettig();

// 只在游戏中显示
const visible = computed(() => route.name === "game");

// 文字表示"当前模式"：3D = 立体，2D = 俯视棋盘
const isTopDown = computed(() => settingStore.viewMode === "top-down");
const label = computed(() => (isTopDown.value ? "2D" : "3D"));
const title = computed(() => (isTopDown.value ? "当前视图：2D 俯视棋盘（点击切换到 3D）" : "当前视图：3D 立体（点击切换到 2D）"));

const toggle = () => {
	const mode: ViewMode = isTopDown.value ? "3d" : "top-down";
	settingStore.viewMode = mode;
	eventBus.emit("graphics:viewMode:change", { mode });
};
</script>

<template>
	<button v-if="visible" @click="toggle" class="view-mode-button btn-small" :title="title">
		{{ label }}
	</button>
</template>

<style lang="scss" scoped>
.view-mode-button {
  height: 2.5rem;
  width: 2.5rem;
  border-radius: 0.5rem;
  font-size: 0.95rem;
  font-weight: 600;
  letter-spacing: 0.02em;
  display: flex;
  justify-content: center;
  align-items: center;
}
</style>
