<script setup lang="ts">
import { reactive, ref, computed, watch, toRaw } from "vue";
import type { FormInstance, Rule } from "ant-design-vue/es/form";
import { message } from "ant-design-vue";
import { PropertyInfo, MapItem } from "@mine-monopoly/types";
import { useEditorStore, useMapDataStore } from "@src/stores";
import EffectEditor from "./effect-editor.vue";
import BuildingModelSeletor from "../../components/building-model-seletor.vue";
import { cloneDeep } from "lodash";
import { generateShortId } from "@src/utils/short-id";

const editorStore = useEditorStore();
const mapDataStore = useMapDataStore();

const currentMapItemId = computed(() => editorStore.currentMapItemId);

const formRef = ref<FormInstance>();
const submitting = ref(false);

const createDefaultData = (): PropertyInfo => ({
	id: generateShortId('property'),
	name: "",
	sellCost: 0,
	buildCost: 0,
	costList: [0, 0, 0],
	level: 0,
	maxLevel: 2, // 建议在普通模式下由 costList.length - 1 决定
	buildingModelIdList: undefined,
	custom: undefined,
	exportData: {},
	customUI: undefined,
});

const formData = reactive<PropertyInfo>(createDefaultData());
const isCustomProperty = ref(false);

const rules: Record<string, Rule[]> = {
	name: [{ required: true, message: "请输入地皮名称", trigger: "blur" }],
	sellCost: [{ required: true, message: "请输入空地价格", trigger: "change" }],
	buildCost: [{ required: true, message: "请输入建楼价格", trigger: "change" }],
	costList: [{ type: "array", required: true, message: "请配置过路费", trigger: "change" }],
};

/** CustomData */

interface CustomDataRow {
	key: string;
	type: "string" | "number" | "boolean";
	value: string | number | boolean;
}

const customDataList = ref<CustomDataRow[]>([]);

// 初始化：将 Object 转为 List
function initCustomDataList() {
	const data = formData.exportData || {};
	customDataList.value = Object.entries(data).map(([key, val]) => {
		let type: CustomDataRow["type"] = "string";
		if (typeof val === "number") type = "number";
		else if (typeof val === "boolean") type = "boolean";
		const value =
			typeof val === "string" || typeof val === "number" || typeof val === "boolean"
				? val
				: String(val);

		return { key, value, type };
	});
}

function onTypeChange(row: CustomDataRow, newType: "string" | "number" | "boolean") {
	const oldVal = row.value;
	row.type = newType;

	if (newType === "string") {
		row.value = String(oldVal);
	} else if (newType === "number") {
		const num = Number(oldVal);
		row.value = isNaN(num) ? 0 : num;
	} else if (newType === "boolean") {
		row.value = Boolean(oldVal) && String(oldVal) !== "false" && String(oldVal) !== "0";
	}
}

watch(
	customDataList,
	(list) => {
		const newData: Record<string, any> = {};
		list.forEach((item) => {
			if (item.key) {
				if (item.type === "number") {
					newData[item.key] = Number(item.value);
				} else if (item.type === "boolean") {
					newData[item.key] = Boolean(item.value);
				} else {
					newData[item.key] = String(item.value);
				}
			}
		});
		formData.exportData = newData;
	},
	{ deep: true },
);

function addCustomDataRow() {
	customDataList.value.push({ key: "", type: "string", value: "" });
}

function removeCustomDataRow(index: number) {
	customDataList.value.splice(index, 1);
}

watch(
	() => currentMapItemId.value,
	(newItemId) => {
		initForm(newItemId || "");
	},
	{ immediate: true, deep: true },
);

function initForm(itemId: string) {
	// 重置表单验证状态
	formRef.value?.clearValidate();

	const mapItem = useMapDataStore().findMapItemById(itemId);
	const defaultData = createDefaultData();

	if (mapItem && mapItem.property) {
		const prop = mapItem.property;
		const sourceData = JSON.parse(JSON.stringify(mapItem.property));
		// 先重置所有属性为默认值，确保清除未定义的属性
		Object.keys(defaultData).forEach(key => {
			(formData as any)[key] = (defaultData as any)[key];
		});
		// 然后从源数据覆盖
		Object.assign(formData, sourceData);
		isCustomProperty.value = !!prop.custom;
	} else {
		// 重置为默认值 - 必须逐个属性重置，不能使用 Object.assign
		Object.keys(defaultData).forEach(key => {
			(formData as any)[key] = (defaultData as any)[key];
		});
		isCustomProperty.value = false;
	}

	// 这里的调用依赖于上面的定义
	initCustomDataList();
}

