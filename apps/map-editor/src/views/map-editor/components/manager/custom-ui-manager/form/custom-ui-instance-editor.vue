<script setup lang="ts">
import { reactive, watch } from "vue";
import { Modal } from "ant-design-vue";
import { CustomUI, UITemplate } from "@mine-monopoly/types";

// 接收 CustomUI 实例 和 所有可选的 Templates
const props = defineProps<{
	instance: CustomUI;
	templates: UITemplate[];
}>();

const emits = defineEmits(["save", "delete"]);

const formState = reactive<CustomUI>(JSON.parse(JSON.stringify(props.instance)));

// 同步 props 变化
watch(
	() => props.instance,
	(newVal) => {
		Object.assign(formState, JSON.parse(JSON.stringify(newVal)));
	},
);

function handleSave() {
	emits("save", JSON.parse(JSON.stringify(formState)));
}

function handleDelete() {
	Modal.confirm({
		title: `确定删除实例: "${formState.name}" 吗?`,
		content: "仅删除地图上的此元素，不会删除对应的组件模板。",
		okText: "删除",
		okType: "danger",
		cancelText: "取消",
		onOk: () => {
			emits("delete", props.instance.id);
		},
	});
}
</script>

<template>
	<div class="instance-editor">
		<a-form layout="vertical" :model="formState" @finish="handleSave">
			<div class="editor-grid">
				<div class="section">
					<a-divider orientation="left">基础信息</a-divider>
					<a-form-item label="实例名称" name="name" :rules="[{ required: true, message: '请输入名称' }]">
						<a-input v-model:value="formState.name" placeholder="例如：玩家状态栏 (P1)" />
					</a-form-item>

					<a-form-item label="选择组件模板" :rules="[{ required: true, message: '请选择一个模板' }]">
						<a-select
							v-model:value="formState.uiSchema"
							placeholder="请选择组件"
							show-search
							option-filter-prop="label"
						>
							<a-select-option v-for="t in templates" :key="t.id" :value="t.id" :label="t.name">
								{{ t.name }}
								<span style="color: #ccc; font-size: 12px; margin-left: 4px"> ({{ t.id.slice(0, 6) }}) </span>
							</a-select-option>
						</a-select>
						<div class="help-text">切换模板将改变此实例的渲染内容</div>
					</a-form-item>

					<a-form-item label="实例 ID">
						<a-input v-model:value="formState.id" disabled class="code-font" />
					</a-form-item>
				</div>

				<div class="section">
					<a-divider orientation="left">地图布局 (Grid Layout)</a-divider>
					<a-row :gutter="16">
						<a-col :span="12">
							<a-form-item label="X 坐标">
								<a-input-number v-model:value="formState.layout.x" :min="0" style="width: 100%" />
							</a-form-item>
						</a-col>
						<a-col :span="12">
							<a-form-item label="Y 坐标">
								<a-input-number v-model:value="formState.layout.y" :min="0" style="width: 100%" />
							</a-form-item>
						</a-col>
					</a-row>

					<a-row :gutter="16">
						<a-col :span="12">
							<a-form-item label="宽度 (Cols)">
								<a-input-number v-model:value="formState.layout.width" :min="1" style="width: 100%" />
							</a-form-item>
						</a-col>
						<a-col :span="12">
							<a-form-item label="高度 (Rows)">
								<a-input-number v-model:value="formState.layout.height" :min="1" style="width: 100%" />
							</a-form-item>
						</a-col>
					</a-row>
				</div>
			</div>

			<div class="actions">
				<a-button danger @click="handleDelete">删除实例</a-button>
				<a-button type="primary" html-type="submit">保存</a-button>
			</div>
		</a-form>
	</div>
</template>

<style scoped lang="scss">
.instance-editor {
	padding: 24px;
	margin: 0 auto;
}
.editor-grid {
	display: grid;
	grid-template-columns: 1fr 1fr;
	gap: 32px;
	margin-bottom: 32px;
}
.help-text {
	font-size: 12px;
	color: #999;
	margin-top: 4px;
}
.code-font {
	font-family: monospace;
	font-size: 12px;
	color: #999;
}
.actions {
	display: flex;
	justify-content: flex-end;
	gap: 16px;
	border-top: 1px solid #f0f0f0;
	padding-top: 24px;
}
</style>
