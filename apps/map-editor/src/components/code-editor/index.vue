<script setup lang="ts">
import * as monaco from "monaco-editor";
import { ref, onMounted, onBeforeUnmount, nextTick, watch } from "vue";
import loader from "@monaco-editor/loader";

import { useMapDataStore } from "@src/stores";

const props = withDefaults(
	defineProps<{
		templateText: string;
		extraLibs?: string[];
		language?: "typescript" | "javascript" | "html" | string;
	}>(),
	{
		language: "typescript",
	},
);

const code = defineModel<string>();

const containerRef = ref<HTMLDivElement | null>(null);
const mapDataStore = useMapDataStore();

// =========================================================
// 📦 全局单例：Monaco Editor 实例和类型库管理
// =========================================================

// 全局管理器（在模块级别持久化）
interface MonacoInstance {
	editor: monaco.editor.IStandaloneCodeEditor | null;
	model: monaco.editor.ITextModel | null;
	instance: typeof monaco | null;
	extraLibs: monaco.IDisposable[];
	containerId: string;
}

const globalMonacoState: {
	currentInstance: MonacoInstance | null;
} = {
	currentInstance: null,
};

// =========================================================
// 🎯 组件状态
// =========================================================

let decorationCollection: monaco.editor.IEditorDecorationsCollection | null = null;
let resizeObserver: ResizeObserver | null = null;

// 为此容器生成唯一 ID
const containerId = `monaco-container-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

// =========================================================
// 📚 类型库管理
// =========================================================

const updateLibs = () => {
	const state = globalMonacoState.currentInstance;
	if (!state?.instance) return;

	const monacoInstance = state.instance;
	const tsDefaults = monacoInstance.languages.typescript.typescriptDefaults;

	// 1. 清理当前实例的所有旧库
	state.extraLibs.forEach((disposable) => {
		try {
			disposable.dispose();
		} catch (e) {
			// 忽略已经 dispose 的错误
		}
	});
	state.extraLibs = [];

	// 2. 注入外部传入的 extraLibs（使用固定 URI）
	if (props.extraLibs) {
		props.extraLibs.forEach((content, index) => {
			// 使用固定的 URI，确保新的库覆盖旧的库
			const uri = `file:///extra-lib-${index}.d.ts`;
			const disposable = tsDefaults.addExtraLib(content, uri);
			state.extraLibs.push(disposable);
		});
	}

	// 3. 注入动态 Store 变量 ($ui__xxx)
	const uis = mapDataStore.uiTemplates || [];
	if (uis.length > 0) {
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

		const libContent = `
    declare global {
      ${declarations}
    }
    export {};
  `;

		// 使用固定的 URI
		const uri = `file:///dynamic-ui-types.d.ts`;
		const disposable = tsDefaults.addExtraLib(libContent, uri);
		state.extraLibs.push(disposable);
	}
};

// =========================================================
// 🎨 高亮显示
// =========================================================

const updateHighlights = () => {
	const state = globalMonacoState.currentInstance;
	if (!state?.editor || !state?.model || !state.instance) return;

	const editor = state.editor;
	const model = state.model;
	const monacoInstance = state.instance;

	const text = model.getValue();
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
				inlineClassName: "custom-ui-token",
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
// 🚀 初始化/重新创建编辑器
// =========================================================

const initEditor = async () => {
	// 如果已存在实例，先完全销毁
	if (globalMonacoState.currentInstance) {
		destroyEditor();
	}

	try {
		// 等待容器准备好
		await nextTick();
		if (!containerRef.value) return;

		// 初始化 Monaco
		loader.config({ monaco });
		const monacoInstance = await loader.init();

		// 配置 TS 编译器
		monacoInstance.languages.typescript.typescriptDefaults.setCompilerOptions({
			target: monacoInstance.languages.typescript.ScriptTarget.ES2020,
			allowNonTsExtensions: true,
			moduleResolution: monacoInstance.languages.typescript.ModuleResolutionKind.NodeJs,
			module: monacoInstance.languages.typescript.ModuleKind.CommonJS,
			noEmit: true,
			esModuleInterop: true,
		});

		// 创建全局状态
		globalMonacoState.currentInstance = {
			editor: null,
			model: null,
			instance: monacoInstance,
			extraLibs: [],
			containerId,
		};

		// 注入类型库
		updateLibs();

		// 创建 Model（使用唯一 URI）
		const modelUri = monacoInstance.Uri.parse(`file:///main-${containerId}.ts`);
		const model = monacoInstance.editor.createModel(
			code.value || props.templateText || "",
			props.language,
			modelUri
		);

		globalMonacoState.currentInstance.model = model;

		// 创建编辑器
		const editor = monacoInstance.editor.create(containerRef.value, {
			model: model,
			minimap: { enabled: false },
			wordWrap: "on",
			theme: "vs",
			automaticLayout: false,
			fontFamily: "'Fira Code', Consolas, 'Courier New', monospace",
			fontSize: 13,
		});

		globalMonacoState.currentInstance.editor = editor;

		// 监听内容变化
		editor.onDidChangeModelContent(() => {
			const val = editor.getValue();
			if (val !== code.value) {
				code.value = val;
			}
			updateHighlights();
		});

		// 初始高亮
		updateHighlights();

		// 设置 ResizeObserver
		resizeObserver = new ResizeObserver(() => {
			editor.layout();
		});
		resizeObserver.observe(containerRef.value);
	} catch (error) {
		console.error("Monaco Init Failed:", error);
	}
};

const destroyEditor = () => {
	const state = globalMonacoState.currentInstance;
	if (!state) return;

	// 1. 清理 ResizeObserver
	if (resizeObserver) {
		resizeObserver.disconnect();
		resizeObserver = null;
	}

	// 2. 清理高亮
	if (decorationCollection) {
		decorationCollection.clear();
		decorationCollection = null;
	}

	// 3. 清理类型库
	state.extraLibs.forEach((disposable) => {
		try {
			disposable.dispose();
		} catch (e) {
			// 忽略
		}
	});
	state.extraLibs = [];

	// 4. 销毁 Model
	if (state.model) {
		state.model.dispose();
		state.model = null;
	}

	// 5. 销毁编辑器
	if (state.editor) {
		state.editor.dispose();
		state.editor = null;
	}

	// 清空全局状态
	globalMonacoState.currentInstance = null;
};

// =========================================================
// 🔄 监听器
// =========================================================

// 1. 外部代码变化 -> 同步到编辑器
watch(code, (newValue) => {
	const state = globalMonacoState.currentInstance;
	if (state?.editor && newValue !== state.editor.getValue()) {
		state.editor.setValue(newValue || "");
		updateHighlights();
	}
});

// 2. 外部 Libs 变化 -> 重新生成 .d.ts
watch(
	() => props.extraLibs,
	() => {
		updateLibs();
	},
	{ deep: true },
);

// 3. Store 中 UI 模板变化 -> 重新生成 $ui__xxx 类型
watch(
	() => mapDataStore.uiTemplates,
	() => {
		updateLibs();
		updateHighlights();
	},
	{ deep: true },
);

// 4. 语言变化
watch(
	() => props.language,
	(lang) => {
		const state = globalMonacoState.currentInstance;
		if (state?.model && state?.instance) {
			const monacoInstance = state.instance;
			monacoInstance.editor.setModelLanguage(state.model, lang);
		}
	},
);

// =========================================================
// 🧬 生命周期
// =========================================================

onMounted(async () => {
	await initEditor();
});

onBeforeUnmount(() => {
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
