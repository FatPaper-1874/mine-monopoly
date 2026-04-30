export interface UploadInput {
	filePath: string;
	name: string;
	targetPath: string;
}

export type UploadResult = string;

export interface StorageProvider {
	readonly name: string;
	upload(input: UploadInput): Promise<UploadResult>;
	uploadMany(inputs: UploadInput[]): Promise<UploadResult[]>;
	delete(keys: string[]): Promise<void>;
}
