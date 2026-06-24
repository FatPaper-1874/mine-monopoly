/**
 * Extended filesystem API for map version management.
 * Bridges the gap until global.d.ts is fully picked up.
 */
export interface ExtendedFsAPI {
	readFile: (filePath: string) => Promise<Buffer>;
	saveFile: (filePath: string, data: string) => Promise<string>;
	saveLocalFile: (filePath: string, data: string | Uint8Array) => Promise<string>;
	mkdir: (dirPath: string) => Promise<void>;
	readDir: (dirPath: string) => Promise<{ name: string; isDirectory: boolean; isFile: boolean }[]>;
	exists: (p: string) => Promise<boolean>;
	statPath: (p: string) => Promise<{ isDirectory: boolean; isFile: boolean; size: number; mtimeMs: number }>;
	unlink: (p: string) => Promise<void>;
	rmdir: (dirPath: string) => Promise<void>;
	rename: (oldPath: string, newPath: string) => Promise<void>;
}

/** Get the extended FS API from window.electronAPI */
export function getFsApi(): ExtendedFsAPI {
	return window.electronAPI as unknown as ExtendedFsAPI;
}
