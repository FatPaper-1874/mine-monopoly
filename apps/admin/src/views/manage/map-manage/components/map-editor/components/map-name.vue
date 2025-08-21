<script setup lang="ts">
import { MapData } from "@/interfaces/interfaces";
import { updateMapName } from "@/utils/api/map";
import { inject, ref, watch } from "vue";

const mapInfo = inject<MapData>("mapInfo")!;
const mapName = ref(mapInfo.name);

watch(mapInfo, (newMapInfo) => {
	mapName.value = newMapInfo.name;
});

function handleUpdateMapName() {
	if (mapInfo) updateMapName(mapInfo.id, mapName.value);
}
</script>

<template>
	<div class="map-name">
		<el-input size="small" class="map-name-input" v-model="mapName" placeholder="请输入地图名称"></el-input>
		<el-button
			size="small"
			class="map-name-submit"
			@click="handleUpdateMapName"
			type="primary"
			style="margin-left: 10px"
			>更改地图名称</el-button
		>
	</div>
</template>

<style lang="scss" scoped>
.map-name {
	padding: 10px;
	background-color: #ffffff;
	display: flex;
	justify-content: space-around;

	& > .map-name-input,
	& > .map-name-submit {
		display: inline-block;
	}
}
</style>
