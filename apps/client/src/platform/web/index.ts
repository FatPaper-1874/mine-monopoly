/**
 * Web 平台实现（浏览器 / PWA）
 *
 * 提供 PlatformAPI 的纯浏览器实现，所有桌面专属方法为空操作。
 */
import type { PlatformAPI } from "../types";

/**
 * 创建 Web 平台的 PlatformAPI 实现
 */
export function createWebPlatform(): PlatformAPI {
	return {
		// ---- 窗口控制（桌面专属，空实现） ----
		minimize: undefined,
		maximize: undefined,
		unmaximize: undefined,
		close: undefined,
		isMaximized: undefined,

		// ---- 版本 ----
		getVersion: () => __APP_VERSION__,

		// ---- 全屏 ----
		onFullScreenChange: (cb: (isFull: boolean) => void) => {
			document.addEventListener("fullscreenchange", () => {
				cb(!!document.fullscreenElement);
			});
		},

		// ---- 日志 ----
		logError: (data) => {
			console.error(`[${data.type}] ${data.message}`, data.stack || "");
		},
		logConsole: (data) => {
			const method = data.level === "error" ? console.error
				: data.level === "warn" ? console.warn
				: console.info;
			method(`[${data.level}] ${data.message}`);
		},
		logNetwork: (data) => {
			console.warn(`[Network] ${data.method} ${data.url}`, data.error);
		},
		openLogsFolder: undefined,

		// ---- 开发者 ----
		openInspector: undefined,
		openAIConsole: undefined,
	};
}
