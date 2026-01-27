<script setup lang="ts">
import * as monaco from "monaco-editor";
import { ref, onMounted, onBeforeUnmount, nextTick, watch, toRaw } from "vue";
import loader from "@monaco-editor/loader";

// 引用路径
import { useMapDataStore } from "@src/stores";

const props = withDefaults(
	defineProps<{
		templateText: string;
		extraLibs?: string[]; // 外部传入的类型 (如 UISchema)
		language?: "typescript" | "javascript" | "html" | string;
	}>(),
	{
		language: "typescript",
	},
);

const code = defineModel<string>();

const containerRef = ref<HTMLDivElement | null>(null);
let editor: monaco.editor.IStandaloneCodeEditor | null = null;
let resizeObserver: ResizeObserver | null = null;
let monacoInstance: typeof monaco | null = null;

// --- 资源销毁器 ---
// 管理外部传入的类型定义 (props.extraLibs)
let extraLibsDisposables: monaco.IDisposable[] = [];
// 管理动态生成的 $ui__xxx 类型定义
let typeLibDisposable: monaco.IDisposable | null = null;
// 管理高亮装饰器
let decorationCollection: monaco.editor.IEditorDecorationsCollection | null = null;

let isInitializing = false;
const mapDataStore = useMapDataStore();

// =========================================================
// 📚 核心功能 1: 管理外部类型库 (如 UISchema)
// =========================================================
const updateExtraLibs = (libs: string[]) => {
	if (!monacoInstance) return;

	// 清理旧的
	extraLibsDisposables.forEach((d) => d.dispose());
	extraLibsDisposables = [];

	// 逐个添加 (使用 addExtraLib 防止覆盖全局)
	libs.forEach((content, index) => {
		const uri = `file:///extra-lib-${index}.d.ts`;
		const disposable = monacoInstance!.languages.typescript.typescriptDefaults.addExtraLib(content, uri);
		extraLibsDisposables.push(disposable);
	});
};

// =========================================================
// 📚 核心功能 2: 动态注入全局变量 ($ui__xxx)
// =========================================================
const updateDynamicTypes = () => {
	if (!monacoInstance) return;

	const uis = mapDataStore.uiTemplates || [];

	// 生成 JSDoc 和变量声明
	// 这些注释会自动成为悬停提示的内容！
	const declarations = uis
		.map(
			(ui) => `
    /**
     * **组件名称**: ${ui.name}\n
     * **slug**: ${ui.slug}
     * * ID: \`${ui.id}\`
     */
    const $ui__${ui.slug}: UISchema;
  `,
		)
		.join("\n");

	// 使用 declare global 扩充全局作用域
	const libContent = `
    declare global {
      ${declarations}
    }
    // 导出为空使其兼容模块模式
    export {};
  `;

	// 替换旧定义
	if (typeLibDisposable) typeLibDisposable.dispose();

	typeLibDisposable = monacoInstance.languages.typescript.typescriptDefaults.addExtraLib(
		libContent,
		"file:///dynamic-ui-types.d.ts",
	);
};

// =========================================================
// 🎨 核心功能 3: 高亮显示 (绿色胶囊)
// =========================================================
// TypeScript 只管代码提示，不管颜色，所以这个要保留
const updateHighlights = () => {
	if (!editor || !monacoInstance) return;
	const model = editor.getModel();
	if (!model) return;

	const text = model.getValue();
	// 正则：匹配 $ui__xxx
	const regex = /(\$ui__[a-zA-Z0-9_\-]+)/g;

	const decorations: monaco.editor.IModelDeltaDecoration[] = [];
	let match;

	while ((match = regex.exec(text)) !== null) {
		const startOffset = match.index;
		const endOffset = startOffset + match[0].length;

		const startPos = model.getPositionAt(startOffset);
		const endPos = model.getPositionAt(endOffset);

		decorations.push({
			range: new monacoInstance.Range(startPos.lineNumber, startPos.column, endPos.lineNumber, endPos.column),
			options: {
				isWholeLine: false,
				inlineClassName: "custom-ui-token", // CSS 样式
				// 这里可以留一个简单的 tooltip，详细的交给 TS Hover
				hoverMessage: { value: "🧩 UI 组件" },
			},
		});
	}

	if (!decorationCollection) {
		decorationCollection = editor.createDecorationsCollection(decorations);
	} else {
		decorationCollection.set(decorations);
	}
};