function handleCustomModeChange(checked: boolean) {
	if (checked) {
		formData.custom = { effectCode: "", description: "" };
	} else {
		formData.custom = undefined;
		// 切回普通模式，确保 costList 存在
		if (!formData.costList || formData.costList.length === 0) {
			formData.costList = [0, 0, 0];
			formData.maxLevel = 2;
		}
	}
}

function addCostLevel() {
	formData.costList.push(0);
	syncMaxLevel();
}

function removeCostLevel(index: number) {
	formData.costList.splice(index, 1);
	syncMaxLevel();
}

function syncMaxLevel() {
	// 如果逻辑是：数组长度 - 1 = 最大等级
	formData.maxLevel = Math.max(0, formData.costList.length - 1);
}

async function handleSubmit() {
	if (!currentMapItemId.value) return;

	try {
		await formRef.value?.validate();
		submitting.value = true;

		// 再次确保 maxLevel 正确 (防御性编程)
		if (!isCustomProperty.value) {
			syncMaxLevel();
		}

		// 提交数据 (toRaw 确保传入 Store 的是纯对象，非 Proxy，视 Store 实现而定)
		mapDataStore.addProperty(currentMapItemId.value, cloneDeep(formData));
		message.success("保存地皮信息成功");
	} catch (error) {
		console.error(error);
		// 校验失败会自动提示，无需额外 message
	} finally {
		submitting.value = false;
	}
}

const effectEditorVisible = ref(false);
const buildingModelVisible = ref(false);

function onBuildingModelSubmit(ids: string[]) {
	formData.buildingModelIdList = ids;
	buildingModelVisible.value = false;
}

async function copyMapItemId() {
	try {
		await navigator.clipboard.writeText(formData.id);
		message.success("ID 已复制到剪贴板");
	} catch (err) {
		message.error("复制失败，请手动选择复制");
	}
}

function handleEffectCodeSave(newCode: string) {
	if (formData.custom) {
		formData.custom.effectCode = newCode;
	}
	effectEditorVisible.value = false;
}

const uiTemplate = computed(() => useMapDataStore().uiTemplates);
</script>

