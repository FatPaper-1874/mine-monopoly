<script setup lang="ts">
import { MapEvent } from "@mine-monopoly/types/interfaces/game/item";
import { useResourceStore } from "@src/stores";
import { computed } from "vue";
import { convertToFpUrl } from "@src/utils/file";

const props = defineProps<{ mapEvent: MapEvent }>();
const emits = defineEmits<{
	edit: [id: string];
	delete: [id: string];
}>();

const resourceStore = useResourceStore();

// 优化：直接使用 computed 计算 URL，store 变化时自动更新
const iconPreview = computed(() => {
	const imageResource = resourceStore.findImageById(props.mapEvent.iconId);
	if (!imageResource) return "";
	// 将 store 中存储的本地路径转换为 fp-file 协议 URL
	return imageResource.url;
});

function handleEdit() {
	emits("edit", props.mapEvent.id);
}

function handleDelete() {
	emits("delete", props.mapEvent.id);
}
</script>

<template>
	<a-card
		:bodyStyle="{
			display: 'flex',
			'justify-content': 'center',
			'align-items': 'center',
			flex: 1,
			width: '100%',
			'background-color': '#eeeeee',
		}"
		class="map-event-card"
		size="small"
		:title="props.mapEvent.name"
	>
		<template #extra>
			<a-button @click="handleEdit" size="small" type="link" primary>编辑</a-button>
			<a-popconfirm title="你确定删除这个地图事件吗" ok-text="确定" cancel-text="取消" @confirm="handleDelete">
				<a-button size="small" type="link" danger>删除</a-button>
			</a-popconfirm>
		</template>
		<img v-if="iconPreview" class="icon-preview" :src="iconPreview" alt="" />
	</a-card>
</template>

<style lang="scss" scoped>
.map-event-card {
	display: flex;
	flex-direction: column;
	.icon-preview {
		width: 50%;
		object-fit: contain;
	}
}
</style>
