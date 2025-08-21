import { Plugin } from "vite";
import fs from "fs";
import path from "path";

export function manifestGenerator(version: string, updateMessage: string): Plugin {
	return {
		name: "vite-plugin-manifest-generator",
		apply: "build",
		writeBundle(options, bundle) {
			const outDir = options.dir || "dist";
			const manifest = {
				version,
				timestamp: Date.now(),
				updateMessage,
			};
			const filePath = path.resolve(outDir, "manifest.json");
			fs.writeFileSync(filePath, JSON.stringify(manifest, null, 2), "utf-8");
			console.log(`[manifest] 生成成功: ${filePath}`);
		},
	};
}
