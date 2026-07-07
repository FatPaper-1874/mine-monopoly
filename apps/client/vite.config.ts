import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import path from "path";
import { readFileSync } from "node:fs";
import viteCompression from "vite-plugin-compression";
import { visualizer } from "rollup-plugin-visualizer";
import electron from "vite-plugin-electron/simple";
import pkg from "./package.json";
import generateMonacoDTS from "./plugins/vite-plugin-generate-monaco-dts";
import { envPlugin } from "@mine-monopoly/env/vite-plugin";

const APP_VERSION_SHORT = pkg.version.split(".").slice(0, 2).join(".");
const updatePolicy = JSON.parse(
	readFileSync(path.resolve(__dirname, "build", "update-policy.json"), "utf-8"),
) as { minNativeVersion?: string };
const MIN_NATIVE_VERSION = updatePolicy.minNativeVersion || "0.0.0";

// https://vitejs.dev/config/
export default defineConfig(({ command, mode }) => {
	const isCheck = mode === "check";
	const isCapacitor = mode === "capacitor";
	const isWeb = mode === "web";
	const webBasePathRaw = process.env.VITE_WEB_BASE_PATH?.trim() || "/monopoly/";
	const webBasePath = webBasePathRaw.startsWith("/")
		? (webBasePathRaw.endsWith("/") ? webBasePathRaw : `${webBasePathRaw}/`)
		: `/${webBasePathRaw.endsWith("/") ? webBasePathRaw : `${webBasePathRaw}/`}`;

	return {
		base: isWeb ? webBasePath : "./",
		assetsInclude: ["**/*.d.ts"],
		define: {
			// 全局常量注入
			__APP_VERSION__: JSON.stringify(pkg.version),
			__BUILD_TIME__: JSON.stringify(new Date().toISOString()),
			__COMPATIBLE_VERSION__: JSON.stringify(APP_VERSION_SHORT),
			__MIN_NATIVE_VERSION__: JSON.stringify(MIN_NATIVE_VERSION),
		},
		plugins: [
			vue(),
			generateMonacoDTS(),
			// Capacitor 不需要 gzip（Android 会把 .gz 当重复资源报错）
			!isCapacitor && viteCompression({
				threshold: 10240, // 只压缩大于 10KB 的文件
			}),
			envPlugin({
				exclude: ["MYSQL_PASSWORD", "TC_KEY"],
				envPath: "../../.env",
			}),
			// Electron 插件仅在桌面端构建时启用
			(!isCheck && !isCapacitor && !isWeb) && electron({
				main: {
					entry: "electron/main.ts",
				},
				preload: {
					input: path.join(__dirname, "electron/preload.ts"),
				},
				renderer: process.env.NODE_ENV === "test" ? undefined : {},
			}),
			!isCheck && command === "build" && visualizer({
				filename: "dist/frontend/stats.html",
				open: false,
				gzipSize: true,
				brotliSize: true,
			}),
		].filter(Boolean),
		build: {
			outDir: isCheck ? "dist/check" : "dist/frontend",
			// Electon 37 (Chrome 130+) 和 Capacitor Android WebView (Chrome 89+) 都支持 top-level await
			target: "es2022",
			minify: isCheck ? false : "terser",
			sourcemap: isCheck ? "inline" : false,
			rollupOptions: {
				output: {
					manualChunks: isCheck ? undefined : (id: string) => {
						if (id.includes("node_modules/vue") || id.includes("node_modules/pinia") || id.includes("node_modules/vue-router")) {
							return "vue-vendor";
						}
						if (id.includes("node_modules/three")) {
							return "three-vendor";
						}
						if (id.includes("node_modules/gsap")) {
							return "gsap-vendor";
						}
						if (id.includes("node_modules/@fortawesome")) {
							return "fa-vendor";
						}
						if (id.includes("packages/ui") || id.includes("packages/components")) {
							return "ui-common";
						}
					},
				},
			},
		},
		css: {
			preprocessorOptions: {
				scss: {
					silenceDeprecations: ['legacy-js-api'],
				},
			},
		},
		resolve: {
			alias: [
				{
					find: "@src",
					replacement: path.resolve(path.dirname("./"), "src"),
				},
				{
					find: "@mine-monopoly/env",
					replacement: path.resolve(__dirname, "../../packages/env/src/browser.ts"),
				},
				{
					find: "@mine-monopoly/style",
					replacement: path.resolve(__dirname, "../../packages/style/src"),
				},
			],
		},
		server: {
			port: 5173,
		},
		optimizeDeps: {
			// @capgo/capacitor-updater 顶层调用 Capacitor registerPlugin()，
			// Vite dev 预打包时无 native bridge 会失败。生产构建通过
			// 动态 import() 自动代码分割，不需要 exclude。
			exclude: ["@capgo/capacitor-updater"],
		},
		esbuild: {
			// 只在生产构建（非 check）时删除 console 和 debugger
			drop: (command === "build" && !isCheck) ? ["console", "debugger"] : [],
		},
	};
});
