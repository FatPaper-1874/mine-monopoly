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

// Used in Renderer process, expose in `preload.ts`
interface Window {
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
