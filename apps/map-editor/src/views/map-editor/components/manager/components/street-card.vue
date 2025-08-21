<script setup lang="ts">
import { Street } from "@fatpaper-monopoly/types/interfaces/game/item";

const props = defineProps<{ street: Street }>();
const emits = defineEmits<{
	edit: [id: string];
	delete: [id: string];
}>();

function handleEdit() {
	emits("edit", props.street.id);
}

function handleDelete() {
	emits("delete", props.street.id);
}
</script>

<template>
	<a-card size="small" :title="props.street.name">
		<template #extra>
			<a-button @click="handleEdit" size="small" type="link" primary>编辑</a-button>
			<a-popconfirm title="你确定删除这个街道吗" ok-text="确定" cancel-text="取消" @confirm="handleDelete">
				<a-button size="small" type="link" danger>删除</a-button>
			</a-popconfirm>
		</template>
		{{ props.street.description }}
	</a-card>
</template>

<style lang="scss" scoped></style>
