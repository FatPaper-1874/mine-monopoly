/// <reference types="vite-plugin-electron/electron-env" />
declare const __APP_VERSION__: string;
declare const __BUILD_TIME__: string;
declare const __COMPATIBLE_VERSION__: string;
declare const __MIN_NATIVE_VERSION__: string;

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

	// 通用平台 API（各平台实现不同）
	platformAPI?: import("../src/platform/types").PlatformAPI;

	// 更新 API（平台无关接口）
	updateAPI: import("../src/platform/types").UpdateAPI;

	// Capacitor 更新源 URL（运行时动态设置）
	__CAPACITOR_UPDATE_URL__?: string;
}

// 扩展 Performance 接口以支持 Chrome 特定的 memory API
interface Performance {
	memory?: {
		jsHeapSizeLimit: number;
		totalJSHeapSize: number;
		usedJSHeapSize: number;
	};
}
