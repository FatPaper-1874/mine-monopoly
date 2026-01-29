<script setup lang="ts">
import { useEditorStore, useMapDataStore } from "./stores";
import Header from "./views/header.vue";
import MapEditor from "./views/map-editor/map-editor.vue";
import { TitleBar } from "@mine-monopoly/ui";
import MapEditorAlert from "@src/components/map-edior-alert/index.vue";
import Update from "@src/components/common/update.vue";
import { onMounted, onUnmounted } from "vue";
import { eventBus } from "./utils/event-bus";
import { loadMapDataFromPath } from "./utils/file";

const version = window.electronAPI.getVersion();
const isLoading = useEditorStore().isLoading;

let removeListener: (() => void) | undefined;

const handleOpenMap = async (filePath: string) => {
	console.log("收到文件路径，开始加载:", filePath);
	await loadMapDataFromPath(filePath);
};

onMounted(() => {
	// 1. 先注册监听 (应对热启动，以及冷启动的回调)
	if (window.electronAPI) {
		removeListener = window.electronAPI.onOpenMapFile((filePath) => {
			handleOpenMap(filePath);
		});

		// 2. 发送就绪信号 (触发冷启动的数据推送)
		window.electronAPI.rendererReady();
	}
});

onUnmounted(() => {
	removeListener && removeListener();
});
</script>

<template>
	<a-config-provider
		:theme="{
			token: {
				// colorPrimary: '#222222',
			},
		}"
	>
		<TitleBar :bg-color="'#2e2e2e'">
			<template #title>
				<img style="width: 16px; height: 16px; margin-right: 6px" src="/logo.ico" alt="" />
				<span style="font-size: 12px">FatPaper-Monopoly 地图编辑器 v{{ version }}</span>
			</template>
		</TitleBar>
		<Header />
		<div class="main-container">
			<map-editor />
		</div>
	</a-config-provider>
	<map-editor-alert />
	<Update />
</template>

<style lang="scss" scoped>
.main-container {
	flex: 1;
	display: flex;
	position: relative;
}
</style>
