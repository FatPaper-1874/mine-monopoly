import type { Ref } from "vue";
import type * as monaco from "monaco-editor";

export interface MonacoTypeLibOptions {
	staticTypes?: string;
	extraLibs?: string;
	uiTemplates?: any[];
	gameSettingForm?: any[];
	modifierTemplates?: any[];
}

export interface MonacoTypeLib {
	content: string;
	filePath: string;
}

export function buildMonacoTypeLibs(options: MonacoTypeLibOptions): MonacoTypeLib[] {
	const libs: MonacoTypeLib[] = [];

	// 1. 组件静态类型
	if (options.staticTypes) {
		libs.push({
			content: options.staticTypes,
			filePath: "file:///static-types.d.ts",
		});
	}

	// 2. 全局额外类型库
	if (options.extraLibs) {
		libs.push({
			content: options.extraLibs,
			filePath: "file:///extra-libs.d.ts",
		});
	}

	// 3. 动态 UI 模板类型
	if (options.uiTemplates && options.uiTemplates.length > 0) {
		const declarations = options.uiTemplates
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

		libs.push({
			content: `
    declare global {
      ${declarations}
    }
    export {};
  `,
			filePath: "file:///ui-templates.d.ts",
		});
	}

	// 4. 动态游戏设置类型
	if (options.gameSettingForm && options.gameSettingForm.length > 0) {
		const declarations = options.gameSettingForm
			.map((setting: any) => {
				const valueType = setting.type === "number-input"
					? "number"
					: "string | number";
				return `    /** ${setting.label} */
    ${setting.key}: { label: string; value: ${valueType}; displayValue: ${valueType} };`;
			})
			.join("\n");

		libs.push({
			content: `
    declare global {
      interface GameSetting {
        ${declarations}
      }
    }
    export {};
  `,
			filePath: "file:///game-settings.d.ts",
		});
	}

	// 5. 动态 Modifier 模板类型
	if (options.modifierTemplates && options.modifierTemplates.length > 0) {
		const declarations = options.modifierTemplates
			.map(
				(mod) => `
    /**
     * **修饰器名称**: ${mod.name}
     * **slug**: ${mod.slug}
     * ID: \`${mod.id}\`
     */
    const $mod__${mod.slug}: ModifierTemplate;
  `,
			)
			.join("\n");

		libs.push({
			content: `
    declare global {
      ${declarations}
    }
    export {};
  `,
			filePath: "file:///modifier-templates.d.ts",
		});
	}

	return libs;
}

function hasSameTypeLibs(
	currentLibs: Record<string, { content: string }>,
	expectedLibs: MonacoTypeLib[],
): boolean {
	const currentPaths = Object.keys(currentLibs);
	return currentPaths.length === expectedLibs.length
		&& expectedLibs.every(({ filePath, content }) => currentLibs[filePath]?.content === content);
}

/**
 * 同步与类型库同路径的 editor model。
 *
 * Monaco 的 TS worker 读取文件时优先使用同 URI 的 model，其次才是 extraLibs。
 * 当诊断的 relatedInformation 指向某个类型库文件（例如 "xxx 已在此处声明"）时，
 * Monaco 会用该类型库当时的内容创建一个同路径 model，且之后不会自动更新或销毁，
 * 导致后续 setExtraLibs 被这个旧 model 遮住，直到重启编辑器。
 */
function syncTypeLibModels(
	monacoInstance: typeof monaco,
	previousPaths: string[],
	typeLibs: MonacoTypeLib[],
): void {
	const expected = new Map(typeLibs.map((lib) => [lib.filePath, lib.content]));
	for (const [filePath, content] of expected) {
		const model = monacoInstance.editor.getModel(monacoInstance.Uri.parse(filePath));
		if (model && model.getValue() !== content) model.setValue(content);
	}
	for (const filePath of previousPaths) {
		if (expected.has(filePath)) continue;
		monacoInstance.editor.getModel(monacoInstance.Uri.parse(filePath))?.dispose();
	}
}

export function syncMonacoTypeLibs(
	monacoInstance: typeof monaco,
	options: MonacoTypeLibOptions,
): void {
	const typeLibs = buildMonacoTypeLibs(options);
	const tsDefaults = monacoInstance.languages.typescript.typescriptDefaults;
	const currentLibs = tsDefaults.getExtraLibs();

	// 内容未变时不调用 setExtraLibs，避免保存校验触发无意义的语言服务重载。
	if (!hasSameTypeLibs(currentLibs, typeLibs)) {
		tsDefaults.setExtraLibs(typeLibs);
	}
	// 即使 extraLibs 未变，也要检查同路径 model 是否残留旧内容
	syncTypeLibModels(monacoInstance, Object.keys(currentLibs), typeLibs);
}

export function useMonacoTypeLibs(monacoInstance: Ref<typeof monaco | null>) {
	function refreshTypeLibs(options: MonacoTypeLibOptions) {
		if (!monacoInstance.value) return;
		syncMonacoTypeLibs(monacoInstance.value, options);
	}

	return { refreshTypeLibs };
}
