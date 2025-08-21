<script setup lang="ts">
import { deleteModel } from "@/utils/api/model";
import { ModelPreviewerRenderer } from "@/utils/three/ModelPreviewerRenderer";
import { Action, ElMessage, ElMessageBox } from "element-plus";
import { onMounted, ref, onUnmounted, onUpdated, watch, onBeforeUnmount } from "vue";
import { Model } from "@/interfaces/interfaces";

const props = defineProps<{ model: Model }>();
const emit = defineEmits(["delete", "edit"]);

let modelPreview: ModelPreviewerRenderer | null;

onMounted(async () => {
	const canvas = document.getElementById(props.model.id) as HTMLCanvasElement;
	modelPreview = new ModelPreviewerRenderer(canvas);
	await modelPreview.loadModel(props.model.fileUrl, true);
});

const modelWatcherHandler = watch(
	() => props.model,
	(newModel, oldModel) => {
		if (newModel.fileUrl === oldModel.fileUrl || !modelPreview) return;
		modelPreview.loadModel(newModel.fileUrl, true);
	},
	{ deep: true }
);

onBeforeUnmount(() => {
  modelWatcherHandler();
	if (!modelPreview) return;
	modelPreview.destroy();
	modelPreview = null;
});

function handleEdit(){
	emit("edit");
};
function handleDelete(){
	ElMessageBox.alert(
		"删除这个模型会导致使用这个模型的其他数据一并删除,如( ItemType, MapItem ),你确定要删除吗",
		"警告",
		{
			confirmButtonText: "确定删除",
			cancelButtonText: "取消",
			type: "warning",
		}
	).then(async () => {
		await deleteModel(props.model.id);
		emit("delete");
	});
};

function handleCommand(command: string){
	switch (command) {
		case "edit":
			handleEdit();
			break;
		case "delete":
			handleDelete();
			break;
	}
};
</script>

<template>
	<el-card class="model-preview-card" :body-style="{ width: '100%', flex: '1', 'box-sizing': 'border-box' }">
		<template #header>
			<div class="card-header">
				<span>{{ model.name }}</span>
				<el-dropdown trigger="click" @command="handleCommand">
					<el-button class="button" text style="color: #409eff">操作</el-button>
					<template #dropdown>
						<el-dropdown-menu>
							<el-dropdown-item command="edit">编辑</el-dropdown-item>
							<el-dropdown-item command="delete" style="color: red">删除</el-dropdown-item>
						</el-dropdown-menu>
					</template>
				</el-dropdown>
			</div>
		</template>
		<canvas class="model-preview__canvas" :id="model.id"></canvas>
	</el-card>
</template>

<style lang="scss" scoped>
.model-preview-card {
	margin: 10px;
	border-radius: 10px;
	box-sizing: border-box;
	display: flex;
	flex-direction: column;
}

.card-header {
	display: flex;
	justify-content: space-between;
	align-items: center;
}

.model-preview__canvas {
	display: block;
	border-radius: 10px;
	width: 100%;
	height: 100%;
}
</style>
