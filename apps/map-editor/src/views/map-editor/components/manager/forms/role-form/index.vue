<script setup lang="ts">
import { useMapDataStore, useResourceStore } from "@src/stores";
import { addNewImage, convertToFpUrl } from "@src/utils/file";
import { RolePreviewerRenderer } from "@src/utils/three/RolePreviewerRenderer";
import { message } from "ant-design-vue";
import { ref, reactive, onMounted, onBeforeUnmount, computed } from "vue";
import CodeEditor from "@src/components/code-editor/index.vue";
import libContent from "./editor-lib.d.ts?raw";
import templateText from "./template-text?raw";
import { Role } from "@mine-monopoly/types";

const { role } = defineProps<{ role: Role | undefined }>();

// 使用 ref 代替 querySelector，更符合 Vue 规范且防止 ID 冲突
const canvasContainerRef = ref<HTMLDivElement>();
let rolePreviewer: RolePreviewerRenderer | null = null;

onMounted(async () => {
	if (role) {
		roleForm.id = role.id;
		roleForm.name = role.name;
		roleForm.description = role.description;
		roleForm.color = role.color;
		roleForm.initCode = role.initCode;
		const resource = useResourceStore().findImageById(role.imageId);
		if (!resource) {
			message.error("获取角色资源失败");
			return;
		}
		// Store 里的 url 已经是 fp-file:// 格式
		roleForm.fileUrl = resource.url;
		await loadRole(resource.url);
	}
});

interface FormState {
	id: string;
	name: string;
	description: string;
	color: string;
	fileUrl: string;
	initCode: string;
}
const roleForm = reactive<FormState>({
	id: "",
	name: "",
	description: "",
	color: "#000000",
	fileUrl: "",
	initCode: "",
});

const emits = defineEmits(["submit"]);

function handleSubmit() {
	if (role) {
		handleEditRole();
	} else {
		handleCreateRole();
	}
}

async function handleEditRole() {
	try {
		if (!role) return;
		const resource = useResourceStore().findImageById(role.imageId);
		if (!resource) {
			message.error("获取角色资源失败");
			return;
		}
		let imageId = role.imageId;

		// 比较 URL (都是 fp-file:// 格式)
		if (roleForm.fileUrl !== resource.url) {
			// addNewImage 内部会处理 fp-file 路径的读取和保存
			imageId = await addNewImage(roleForm.fileUrl, roleForm.name);
			useResourceStore().removeImage(role.imageId);
		}
		const _role = {
			id: role.id,
			name: roleForm.name,
			description: roleForm.description,
			color: roleForm.color,
			imageId,
			initCode: roleForm.initCode,
		};
		useMapDataStore().editRole(_role);
		message.success(`编辑角色 "${_role.name}" 成功`, 1);
		emits("submit");
	} catch (e: any) {
		message.error(e.message, 1);
	}
}

async function handleCreateRole() {
	try {
		// 保存图片
		const imageId = await addNewImage(roleForm.fileUrl, roleForm.name);
		const role = {
			id: `role-${crypto.randomUUID()}`,
			name: roleForm.name,
			description: roleForm.description,
			color: roleForm.color,
			imageId,
			initCode: roleForm.initCode,
		};
		useMapDataStore().addRole(role);
		message.success(`添加角色 "${role.name}" 成功`, 1);
		emits("submit");
	} catch (e: any) {
		message.error(e.message, 1);
	}
}

async function handleAddRole() {
	const res = await window.electronAPI.showOpenDialog({
		filters: [{ name: "纸片人", extensions: ["png", "webp"] }],
		properties: ["openFile"],
	});
	if (res.filePaths.length > 0) {
		// 核心修改：转换为 fp-file 协议 URL，实现统一和预览
		roleForm.fileUrl = convertToFpUrl(res.filePaths[0]);
		await loadRole(roleForm.fileUrl);
	}
}

async function loadRole(fileUrl: string) {
	if (!rolePreviewer) {
		// 使用 ref 获取容器
		if (canvasContainerRef.value) {
			rolePreviewer = new RolePreviewerRenderer(canvasContainerRef.value);
		}
	}
	await rolePreviewer?.loadRole(fileUrl);
}

onBeforeUnmount(handleClose);

function handleClose() {
	roleForm.name = "";
	roleForm.fileUrl = "";
	rolePreviewer?.destroy();
	rolePreviewer = null;
}
</script>

<template>
	<div class="role-form-container">
		<a-form @finish="handleSubmit" :model="roleForm" name="basic" autocomplete="off" class="role-form">
			<a-form-item label="ID">
				<a-alert style="word-break: break-all" :message="roleForm.id" type="info" />
			</a-form-item>

			<a-form-item label="角色名称" name="name" :rules="[{ required: true, message: '请输入角色名称' }]">
				<a-input v-model:value="roleForm.name" />
			</a-form-item>

			<a-form-item label="角色描述" name="description" :rules="[{ required: true, message: '请输入角色描述' }]">
				<a-textarea v-model:value="roleForm.description" :auto-size="{ minRows: 4, maxRows: 6 }" />
				<a-typography-paragraph type="secondary" style="font-size: 12px; margin-top: 4px;">
					支持 \n 进行换行
				</a-typography-paragraph>
			</a-form-item>

			<a-form-item label="代表颜色" name="color" :rules="[{ required: true, message: '请输入代表颜色' }]">
				<input type="color" v-model="roleForm.color" />
			</a-form-item>

			<a-form-item label="角色预览" name="fileUrl" :rules="[{ required: true, message: '请选择角色图片' }]">
				<div ref="canvasContainerRef" class="model-preview-canvas-container"></div>
				<a-button @click="handleAddRole" size="small">选择纸片人图片</a-button>
			</a-form-item>

			<a-form-item>
				<a-button style="width: 100%" type="primary" html-type="submit">提交</a-button>
			</a-form-item>
		</a-form>
		<div class="editor-container">
			<span class="title">
				<a-alert message="在下面编辑器编写角色代码，在玩家初始化时会执行" type="info" show-icon />
			</span>
			<code-editor v-model="roleForm.initCode" :template-text="templateText" :static-types="libContent" />
		</div>
	</div>
</template>

<style lang="scss" scoped>
.role-form-container {
	display: flex;
	height: 75vh;

	.role-form {
		width: 25vw;
		display: flex;
		flex-direction: column;
		overflow-y: scroll;
		padding-right: 10px;
	}

	.editor-container {
		display: flex;
		flex: 1;
		flex-direction: column;
		padding: 0 10px;
		gap: 10px;
	}
}
.role-image-url {
	display: block;
	margin-bottom: 10px;
	padding: 5px;
	border: 1px solid #ccc;
	border-radius: 5px;
	background-color: #f3f3f3;
	word-break: break-all;
}
.model-preview-canvas-container {
	display: block;
	margin-bottom: 10px;
	border-radius: 10px;
	width: 100%;
	height: 150px;
	border-radius: 5px;
	background-color: #f3f3f3;
	overflow: hidden;
}
</style>