<template>
	<div class="property-editor">
		<div class="header">
			<span class="title">地皮设置</span>
			<a-space>
				<span>模式：</span>
				<a-switch
					v-model:checked="isCustomProperty"
					@change="handleCustomModeChange"
					checked-children="自定义"
					un-checked-children="标准"
				/>
			</a-space>
		</div>

		<a-form ref="formRef" :model="formData" :rules="rules" layout="vertical" class="scrollable-form">
			<a-row :gutter="16">
				<a-col :span="24">
					<a-form-item label="地皮ID">
						{{ formData.id }}
						<a-button type="link" size="mini" @click="copyMapItemId">
							<template #icon>复制ID</template>
						</a-button>
					</a-form-item>
				</a-col>

				<a-col :span="24">
					<a-form-item label="地皮名称" name="name">
						<a-input v-model:value="formData.name" placeholder="例如：贝克街" allow-clear />
					</a-form-item>
				</a-col>

				<a-col :span="12">
					<a-form-item label="最大等级 (Max Level)" name="maxLevel">
						<a-input-number
							v-model:value="formData.maxLevel"
							:min="0"
							style="width: 100%"
							:disabled="!isCustomProperty"
						/>
					</a-form-item>
				</a-col>

				<a-col :span="12">
					<a-form-item label="购买价格" name="sellCost">
						<a-input-number
							v-model:value="formData.sellCost"
							:min="0"
							:step="100"
							style="width: 100%"
							addon-after="$"
						/>
					</a-form-item>
				</a-col>
				<a-col :span="12">
					<a-form-item label="升级成本" name="buildCost">
						<a-input-number
							v-model:value="formData.buildCost"
							:min="0"
							:step="100"
							style="width: 100%"
							addon-after="$"
						/>
					</a-form-item>
				</a-col>
			</a-row>

			<a-divider style="margin: 12px 0" />

			<template v-if="isCustomProperty && formData.custom">
				<div class="custom-block">
					<div class="info-text">地皮描述</div>
					<a-textarea v-model:value="formData.custom.description" placeholder="填写地皮描述" :rows="4" />
					<a-typography-paragraph type="secondary" style="font-size: 12px; margin-top: 4px;">
						支持 \n 进行换行
					</a-typography-paragraph>
				</div>

				<a-divider style="margin: 12px 0" />

				<div class="custom-block">
					<div class="info-text">自定义模式下，地皮触发逻辑由代码控制。</div>
					<a-button type="dashed" block @click="effectEditorVisible = true">
						<template #icon><span>⚡</span></template>
						编辑脚本代码
					</a-button>
				</div>
			</template>

			<template v-else>
				<div class="cost-list-header">
					<span>过路费等级配置</span>
					<a-button type="link" size="small" @click="addCostLevel">新增等级</a-button>
				</div>

				<div class="cost-list-container">
					<template v-for="(cost, index) in formData.costList" :key="index">
						<a-form-item :name="['costList', index]" :rules="{ required: true, message: '必填' }" class="cost-item">
							<div class="cost-row">
								<span class="level-label">LV.{{ index }}</span>
								<a-input-number v-model:value="formData.costList[index]" :min="0" :step="50" style="flex: 1" />
								<a-button v-if="formData.costList.length > 1" type="text" danger @click="removeCostLevel(index)">
									×
								</a-button>
							</div>
						</a-form-item>
					</template>
				</div>
			</template>

			<a-divider style="margin: 12px 0" />

			<a-form-item label="建筑模型绑定">
				<div class="model-preview">
					<div v-if="formData.buildingModelIdList?.length" class="model-tags">
						已绑定 {{ formData.buildingModelIdList.length }} 个模型ID
					</div>
					<div v-else class="text-gray">暂无模型绑定</div>

					<a-space>
						<a-button size="small" @click="buildingModelVisible = true">
							{{ formData.buildingModelIdList ? "修改" : "选择" }}
						</a-button>
						<a-button
							v-if="formData.buildingModelIdList"
							size="small"
							danger
							@click="formData.buildingModelIdList = undefined"
						>
							清空
						</a-button>
					</a-space>
				</div>
			</a-form-item>

			<a-divider style="margin: 12px 0" />

			<a-form-item label="自定义展示UI模板">
				<a-select
					v-model:value="formData.customUI"
					placeholder="请选择组件"
					show-search
					allow-clear
					option-filter-prop="label"
				>
					<a-select-option v-for="t in uiTemplate" :key="t.id" :value="t.id" :label="t.name">
						{{ t.name }}
						<span style="color: #ccc; font-size: 12px; margin-left: 4px"> ({{ t.id.slice(0, 6) }}) </span>
					</a-select-option>
				</a-select>
				<div class="help-text">会将地皮实例(property)传入作为数据</div>
			</a-form-item>

			<div class="custom-data-section">
				<div class="section-header">
					<span>自定义数据 (Custom Data)</span>
					<a-button type="link" @click="addCustomDataRow">添加参数</a-button>
				</div>

				<div v-if="customDataList.length === 0" class="empty-tip">暂无自定义参数</div>

				<div v-else class="custom-data-list">
					<div v-for="(row, index) in customDataList" :key="index" class="custom-data-row">
						<a-input v-model:value="row.key" placeholder="Key" style="width: 30%; min-width: 80px" />

						<span class="colon">:</span>

						<div class="value-input-wrapper">
							<a-input v-if="row.type === 'string'" v-model:value="row.value" placeholder="Value" />
							<a-input-number
								v-else-if="row.type === 'number'"
								v-model:value="row.value"
								style="width: 100%"
								placeholder="0"
							/>
							<a-switch
								v-else-if="row.type === 'boolean'"
								v-model:checked="row.value"
								checked-children="True"
								un-checked-children="False"
							/>
						</div>

						<a-select
							:value="row.type"
							@update:value="(val: any) => onTypeChange(row, val)"
							style="width: 85px; flex-shrink: 0"
							:dropdownMatchSelectWidth="false"
						>
							<a-select-option value="string">Str</a-select-option>
							<a-select-option value="number">Num</a-select-option>
							<a-select-option value="boolean">Bool</a-select-option>
						</a-select>

						<a-button type="text" danger class="delete-btn" @click="removeCustomDataRow(index)"> × </a-button>
					</div>
				</div>
			</div>
		</a-form>

		<div class="footer-actions">
			<a-button type="primary" block :loading="submitting" @click="handleSubmit"> 保存地皮配置 </a-button>
		</div>

		<a-modal v-model:open="effectEditorVisible" title="编辑触发代码" width="800px" destroyOnClose :footer="null">
			<effect-editor v-if="formData.custom" :value="formData.custom.effectCode" @save="handleEffectCodeSave" />
		</a-modal>

		<a-modal v-model:open="buildingModelVisible" title="选择建筑模型" destroyOnClose :footer="null">
			<building-model-seletor :modelIdList="formData.buildingModelIdList" @submit="onBuildingModelSubmit" />
		</a-modal>
	</div>
