import { ipcRenderer, contextBridge } from "electron";
import { version } from "../package.json";

// --------- 错误日志类型定义 ---------
export interface LogErrorData {
	type: "Vue" | "Promise" | "Runtime" | "Worker" | "Network" | "Console";
	message: string;
	stack?: string;
	info?: string; // Vue 错误的额外信息
	filename?: string; // Runtime 错误的文件名
	lineno?: number; // Runtime 错误的行号
	colno?: number; // Runtime 错误的列号
	url?: string; // Network 错误的 URL
	method?: string; // Network 请求方法
	status?: number; // Network 状态码
	timestamp?: string;
	additionalData?: Record<string, any>;
}

export interface LogConsoleData {
	level: "error" | "warn" | "info";
	message: string;
	stack?: string;
}

export interface LogNetworkData {
	url: string;
	method: string;
	status?: number;
	error: string;
}

// --------- Expose some API to the Renderer process ---------
contextBridge.exposeInMainWorld("electronAPI", {
	//窗口事件相关
	minimize: () => ipcRenderer.send("window-minimize"),
	isMaximized: () => ipcRenderer.invoke("window-is-maximized"),
	maximize: () => ipcRenderer.send("window-maximize"),
	unmaximize: () => ipcRenderer.send("window-unmaximize"),
	close: () => ipcRenderer.send("window-close"),
	getVersion: () => version,
	onFullScreenChange: (callback: (isFull: boolean) => void) =>
		ipcRenderer.on("fullscreen-changed", (_, isFull) => callback(isFull)),
	//错误日志相关
	logError: (error: LogErrorData) => ipcRenderer.send("log-error", error),
	logConsole: (data: LogConsoleData) => ipcRenderer.send("log-console", data),
	logNetwork: (data: LogNetworkData) => ipcRenderer.send("log-network", data),
	openLogsFolder: () => ipcRenderer.invoke("open-logs-folder"),
});

contextBridge.exposeInMainWorld("mapCacheLoader", {
	async save(mapId: string, hash: string, arrayBuffer: ArrayBuffer): Promise<void> {
		await ipcRenderer.invoke("map-cache:save", mapId, hash, arrayBuffer);
	},
	async load(mapId: string, hash: string): Promise<ArrayBuffer | undefined> {
		const buffer = await ipcRenderer.invoke("map-cache:load", mapId, hash);
		if (buffer) {
			return buffer;
		}
		return undefined;
	},
});

contextBridge.exposeInMainWorld("updateAPI", {
	// 触发操作
	checkForUpdate: () => ipcRenderer.invoke("check-for-update"),
	startDownload: () => ipcRenderer.invoke("start-download-update"),
	quitAndInstall: () => ipcRenderer.invoke("quit-and-install"),

	// 监听状态
	onUpdateStatus: (callback: (data: any) => void) => {
		const subscription = (_: any, value: any) => callback(value);
		ipcRenderer.on("update-status", subscription);
		// 返回清理函数
		return () => ipcRenderer.removeListener("update-status", subscription);
	},
});
