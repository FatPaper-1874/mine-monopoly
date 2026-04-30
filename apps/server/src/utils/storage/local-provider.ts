import fs from "fs/promises";
import path from "path";
import { env } from "@mine-monopoly/env";
import { serverLog } from "#src/utils/logger";
import type { StorageProvider, UploadInput, UploadResult } from "./types.js";

export class LocalStorageProvider implements StorageProvider {
	readonly name = "local";

	private get baseUrl(): string {
		return `${env("PROTOCOL")}://${env("MONOPOLY_DOMAIN")}:${env<number>("SERVER_PORT")}`;
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
