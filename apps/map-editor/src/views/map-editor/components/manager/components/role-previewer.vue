<script setup lang="ts">
import { Role } from "@fatpaper-monopoly/types";
import { useMapDataStore, useResourceStore } from "@src/stores";
import { RolePreviewerRenderer } from "@src/utils/three/RolePreviewerRenderer";
import { message } from "ant-design-vue";
import { onBeforeUnmount, onMounted, watch } from "vue";

const props = defineProps<{ role: Role }>();

const emits = defineEmits(["edit"]);

let rolePreviewer: RolePreviewerRenderer | null;

onMounted(() => {
	if (!rolePreviewer) {
		const canvasContainer = document.querySelector(`#${props.role.id}`) as HTMLDivElement;
		rolePreviewer = new RolePreviewerRenderer(canvasContainer);
	}
	const image = useResourceStore().findImageById(props.role.imageId);
	if (!image) {
		message.error(`获取角色 "${props.role.name}" 的图片资源失败`);
		return;
	}
	rolePreviewer.loadRole(image.url);
});

watch(
	() => props.role,
	async (newRole) => {
		if (rolePreviewer && newRole) {
			const image = useResourceStore().findImageById(newRole.imageId);
			if (!image) {
				message.error(`获取角色 "${newRole.name}" 的图片资源失败`);
				return;
			}
			rolePreviewer.loadRole(image.url);
		}
	},
	{ deep: true }
);

function handleEdit() {
	emits("edit", props.role.id);
}

function handleDelete() {
	useMapDataStore().removeRole(props.role.id);
}

onBeforeUnmount(() => {
	rolePreviewer?.destroy();
	rolePreviewer = null;
});
</script>

<template>
	<a-card class="role-previewer" size="small" :title="props.role.name" :bodyStyle="{ flex: '1' }">
		<template #extra>
			<a-button @click="handleEdit" size="small" type="link" primary>编辑</a-button>
			<a-popconfirm title="你确定删除这个角色吗" ok-text="确定" cancel-text="取消" @confirm="handleDelete">
				<a-button size="small" type="link" danger>删除</a-button>
			</a-popconfirm>
		</template>
		<div :id="props.role.id" class="role-preview-canvas-container"></div>
	</a-card>
</template>

<style lang="scss" scoped>
.role-previewer {
	display: flex;
	flex-direction: column;
}
.role-preview-canvas-container {
	width: 100%;
	height: 100%;
	border-radius: 5px;
	background-color: #f3f3f3;
	overflow: hidden;
}
</style>
