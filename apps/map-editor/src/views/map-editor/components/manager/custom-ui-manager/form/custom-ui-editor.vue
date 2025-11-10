<script setup lang="ts">
import { CustomUI } from "@fatpaper-monopoly/types";
import CodeEditor from "@src/components/code-editor/index.vue";
import libContent from "./editor-lib.d.ts?raw";
import vueHLib from "./vue-h.d.ts?raw";
import templateText from "./template-text?raw";
import { onMounted, reactive, ref } from "vue";
import { Modal } from "ant-design-vue";

const props = defineProps<{ customUI: CustomUI }>();

const emits = defineEmits(["save", "delete"]);

const tempCustomUIForm = reactive<CustomUI>(props.customUI);

function handleSave() {
	emits("save", JSON.parse(JSON.stringify(tempCustomUIForm)));
}

function handleDelete() {
	Modal.confirm({
		title: `确定删除UI: "${props.customUI.name}" 吗?`,
		onOk: () => {
			emits("delete", props.customUI.id);
		},
		okText: "删除",
		cancelText: "取消",
	});
}
</script>

<template>
	<a-row :gutter="16" style="height: 75vh">
		<a-col :span="4">
			<a-form @finish="handleSave" :model="tempCustomUIForm" name="custom-ui">
				<a-form-item label="ID">
					<a-input v-model:value="tempCustomUIForm.id" disabled />
				</a-form-item>

				<a-form-item label="名称" name="name" :rules="[{ required: true, message: '请输入UI名称' }]">
					<a-input v-model:value="tempCustomUIForm.name" />
				</a-form-item>

				<a-form-item label="X" :name="['layout', 'x']" :rules="[{ required: true, message: '布局数据X不能为空' }]">
					<a-input-number :min="0" v-model:value="tempCustomUIForm.layout.x" placeholder="请输入X坐标" />
				</a-form-item>

				<a-form-item label="Y" :name="['layout', 'y']" :rules="[{ required: true, message: '布局数据Y不能为空' }]">
					<a-input-number :min="0" v-model:value="tempCustomUIForm.layout.y" placeholder="请输入Y坐标" />
				</a-form-item>

				<a-form-item
					label="宽"
					:name="['layout', 'width']"
					:rules="[{ required: true, message: '布局数据宽不能为空' }]"
				>
					<a-input-number :min="1" v-model:value="tempCustomUIForm.layout.width" placeholder="请输入宽度" />
				</a-form-item>

				<a-form-item
					label="高"
					:name="['layout', 'height']"
					:rules="[{ required: true, message: '布局数据高不能为空' }]"
				>
					<a-input-number :min="1" v-model:value="tempCustomUIForm.layout.height" placeholder="请输入高度" />
				</a-form-item>

				<a-form-item>
					<a-button @click="handleDelete" danger>删除</a-button>
					<a-button style="margin-left: 10px" type="primary" html-type="submit">确认修改</a-button>
				</a-form-item>
			</a-form>
		</a-col>
		<a-col :span="20">
			<div class="code-editor-container">
				<span class="title">
					<a-alert message="在下面编辑器编写VNode生成代码, 代码会在加载游戏UI时触发" type="info" show-icon />
				</span>

				<code-editor
					v-model="tempCustomUIForm.initCode"
					:template-text="templateText"
					:extra-libs="[libContent, vueHLib]"
				/>
			</div>
		</a-col>
	</a-row>
</template>

<style lang="scss" scoped>
.layout-input {
	margin-bottom: 10px;
}
.code-editor-container {
	display: flex;
	height: 100%;
	flex-direction: column;
	padding: 0 10px;
	gap: 10px;
}
</style>
