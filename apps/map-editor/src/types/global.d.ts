/**
 * Global type definitions for MineMonopoly Map Editor
 */

import { OpenDialogOptions, SaveDialogOptions, OpenDialogReturnValue, SaveDialogReturnValue } from "electron";

declare global {
	interface Window {
		electronAPI: {
			// Window controls
			minimize: () => void;
			isMaximized: () => Promise<boolean>;
			maximize: () => void;
			unmaximize: () => void;
			close: () => void;

			// File operations
			readFile: (filePath: string) => Promise<Buffer>;
			saveFile: (filePath: string, data: string) => Promise<string>;
		saveLocalFile: (filePath: string, data: string | Uint8Array) => Promise<string>;
			copyFile: (fromFilePath: string, toFilePath: string, newFileName: string) => Promise<{ filePath: string; fileType: string }>;
			clearTempDir: () => Promise<void>;
			copyEmptyResource: (resourceType: "model" | "image") => Promise<{ filePath: string; fileType: string; url: string }>;

			// Custom file operations
			showOpenDialog: (options: OpenDialogOptions) => Promise<OpenDialogReturnValue>;
			showSaveDialog: (options: SaveDialogOptions) => Promise<SaveDialogReturnValue>;

			// ─── 目录操作 (地图版本管理用) ───
			mkdir: (dirPath: string) => Promise<void>;
			readDir: (dirPath: string) => Promise<{ name: string; isDirectory: boolean; isFile: boolean }[]>;
			exists: (p: string) => Promise<boolean>;
			statPath: (p: string) => Promise<{ isDirectory: boolean; isFile: boolean; size: number; mtimeMs: number }>;
			unlink: (p: string) => Promise<void>;
			rmdir: (dirPath: string) => Promise<void>;

			// Version and info
			getVersion: () => string;
			getImageBase64: (filePath: string) => Promise<string>;

			// Renderer ready
			rendererReady: () => void;
			onOpenMapFile: (callback: (filePath: string) => void) => () => void;
		};

		updateAPI: {
			checkForUpdate: () => Promise<void>;
			startDownload: () => Promise<void>;
			quitAndInstall: () => Promise<void>;
			onUpdateStatus: (callback: (data: any) => void) => () => void;
		};

		mcpAPI: {
			startMCPServer: () => Promise<{ success: boolean; message: string }>;
			stopMCPServer: () => Promise<{ success: boolean; message: string }>;
			getMCPStatus: () => Promise<{ running: boolean }>;
			getMCPTools: () => Promise<Array<{ name: string; description: string }>>;
			onServerStatusChange: (callback: (status: { running: boolean }) => void) => () => void;
		};

		gitAPI: {
			init: (dir: string) => Promise<void>;
			commitAll: (dir: string, message: string, author?: string) => Promise<string>;
			log: (dir: string, depth?: number) => Promise<{ oid: string; message: string; timestamp: number }[]>;
			checkout: (dir: string, oid: string) => Promise<void>;
			diff: (dir: string, oidA: string, oidB: string) => Promise<{ filePath: string; status: string }[]>;
			readFile: (dir: string, oid: string, filePath: string) => Promise<string>;
			currentOid: (dir: string) => Promise<string | null>;
			createTag: (dir: string, name: string, message?: string) => Promise<void>;
			hasChanges: (dir: string) => Promise<boolean>;
		};
	}
}

export {};
