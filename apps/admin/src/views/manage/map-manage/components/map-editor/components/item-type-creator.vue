<script setup lang="ts">
import { createItemTypes } from "@/utils/api/itemType";
import { getItemTypesListByMapId } from "@/utils/api/map";
import { getModelList } from "@/utils/api/model";
import { ItemType, Model } from "@/interfaces/interfaces";
import { FormInstance, FormRules, ElDialog, ElForm, ElFormItem } from "element-plus";
import { ref, onBeforeMount, reactive, toRaw, computed, onUpdated } from "vue";
import { useRoute } from "vue-router";
import { randomHEXColor } from "@/utils/color";

const props = withDefaults(defineProps<{ visible: boolean }>(), { visible: true });
const emits = defineEmits<{ (e: "update:visible", v: boolean): void; (e: "created"): void }>();
const mapId = useRoute().query.mapId as string;

const _modelsList = ref<{ lv0: string; lv1: string; lv2: string }>([]);
const newTypeForm = reactive({
	name: "",
	modelId: "",
	color: randomHEXColor(),
	size: 1,
});
const itemTypeFormRef = ref<FormInstance>();

const itemTypeFormRules = reactive<FormRules>({
	name: [{ required: true, message: "填写添加类型的名称", trigger: "blur" }],
	modelId: [{ required: true, message: "填写添加类型模型的名称", trigger: "blur" }],
	color: [{ required: true, message: "选择颜色", trigger: "blur" }],
	size: [{ required: true, message: "选择大小", trigger: "blur" }],
});

const handleAddType = async (formEl: FormInstance | undefined) => {
	if (!formEl) return;
	await formEl.validate(async (valid) => {
		if (valid) {
			const { name, color, modelId, size } = { ...toRaw(newTypeForm) };
			await createItemTypes(name, color, size, modelId, mapId);
			formEl.resetFields();
			emits("created");
			emits("update:visible", false);
		} else {
			console.log("error submit!");
			return false;
		}
	});
};

const loadModelList = async () => {
	const { modelList } = await getModelList(1, 100);
	_modelsList.value = modelList;
};

function handleModelSelected(modelId: string) {
	const model = _modelsList.value.find((item) => item.id === modelId);
	if (model) newTypeForm.name = model.name;
}

onUpdated(() => {
	newTypeForm.color = randomHEXColor();
});

onBeforeMount(() => {
	loadModelList();
});
</script>

<template>
	<el-dialog
		@close="() => emits('update:visible', false)"
		:model-value="visible"
		append-to-body
		modal-append-to-body
		title="为Itme添加一个新的类型"
		width="400"
		class="model-selecter"
	>
		<el-form
			label-position="left"
			label-width="100px"
			ref="itemTypeFormRef"
			:rules="itemTypeFormRules"
			:model="newTypeForm"
		>
			<el-form-item label="类型名称" prop="name">
				<el-input v-model="newTypeForm.name" placeholder=""></el-input>
			</el-form-item>

			<el-form-item label="模型" prop="modelId">
				<el-select @change="handleModelSelected" clearable v-model="newTypeForm.modelId" placeholder="选择模型">
					<el-option v-for="model in _modelsList" :key="model.id" :value="model.id" :label="model.name"></el-option>
				</el-select>
			</el-form-item>

			<el-form-item label="代表颜色" prop="color">
				<el-color-picker color-format="hex" v-model="newTypeForm.color" placeholder=""></el-color-picker>
			</el-form-item>

			<!--      <el-form-item label="占用格数" prop="size">-->
			<!--        <el-input-number v-model="newTypeForm.size" :min="1" :max="3"></el-input-number>-->
			<!--      </el-form-item>-->

			<el-form-item>
				<el-button @click="handleAddType(itemTypeFormRef)" type="primary">添加类型</el-button>
			</el-form-item>
		</el-form>
	</el-dialog>
</template>

<style lang="scss" scoped></style>
