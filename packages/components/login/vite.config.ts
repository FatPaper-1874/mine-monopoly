import { defineConfig } from "vite";
import path from "path";
import { envPlugin } from "../../../../packages/env/src/vite-plugin-env.ts";

// https://vitejs.dev/config/
export default defineConfig(({ command }) => {
	return {
		plugins: [
			envPlugin({
				exclude: ['MYSQL_PASSWORD', 'TC_KEY'],
				envPath: '../../../.env',
			}),
		],
		resolve: {
			alias: [
				{
					find: "@",
					replacement: path.resolve(path.dirname("./"), "src"),
				},
				{
					find: "@mine-monopoly/env",
					replacement: path.resolve(__dirname, "../../../../packages/env/src/browser.ts"),
				},
			],
		},
	};
});
