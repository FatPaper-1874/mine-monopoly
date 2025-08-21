<script setup lang="ts">
import {
	FormInstance,
	FormRules,
	UploadInstance,
	ElMessage,
	UploadRawFile,
	UploadProps,
	genFileId,
} from "element-plus";
import { ref, reactive, toRaw, computed, watch } from "vue";
import { Model } from "@/interfaces/interfaces";
import { __MONOPOLYSERVER__ } from "@G/global.config";
import { createModel, updateModel } from "@/utils/api/model";
import { temp } from "three/examples/jsm/nodes/core/VarNode";

const props = defineProps<{ visible: boolean; model: Model | undefined }>();

const uploadHeader = { Authorization: localStorage.getItem("token") };

const emit = defineEmits(["open", "opened", "close", "closed", "success", "error", "update:visible"]);

watch(
	() => props.visible,
	(newVisible: boolean) => {
		emit("update:visible", newVisible);
	}
);
const fromRef = ref<FormInstance>();
const uploadRef = ref<UploadInstance>();

const modelForm = reactive<{ id: string; name: string; modelFile: UploadRawFile | undefined }>({
	id: "",
	name: "",
	modelFile: undefined,
});

watch(
	() => props.model,
	(newModel) => {
		modelForm.id = newModel?.id || "";
		modelForm.name = newModel?.name || "";
	}
);

const createRules = reactive<FormRules>({
	name: [{ required: true, message: "请输入模型名字", trigger: "blur" }],
	modelFile: [{ required: true, message: "请选择模型", trigger: "blur" }],
});

const updateRules = reactive<FormRules>({
	name: [{ required: true, message: "请输入模型名字", trigger: "blur" }],
	modelFile: [{ required: false, message: "请选择模型", trigger: "blur" }],
});

function submitUpload() {
	fromRef.value!.validate(async (valid) => {
		if (!valid) return;
		try {
			let res;
			if (props.model) {
				res = await updateModel(props.model.id, modelForm.name, modelForm.modelFile);
			} else {
				if (!modelForm.modelFile) return;
				res = await createModel(modelForm.name, modelForm.modelFile);
			}
			handleUploadSuccess(res);
		} catch (e: any) {
			handleUploadFailed();
		}
	});
}

function handleClose(done: any) {
	fromRef.value?.resetFields();
	emit("close");
}

function handleUploadSuccess(res: any) {
	fromRef.value?.resetFields();
	emit("success");
}

function handleUploadFailed() {
	fromRef.value?.resetFields();
	emit("error");
}

const handleModelUploadExceed: UploadProps["onExceed"] = (files) => {
	if (!uploadRef.value) return;
	uploadRef.value.clearFiles();
	const file = files[0] as UploadRawFile;
	file.uid = genFileId();
	uploadRef.value.handleStart(file);
};

const handleModelUploadChanged: UploadProps["onChange"] = (file, files) => {
	if (file.raw) {
		// arrivedEventFrom.iconUrl = URL.createObjectURL(file.raw);
		modelForm.modelFile = file.raw;
	}
};
</script>

<template>
	<el-dialog
		destroy-on-close
		lock-scroll
		title="添加模型"
		:model-value="props.visible"
		width="30%"
		:before-close="handleClose"
	>
		<el-form ref="fromRef" :rules="model ? updateRules : createRules" label-width="80px" :model="modelForm">
			<el-form-item label="模型名字" prop="name">
				<el-input v-model="modelForm.name" />
			</el-form-item>

			<el-form-item label="模型文件" prop="modelFile">
				<el-upload
					style="width: 100%"
					name="model"
					accept=".glb"
					:headers="uploadHeader"
					:data="modelForm"
					ref="uploadRef"
					class="upload-demo"
					:on-exceed="handleModelUploadExceed"
					:on-change="handleModelUploadChanged"
					:auto-upload="false"
					:limit="1"
				>
					<template #trigger>
						<el-button type="primary">选择.glb模型文件</el-button>
					</template>
				</el-upload>
			</el-form-item>
		</el-form>
		<el-button type="primary" @click="submitUpload">添加</el-button>
	</el-dialog>
</template>

<style lang="scss" scoped></style>
