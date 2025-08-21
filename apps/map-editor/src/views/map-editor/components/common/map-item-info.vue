<script setup lang="ts">
import { MapItem } from "@fatpaper-monopoly/types/interfaces/game/item";
import { computed } from "vue";

const props = defineProps<{ mapItem: MapItem }>();

// 转换旋转值为可读文本
const rotationText = computed(() => {
	const rotations = ["0° (上)", "90° (右)", "180° (下)", "270° (左)"];
	return rotations[props.mapItem.rotation] || "未知方向";
});
</script>

<template>
	<a-card size="small" class="info-card">
		<h4>MapItem详情</h4>
		<a-descriptions bordered :cloumn="3" size="small" :contentStyle="{ 'font-size': '.9em', 'max-width': '200px' }">
			<a-descriptions-item :span="3" label="ID">{{ mapItem.id }}</a-descriptions-item>
			<a-descriptions-item :span="3" label="类型">{{ mapItem.type.name }}</a-descriptions-item>
			<a-descriptions-item :span="1" label="坐标"> ({{ mapItem.x }}, {{ mapItem.y }}) </a-descriptions-item>
			<a-descriptions-item :span="2" label="方向"> {{ rotationText }} </a-descriptions-item>
			<a-descriptions-item :span="3" label="绑定的地皮" v-if="mapItem.linkto">
				{{ mapItem.linkto }}
			</a-descriptions-item>
			<a-descriptions-item :span="3" label="地皮" v-if="mapItem.beLinked">
				是的，我是地皮
			</a-descriptions-item>
		</a-descriptions>
	</a-card>
</template>

<style lang="scss" scoped>
.info-card {
	overflow-y: auto;

	:deep(.ant-descriptions-item-label) {
		font-weight: bold;
	}

	.ant-tag {
		margin-bottom: 4px;
	}

	.ant-descriptions {
		margin-top: 8px;
	}
}
</style>