</template>

<style scoped lang="scss">
.property-editor {
	background: #fff;
	border-radius: 8px;
	box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
	width: 30vw;
	max-height: 70vh;
	overflow-y: scroll;
}

.header {
	padding: 16px 20px;
	border-bottom: 1px solid #f0f0f0;
	display: flex;
	justify-content: space-between;
	align-items: center;
	flex-shrink: 0;

	.title {
		margin: 0;
		font-weight: 600;
	}
}

.scrollable-form {
	flex: 1;
	overflow-y: auto;
	padding: 20px;
}

.custom-block {
	background: #fafafa;
	padding: 15px;
	border-radius: 6px;
	border: 1px dashed #d9d9d9;
	text-align: center;

	.info-text {
		margin-bottom: 10px;
		color: #888;
		font-size: 13px;
	}
}

.cost-list-header {
	display: flex;
	justify-content: space-between;
	align-items: center;
	margin-bottom: 10px;
	font-weight: 500;
}

.cost-list-container {
	background: #fafafa;
	padding: 10px;
	border-radius: 6px;
}

.cost-item {
	margin-bottom: 10px;

	&:last-child {
		margin-bottom: 0;
	}

	.cost-row {
		display: flex;
		align-items: center;
		gap: 8px;

		.level-label {
			width: 40px;
			font-weight: bold;
			color: #666;
		}
	}
}

.model-preview {
	display: flex;
	justify-content: space-between;
	align-items: center;
	padding: 8px 12px;
	background: #f5f5f5;
	border-radius: 4px;

	.model-tags {
		color: #1890ff;
		font-weight: 500;
	}

	.text-gray {
		color: #ccc;
	}
}

.footer-actions {
	padding: 12px 20px;
	border-top: 1px solid #f0f0f0;
	background: #fff;
	flex-shrink: 0;
}

// Custom Data
.section-header {
	display: flex;
	justify-content: space-between;
	align-items: center;
	font-weight: 600;
	margin-bottom: 8px;
	color: #333;
}

.empty-tip {
	text-align: center;
	color: #999;
	font-size: 12px;
	padding: 10px 0;
	border: 1px dashed #eee;
	border-radius: 4px;
}

.custom-data-list {
	display: flex;
	flex-direction: column;
	gap: 8px;
	padding-bottom: 4px;
}

.custom-data-row {
	display: flex;
	align-items: center;
	gap: 6px;
	background: #fafafa;
	padding: 6px;
	border-radius: 4px;
	border: 1px solid #f0f0f0;

	// 关键：防止Flex挤压
	flex-shrink: 0;

	.colon {
		font-weight: bold;
		color: #999;
	}

	.value-input-wrapper {
		flex: 1;
		display: flex;
		align-items: center;
		min-width: 0;

		:deep(.ant-input-number) {
			width: 100%;
		}
	}

	.delete-btn {
		padding: 0 4px;
		height: 24px;
		line-height: 24px;
	}
}

.help-text {
	font-size: 12px;
	color: #999;
	margin-top: 4px;
}
</style>
