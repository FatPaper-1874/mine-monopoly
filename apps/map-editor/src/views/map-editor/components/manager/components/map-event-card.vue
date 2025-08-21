<script setup lang="ts">
import { MapEvent } from "@fatpaper-monopoly/types/interfaces/game/item";
import { useResourceStore } from "@src/stores";
import { message } from "ant-design-vue";
import { onMounted, ref, watch } from "vue";

const props = defineProps<{ mapEvent: MapEvent }>();
const emits = defineEmits<{
	edit: [id: string];
	delete: [id: string];
}>();

watch(
	() => props.mapEvent.iconId,
	async (newIconId) => {
		const imageResource = useResourceStore().findImageById(newIconId);
		if (!imageResource) {
			message.error(`获取 ${props.mapEvent.name} 的icon资源失败`, 1);
			return;
		}
		const content = await window.electronAPI.getImageBase64(imageResource.url);
		iconPreview.value = `data:image/png;base64,${content}`;
	},
	{ immediate: true }
);

const iconPreview = ref("");

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
		<img class="icon-preview" :src="iconPreview" alt="" />
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
