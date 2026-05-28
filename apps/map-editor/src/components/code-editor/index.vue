<script setup lang="ts">
import * as monaco from "monaco-editor";
import { ref, onMounted, onBeforeUnmount, watch } from "vue";
import { useMapDataStore } from "@src/stores";
import { useMonacoInstance } from "./composables/useMonacoInstance";
import { useMonacoTypeLibs } from "./composables/useMonacoTypeLibs";

const props = withDefaults(
	defineProps<{
		modelValue: string;
		staticTypes?: string;
		language?: 'typescript' | 'javascript' | 'html' | string;
		templateText?: string;
		skipTypeLibs?: boolean;
	}>(),
	{
		language: 'typescript',
		skipTypeLibs: false,
	},
);

const code = defineModel<string>('modelValue');
const containerRef = ref<HTMLDivElement | null>(null);
const mapDataStore = useMapDataStore();

const { monacoInstance, initEditor, destroyEditor } = useMonacoInstance();
const { refreshTypeLibs } = useMonacoTypeLibs(monacoInstance);

// 组件内部状态
let editorInstance: monaco.editor.IStandaloneCodeEditor | null = null;
let modelInstance: monaco.editor.ITextModel | null = null;
let decorationCollection: monaco.editor.IEditorDecorationsCollection | null = null;
const containerId = `monaco-container-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

// =========================================================
// 🎨 高亮显示
// =========================================================

const updateHighlights = () => {
	if (!editorInstance || !modelInstance || !monacoInstance.value) return;

	const text = modelInstance.getValue();
	const regex = /(\$ui__[a-zA-Z0-9_\-]+|\$mod__[a-zA-Z0-9_\-]+)/g;
	const decorations: monaco.editor.IModelDeltaDecoration[] = [];
	let match;

	while ((match = regex.exec(text)) !== null) {
		const startOffset = match.index;
		const endOffset = startOffset + match[0].length;
		const startPos = modelInstance.getPositionAt(startOffset);
		const endPos = modelInstance.getPositionAt(endOffset);

		const isMod = match[0].startsWith("$mod__");
		decorations.push({
			range: new monacoInstance.value.Range(startPos.lineNumber, startPos.column, endPos.lineNumber, endPos.column),
			options: {
				isWholeLine: false,
				inlineClassName: isMod ? "custom-mod-token" : "custom-ui-token",
				hoverMessage: { value: isMod ? "⚡ 修饰器模板" : "🧩 UI 组件" },
			},
		});
	}

	if (!decorationCollection) {
		decorationCollection = editorInstance.createDecorationsCollection(decorations);
	} else {
		decorationCollection.set(decorations);
	}
};

// =========================================================
// 🔄 监听器
// =========================================================

// 1. 外部代码变化 -> 同步到编辑器
watch(code, (newValue) => {
	if (editorInstance && newValue !== editorInstance.getValue()) {
		editorInstance.setValue(newValue || "");
		updateHighlights();
	}
});

// 2. 语言变化
watch(
	() => props.language,
	(lang) => {
		if (modelInstance && monacoInstance.value) {
			monacoInstance.value.editor.setModelLanguage(modelInstance, lang);
		}
	},
);

// =========================================================
// 🧬 生命周期
// =========================================================

onMounted(async () => {
	if (!containerRef.value) return;

	const result = await initEditor(containerRef.value, {
		value: code.value || (props.templateText || ""),
		language: props.language,
		containerId,
	});
	editorInstance = result.editor;
	modelInstance = result.model;

	// 修复竞态：initEditor 是 async 的，等待期间 code.value 可能已被父组件更新
	if (code.value && code.value !== editorInstance.getValue()) {
		editorInstance.setValue(code.value);
	}

	// 注入类型库（挂载时 + store 变化时）
	const refreshTypes = () => {
		if (props.skipTypeLibs || !monacoInstance.value) return;
		refreshTypeLibs({
			staticTypes: props.staticTypes,
			extraLibs: mapDataStore.extraLibs || '',
			uiTemplates: mapDataStore.uiTemplates || [],
			gameSettingForm: mapDataStore.gameSettingForm || [],
			modifierTemplates: mapDataStore.modifierTemplates || [],
		});
	};
	refreshTypes();

	watch(
		() => [
			mapDataStore.extraLibs,
			mapDataStore.uiTemplates,
			mapDataStore.gameSettingForm,
			mapDataStore.modifierTemplates,
		],
		() => refreshTypes(),
	);

	// 监听内容变化
	editorInstance.onDidChangeModelContent(() => {
		const val = editorInstance!.getValue();
		if (val !== code.value) {
			code.value = val;
		}
		updateHighlights();
	});

	// 初始高亮
	updateHighlights();
});

onBeforeUnmount(() => {
	if (decorationCollection) {
		decorationCollection.clear();
		decorationCollection = null;
	}
	destroyEditor();
});
</script>

<template>
	<div ref="containerRef" class="monaco-editor-container"></div>
</template>

<style lang="scss">
/* 全局样式：UI 组件高亮 */
.custom-ui-token {
	background-color: #f0f5ffd7;
	color: #1d39c4 !important;
	border: 1px solid #adc6ff;
	border-radius: 4px;
	font-weight: bold;
	font-style: oblique;
	margin: 0 1px;
}

.vs-dark .custom-ui-token {
	background-color: #162447;
	color: #6a85b6 !important;
	border-color: #2f4b7c;
}

.custom-mod-token {
	background-color: #fff7e6d7;
	color: #d48806 !important;
	border: 1px solid #ffd591;
	border-radius: 4px;
	font-weight: bold;
	font-style: oblique;
	margin: 0 1px;
}

.vs-dark .custom-mod-token {
	background-color: #2b1d0e;
	color: #d48806 !important;
	border-color: #594214;
}
</style>

<style lang="scss" scoped>
.monaco-editor-container {
	width: 100%;
	height: 100%;
	border: 1px solid #cccccc;
	box-sizing: border-box;
	background-color: #eeeeee;
}
</style>
