<script setup lang="ts">
import { ElMessage, FormInstance, FormRules, UploadInstance, UploadUserFile } from "element-plus";
import { computed, nextTick, onMounted, onUpdated, reactive, ref, watch } from "vue";
import { Animated2DBase } from "@/views/manage/role-manage/components/utils/Animated2DBase";
import { createRole, preUpload, updateRole } from "@/utils/api/role";
import RolePreviewer from "@/views/manage/role-manage/components/role-previewer.vue";
import { __MONOPOLYSERVER__, __PROTOCOL__ } from "@G/global.config";
import { Role } from "@/interfaces/interfaces";

const emit = defineEmits(["open", "opened", "close", "closed", "success", "error"]);

const props = defineProps<{ visible: boolean; role: Role | undefined }>();
const isUpdateMode = computed(() => Boolean(props.role));

onUpdated(() => {
	resetForm();
	const role = props.role;
	if (role) {
		roleForm.name = role.roleName;
		roleForm.color = role.color;
		nextTick(() => {
			preViewRoleBaseUrl.value = `${__PROTOCOL__}://`;
			preViewRoleFileName.value = role.fileName;
		});
	}
});

const isFileListEmpty = computed(() => roleForm.fileList.length <= 0);

const uploadHeader = { Authorization: localStorage.getItem("token") };

const uploadRef = ref<UploadInstance>();
const formRef = ref<FormInstance>();

const roleForm = reactive({
	name: "",
	color: "",
	fileList: new Array<UploadUserFile>(),
});

const rules = reactive<FormRules>({
	name: [{ required: true, message: "请输入角色名字", trigger: "blur" }],
	color: [{ required: true, message: "请选择角色代表颜色", trigger: "blur" }],
	fileList: [{ validator: filesRule, trigger: "blur" }],
});

function filesRule(rule: any, value: any, callback: any) {
	if (isUpdateMode) {
		callback();
	} else {
		if (value.value instanceof Array && value.value.length === 0) {
			callback(new Error("请上传角色的文件"));
		} else {
			callback();
		}
	}
}

function handleFormSubmit() {
	formRef.value!.validate(async (valid) => {
		if (!valid) return;
		const formData = new FormData();
		formData.append("name", roleForm.name);
		formData.append("color", roleForm.color);
		roleForm.fileList.forEach((file) => {
			if (file.raw) {
				formData.append("role", file.raw);
			}
		});
		if (props.role) {
			formData.append("id", props.role.id);
			await updateRole(formData);
		} else {
			await createRole(formData);
		}
		handleUploadSuccess();
	});
}

function handleClose(done: any) {
	resetForm();
	emit("close");
}

function handleUploadSuccess() {
	resetForm();
	emit("success");
}

function handleUploadFailed(res: any) {
	resetForm();
	if (res.status === 500) {
		ElMessage({
			type: "error",
			message: res.msg,
		});
	}
	emit("error");
}

function handleFilesListChange() {}

const preViewRoleBaseUrl = ref("");
const preViewRoleFileName = ref("");
const handlePreUpload = async () => {
	if (isFileListEmpty.value) {
		return;
	}
	const formData = new FormData();
	formData.append("name", "role");

	roleForm.fileList.forEach((file) => {
		if (file.raw) {
			formData.append("role", file.raw);
		}
	});
	const fileName = await preUpload(formData);
	if (fileName) {
		preViewRoleBaseUrl.value = `${__PROTOCOL__}://`;
		preViewRoleFileName.value = fileName;
	}
};

function resetForm() {
	const form = formRef.value;
	if (form) {
		form.resetFields();
		roleForm.name = "";
		roleForm.color = "";
		roleForm.fileList.length = 0;
	}
	preViewRoleBaseUrl.value = "";
	preViewRoleFileName.value = "";
}
</script>

<template>
	<el-dialog
		destroy-on-close
		lock-scroll
		:title="isUpdateMode ? '修改角色' : '添加角色'"
		:model-value="props.visible"
		width="60%"
		:before-close="handleClose"
	>
		<el-row :gutter="24">
			<el-col :span="8">
				<el-form label-position="top" ref="formRef" :rules="rules" label-width="80px" :model="roleForm">
					<el-form-item label="角色名字" prop="name">
						<el-input v-model="roleForm.name" />
					</el-form-item>

					<el-form-item label="代表颜色" prop="color">
						<el-color-picker color-format="hex" v-model="roleForm.color" />
					</el-form-item>

					<el-form-item label="角色文件" prop="fileList">
						<el-upload
							v-model:file-list="roleForm.fileList"
							name="role"
							style="width: 100%"
							accept=".png,.atlas,.json"
							:auto-upload="false"
							:headers="uploadHeader"
							:data="roleForm"
							:limit="3"
							multiple
							ref="uploadRef"
							drag
							:action="`${__MONOPOLYSERVER__}/role/create`"
							@change="handleFilesListChange"
							@success="handleUploadSuccess"
							@error="handleUploadFailed"
						>
							<div class="upload_dragarea">
								<el-icon class="el-icon--upload">
									<upload-filled />
								</el-icon>
								<span> 拖入角色的数据文件(.png、.atlas、.json) </span>
							</div>
						</el-upload>
					</el-form-item>
					<el-form-item>
						<el-button @click="handlePreUpload" type="primary">预检模型</el-button>
						<el-button @click="handleFormSubmit" type="success">{{ isUpdateMode ? "修改角色" : "添加角色" }}</el-button>
					</el-form-item>
				</el-form>
			</el-col>

			<el-col style="display: flex" :span="16">
				<role-previewer :base-url="preViewRoleBaseUrl" :file-name="preViewRoleFileName" v-if="visible"></role-previewer>
			</el-col>
		</el-row>
	</el-dialog>
</template>

<style lang="scss" scoped>
.upload_dragarea {
	display: flex;
	flex-direction: column;
	align-items: center;
}
</style>
