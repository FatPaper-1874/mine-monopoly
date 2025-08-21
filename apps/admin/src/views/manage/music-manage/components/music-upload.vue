<script setup lang="ts">
import { FormInstance, FormRules, UploadInstance, ElMessage } from "element-plus";
import { ref, reactive, toRaw, computed } from "vue";
import { __MONOPOLYSERVER__ } from "@G/global.config";

const props = defineProps({
	visible: {
		type: Boolean,
		default: false,
	},
});

const uploadHeader = { Authorization: localStorage.getItem("token") };

const emit = defineEmits(["open", "opened", "close", "closed", "success", "error"]);

const uploadRef = ref<UploadInstance>();
const fromRef = ref<FormInstance>();

const musicForm = reactive({
	name: "",
	fileList: [],
});

const rules = reactive<FormRules>({
	name: [{ required: true, message: "请输入音乐名字", trigger: "blur" }],
	fileList: [{ required: true, message: "请选择音乐", trigger: "blur" }],
});

function submitUpload() {
	fromRef.value!.validate((valid) => {
		if (!valid) return;
		uploadRef.value!.submit();
	});
}

function handleClose(done: any) {
	fromRef.value?.resetFields();
	emit("close");
}

function handleUploadSuccess(res: any) {
	fromRef.value?.resetFields();
	if (res.status === 200) {
		ElMessage({
			type: "success",
			message: res.msg,
		});
	}
	emit("success");
}

function handleUploadFailed(res: any) {
	fromRef.value?.resetFields();
	if (res.status === 500) {
		ElMessage({
			type: "error",
			message: res.msg,
		});
	}
	emit("error");
}
const uploadAction = computed(() => `${__MONOPOLYSERVER__}/music/create`);
</script>

<template>
	<el-dialog
		destroy-on-close
		lock-scroll
		title="添加音乐"
		:music-value="props.visible"
		width="30%"
		:before-close="handleClose"
	>
		<el-form ref="fromRef" :rules="rules" label-width="80px" :model="musicForm">
			<el-form-item label="音乐名字" prop="name">
				<el-input v-model="musicForm.name" />
			</el-form-item>

			<el-form-item label="音乐文件" prop="fileList">
				<el-upload
					v-model:file-list="musicForm.fileList"
					style="width: 100%"
					name="music"
					accept=".mp3"
					:auto-upload="false"
					:headers="uploadHeader"
					:data="musicForm"
					ref="uploadRef"
					:action="uploadAction"
					@success="handleUploadSuccess"
					@error="handleUploadFailed"
				>
					<template #trigger>
						<el-button type="primary">选择.mp3音乐文件</el-button>
					</template>
				</el-upload>
			</el-form-item>
		</el-form>
		<el-button type="primary" @click="submitUpload">添加</el-button>
	</el-dialog>
</template>

<style lang="scss" scoped></style>
