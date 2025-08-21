<script setup lang="ts">
import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";
import {
	ElMessage,
	FormInstance,
	FormRules,
	genFileId,
	UploadInstance,
	UploadProps,
	UploadRawFile,
} from "element-plus";
import { computed, onBeforeMount, onMounted, reactive, ref, toRaw, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import CodeEditor from "@/components/code-editor/index.vue";
import ModelText from "./model-text?raw";
import { createArrivedEvent, getArrivedEventById, updateArrivedEvent } from "@/utils/api/arrivedEvent";
import { ArrivedEvent } from "@/interfaces/interfaces";
import { __MONOPOLYSERVER__, __PROTOCOL__ } from "@G/global.config";

const route = useRoute();
const router = useRouter();
const _arrivedEventId = route.query.id as string;

const editorVisible = ref(false);

const modelText = ref<string>(ModelText);
const tempIconFile = ref<UploadRawFile | undefined>();
const iconUploadRef = ref<UploadInstance>();

const arrivedEventFrom = reactive({
	name: "",
	describe: "",
	iconUrl: "",
	effectCode: "",
});
const arrivedEventFormRef = ref<FormInstance>();

const arrivedEventFormRules = reactive<FormRules>({
	name: [{ required: true, message: "填写到达事件的名称", trigger: "blur" }],
	describe: [{ required: true, message: "填写到达事件的描述", trigger: "blur" }],
	iconUrl: [{ required: !Boolean(_arrivedEventId), message: "上传icon", trigger: "blur" }],
});

const handleCreateArrivedEvent = async (formEl: FormInstance | undefined) => {
	if (!formEl) return;
	await formEl.validate(async (valid) => {
		if (valid) {
			const { name, describe, effectCode } = { ...toRaw(arrivedEventFrom) };

			if (_arrivedEventId) {
				await updateArrivedEvent(_arrivedEventId, name, describe, effectCode, tempIconFile.value);
			} else {
				if (!tempIconFile.value) {
					ElMessage({ message: "读取icon文件失败", type: "error" });
					return;
				}
				await createArrivedEvent(name, describe, effectCode, tempIconFile.value);
				router.replace({ path: "/arrived-event" });
			}
		} else {
			ElMessage({ message: "请完成表单", type: "warning" });
		}
	});
};

const loadArrivedEventInfo = async (id: string) => {
	const { name, describe, iconUrl, effectCode } = await getArrivedEventById(id);
	Object.assign(arrivedEventFrom, { name, describe, iconUrl: `${__PROTOCOL__}://${iconUrl}`, effectCode });
	// const oldModelText = modelText.value;
	// const oldModelTextArr = oldModelText.split("\n");
	// const firstTagIndex = oldModelTextArr.findIndex((i) => i.includes("//CODING AREA"));
	// oldModelTextArr.splice(firstTagIndex + 1, 0, effectCode);
	// modelText.value = oldModelTextArr.join("\n");
	editorVisible.value = true;
};

const uploadAction = computed(() => `${__MONOPOLYSERVER__}/arrived-event/${_arrivedEventId ? "update" : "create"}`);

const handleIconUploadChanged: UploadProps["onChange"] = (file, files) => {
	if (file.raw) {
		arrivedEventFrom.iconUrl = URL.createObjectURL(file.raw);
		tempIconFile.value = file.raw;
	}
};

const handleIconUploadExceed: UploadProps["onExceed"] = (files) => {
	if (!iconUploadRef.value) return;
	iconUploadRef.value.clearFiles();
	const file = files[0] as UploadRawFile;
	file.uid = genFileId();
	iconUploadRef.value.handleStart(file);
};

function setArrivedEventInfo(arrivedEvent: ArrivedEvent) {
	const { name, describe, effectCode, iconUrl } = arrivedEvent;
	Object.assign(arrivedEventFrom, { name, describe, iconUrl });
	const modelTextStrArr = ModelText.split("\n");
	const insertIndex = modelTextStrArr.findIndex((s) => s.includes("CODING AREA")) + 1;
	modelTextStrArr.splice(insertIndex, 1, ...effectCode.split("\n"));
	modelText.value = modelTextStrArr.join("\n");
}

//代码编辑器相关
onBeforeMount(async () => {
	if (_arrivedEventId) {
		loadArrivedEventInfo(_arrivedEventId);
	} else {
		editorVisible.value = true;
	}
});
</script>

<template>
	<div class="arrived-event-editor">
		<div class="left-container">
			<div class="arrived-event-icon-preview-container">
				<el-image class="arrived-event-icon-preview" :src="arrivedEventFrom.iconUrl">
					<template #error>
						<div class="no-icon-tip">没有icon :(</div>
					</template>
				</el-image>
			</div>
			<div class="arrived-event-form-container">
				<el-form
					label-position="left"
					label-width="100px"
					ref="arrivedEventFormRef"
					:rules="arrivedEventFormRules"
					:model="arrivedEventFrom"
				>
					<el-form-item label="名称" prop="name">
						<el-input v-model="arrivedEventFrom.name" placeholder=""></el-input>
					</el-form-item>

					<el-form-item label="描述" prop="describe">
						<el-input type="textarea" v-model="arrivedEventFrom.describe" placeholder=""></el-input>
					</el-form-item>

					<el-form-item label="icon" prop="iconUrl">
						<el-upload
							ref="iconUploadRef"
							accept=".png,.jpg"
							:action="uploadAction"
							:on-exceed="handleIconUploadExceed"
							:on-change="handleIconUploadChanged"
							:auto-upload="false"
							:limit="1"
						>
							<template #trigger>
								<el-button type="primary">上传icon</el-button>
							</template>
						</el-upload>
					</el-form-item>

					<el-form-item>
						<el-button @click="handleCreateArrivedEvent(arrivedEventFormRef)" type="primary">保存到达事件</el-button>
					</el-form-item>
				</el-form>
			</div>
		</div>

		<div class="right-container">
			<div class="explain-area">
				<FontAwesomeIcon icon="warning" />
				<span>
					以下区域编写的代码将会在游戏后端运行时读取并运行，代码上方为定义的接口区域，请在注释为"CODING AREA"
					的区域内编写代码，不能修改上方的接口以及外围的函数定义。
				</span>
			</div>
			<div class="editor-area">
				<code-editor v-if="editorVisible" :model-text="modelText" v-model="arrivedEventFrom.effectCode" />
			</div>
		</div>
	</div>
</template>

<style lang="scss" scoped>
.arrived-event-editor {
	width: 100%;
	height: 100%;
	display: flex;

	& > .left-container {
		display: flex;
		flex-direction: column;
		justify-content: center;
	}

	& > .right-container {
		flex: 1;
		margin-left: 20px;
		border-radius: 10px;
		padding: 20px;
		box-shadow: var(--el-box-shadow-light);
		background-color: #ffffff;
		display: flex;
		flex-direction: column;
		justify-content: space-between;
	}
}

.arrived-event-icon-preview-container {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: space-around;
	margin-bottom: 50px;

	$img-size: 300px;

	.arrived-event-icon-preview {
		width: $img-size;
		height: $img-size;
		border-radius: 10px;

		.no-icon-tip {
			text-align: center;
			line-height: $img-size;
			background-color: #ededed;
			font-weight: bold;
			color: #858585;
		}
	}
}

.arrived-event-form-container {
	border-radius: 10px;
	padding: 20px;
	box-shadow: var(--el-box-shadow-light);
	background-color: #ffffff;
}

.explain-area {
	user-select: none;
	padding: 8px 16px;
	color: var(--el-color-danger-dark-2);
	background-color: var(--el-color-danger-light-7);
	border-radius: 4px;
	border-left: 5px solid var(--el-color-danger);
	margin-bottom: 20px;
}

.editor-area {
	flex: 1;
}

#code-editor {
	width: 100%;
	height: 100%;
}
</style>
