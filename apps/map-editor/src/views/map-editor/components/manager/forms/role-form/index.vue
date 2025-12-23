<script setup lang="ts">
import { useMapDataStore, useResourceStore } from "@src/stores";
import { addNewImage } from "@src/utils/file";
import { RolePreviewerRenderer } from "@src/utils/three/RolePreviewerRenderer";
import { message } from "ant-design-vue";
import { ref, reactive, onMounted, onUpdated, onBeforeUnmount, computed } from "vue";
import CodeEditor from "@src/components/code-editor/index.vue";
import libContent from "./editor-lib.d.ts?raw";
import templateText from "./template-text?raw";
import { Role } from "@fatpaper-monopoly/types";
import { clone } from "lodash";

const { role } = defineProps<{ role: Role | undefined }>();
const extraLibs = computed(() => useMapDataStore().extraLibs);

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
let rolePreviewer: RolePreviewerRenderer | null;

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
		if (roleForm.fileUrl !== resource.url) {
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
		roleForm.fileUrl = res.filePaths[0];
		await loadRole(roleForm.fileUrl);
	}
}

async function loadRole(fileUrl: string) {
	if (!rolePreviewer) {
		const canvasContainer = document.querySelector("#form-preview-canvas-container") as HTMLDivElement;
		rolePreviewer = new RolePreviewerRenderer(canvasContainer);
	}
	await rolePreviewer.loadRole(fileUrl);
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
			<a-form-item label="角色名称" name="name" :rules="[{ required: true, message: '请输入角色名称' }]">
				<a-input v-model:value="roleForm.name" />
			</a-form-item>

			<a-form-item label="角色描述" name="description" :rules="[{ required: true, message: '请输入角色描述' }]">
				<a-textarea v-model:value="roleForm.description" :auto-size="{ minRows: 4, maxRows: 6 }" />
			</a-form-item>

			<a-form-item label="代表颜色" name="color" :rules="[{ required: true, message: '请输入代表颜色' }]">
				<input type="color" v-model="roleForm.color" />
			</a-form-item>

			<a-form-item label="角色预览" name="fileUrl" :rules="[{ required: true, message: '请选择角色图片' }]">
				<span class="role-image-url" v-if="roleForm.fileUrl">{{ roleForm.fileUrl }}</span>
				<div id="form-preview-canvas-container" class="model-preview-canvas-container"></div>
				<a-button @click="handleAddRole" type="primary">选择纸片人图片</a-button>
			</a-form-item>

			<a-form-item>
				<a-button style="float: right" type="primary" html-type="submit">提交</a-button>
			</a-form-item>
		</a-form>
		<div class="editor-container">
			<span class="title">
				<a-alert message="在下面编辑器编写角色代码，在玩家初始化时会执行" type="info" show-icon />
			</span>
			<code-editor v-model="roleForm.initCode" :template-text="templateText" :extra-libs="[libContent, extraLibs]" />
		</div>
	</div>
</template>

<style lang="scss" scoped>
.role-form-container {
	display: flex;
	height: 75vh;

	.role-form {
		width: 25vw;
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
