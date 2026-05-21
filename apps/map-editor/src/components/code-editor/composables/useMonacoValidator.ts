import * as monaco from "monaco-editor";
import { mapContentService } from "@src/services";
import staticEditorLib from "../editor-lib.d.ts?raw";

/**
 * 验证结果
 */
export interface ValidateResult {
	valid: boolean;
	errors: Array<{ line: number; column: number; message: string }>;
}

/**
 * 代码类型对应的模板配置
 */
interface TemplateConfig {
	/** 模板头代码（import + 参数声明 + 箭头函数开头） */
	header: string;
	/** 模板尾（闭合括号） */
	footer: string;
}

/**
 * 各代码类型的模板定义
 * header 行数决定了用户代码的起始行偏移
 */
const TEMPLATES: Record<string, TemplateConfig> = {
	"chance-card": {
		header: `import type { IPlayer, IProperty, IChanceCard, IGameProcess } from "@mine-monopoly/types/interfaces/game/game-process";
	import { MoneyTag } from "@mine-monopoly/types/enums/money-tag";

	(async (sourcePlayer: IPlayer, target: IPlayer | IProperty | IPlayer[] | IProperty[], gameProcess: IGameProcess) => {
	`,
		footer: `});
	`,
	},
	"map-event": {
		header: `import type { IPlayer, IGameProcess } from "@mine-monopoly/types/interfaces/game/game-process";
	import { MoneyTag } from "@mine-monopoly/types/enums/money-tag";

	(async (player: IPlayer, gameProcess: IGameProcess) => {
	`,
		footer: `});
	`,
	},
	"role": {
		header: `import type { IPlayer, IGameProcess } from "@mine-monopoly/types/interfaces/game/game-process";
	import { MoneyTag } from "@mine-monopoly/types/enums/money-tag";

	((player: IPlayer, gameProcess: IGameProcess) => {
	`,
		footer: `});
	`,
	},
	"game-phase": {
		header: `import type { GameContext, IGameProcess } from "@mine-monopoly/types/interfaces/game/game-process";
	import { MoneyTag } from "@mine-monopoly/types/enums/money-tag";

	((ctx: GameContext, gameProcess: IGameProcess) => {
	`,
		footer: `});
	`,
	},
	"modifier": {
		header: `import type { IPlayer, IGameProcess } from "@mine-monopoly/types/interfaces/game/game-process";
	import type { ICommand, ICommandContext, ICommandMap } from "@mine-monopoly/types/interfaces/game/action-system/command";
	import type { ModifierTemplate } from "@mine-monopoly/types/interfaces/game/action-system/modifier";
	import { MoneyTag } from "@mine-monopoly/types/enums/money-tag";

	(async (player: IPlayer, gameProcess: IGameProcess, cmd: ICommand<ICommandMap, keyof ICommandMap>, ctx: ICommandContext<ICommandMap, keyof ICommandMap>) => {
	`,
		footer: `});
	`,
	},
	"property": {
		header: `import type { IPlayer, IProperty, IGameProcess } from "@mine-monopoly/types/interfaces/game/game-process";
	import { MoneyTag } from "@mine-monopoly/types/enums/money-tag";

	(async (player: IPlayer, property: IProperty, gameProcess: IGameProcess) => {
	`,
		footer: `});
	`,
	},
	"extra-libs": {
		header: "",
		footer: "",
	},
};

/**
 * 获取模板头的行数（用于偏移错误行号）
 */
function getHeaderLineCount(codeType: string): number {
	const header = TEMPLATES[codeType]?.header || "";
	return header.split("\n").length - 1; // header 末尾有换行，最后一行算第 0 行偏移
}

/**
 * 使用 Monaco TS 语言服务校验 effectCode
 *
 * 不依赖编辑器实例，直接创建临时 model 利用已注入的 extraLibs 进行类型检查。
 */
