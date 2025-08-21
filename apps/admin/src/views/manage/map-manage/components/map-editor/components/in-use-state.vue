<script setup lang="ts">
import { MapData } from "@/interfaces/interfaces";
import { updateMapInUse } from "@/utils/api/map";
import { inject, ref, watch } from "vue";

const mapInfo = inject<MapData>("mapInfo")!;
const emits = defineEmits(["isUseChanged"]);
const inUse = ref(mapInfo.inUse);

watch(mapInfo, (newMapInfo) => {
	inUse.value = newMapInfo.inUse;
});

const isLoading = ref(false);
const handleUpdateMapInUse = async () => {
	isLoading.value = true;
	if (mapInfo) await updateMapInUse(mapInfo.id, inUse.value);
	isLoading.value = false;
};
</script>

<template>
	<div v-loading="isLoading" class="in-use-state">
		<span>启动地图才会刷新地图缓存, 用户才能使用到最新更新的地图</span><br/>
		<el-switch
			inline-prompt
			style="--el-switch-on-color: #13ce66; --el-switch-off-color: #ff4949"
			v-model="inUse"
			active-text="地图启用中"
			inactive-text="地图停用中"
			@change="handleUpdateMapInUse"
		></el-switch>
	</div>
</template>

<style lang="scss" scoped>
.in-use-state {
	padding: 6px 12px;
	background: #fff;

	&>span{
		font-size: 12px;
		font-weight: bold;
		color: #3d3d3d;
	}
}
</style>
