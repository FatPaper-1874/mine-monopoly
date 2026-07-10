/// <reference types="vite-plugin-electron/electron-env" />

declare namespace NodeJS {
	interface ProcessEnv {
		/**
		 * The built directory structure
		 *
		 * ```tree
		 * ├─┬─┬ dist
		 * │ │ └── index.html
		 * │ │
		 * │ ├─┬ dist-electron
		 * │ │ ├── main.js
		 * │ │ └── preload.js
		 * │
		 * ```
		 */
		APP_ROOT: string;
		/** /dist/ or /public/ */
		VITE_PUBLIC: string;
	}
}

// 与 packages/components/ui/title-bar/title-bar.vue 约定的统一平台 API
interface PlatformAPI {
	minimize: () => void;
	maximize: () => void;
	unmaximize: () => void;
	close: () => void;
	isMaximized: () => Promise<boolean>;
}

// Used in Renderer process, expose in `preload.ts`
interface Window {
	platformAPI?: PlatformAPI;
	electronAPI: {
		minimize: () => void;
		maximize: () => void;
		unmaximize: () => void;
		close: () => void;
		isMaximized: () => Promise<boolean>;

		readFile: (filePath: string) => Promise<Buffer>;
		saveFile: (filePath: string, data: string | Uint8Array) => Promise<string>;
		saveLocalFile: (filePath: string, data: string | Uint8Array) => Promise<string>;
		copyFile: (
			fromFilePath: string,
			toFilePath: string,
			newFileName: string,
		) => Promise<{ filePath: string; fileType: string }>;
		clearTempDir: () => Promise<void>;
		mkdir: (dirPath: string) => Promise<void>;
		readDir: (dirPath: string) => Promise<{ name: string; isDirectory: boolean; isFile: boolean }[]>;
		exists: (p: string) => Promise<boolean>;
		statPath: (p: string) => Promise<{ isDirectory: boolean; isFile: boolean; size: number; mtimeMs: number }>;
		unlink: (p: string) => Promise<void>;
		rmdir: (dirPath: string) => Promise<void>;
		rename: (oldPath: string, newPath: string) => Promise<void>;

		showOpenDialog: (options: OpenDialogOptions) => Promise<OpenDialogReturnValue>;
		showSaveDialog: (options: SaveDialogOptions) => Promise<SaveDialogReturnValue>;

		getVersion: () => string;
		getImageBase64: (fliePath: string) => Promise<string>;

		rendererReady: () => void;
		onOpenMapFile: (callback: (filePath: string) => void) => () => void;
		copyEmptyResource: (type: "model" | "image") => Promise<{
			fileType: string;
			url: string;
		}>;
	};

	updateAPI: {
		checkForUpdate: () => Promise<any>;
		startDownload: () => Promise<void>;
		quitAndInstall: () => Promise<void>;
		onUpdateStatus: (callback: (data: any) => void) => () => void;
	};
}
