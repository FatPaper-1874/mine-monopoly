<script setup lang="ts">
import type { FormInstance, Rule } from "ant-design-vue/es/form";
import { reactive, ref, toRaw, computed, watch, onMounted, createVNode } from "vue";
import { PropertyInfo, MapItem } from "@fatpaper-monopoly/types/interfaces/game/item";
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
const propertyForm = reactive<Omit<PropertyInfo, "id">>({
	name: "",
	sellCost: 100,
	buildCost: 100,
	cost_lv0: 100,
	cost_lv1: 100,
	cost_lv2: 100,
	effectCode: undefined,
	buildingModelIdList: undefined,
	streetId: "",
});

// 表单引用
const propertyFormRef = ref<FormInstance>();

// 表单规则
const propertyFormRules: Record<string, Rule[]> = {
	name: [{ required: true, message: "请填写地皮名称", trigger: "blur" }],
	sellCost: [{ required: true, message: "请填写空地价格", trigger: "blur" }],
	buildCost: [{ required: true, message: "请填写建楼价格", trigger: "blur" }],
	cost_lv0: [{ required: true, message: "请填写空地过路费", trigger: "blur" }],
	cost_lv1: [{ required: true, message: "请填写一栋楼过路费", trigger: "blur" }],
	cost_lv2: [{ required: true, message: "请填写两栋楼过路费", trigger: "blur" }],
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
		const { id, name, sellCost, buildCost, cost_lv0, cost_lv1, cost_lv2, streetId, effectCode, buildingModelIdList } =
			newMapItem.property;
		propertyId.value = id;
		Object.assign(propertyForm, {
			name,
			sellCost,
			buildCost,
			cost_lv0,
			cost_lv1,
			cost_lv2,
			effectCode,
			buildingModelIdList,
			streetId,
		});
	} else {
		propertyId.value = "";
		propertyFormRef.value?.resetFields();
	}
}

// 表单提交
async function handleCreateOrUpdateProperty() {
	if (currentMapItemId.value) {
		// TODO
		useMapDataStore().addProperty(currentMapItemId.value, {
			id: propertyId.value || crypto.randomUUID(),
			...propertyForm,
		});
		message.success("地皮信息设置成功");
	}
}

// 自动计算过路费
const autoArrivedCost = () => {
	const { sellCost, buildCost } = { ...toRaw(propertyForm) };
	propertyForm.cost_lv0 = Math.round(0.7 * sellCost);
	propertyForm.cost_lv1 = Math.round(0.8 * sellCost + buildCost * 0.6);
	propertyForm.cost_lv2 = Math.round(0.8 * sellCost + buildCost * 1.1);
};

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
			:label-col="{ span: 10 }"
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

			<a-form-item label="空地过路费" name="cost_lv0">
				<a-input-number :min="0" :step="100" v-model:value="propertyForm.cost_lv0" style="width: 100%" />
			</a-form-item>

			<a-form-item label="一栋楼过路费" name="cost_lv1">
				<a-input-number :min="0" :step="100" v-model:value="propertyForm.cost_lv1" style="width: 100%" />
			</a-form-item>

			<a-form-item label="两栋楼过路费" name="cost_lv2">
				<a-input-number :min="0" :step="100" v-model:value="propertyForm.cost_lv2" style="width: 100%" />
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
					<a-button @click="autoArrivedCost">过路费参考</a-button>
					<a-button type="primary" html-type="submit"> 绑定地皮 </a-button>
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