// =========================================================
// 🚀 初始化编辑器
// =========================================================
const initEditor = async () => {
	if (editor || isInitializing || !containerRef.value) return;

	isInitializing = true;

	try {
		loader.config({ monaco });
		monacoInstance = await loader.init();

		// 配置 TS 编译器
		monacoInstance.languages.typescript.typescriptDefaults.setCompilerOptions({
			target: monacoInstance.languages.typescript.ScriptTarget.ES2020,
			allowNonTsExtensions: true,
			moduleResolution: monacoInstance.languages.typescript.ModuleResolutionKind.NodeJs,
			module: monacoInstance.languages.typescript.ModuleKind.CommonJS,
			noEmit: true,
			esModuleInterop: true,
		});

		// 注入资源
		if (props.extraLibs) updateExtraLibs(props.extraLibs);
		updateDynamicTypes();

		if (!containerRef.value) return;

		// 显式创建 Model (file:// 协议)，让它能识别到上面的 d.ts
		const modelUri = monacoInstance.Uri.parse("file:///main.ts");
		let model = monacoInstance.editor.getModel(modelUri);
		if (!model) {
			model = monacoInstance.editor.createModel(code.value || props.templateText || "", props.language, modelUri);
		} else {
			model.setValue(code.value || props.templateText || "");
			monacoInstance.editor.setModelLanguage(model, props.language);
		}

		editor = monacoInstance.editor.create(containerRef.value, {
			model: model,
			minimap: { enabled: false },
			wordWrap: "on",
			theme: "vs",
			automaticLayout: false,
			fontFamily: "'Fira Code', Consolas, 'Courier New', monospace",
			fontSize: 13,
		});

		// 监听变化
		editor.onDidChangeModelContent(() => {
			code.value = editor!.getValue();
			updateHighlights();
		});

		// 初始高亮
		updateHighlights();
	} catch (error) {
		console.error("Monaco Init Failed:", error);
	} finally {
		isInitializing = false;
	}
};

// --- Watchers ---

watch(
	() => mapDataStore.uiTemplates,
	() => {
		updateDynamicTypes(); // 变量变了，更新 .d.ts
		updateHighlights(); // 高亮也要重新扫一遍
	},
	{ deep: true },
);

watch(code, (newValue) => {
	if (editor && newValue !== editor.getValue()) {
		editor.setValue(newValue || "");
		updateHighlights();
	}
});

watch(
	() => props.extraLibs,
	(val) => val && updateExtraLibs(val),
	{ deep: true },
);

watch(
	() => props.language,
	(lang) => {
		if (editor) {
			const model = editor.getModel();
			if (model) monaco.editor.setModelLanguage(model, lang);
		}
	},
);

onMounted(async () => {
	await nextTick();
	await initEditor();
	resizeObserver = new ResizeObserver(() => {
		if (editor) editor.layout();
	});
	if (containerRef.value) resizeObserver.observe(containerRef.value);
});

onBeforeUnmount(() => {
	resizeObserver?.disconnect();

	// 清理资源
	extraLibsDisposables.forEach((d) => d.dispose());
	typeLibDisposable?.dispose();

	editor?.dispose();
});
</script>

<template>
	<div ref="containerRef" id="editor"></div>
</template>

<style lang="scss">
/* 全局样式：绿色胶囊 */
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
</style>

<style lang="scss" scoped>
#editor {
	width: 100%;
	height: 100%;
	border: 1px solid #cccccc;
	box-sizing: border-box;
	background-color: #eeeeee;
}
</style>
