/// <reference types="vite-plugin-electron/electron-env" />
declare const __APP_VERSION__: string;
declare const __BUILD_TIME__: string;
declare const __COMPATIBLE_VERSION__: string;

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
	ipcRenderer: import("electron").IpcRenderer;
	electronAPI: {
		minimize: () => void;
		maximize: () => void;
		unmaximize: () => void;
		close: () => void;
		isMaximized: () => Promise<boolean>;
		getVersion: () => string;
		onFullScreenChange: (callback: (isFull: boolean) => void) => void;
		logError: (error: {
			type: "Vue" | "Promise" | "Runtime";
			message: string;
			stack?: string;
			info?: string;
			filename?: string;
			lineno?: number;
			colno?: number;
		}) => void;
		openLogsFolder: () => Promise<string>;
	};

	mapCacheLoader: {
		save(mapId: string, hash: string, arrayBuffer: ArrayBuffer): Promise<void>;
		load(mapId: string, hash: string): Promise<ArrayBuffer | undefined>;
	};

	updateAPI: {
		checkForUpdate: () => Promise<any>;
		startDownload: () => Promise<void>;
		quitAndInstall: () => Promise<void>;
		onUpdateStatus: (callback: (data: any) => void) => () => void;
	};
}
