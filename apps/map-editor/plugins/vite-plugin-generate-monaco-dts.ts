import fs from "fs";
import path from "path";
import ts from "typescript";
import { generateDtsBundle } from "dts-bundle-generator";

function readTsConfig() {
	const tsconfigPath = ts.findConfigFile(process.cwd(), ts.sys.fileExists, "tsconfig.json");
	if (!tsconfigPath) return {};
	const configFile = ts.readConfigFile(tsconfigPath, ts.sys.readFile);
	const parsed = ts.parseJsonConfigFileContent(configFile.config, ts.sys, path.dirname(tsconfigPath));
	return parsed.options;
}

export default function generateMonacoDTS() {
	// 生成单个文件的 d.ts
	function generateForFile(tsFile: string) {
		const outDir = path.dirname(tsFile);

		const content = generateDtsBundle(
			[
				{
					filePath: tsFile,
					output: {
						noBanner: true,
						inlineDeclareGlobals: true,
					},
				},
			],
			{ preferredConfigPath: path.resolve(__dirname, "../../../tsconfig.json") }
		);
		// 输出文件名 = 源文件同名，但扩展名改为 .d.ts
		const targetPath = path.join(outDir, path.basename(tsFile, path.extname(tsFile)) + ".d.ts");

		const globalContent = toGlobalDts(content[0]);

		fs.writeFileSync(targetPath, globalContent, "utf8");
		console.log(
			`[monaco-dts] Generated: ${path.relative(process.cwd(), outDir)}\\${path.basename(tsFile, ".ts")}.d.ts`
		);
	}

	// 扫描 src 下带 //@need-to-parse 的 ts 文件
	function scanAndGenerate() {
		function walk(dir: string) {
			const files = fs.readdirSync(dir, { withFileTypes: true });
			for (const file of files) {
				const fullPath = path.join(dir, file.name);
				if (file.isDirectory()) {
					walk(fullPath);
				} else if (file.isFile() && file.name.endsWith(".ts")) {
					const content = fs.readFileSync(fullPath, "utf-8");
					if (content.startsWith("//@need-to-parse")) {
						generateForFile(fullPath);
					}
				}
			}
		}
		walk(path.resolve(process.cwd(), "./src"));
	}

	return {
		name: "vite-plugin-generate-monaco-dts",
		buildStart() {
			scanAndGenerate();
		},
		configureServer(server: any) {
			server.watcher.on("change", (file: any) => {
				if (file.endsWith(".ts")) {
					const content = fs.readFileSync(file, "utf-8");
					if (content.startsWith("//@need-to-parse")) {
						console.log(`[monaco-dts] Updating ${file}`);
						generateForFile(file);
					}
				}
			});
		},
		closeBundle() {
			scanAndGenerate();
		},
	};
}

function toGlobalDts(modularContent: string): string {
	let text = modularContent;

	// 1) 去掉 "export {};" 以及导出集合 "export { A, B }"
	text = text.replace(/^\s*export\s*\{\s*[^}]*\}\s*;?\s*$/gm, "");
	text = text.replace(/^\s*export\s*;\s*$/gm, ""); // 保险

	// 2) 把常见的导出标记去掉：export declare / export interface / export type / export class / export function / export const / export let / export var / export namespace
	text = text.replace(/\bexport\s+declare\b/g, "declare");
	text = text.replace(/\bexport\s+(interface|type|class|function|const|let|var|namespace)\b/g, "$1");

	// 3) 处理 "export default"（尽量保留声明，去掉 default）
	//    - export default interface X -> interface X
	text = text.replace(/\bexport\s+default\s+interface\b/g, "interface");
	//    - export default class X -> class X
	text = text.replace(/\bexport\s+default\s+class\b/g, "class");
	//    - export default type X = ... -> type X = ...
	text = text.replace(/\bexport\s+default\s+type\b/g, "type");
	//    - export default function X(...) -> function X(...)
	text = text.replace(/\bexport\s+default\s+function\b/g, "function");
	//    - 对于没有名字的 default（少见于 .d.ts），直接去掉 default
	text = text.replace(/\bexport\s+default\s+/g, "");

	// 4) 如果已经存在 declare global，就不再包裹
	const hasDeclareGlobal = /declare\s+global\s*\{/.test(text);

	// 5) 清理多余空行
	text = text
		.split(/\r?\n/)
		.filter((l, i, arr) => !(l.trim() === "" && arr[i - 1]?.trim() === ""))
		.join("\n")
		.trim();

	// 6) 包上 declare global（让它真正成为全局声明）
	// if (!hasDeclareGlobal) {
	// 	// 缩进一下更好看（可选）
	// 	const indented = text
	// 		.split("\n")
	// 		.map((l) => (l.trim() ? "  " + l : l))
	// 		.join("\n");
	// 	text = `declare global {\n${indented}\n}\n`;
	// }

	// 7) 确保没有多余的 export {} 之类残留
	text = text.replace(/^\s*export\s*\{\s*\}\s*;?\s*$/gm, "");

	return text + "\n";
}
