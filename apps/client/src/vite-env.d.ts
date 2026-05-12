/// <reference types="vite/client" />

// ========== Electron API 类型定义 ==========

interface LogErrorData {
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
}

interface LogConsoleData {
	level: "error" | "warn" | "info";
	message: string;
	stack?: string;
}

interface LogNetworkData {
	url: string;
	method: string;
	status?: number;
	error: string;
}

interface ElectronAPI {
	// 窗口事件相关
	minimize: () => void;
	maximize: () => void;
	close: () => void;
	getVersion: () => string;
	onFullScreenChange: (callback: (isFull: boolean) => void) => void;
	// 错误日志相关
	logError: (error: LogErrorData) => void;
	logConsole: (data: LogConsoleData) => void;
	logNetwork: (data: LogNetworkData) => void;
	openLogsFolder: () => Promise<string>;
}

declare global {
	interface Window {
		electronAPI?: ElectronAPI;
	}
}

declare module "*.md?raw" {
	const content: string;
	export default content;
}

