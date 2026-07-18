/**
 * 通用平台 API 类型定义
 *
 * 统一所有平台（Electron / Capacitor / Web）的能力接口，
 * 各平台提供各自的实现模块。
 */

/** 平台类型 */
export type PlatformType = "electron" | "capacitor" | "mobile" | "web";

// ========== 日志数据类型 ==========

export interface LogErrorData {
	type: "Vue" | "Promise" | "Runtime" | "Worker" | "Network" | "Console" | string;
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

// ========== 平台能力接口 ==========

/**
 * 平台 API — 各平台按需实现
 *
 * 窗口控制类方法（minimize / maximize / close 等）仅桌面平台有，标记为可选。
 */
export interface PlatformAPI {
	// ---- 窗口控制（桌面平台） ----
	minimize?: () => void;
	maximize?: () => void;
	unmaximize?: () => void;
	close?: () => void;
	isMaximized?: () => Promise<boolean>;

	// ---- 版本 ----
	getVersion: () => string;

	// ---- 全屏 ----
	onFullScreenChange: (callback: (isFull: boolean) => void) => void;

	// ---- 日志 ----
	logError: (error: LogErrorData) => void;
	logConsole: (data: LogConsoleData) => void;
	logNetwork: (data: LogNetworkData) => void;
	openLogsFolder?: () => Promise<string>;

	/** Electron: 从主进程文件系统加载历史日志 */
	getHistoryLogs?: () => Promise<any[]>;

	// ---- 开发者 ----
	openInspector?: () => Promise<void>;
	openAIConsole?: () => Promise<void>;
}

/** 更新 API 接口 */
export interface UpdateAPI {
	checkForUpdate: () => Promise<any>;
	startDownload: () => Promise<void>;
	quitAndInstall: () => Promise<void>;
	onUpdateStatus: (callback: (data: any) => void) => () => void;
}
