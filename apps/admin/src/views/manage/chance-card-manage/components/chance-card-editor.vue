<script setup lang="ts">
import ChanceCard from "@/components/sample/chance-card.vue";
import { ChanceCardType } from "@/enums/bace";
import router from "@/router/index";
import { createChanceCard, getChanceCardById, updateChanceCard } from "@/utils/api/chanceCard";
import { randomRGBColor } from "@/utils/color";
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
import { computed, onBeforeMount, onMounted, reactive, ref, toRaw } from "vue";
import { useRoute } from "vue-router";
import CodeEditor from "@/components/code-editor/index.vue";
import ModelText from "./model-text?raw";
import { __MONOPOLYSERVER__ } from "@G/global.config";

const modleText = computed(() => {
	return ModelText.replaceAll("%TYPE%", targetTypeMap[chanceCardForm.type]);
});

const route = useRoute();
const _chanceCardId = route.query.id as string;
const editorVisible = ref(false);

const tempIconFile = ref<UploadRawFile | undefined>();
const iconUploadRef = ref<UploadInstance>();

const targetNameMap: Record<ChanceCardType, string> = {
	[ChanceCardType.ToSelf]: "对自己生效",
	[ChanceCardType.ToOtherPlayer]: "对其他玩家生效",
	[ChanceCardType.ToPlayer]: "对玩家生效",
	[ChanceCardType.ToProperty]: "对地产生效",
	[ChanceCardType.ToMapItem]: "对格子生效",
};

const targetTypeMap: Record<ChanceCardType, string> = {
	[ChanceCardType.ToSelf]: "PlayerInterface",
	[ChanceCardType.ToOtherPlayer]: "PlayerInterface",
	[ChanceCardType.ToPlayer]: "PlayerInterface",
	[ChanceCardType.ToProperty]: "PropertyInterface",
	[ChanceCardType.ToMapItem]: "MapItemInterface",
};

const chanceCardForm = reactive<{
	name: string;
	describe: string;
	type: ChanceCardType;
	icon: string;
	color: string;
	effectCode: string;
}>({
	name: "",
	describe: "",
	type: ChanceCardType.ToPlayer,
	icon: "",
	color: randomRGBColor(),
	effectCode: "",
});
const chanceCardFormRef = ref<FormInstance>();

const chanceCardFormRules = reactive<FormRules>({
	name: [{ required: true, message: "填写添机会卡的名称", trigger: "blur" }],
	describe: [{ required: true, message: "填写添机会卡的描述", trigger: "blur" }],
	type: [{ required: true, message: "选择机会卡类型", trigger: "blur" }],
	icon: [{ required: true, message: "选择图标", trigger: "blur" }],
	color: [{ required: true, message: "选择颜色", trigger: "blur" }],
	effectCode: [{ required: true, message: "选择大小", trigger: "blur" }],
});

const handleCreateOrUpdateChanceCard = async (formEl: FormInstance | undefined) => {
	if (!formEl) return;
	await formEl.validate(async (valid) => {
		if (valid) {
			const { name, describe, type, color, icon, effectCode } = {
				...chanceCardForm,
			};
			if (_chanceCardId) {
				const {
					name: new_name,
					describe: new_describe,
					type: new_type,
					color: new_color,
					icon: new_icon,
					effectCode: new_effectCode,
				} = (await updateChanceCard(_chanceCardId, name, describe, type, color, effectCode, tempIconFile.value)) as any;
				setChanceCardInfo(new_name, new_describe, new_type, new_color, new_icon, new_effectCode);
			} else {
				if (!tempIconFile.value) {
					ElMessage({ message: "读取icon文件失败", type: "error" });
					return;
				}
				await createChanceCard(name, describe, type, color, tempIconFile.value, effectCode);
				router.replace({ path: "/chance-card" });
			}
		} else {
			console.log("error submit!");
			return false;
		}
	});
};

const loadChanceCardInfo = async () => {
	if (_chanceCardId) {
		const { name, describe, type, color, icon, effectCode } = (await getChanceCardById(_chanceCardId)) as any;
		setChanceCardInfo(name, describe, type, color, icon, effectCode);
	} else {
		editorVisible.value = true;
	}
};

const uploadAction = computed(() => `${__MONOPOLYSERVER__}/chance_card/${_chanceCardId ? "update" : "create"}`);

const setChanceCardInfo = (
	name: string,
	describe: string,
	type: ChanceCardType,
	color: string,
	icon: string,
	effectCode: string
) => {
	chanceCardForm.name = name;
	chanceCardForm.describe = describe;
	chanceCardForm.type = type;
	chanceCardForm.color = color;
	chanceCardForm.icon = icon;
	chanceCardForm.effectCode = effectCode;
	editorVisible.value = true;
};

const handleIconUploadExceed: UploadProps["onExceed"] = (files) => {
	if (!iconUploadRef.value) return;
	iconUploadRef.value.clearFiles();
	const file = files[0] as UploadRawFile;
	file.uid = genFileId();
	iconUploadRef.value.handleStart(file);
};

const handleIconUploadChanged: UploadProps["onChange"] = (file, files) => {
	if (file.raw) {
		chanceCardForm.icon = URL.createObjectURL(file.raw);
		tempIconFile.value = file.raw;
	}
};

//代码编辑器相关
onBeforeMount(() => {
	loadChanceCardInfo();
});
</script>

<template>
	<div class="chance-card-editor">
		<div class="left-container">
			<div class="chance-card-preview">
				<chance-card
					:name="chanceCardForm.name"
					:describe="chanceCardForm.describe"
					:icon="chanceCardForm.icon"
					:color="chanceCardForm.color"
				></chance-card>
			</div>
			<div class="chance-card-form-container">
				<el-form
					label-position="left"
					label-width="100px"
					ref="chanceCardFormRef"
					:rules="chanceCardFormRules"
					:model="chanceCardForm"
				>
					<el-form-item label="机会卡名称" prop="name">
						<el-input v-model="chanceCardForm.name" placeholder=""></el-input>
					</el-form-item>

					<el-form-item label="机会卡描述" prop="describe">
						<el-input type="textarea" v-model="chanceCardForm.describe" placeholder=""></el-input>
					</el-form-item>

					<el-form-item label="机会卡类型" prop="type">
						<el-select v-model="chanceCardForm.type">
							<el-option v-for="(value, key) in targetNameMap" :value="key" :label="value" :key="key"></el-option>
						</el-select>
					</el-form-item>

					<el-form-item label="机会卡图标" prop="icon">
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

					<el-form-item label="机会卡颜色" prop="color">
						<el-color-picker color-format="rgb" v-model="chanceCardForm.color" placeholder=""></el-color-picker>
					</el-form-item>

					<el-form-item>
						<el-button @click="handleCreateOrUpdateChanceCard(chanceCardFormRef)" type="primary"
							>{{ _chanceCardId ? "保存机会卡" : "添加机会卡" }}
						</el-button>
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
				<code-editor @save="handleCreateOrUpdateChanceCard(chanceCardFormRef)" v-if="editorVisible" :model-text="modleText" v-model="chanceCardForm.effectCode" />
			</div>
		</div>
	</div>
</template>

<style lang="scss" scoped>
.chance-card-editor {
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

.chance-card-preview {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: space-around;
	margin-bottom: 50px;
}

.chance-card-form-container {
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
</style>
