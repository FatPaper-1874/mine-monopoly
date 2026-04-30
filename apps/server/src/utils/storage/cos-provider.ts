import COS, { CosError } from "cos-nodejs-sdk-v5";
import { env } from "@mine-monopoly/env";
import type { StorageProvider, UploadInput, UploadResult } from "./types.js";

function promisify<T>(fn: (cb: (err: CosError, data: T) => void) => void): Promise<T> {
	return new Promise((resolve, reject) => {
		fn((err, data) => (err ? reject(err) : resolve(data)));
	});
}

export class CosStorageProvider implements StorageProvider {
	readonly name = "cos";
	private client: COS;
	private bucket: string;
	private region: string;

	constructor() {
		this.bucket = env("TC_BUCKET_NAME", "");
		this.region = env("TC_REGION", "");
		this.client = new COS({
			SecretId: env("TC_ID", ""),
			SecretKey: env("TC_KEY", ""),
		});
	}

	async upload(input: UploadInput): Promise<UploadResult> {
		const key = `${input.targetPath}/${input.name}`;
		const data = await promisify<{ Location: string }>((cb) =>
			this.client.uploadFile(
				{
					Bucket: this.bucket,
					Region: this.region,
					Key: key,
					FilePath: input.filePath,
					SliceSize: 1024 * 1024 * 5,
				},
				cb,
			),
		);
		return data.Location;
	}

	async uploadMany(inputs: UploadInput[]): Promise<UploadResult[]> {
		const data = await promisify<{ files: { data: { Location: string } }[] }>((cb) =>
			this.client.uploadFiles(
				{
					files: inputs.map((i) => ({
						Bucket: this.bucket,
						Region: this.region,
						Key: `${i.targetPath}/${i.name}`,
						FilePath: i.filePath,
					})),
					SliceSize: 1024 * 1024 * 5,
				},
				cb,
			),
		);
		return data.files.map((f) => f.data.Location);
	}

	async delete(keys: string[]): Promise<void> {
		if (keys.length === 0) return;
		await promisify((cb) =>
			this.client.deleteMultipleObject(
				{
					Bucket: this.bucket,
					Region: this.region,
					Objects: keys.map((k) => ({ Key: k })),
				},
				cb,
			),
		);
	}
}
