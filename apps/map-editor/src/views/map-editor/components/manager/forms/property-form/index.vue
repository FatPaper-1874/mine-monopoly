<script setup lang="ts">
import type { FormInstance, Rule } from "ant-design-vue/es/form";
import { reactive, ref, toRaw, computed, watch, onMounted, createVNode } from "vue";
import { PropertyInfo, MapItem } from "@fatpaper-monopoly/types";
import { useEditorStore, useMapDataStore } from "@src/stores";
import { message } from "ant-design-vue";
import EffectEditor from "./effect-editor.vue";
import BuildingModelSeletor from "../../components/building-model-seletor.vue";

// props & emits
const emits = defineEmits(["submit"]);

const currentMapItem = computed(() => useEditorStore().currentMapItem);
const currentMapItemId = computed(() => useEditorStore().currentMapItemId);
const streetList = computed(() => useMapDataStore().streets);

const propertyId = ref("");

// 表单数据
const propertyForm = reactive<PropertyInfo>({
	id: crypto.randomUUID(),
	name: "",
	sellCost: 0,
	buildCost: 0,
	costList: [0, 0, 0],
	level: 0,
	maxLevel: 2,
	effectCode: undefined,
	buildingModelIdList: undefined,
	streetId: "",
});

// 表单引用
const propertyFormRef = ref<FormInstance>();

// 表单规则
const propertyFormRules: Record<string, Rule[]> = {
	name: [{ required: true, message: "请填写地皮名称", trigger: "blur" }],
	maxLevel: [{ required: true, message: "请填写最大等级", trigger: "blur" }],
	sellCost: [{ required: true, message: "请填写空地价格", trigger: "blur" }],
	buildCost: [{ required: true, message: "请填写建楼价格", trigger: "blur" }],
	streetId: [{ required: true, message: "请选择街道", trigger: "change" }],
};

// 表单回填
onMounted(() => {
	updateForm(currentMapItem.value);
});

watch(
	currentMapItem,
	(newMapItem) => {
		updateForm(newMapItem);
	},
	{ deep: true }
);

function updateForm(newMapItem: MapItem | undefined) {
	if (newMapItem?.property) {
		propertyId.value = newMapItem.property.id;
		Object.assign(propertyForm, newMapItem.property);
	} else {
		propertyId.value = "";
		propertyFormRef.value?.resetFields();
	}
}

// 表单提交
async function handleCreateOrUpdateProperty() {
	if (currentMapItemId.value) {
		// TODO
		useMapDataStore().addProperty(currentMapItemId.value, propertyForm);
		message.success("地皮信息设置成功");
	}
}

const effectCodeEditorVisible = ref(false);

function handleSubmitEffectCode() {
	handleCreateOrUpdateProperty();
	effectCodeEditorVisible.value = false;
}

function handleDeleteEffectCode() {
	propertyForm.effectCode = undefined;
	handleCreateOrUpdateProperty();
}

const buildingModelVisible = ref(false);

function handleBuildingModelSeletorSubmit(idList: string[]) {
	propertyForm.buildingModelIdList = idList;
}

function addCostLevel() {
	propertyForm.costList.push(0);
	propertyForm.maxLevel = propertyForm.costList.length - 1;
}

function removeCostLevel(index: number) {
	propertyForm.costList.splice(index, 1);
	propertyForm.maxLevel = propertyForm.costList.length - 1;
}
</script>