export function useMonacoValidator() {
	/**
	 * 校验代码
	 * @param code 用户代码片段（不含模板包装）
	 * @param codeType 代码类型
	 * @returns 校验结果
	 */
	async function validate(code: string, codeType: string): Promise<ValidateResult> {
		const template = TEMPLATES[codeType];
		if (!template) {
			return {
				valid: false,
				errors: [{ line: 0, column: 0, message: `Unknown codeType: ${codeType}` }],
			};
		}

		// 获取全局 Monaco 单例
		const monacoInstance = await getMonacoInstance();
		if (!monacoInstance) {
			return {
				valid: false,
				errors: [{ line: 0, column: 0, message: "Monaco instance not available" }],
			};
		}

		// 获取动态类型声明（修饰器、UI 模板等）
		// 将它们直接内联到代码中，而不是通过 setExtraLibs（因为 declare global 在 extraLibs 中可能不生效）
		let dynamicTypeDeclarations = "";
		try {
			const dynamicLibs = await mapContentService.getAllTypeLibs();
			// 提取 declare global 块中的内容
			const extractGlobalContent = (libContent: string) => {
				const match = libContent.match(/declare global\s*{([\s\S]*?)}/);
				return match ? match[1] : "";
			};
			if (dynamicLibs.modifierTemplateTypes) {
				dynamicTypeDeclarations += extractGlobalContent(dynamicLibs.modifierTemplateTypes) + "\n";
			}
			if (dynamicLibs.uiTemplateTypes) {
				dynamicTypeDeclarations += extractGlobalContent(dynamicLibs.uiTemplateTypes) + "\n";
			}
		} catch {
			// 动态类型获取失败，继续使用静态类型
		}

		// 组装完整代码，将动态类型声明插入到模板 header 之后
		const fullCode = template.header + dynamicTypeDeclarations + code + "\n" + template.footer;
		// 计算实际 header 行数（模板 header + 动态类型声明）
		const headerLines = getHeaderLineCount(codeType) + dynamicTypeDeclarations.split("\n").length;

		// 注入完整类型库到 Monaco TS 语言服务
		const tsDefaults = monacoInstance.languages.typescript.typescriptDefaults;
		const libs: { content: string; filePath: string }[] = [];

		// 静态类型（enum、interface 等）
		if (staticEditorLib) {
			libs.push({ content: staticEditorLib, filePath: 'file:///static-types.d.ts' });
		}

		// 额外库代码（用户自定义）
		try {
			const dynamicLibs = await mapContentService.getAllTypeLibs();
			if (dynamicLibs.extraLibs) {
				libs.push({ content: dynamicLibs.extraLibs, filePath: 'file:///extra-libs.d.ts' });
			}
			// 游戏设置类型也通过 extraLibs 加载
			if (dynamicLibs.gameSettingTypes) {
				libs.push({ content: dynamicLibs.gameSettingTypes, filePath: 'file:///game-settings.d.ts' });
			}
		} catch {
			// extra libs not available, continue with static only
		}

		if (libs.length === 0) {
			return { valid: false, errors: [{ line: 0, column: 0, message: "No type libraries available" }] };
		}

		// 保存当前 extraLibs，校验完成后恢复，避免影响 UI 编辑器
		const prevLibs = tsDefaults.getExtraLibs();
		tsDefaults.setExtraLibs(libs);

		// 创建临时 model
		const uri = monacoInstance.Uri.parse(`file:///validate-${Date.now()}.ts`);
		const model = monacoInstance.editor.createModel(fullCode, "typescript", uri);

		try {
			// 等待 TS worker 产出诊断
			const markers = await waitForDiagnostics(monacoInstance, uri, 3000);

			// 提取错误（只取 Severity.Error，只保留用户代码行范围）
			const userCodeLineCount = code.split("\n").length;
			const errors: ValidateResult["errors"] = [];

			for (const marker of markers) {
				if (marker.severity !== monacoInstance.MarkerSeverity.Error) continue;
				// 转换为用户代码内的相对行号
				const userLine = marker.startLineNumber - headerLines;
				if (userLine < 1 || userLine > userCodeLineCount) continue;
				errors.push({
					line: userLine,
					column: marker.startColumn,
					message: marker.message,
				});
			}

			return { valid: errors.length === 0, errors };
		} finally {
			model.dispose();
			// 恢复 extraLibs，避免影响 UI 编辑器的类型提示
			tsDefaults.setExtraLibs(prevLibs);
		}
	}

	return { validate };
}

/**
 * 获取已初始化的 Monaco 全局单例
 */
let monacoPromise: Promise<typeof monaco> | null = null;

function getMonacoInstance(): Promise<typeof monaco | null> {
	if (!monacoPromise) {
		monacoPromise = import("monaco-editor").then((m) => {
			// 检查是否已初始化 compiler options
			const defaults = m.languages.typescript.typescriptDefaults;
			try {
				defaults.setCompilerOptions({
					target: m.languages.typescript.ScriptTarget.ES2020,
					allowNonTsExtensions: true,
					moduleResolution: m.languages.typescript.ModuleResolutionKind.NodeJs,
					module: m.languages.typescript.ModuleKind.CommonJS,
					noEmit: true,
					esModuleInterop: true,
				});
			} catch {
				// compiler options already set
			}
			return m;
		}).catch(() => null);
	}
	return monacoPromise;
}

/**
 * 等待 Monaco TS worker 产出指定 URI 的诊断信息
 */
function waitForDiagnostics(
	monacoInstance: typeof monaco,
	uri: monaco.Uri,
	timeoutMs: number,
): Promise<monaco.editor.IMarker[]> {
	return new Promise((resolve) => {
		const key = uri.toString();
		let done = false;

		const finish = (markers: monaco.editor.IMarker[]) => {
			if (done) return;
			done = true;
			disposable.dispose();
			resolve(markers);
		};

		// 监听 markers 变化
		const disposable = monacoInstance.editor.onDidChangeMarkers((uris) => {
			if (uris.some((u) => u.toString() === key)) {
				const markers = monacoInstance.editor.getModelMarkers({ resource: uri });
				finish(markers);
			}
		});

		// 先检查是否已有结果
		const existing = monacoInstance.editor.getModelMarkers({ resource: uri });
		if (existing.length > 0) {
			finish(existing);
			return;
		}

		// 超时兜底：无错误时返回空数组
		setTimeout(() => {
			const markers = monacoInstance.editor.getModelMarkers({ resource: uri });
			finish(markers);
		}, timeoutMs);
	});
}
