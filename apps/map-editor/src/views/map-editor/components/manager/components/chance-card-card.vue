<script setup lang="ts">
import { ChanceCard } from "@fatpaper-monopoly/types/interfaces/game/item";
import { useResourceStore } from "@src/stores";
import { message } from "ant-design-vue";
import ChanceCardPreview from "../../common/chance-card-preview.vue";
import { onMounted, ref, watch } from "vue";

const props = defineProps<{ chanceCard: ChanceCard }>();
const emits = defineEmits<{
	edit: [id: string];
	delete: [id: string];
}>();

watch(
	() => props.chanceCard.iconId,
	async (newIconId) => {
		const imageResource = useResourceStore().findImageById(newIconId);
		if (!imageResource) {
			message.error(`获取 ${props.chanceCard.name} 的icon资源失败`, 1);
			return;
		}
		const content = await window.electronAPI.getImageBase64(imageResource.url);
		iconPreview.value = `data:image/png;base64,${content}`;
	},
	{ immediate: true }
);

const iconPreview = ref("");

function handleEdit() {
	emits("edit", props.chanceCard.id);
}

function handleDelete() {
	emits("delete", props.chanceCard.id);
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
			'background-color': '#efefef',
		}"
		class="map-event-card"
		size="small"
		:title="props.chanceCard.name"
	>
		<template #extra>
			<a-button @click="handleEdit" size="small" type="link" primary>编辑</a-button>
			<a-popconfirm title="你确定删除这张机会卡吗" ok-text="确定" cancel-text="取消" @confirm="handleDelete">
				<a-button size="small" type="link" danger>删除</a-button>
			</a-popconfirm>
		</template>
		<chance-card-preview :chance-card="chanceCard" :disable="false" :icon-preview="''" />
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
