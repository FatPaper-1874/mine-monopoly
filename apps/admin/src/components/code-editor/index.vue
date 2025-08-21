<script setup lang="ts">
import * as monaco from "monaco-editor";
import { nextTick, onMounted, ref, watch, watchEffect } from "vue";
import { ElMessage } from "element-plus";
import { onBeforeUnmount } from "vue";

const props = defineProps<{ modelText: string; modelValue: string }>();
const emits = defineEmits(["update:modelValue", "save"]);
let editor: monaco.editor.IStandaloneCodeEditor | null = null;

const contentCache = ref(props.modelValue);

const handleSaveKey = (event: KeyboardEvent) => {
	if (event.ctrlKey && event.key === "s") {
		event.preventDefault(); // 阻止默认的保存行为
		emits("save");
	}
};

function mixContent(model: string, content: string) {
	const oldModelTextArr = model.split("\n");
	const firstTagIndex = oldModelTextArr.findIndex((i) => i.includes("//CODING AREA"));
	oldModelTextArr.splice(firstTagIndex + 1, 0, content);
	return oldModelTextArr.join("\n");
}

watch(
	() => props.modelText,
	(newValue) => {
		const content = mixContent(newValue, contentCache.value);
		editor && editor.setValue(content);
		console.log("change");

		// nextTick(() => {
		// 	if (!editor) return;
		// 	const formatDocument = editor.getAction("editor.action.formatDocument");
		// 	formatDocument && formatDocument.run();
		// });
	},
	{
		immediate: true,
	}
);

onMounted(() => {
	// monaco.languages.typescript.javascriptDefaults.setCompilerOptions({
	// 	target: monaco.languages.typescript.ScriptTarget.ESNext,
	// 	module: monaco.languages.typescript.ModuleKind.CommonJS,
	// });

	// const model = monaco.editor.createModel(code, "typescript");

	// const output = monaco.languages.typescript.transpileModule(code, {
	// 	compilerOptions: { module: monaco.languages.typescript.ModuleKind.CommonJS },
	// });
	// import("./base-interface.d.ts?raw").then((res) => {
	// 	const baseInterface = res.default;
	// 	monaco.languages.typescript.typescriptDefaults.setExtraLibs([{ content: baseInterface }]);
	const container = document.getElementById("code-editor-container") as HTMLElement;
	editor = monaco.editor.create(container, {
		value: mixContent(props.modelText, props.modelValue),
		language: "typescript",
		automaticLayout: true,
	});

	editor.onDidChangeModelContent((e) => {
		if (!editor) return;
		const content = editor.getValue();
		const match = content.match(/\/\/CODING AREA\s*([\s\S]*?)\s*\/\/CODING AREA/);
		if (!match) {
			ElMessage({ type: "error", message: "请不要删除 //CODING AREA" });
			return;
		}
		contentCache.value = match[1].trim();
		emits("update:modelValue", match[1].trim());
	});
	nextTick(() => {
		if (!editor) return;
		editor.setValue(editor.getValue());
	});
});
window.addEventListener("keydown", handleSaveKey);
// });

onBeforeUnmount(() => {
	window.removeEventListener("keydown", handleSaveKey);
	editor && editor.dispose();
});
</script>

<template>
	<div id="code-editor-container">
		<div id="code-editor"></div>
	</div>
</template>

<style scoped lang="scss">
#code-editor-container {
	width: 100%;
	height: 100%;
}
</style>
