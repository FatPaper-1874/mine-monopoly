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
			type: "Vue" | "Promise" | "Runtime" | "Worker" | "Network" | "Console";
			message: string;
			stack?: string;
			info?: string;
			filename?: string;
			lineno?: number;
			colno?: number;
			url?: string;
			method?: string;
			status?: number;
			timestamp?: string;
			additionalData?: Record<string, any>;
		}) => void;
		logConsole: (data: {
			level: "error" | "warn" | "info";
			message: string;
			stack?: string;
		}) => void;
		logNetwork: (data: {
			url: string;
			method: string;
			status?: number;
			error: string;
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

// 扩展 Performance 接口以支持 Chrome 特定的 memory API
interface Performance {
	memory?: {
		jsHeapSizeLimit: number;
		totalJSHeapSize: number;
		usedJSHeapSize: number;
	};
}
