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
	ipcRenderer: import("electron").IpcRenderer;
	electronAPI: {
		minimize: () => void;
		maximize: () => void;
		unmaximize: () => void;
		close: () => void;
		isMaximized: () => Promise<boolean>;
		getVersion: () => string;
		onFullScreenChange: (callback: (isFull: boolean) => void) => void;
	};

	mapCacheLoader: {
		save(mapId: string, hash: string, arrayBuffer: ArrayBuffer): Promise<void>;
		load(mapId: string, hash: string): Promise<ArrayBuffer | undefined>;
	};
}