<template>
	<div class="property-form">
		<h4>地皮设置</h4>
		<a-form
			size="small"
			ref="propertyFormRef"
			:model="propertyForm"
			:rules="propertyFormRules"
			layout="horizontal"
			label-align="left"
			:label-col="{ span: 9 }"
			:wrapper-col="{ span: 14 }"
			:disabled="currentMapItemId === '' || currentMapItem?.linkto"
			@finish="handleCreateOrUpdateProperty"
		>
			<a-form-item label="地皮名称" name="name">
				<a-input v-model:value="propertyForm.name" allow-clear />
			</a-form-item>

			<a-form-item label="空地价格" name="sellCost">
				<a-input-number :min="0" :step="100" v-model:value="propertyForm.sellCost" style="width: 100%" />
			</a-form-item>

			<a-form-item label="建楼价格" name="buildCost">
				<a-input-number :min="0" :step="100" v-model:value="propertyForm.buildCost" style="width: 100%" />
			</a-form-item>

			<a-form-item label="最大等级" name="maxLevel">
				<a-input-number :min="0" v-model:value="propertyForm.maxLevel" style="width: 100%" />
			</a-form-item>

			<a-form-item
				v-for="(cost, index) in propertyForm.costList"
				:label="index === 0 ? '空地过路费' : `LV${index}过路费`"
				:name="['costList', index]"
				:key="index"
				:rules="{
					required: true,
					message: '过路费不能为空',
					trigger: 'change',
				}"
			>
				<a-input-number
					:min="0"
					:step="100"
					v-model:value="propertyForm.costList[index]"
					style="width: 60%; margin-right: 8px"
				/>
				<a-button
					type="primary"
					danger
					v-if="index === propertyForm.costList.length - 1"
					@click="removeCostLevel(index)"
					>删除</a-button
				>
			</a-form-item>

			<a-form-item :wrapper-col="{ offset: 9 }">
				<a-button style="width: 100%" type="dashed" @click="addCostLevel">添加一个收费等级</a-button>
			</a-form-item>

			<a-form-item label="所属街道" name="streetId">
				<a-select v-model:value="propertyForm.streetId" placeholder="选择所属街道" allow-clear>
					<a-select-option v-for="street in streetList" :key="street.id" :value="street.id">
						{{ street.name }}
					</a-select-option>
				</a-select>
			</a-form-item>

			<!-- 操作按钮组 -->
			<a-form-item style="justify-self: end">
				<a-space>
					<a-button type="primary" html-type="submit"> 保存地皮信息 </a-button>
				</a-space>
			</a-form-item>
		</a-form>
		<a-divider><h5 style="font-size: 0.75em">额外部分</h5></a-divider>
		<div class="extra-area">
			<div>
				<a-button @click="effectCodeEditorVisible = true" type="dashed">{{
					propertyForm.effectCode ? "修改触发代码" : "添加触发代码"
				}}</a-button>
				<a-button @click="handleDeleteEffectCode" type="primary" danger v-if="propertyForm.effectCode"
					>删除触发代码</a-button
				>
			</div>
			<div>
				<a-button @click="buildingModelVisible = true" type="dashed">{{
					propertyForm.buildingModelIdList ? "修改建筑模型" : "添加建筑模型"
				}}</a-button>
				<a-button type="primary" danger v-if="propertyForm.buildingModelIdList">删除建筑模型</a-button>
			</div>
		</div>
		<building-model-seletor
			@submit="handleBuildingModelSeletorSubmit"
			v-model:visible="buildingModelVisible"
			:modelIdList="propertyForm.buildingModelIdList"
			:title="`${propertyForm.name}的房屋模型`"
		/>
	</div>

	<a-modal
		@ok="handleSubmitEffectCode"
		v-model:open="effectCodeEditorVisible"
		title="编辑触发代码"
		width="80vw"
		closable
		okText="确定修改"
		cancelText="取消"
		destroyOnClose
	>
		<effect-editor v-model="propertyForm.effectCode" />
	</a-modal>
</template>

<style scoped lang="scss">
.property-form {
	padding: 15px 20px;
	background: #fff;
	border-radius: 8px;
	box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
	max-height: 70vh;
	overflow-y: scroll;

	h4 {
		margin-bottom: 10px;
	}
}

.extra-area {
	width: 100%;
	display: flex;
	flex-direction: column;
	justify-content: center;
	gap: 10px;

	div {
		width: 100%;
		display: flex;
		justify-content: center;
		gap: 10px;

		button:first-child {
			flex: 1;
		}
	}
}
</style>
