<script setup lang="ts">
import { useEditorStore, useMapDataStore } from "./stores";
import Header from "./views/header.vue";
import MapEditor from "./views/map-editor/map-editor.vue";
import { TitleBar } from "@fatpaper-monopoly/ui";
import MapEditorAlert from "@src/components/map-edior-alert/index.vue";

const mapName = useMapDataStore().name;
const version = window.electronAPI.getVersion();
const isLoading = useEditorStore().isLoading;
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
				<span style="font-size: 12px">FatPaper-Monopoly 地图编辑器 v{{ version }}</span>
				<span v-if="mapName" style="font-size: 12px; margin-left: 10px">当前地图: {{ mapName }}</span>
			</template>
		</TitleBar>
		<Header />
		<div class="main-container">
			<map-editor />
		</div>
	</a-config-provider>
	<map-editor-alert />
</template>

<style lang="scss" scoped>
.main-container {
	flex: 1;
	display: flex;
	position: relative;
}
</style>
