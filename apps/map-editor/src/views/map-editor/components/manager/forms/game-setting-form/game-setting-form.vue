<script setup lang="ts">
import { FormSchema } from "@mine-monopoly/types";
import { useMapDataStore } from "@src/stores";
import { message } from "ant-design-vue";
import { clone } from "lodash";
import { ref } from "vue";
import { generateShortId } from "@src/utils/short-id";

// 编辑器内部维护的数据
const schemaList = ref<FormSchema[]>(clone(useMapDataStore().gameSettingForm));

// 添加新字段
const addField = (type: "number-input" | "select") => {
	schemaList.value.push({
		id: generateShortId('form-field'),
		key: type === "number-input" ? `num_field` : `sel_field`,
		type,
		label: type === "number-input" ? "数字输入项" : "下拉选择项",
		defaultValue: type === "number-input" ? 0 : undefined,
		// 如果是下拉框，默认给一个选项
		options: type === "select" ? [{ label: "选项1", value: "1" }] : undefined,
	});
};

// 删除字段
const removeField = (index: number) => {
	const field = schemaList.value[index];
	if (field?.builtIn) return; // 内置参数不可删除
	schemaList.value.splice(index, 1);
};

// 添加下拉选项
const addOption = (field: FormSchema) => {
	field.options?.push({ label: "新选项", value: "" });
};

// 删除下拉选项
const removeOption = (field: FormSchema, idx: number) => {
	const removedVal = field.options?.[idx].value;
	// 如果删除了作为默认值的选项，重置默认值
	if (removedVal === field.defaultValue) {
		field.defaultValue = undefined;
	}
	field.options?.splice(idx, 1);
};

function save() {
	try {
		useMapDataStore().updateGameSettingFrom(clone(schemaList.value));
		message.success("保存游戏参数表单成功", 1);
	} catch (e: any) {
		message.error(e.message, 1);
	}
}
</script>

<template>
	<div class="editor-wrapper">
		<div class="toolbar">
			<div>
				<a-button @click="addField('number-input')" style="margin-right: 6px"> + 添加数字输入 </a-button>
				<a-button @click="addField('select')"> + 添加下拉选择 </a-button>
			</div>
			<a-button type="primary" @click="save"> 保存 </a-button>
		</div>

		<a-empty v-if="schemaList.length === 0" description="点击上方按钮添加表单项" />

		<div class="schema-list">
			<a-card v-for="(field, index) in schemaList" :key="field.id" size="small" class="field-card" :hoverable="true">
				<template #title>
					<span class="card-title">
						<span class="tag" :class="field.type">
							{{ field.type === "number-input" ? "数字" : "下拉" }}
						</span>
						{{ field.key }}
						<span v-if="field.builtIn" class="built-in-tag">内置</span>
					</span>
				</template>

				<template #extra>
					<a-popconfirm
						v-if="field.builtIn"
						title="内置参数不可删除"
						placement="left"
					>
						<a-button type="link" danger size="small" disabled> 删除字段 </a-button>
					</a-popconfirm>
					<a-popconfirm
						v-else
						title="确定删除此字段？"
						placement="left"
						@confirm="removeField(index)"
					>
						<a-button type="link" danger size="small"> 删除字段 </a-button>
					</a-popconfirm>
				</template>

				<a-form layout="vertical">
					<a-row :gutter="16">
						<a-col :span="8">
							<a-form-item label="显示标题 (Label)">
								<a-input v-model:value="field.label" placeholder="例如：年龄" />
							</a-form-item>
						</a-col>
						<a-col :span="8">
							<a-form-item label="字段名 (Key)">
								<a-input v-model:value="field.key" placeholder="例如：age" />
							</a-form-item>
						</a-col>
						<a-col :span="8">
							<a-form-item label="默认值">
								<a-input-number
									v-if="field.type === 'number-input'"
									v-model:value="field.defaultValue as number"
									style="width: 100%"
									placeholder="默认数字"
								/>
								<a-select
									v-else
									v-model:value="field.defaultValue"
									style="width: 100%"
									placeholder="选择默认项"
									allowClear
								>
									<a-select-option v-for="(opt, i) in field.options" :key="i" :value="opt.value">
										{{ opt.label }}
									</a-select-option>
								</a-select>
							</a-form-item>
						</a-col>
					</a-row>

					<!-- 数字类型专属：最大最小值设置 -->
					<a-row v-if="field.type === 'number-input'" :gutter="16" style="margin-top: -8px">
						<a-col :span="12">
							<a-form-item label="最小值 (可选)">
								<a-input-number
									v-model:value="field.min"
									style="width: 100%"
									placeholder="不限制"
									allowClear
								/>
							</a-form-item>
						</a-col>
						<a-col :span="12">
							<a-form-item label="最大值 (可选)">
								<a-input-number
									v-model:value="field.max"
									style="width: 100%"
									placeholder="不限制"
									allowClear
								/>
							</a-form-item>
						</a-col>
					</a-row>

					<div v-if="field.type === 'select'" class="options-area">
						<div class="options-header">选项列表：</div>

						<div v-for="(opt, i) in field.options" :key="i" class="option-row">
							<span class="option-index">{{ i + 1 }}.</span>
							<a-input v-model:value="opt.label" placeholder="显示名" />
							<a-input v-model:value="opt.value" placeholder="值" />
							<a-button size="small" danger @click="removeOption(field, i)"> 删除 </a-button>
						</div>

						<a-button type="dashed" block style="margin-top: 10px" @click="addOption(field)"> + 添加新选项 </a-button>
					</div>
				</a-form>
			</a-card>
		</div>
	</div>
</template>

<style scoped>
.editor-wrapper {
	padding: 20px;
	height: 70vh;
	overflow-y: scroll;
	background-color: #fff;
}

.toolbar {
	margin-bottom: 20px;
	padding-bottom: 20px;
	border-bottom: 1px solid #f0f0f0;
	display: flex;
	justify-content: space-between;
}

.schema-list {
	display: flex;
	flex-direction: column;
	gap: 16px;
}

.field-card {
	border: 1px solid #f0f0f0;
	background-color: #fafafa;
}

.card-title {
	font-weight: bold;
	display: flex;
	align-items: center;
	gap: 8px;
}

.tag {
	font-size: 12px;
	padding: 2px 6px;
	border-radius: 4px;
	color: #fff;
	font-weight: normal;
}

.tag.number-input {
	background-color: #1677ff; /* Ant Blue */
}

.tag.select {
	background-color: #52c41a; /* Ant Green */
}

.built-in-tag {
	font-size: 11px;
	padding: 1px 6px;
	border-radius: 3px;
	background-color: #e6f7ff;
	color: #1677ff;
	border: 1px solid #91caff;
	margin-left: 4px;
	font-weight: normal;
}

/* 选项区域样式 */
.options-area {
	margin-top: 10px;
	padding: 12px;
	background-color: #e6f7ff; /* 浅蓝色背景区分 */
	border: 1px dashed #91caff;
	border-radius: 4px;
}

.options-header {
	font-size: 13px;
	color: #666;
	margin-bottom: 8px;
}

.option-row {
	display: flex;
	align-items: center;
	gap: 8px;
	margin-bottom: 8px;
}

.option-index {
	color: #999;
	font-size: 12px;
	width: 20px;
}
</style>
