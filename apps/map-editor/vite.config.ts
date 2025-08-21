import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import electron from "vite-plugin-electron/simple";
import path from "path";
import Components from "unplugin-vue-components/vite";
import { AntDesignVueResolver } from "unplugin-vue-components/resolvers";
import monacoEditorPlugin from "vite-plugin-monaco-editor-esm";
import generateMonacoDTS from "./plugins/vite-plugin-generate-monaco-dts";

// https://vite.dev/config/
export default defineConfig({
	plugins: [
		vue(),
		// interfaceToProtoPlugin({
		// 	inputPath: "../../packages/types/interfaces/game/map.ts",
		// 	outputPath: "./protos/game_map.proto",
		// }),
		// monacoEditorPlugin({
		// 	languageWorkers: ["editorWorkerService", "typescript", "html"],
		// }),
		generateMonacoDTS(),
		Components({
			resolvers: [
				AntDesignVueResolver({
					importStyle: "less", // 使用 Less 样式（Ant Design 默认）
				}),
			],
			dts: true,
		}),
		electron({
			main: {
				entry: "electron/main.ts",
			},
			preload: {
				input: path.join(__dirname, "electron/preload.ts"),
			},
			renderer: process.env.NODE_ENV === "test" ? undefined : {},
		}),
	],
	build: {
		outDir: "dist/frontend",
	},
	resolve: {
		alias: [
			{
				find: "@src",
				replacement: path.resolve(path.dirname("./"), "src"),
			},
		],
	},
	worker: {
		format: "es", // 重要：让 worker 用 ESM 格式
	},
});
