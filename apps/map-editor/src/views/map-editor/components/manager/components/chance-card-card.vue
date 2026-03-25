<script setup lang="ts">
import { useResourceStore } from "@src/stores";
import { ChanceCardInfo } from "@mine-monopoly/types";
import { computed } from "vue";
import { ChanceCard } from "@mine-monopoly/ui";

const props = defineProps<{ chanceCard: ChanceCardInfo }>();
const emits = defineEmits<{
	edit: [id: string];
	delete: [id: string];
}>();

const resourceStore = useResourceStore();

// 优化：使用 computed 直接关联 Store，确保图片更新时卡片自动刷新
const iconPreviewUrl = computed(() => {
	const imageResource = resourceStore.findImageById(props.chanceCard.iconId);
	return imageResource ? imageResource.url : "";
});

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
			justifyContent: 'center',
			alignItems: 'center',
			flex: 1,
			width: '100%',
			backgroundColor: '#efefef',
			padding: '10px',
		}"
		class="chance-card-card"
		size="small"
		:title="props.chanceCard.name"
	>
		<template #extra>
			<a-button @click="handleEdit" size="small" type="link">编辑</a-button>
			<a-popconfirm title="你确定删除这张机会卡吗" ok-text="确定" cancel-text="取消" @confirm="handleDelete">
				<a-button size="small" type="link" danger>删除</a-button>
			</a-popconfirm>
		</template>

		<ChanceCard :chance-card="chanceCard" :icon-url="iconPreviewUrl" :disable="false" />
	</a-card>
</template>

<style lang="scss" scoped>
.chance-card-card {
	display: flex;
	flex-direction: column;
	height: 100%;
}
</style>
