import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import electron from "vite-plugin-electron/simple";
import path from "path";
import Components from "unplugin-vue-components/vite";
import { AntDesignVueResolver } from "unplugin-vue-components/resolvers";
import monacoEditorPlugin from "vite-plugin-monaco-editor-esm";
import { visualizer } from "rollup-plugin-visualizer";
import generateMonacoDTS from "./plugins/vite-plugin-generate-monaco-dts";
import { envPlugin } from "@mine-monopoly/env/vite-plugin";
import pkg from "./package.json";

export default defineConfig(({ command, mode }) => {
	const isCheck = mode === 'check';

	return {
		base: "./",
		define: {
			// 注入全局变量
			__APP_VERSION__: JSON.stringify(pkg.version),
			__BUILD_TIME__: JSON.stringify(new Date().toISOString()),
		},
		plugins: [
			vue(),
			generateMonacoDTS(),
			monacoEditorPlugin(),
			envPlugin({
				exclude: ['MYSQL_PASSWORD', 'TC_KEY'],
				envPath: '../../.env',
			}),
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
					vite: {
						resolve: {
							alias: {
								"@src": path.resolve(__dirname, "src"),
							},
						},
					},
				},
				preload: {
					input: path.join(__dirname, "electron/preload.ts"),
				},
				renderer: process.env.NODE_ENV === "test" ? undefined : {},
			}),
			!isCheck && command === 'build' && visualizer({
				filename: 'dist/frontend/stats.html',
				open: false,
				gzipSize: true,
				brotliSize: true,
			}),
		].filter(Boolean),
		build: {
			outDir: isCheck ? "dist/check" : "dist/frontend",
			minify: isCheck ? false : 'terser',
			sourcemap: isCheck ? 'inline' : false,
			rollupOptions: {
				output: {
					manualChunks: isCheck ? undefined : (id: string) => {
						if (id.includes('node_modules/vue') || id.includes('node_modules/pinia') || id.includes('node_modules/vue-router')) {
							return 'vue-vendor';
						}
						// Monaco Editor 核心
						if (id.includes('node_modules/monaco-editor')) {
							return 'monaco-core';
						}
						if (id.includes('node_modules/ant-design-vue') || id.includes('node_modules/@ant-design')) {
							return 'antd-vendor';
						}
						if (id.includes('packages/ui') || id.includes('packages/components')) {
							return 'ui-common';
						}
					},
				},
			},
		},
		resolve: {
			alias: [
				{
					find: "@src",
					replacement: path.resolve(__dirname, "src"),
				},
			],
		},
		server: {
			port: 5174,
			strictPort: true,
		},
		worker: {
			format: "es", // 重要：让 worker 用 ESM 格式
		},
	};
});
