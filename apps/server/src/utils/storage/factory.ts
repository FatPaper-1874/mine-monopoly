import { env } from "@mine-monopoly/env";
import { LocalStorageProvider } from "./local-provider.js";
import { CosStorageProvider } from "./cos-provider.js";
import type { StorageProvider } from "./types.js";

let _instance: StorageProvider | null = null;

export function createStorageProvider(): StorageProvider {
	if (_instance) return _instance;

	const tcBucket = env("TC_BUCKET_NAME", "");
	const tcRegion = env("TC_REGION", "");
	const tcId = env("TC_ID", "");
	const tcKey = env("TC_KEY", "");

	if (tcBucket && tcRegion && tcId && tcKey) {
		_instance = new CosStorageProvider();
	} else {
		_instance = new LocalStorageProvider();
	}

	return _instance;
}

export function getStorage(): StorageProvider {
	return createStorageProvider();
}
