import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import path from "path";
import Components from "unplugin-vue-components/vite";
import { AntDesignVueResolver } from "unplugin-vue-components/resolvers";
import { envPlugin } from "../../packages/env/src/vite-plugin-env.ts";

// https://vitejs.dev/config/
export default defineConfig(({ command }) => {
	return {
		base: "./",
		plugins: [
			vue(),
			Components({
				resolvers: [
					AntDesignVueResolver({
						importStyle: "less", // 使用 Less 样式（Ant Design 默认）
					}),
				],
				dts: true,
			}),
			envPlugin({
				exclude: ['MYSQL_PASSWORD', 'TC_KEY'],
				envPath: '../../.env',
			}),
		],
		server: {
			port: 5174,
		},
		resolve: {
			alias: [
				{
					find: "@",
					replacement: path.resolve(path.dirname("./"), "src"),
				},
				{
					find: "@mine-monopoly/env",
					replacement: path.resolve(__dirname, "../../packages/env/src/browser.ts"),
				},
				{
					find: "@mine-monopoly/style",
					replacement: path.resolve(__dirname, "../../packages/style/dist"),
				},
			],
		},
		esbuild: {
			drop: command === "build" ? ["console", "debugger"] : [],
		},
	};
});
