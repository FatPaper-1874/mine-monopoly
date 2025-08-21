<script setup lang="ts">
import { Street } from "@fatpaper-monopoly/types/interfaces/game/item";
import CodeEditor from "@src/components/code-editor/index.vue";
import libContent from "./editor-lib.d.ts?raw";
import templateText from "./template-text?raw";
import { reactive, watch } from "vue";
import { useMapDataStore } from "@src/stores";
import { message } from "ant-design-vue";

const props = defineProps<{ street: Street | undefined }>();
const emits = defineEmits(["close"]);

function getInitForm() {
	const initForm = {
		id: crypto.randomUUID(),
		name: "",
		description: "",
		effectCode: "",
		properties: [],
	};
	return initForm;
}

const streetForm = reactive<Street>(props.street || getInitForm());

function handleAddStreet() {
	try {
		const mapDataStore = useMapDataStore();
		if (props.street) {
			mapDataStore.editStreet(streetForm);
			message.success(`修改${streetForm.name}成功`);
		} else {
			mapDataStore.addStreet(streetForm);
			message.success("添加成功");
		}
		emits("close");
	} catch (e: any) {
		message.error(e.message, 1);
	}
}
</script>

<template>
	<div class="street-form-container">
		<a-form @finish="handleAddStreet" :model="streetForm" name="street" autocomplete="off">
			<a-form-item label="ID">
				<a-alert style="word-break: break-all" :message="streetForm.id" type="info" />
			</a-form-item>
			<a-form-item label="街道名称" name="name" :rules="[{ required: true, message: '请输入街道名称' }]">
				<a-input v-model:value="streetForm.name" />
			</a-form-item>
			<a-form-item label="街道描述" name="description" :rules="[{ required: true, message: '请输入街道描述' }]">
				<a-input v-model:value="streetForm.description" />
			</a-form-item>
			<a-form-item>
				<a-button type="primary" html-type="submit">确认修改</a-button>
			</a-form-item>
		</a-form>
		<div class="editor-container">
			<span class="title"
				><a-alert
					message="在下面编辑器编写触发代码，游戏进行到响应的触发时机会直接执行下面全部的代码"
					type="info"
					show-icon
			/></span>
			<code-editor v-model="streetForm.effectCode" :template-text="templateText" :extra-libs="[libContent]" />
		</div>
	</div>
</template>

<style lang="scss" scoped>
.street-form-container {
	display: flex;
	height: 75vh;

	.editor-container {
		display: flex;
		flex: 1;
		flex-direction: column;
		padding: 0 10px;
		gap: 10px;
	}
}
</style>
