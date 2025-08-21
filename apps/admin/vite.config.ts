import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import path from "path";
import { visualizer } from "rollup-plugin-visualizer";
import AutoImport from "unplugin-auto-import/vite";
import Components from "unplugin-vue-components/vite";
import { ElementPlusResolver } from "unplugin-vue-components/resolvers";

// https://vitejs.dev/config/
export default defineConfig(({ command }) => {
	return {
		plugins: [
			vue(),
			visualizer({
				gzipSize: true,
				brotliSize: true,
				emitFile: false,
				filename: "test.html", //分析图生成的文件名
				open: true, //如果存在本地服务端口，将在打包后自动展示
			}),
			AutoImport({
				resolvers: [ElementPlusResolver()],
			}),
			Components({
				resolvers: [ElementPlusResolver()],
			}),
		],
		server: {
			port: 82,
		},
		resolve: {
			alias: [
				{
					find: "@",
					replacement: path.resolve(path.dirname("./"), "src"),
				},
				{
					find: "@G",
					replacement: path.resolve(path.dirname("./"), "./"),
				},
			],
		},
		esbuild: {
			drop: command === "build" ? ["console", "debugger"] : [],
		},
	};
});
