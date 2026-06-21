import fs from "fs/promises";
import path from "path";
import { env } from "@mine-monopoly/env";
import { serverLog } from "#src/utils/logger";
import type { StorageProvider, UploadInput, UploadResult } from "./types.js";

export class LocalStorageProvider implements StorageProvider {
	readonly name = "local";

	private get baseUrl(): string {
		const protocol = env("PROTOCOL");
		const domain = env("MONOPOLY_DOMAIN");
		const prefix = env("API_BASE_PREFIX", "");

		if (prefix) {
			// 路径反代模式（如 nginx）：使用标准端口，URL 中包含前缀
			return `${protocol}://${domain}${prefix}`;
		}

		// 端口模式（开发/直连）：使用 SERVER_PORT，无前缀
		return `${protocol}://${domain}:${env<number>("SERVER_PORT")}`;
	}

	async upload(input: UploadInput): Promise<UploadResult> {
		const relativePath = `${input.targetPath}/${input.name}`;
		const absoluteTarget = path.resolve(`./public/${relativePath}`);
		await fs.mkdir(path.dirname(absoluteTarget), { recursive: true });
		await fs.rename(input.filePath, absoluteTarget);
		return `${this.baseUrl}/static/${relativePath}`;
	}

	async uploadMany(inputs: UploadInput[]): Promise<UploadResult[]> {
		return Promise.all(inputs.map((i) => this.upload(i)));
	}

	async delete(keys: string[]): Promise<void> {
		for (const key of keys) {
			const absolutePath = path.resolve(`./public/${key}`);
			try {
				await fs.access(absolutePath);
				await fs.unlink(absolutePath);
			} catch (err: any) {
				serverLog(`Local delete failed for ${key}: ${err.message}`, "warn");
			}
		}
	}
}
