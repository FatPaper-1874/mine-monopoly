import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import path from "path";
import { visualizer } from "rollup-plugin-visualizer";
import viteCompression from "vite-plugin-compression";
import externalGlobals from "rollup-plugin-external-globals";
import { manifestGenerator } from "./build/plugins/vite-plugin-manifest";
import pkg from "./package.json";

// https://vitejs.dev/config/
export default defineConfig(({ command }) => {
	return {
		plugins: [
			vue(),
			viteCompression(),
			manifestGenerator(pkg.version, pkg.updateMessage),
			// visualizer({
			// 	gzipSize: true,
			// 	brotliSize: true,
			// 	emitFile: false,
			// 	filename: "test.html", //分析图生成的文件名
			// 	open: true, //如果存在本地服务端口，将在打包后自动展示
			// }),
		],
		build: {
			rollupOptions: {
				plugins: [
					// externalGlobals({
					// 	vue: "Vue",
					// 	"vue-router": "VueRouter",
					// 	"vue-demi": "VueDemi",
					// 	pinia: "Pinia",
					// 	three: "",
					// 	gsap: "",
					// }),
				],
			},
		},
		resolve: {
			alias: [
				{
					find: "@src",
					replacement: path.resolve(path.dirname("./"), "src"),
				},
			],
		},
		server: {
			port: 80,
		},
		esbuild: {
			drop: command === "build" ? ["console", "debugger"] : [],
		},
	};
});
