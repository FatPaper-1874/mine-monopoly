/**
 * Electron 平台实现
 *
 * 从 preload 暴露的 electronAPI 中读取，
 * 封装为统一的 PlatformAPI 接口。
 */
import type { PlatformAPI } from "../types";

/**
 * 创建 Electron 平台的 PlatformAPI 实现
 *
 * 委托给 preload 通过 contextBridge 暴露的 window.electronAPI。
 */
export function createElectronPlatform(): PlatformAPI {
	const api = (window as any).electronAPI;

	return {
		// 窗口控制
		minimize: api?.minimize?.bind(api),
		maximize: api?.maximize?.bind(api),
		unmaximize: api?.unmaximize?.bind(api),
		close: api?.close?.bind(api),
		isMaximized: api?.isMaximized?.bind(api),

		// 版本
		getVersion: () => api?.getVersion?.() ?? __APP_VERSION__,

		// 全屏
		onFullScreenChange: (cb: (isFull: boolean) => void) => api?.onFullScreenChange?.(cb),

		// 日志
		logError: (data) => api?.logError?.(data),
		logConsole: (data) => api?.logConsole?.(data),
		logNetwork: (data) => api?.logNetwork?.(data),
		openLogsFolder: () => api?.openLogsFolder?.(),

		// 历史日志（从主进程文件加载，Electron 专属）
		getHistoryLogs: api?.getLogs?.bind(api) as any,

		// 开发者
		openInspector: api?.openInspector?.bind(api),
		openAIConsole: api?.openAIConsole?.bind(api),
	};
}
