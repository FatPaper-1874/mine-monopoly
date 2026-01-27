<script setup lang="ts">
import { ref, watch } from "vue";
import { message } from "ant-design-vue"; // 假设使用了 ant-design-vue 的 message
import { useMapDataStore } from "@src/stores";
import libContent from "./editor-lib.d.ts?raw";
import CodeEditor from "@src/components/code-editor/index.vue";

const visible = defineModel({ default: false });

const store = useMapDataStore();
const localEffectCode = ref("");

watch(
	() => visible.value,
	async (isOpen) => {
		if (isOpen) {
			localEffectCode.value = store.extraLibs + "" || "";
		}
	},
	{ immediate: true },
);

function handleSave() {
	store.extraLibs = localEffectCode.value;
	message.success("保存成功");
	visible.value = false;
}

function handleClose() {
	visible.value = false;
}
</script>

<template>
	<a-modal
		destroyOnClose
		@cancel="handleClose"
		@ok="handleSave"
		ok-text="保存"
		cancel-text="取消"
		width="70%"
		v-model:open="visible"
		title="全局TS类型"
	>
		<div class="editor-container">
			<code-editor v-model="localEffectCode" :template-text="''" :extra-libs="[libContent]" />
		</div>
	</a-modal>
</template>

<style lang="scss" scoped>
.editor-container {
	width: 100%;
	height: 60vh;
}
</style>
