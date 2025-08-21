<script setup lang="ts">
import { MapData, Model } from "@/interfaces/interfaces";
import { updateHouseModelList } from "@/utils/api/map";
import { getModelList } from "@/utils/api/model";
import { ElForm, ElFormItem, FormRules, ElSelect, ElOption, ElButton, FormInstance, ElDialog } from "element-plus";
import { inject, onMounted, reactive, ref, toRaw, watch } from "vue";

const mapInfo = inject<MapData>("mapInfo")!;

watch(mapInfo, (newMapInfo) => {
	const { houseModel_lv0, houseModel_lv1, houseModel_lv2 } = newMapInfo;
	if (houseModel_lv0 && houseModel_lv1 && houseModel_lv2)
		Object.assign(houseModelsForm, { lv0: houseModel_lv0.id, lv1: houseModel_lv1.id, lv2: houseModel_lv2.id });
});

const _modelsList = ref<Model[]>([]);
const houseModelsFormRef = ref<FormInstance>();
const houseModelsForm = reactive({
	lv0: "",
	lv1: "",
	lv2: "",
});

const houseModelsFormRules = reactive<FormRules>({
	lv0: [{ required: true, message: "请选择地皮模型", trigger: "blur" }],
	lv1: [{ required: true, message: "请选择一级房屋模型", trigger: "blur" }],
	lv2: [{ required: true, message: "请选择二级房屋模型", trigger: "blur" }],
});

const loadModelList = async () => {
	const { modelList } = await getModelList(1, 10000);
	_modelsList.value = modelList;
};

const handleChangeHouseModels = async (formEl: FormInstance | undefined) => {
	if (!formEl) return;
	await formEl.validate(async (valid) => {
		if (valid) {
			const { lv0, lv1, lv2 } = houseModelsForm;
			await updateHouseModelList(mapInfo.id, { lv0, lv1, lv2 });
		} else {
			return false;
		}
	});
};

onMounted(() => {
	loadModelList();
});
</script>

<template>
	<div class="house-model-selector">
		<el-form size="small" ref="houseModelsFormRef" :model="houseModelsForm" :rules="houseModelsFormRules">
			<el-form-item label="地皮模型" prop="lv0">
				<el-select clearable v-model="houseModelsForm.lv0" placeholder="选择地皮模型">
					<el-option v-for="model in _modelsList" :key="model.id" :value="model.id" :label="model.name"></el-option>
				</el-select>
			</el-form-item>

			<el-form-item label="一级房屋模型" prop="lv1">
				<el-select clearable v-model="houseModelsForm.lv1" placeholder="选择一级房屋模型">
					<el-option v-for="model in _modelsList" :key="model.id" :value="model.id" :label="model.name"></el-option>
				</el-select>
			</el-form-item>
			<el-form-item label="二级房屋模型" prop="lv2">
				<el-select clearable v-model="houseModelsForm.lv2" placeholder="选择二级房屋模型">
					<el-option v-for="model in _modelsList" :key="model.id" :value="model.id" :label="model.name"></el-option>
				</el-select>
			</el-form-item>
			<el-form-item>
				<el-button @click="handleChangeHouseModels(houseModelsFormRef)" type="primary">更新房屋模型</el-button>
			</el-form-item>
		</el-form>
	</div>
</template>

<style lang="scss" scoped>
.house-model-selector {
	padding: 10px;
	background-color: #fff;
}

.el-form-item:last-child {
	margin-bottom: 0;
}
</style>
