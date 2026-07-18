import {
	app,
	ipcMain,
	BrowserWindow,
	Menu,
	dialog,
	OpenDialogOptions,
	SaveDialogOptions,
	protocol,
	net,
} from "electron";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import path from "node:path";
import fs from "fs/promises";
import fsSync from "fs";
import url from "node:url";
import { autoUpdater } from "electron-updater";
import log from "electron-log";
import { loadUpdateSources, type UpdateSource } from "./update-config.js";
import { GMAction, GMActionResponseData } from "../src/interfaces/worker";

// ============================================================
// 更新源配置
// ============================================================
let currentUpdateSource: UpdateSource | null = null;
let isFallbackInProgress = false;

// --------- 错误日志处理 ---------

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

// 日志目录：在用户数据目录下（跨平台可写，兼容 macOS .app 包结构）
const logsDir = path.join(app.getPath("userData"), "logs");

// 增强的日志文件路径
const mainLogPath = path.join(logsDir, "main.log");
const errorLogPath = path.join(logsDir, "error.log");

// 日志文件健康检查
let logFileHealthy = true;
let lastLogCheck = 0;
const LOG_CHECK_INTERVAL = 60000; // 每分钟检查一次

// 本地时间格式化（YYYY-MM-DD HH:mm:ss）
function formatLocalTime(date: Date = new Date()): string {
	const pad = (n: number) => String(n).padStart(2, "0");
	return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

// 检查日志文件是否可写
async function checkLogFileHealth(): Promise<boolean> {
	const now = Date.now();
	if (now - lastLogCheck < LOG_CHECK_INTERVAL) {
		return logFileHealthy;
	}
	lastLogCheck = now;

	try {
		const testPath = path.join(logsDir, ".health-check");
		await fs.appendFile(testPath, `health-check-${now}\n`);
		await fs.unlink(testPath);
		logFileHealthy = true;
		return true;
	} catch (err) {
		logFileHealthy = false;
		console.error("[日志健康检查失败]:", err);
		// 尝试重新创建日志目录
		try {
			await fs.mkdir(logsDir, { recursive: true });
			logFileHealthy = true;
		} catch (retryErr) {
			console.error("[重建日志目录失败]:", retryErr);
		}
		return false;
	}
}

// 确保日志目录存在
async function ensureLogsDir() {
	try {
		await fs.mkdir(logsDir, { recursive: true });

		// 初始化日志文件
		const now = formatLocalTime();
		const header = `\n${"=".repeat(80)}\n应用启动: ${now}\nElectron 版本: ${process.versions.electron}\nChrome 版本: ${process.versions.chrome}\nNode 版本: ${process.versions.node}\n平台: ${process.platform}\n架构: ${process.arch}\n${"=".repeat(80)}\n\n`;

		await fs.appendFile(mainLogPath, header, "utf-8");
		await fs.appendFile(errorLogPath, header, "utf-8");
	} catch (err) {
		console.error("Failed to create logs directory:", err);
	}
}

// 格式化日志条目（增强版）
function formatLogEntry(error: LogErrorData): string {
	const timestamp = formatLocalTime();

	let log = `\n[${timestamp}] [${error.type}]\n`;
	log += `消息: ${error.message}\n`;

	if (error.info) {
		log += `信息: ${error.info}\n`;
	}

	if (error.filename) {
		log += `文件: ${error.filename}:${error.lineno}:${error.colno}\n`;
	}

	if (error.url) {
		log += `URL: ${error.url}\n`;
		if (error.method) {
			log += `方法: ${error.method}\n`;
		}
		if (error.status) {
			log += `状态码: ${error.status}\n`;
		}
	}

	if (error.stack) {
		// 改进堆栈格式化
		log += `\n堆栈跟踪:\n`;
		const lines = error.stack.split("\n");
		for (const line of lines) {
			log += `  ${line}\n`;
		}
	}

	if (error.additionalData) {
		log += `\n附加数据:\n`;
		try {
			log += `  ${JSON.stringify(error.additionalData, null, 2)}\n`;
		} catch (err) {
			log += `  [无法序列化附加数据]\n`;
		}
	}

	log += "-".repeat(80) + "\n";
	return log;
}

// 同时写入主日志和错误日志
async function writeLogEntry(logEntry: string, isError: boolean = true): Promise<void> {
	const healthOk = await checkLogFileHealth();
	if (!healthOk) {
		console.error("[日志系统异常] 无法写入日志文件");
		return;
	}

	try {
		// 所有错误都写入主日志
		await fs.appendFile(mainLogPath, logEntry, "utf-8");
		// 错误也写入专门的错误日志
		if (isError) {
			await fs.appendFile(errorLogPath, logEntry, "utf-8");
		}
	} catch (err) {
		console.error("[写入日志失败]:", err);
		logFileHealthy = false;
	}
}

// 写入错误日志（增强版）
async function writeErrorLog(error: LogErrorData): Promise<string | null> {
	const logEntry = formatLogEntry(error);

	// 确定错误等级
	const isError = ["Vue", "Promise", "Runtime", "Worker"].includes(error.type);

	await writeLogEntry(logEntry, isError);

	// 返回日志文件路径用于显示
	return isError ? errorLogPath : mainLogPath;
}

autoUpdater.logger = log;
autoUpdater.autoDownload = false; // 关键：设为 false，防止游戏过程中自动抢网速
autoUpdater.autoInstallOnAppQuit = true; // 退出时自动安装

log.transports.file.level = "info";

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

process.env.APP_ROOT = path.join(__dirname, "..");

export const VITE_DEV_SERVER_URL = process.env["VITE_DEV_SERVER_URL"];
export const MAIN_DIST = path.join(process.env.APP_ROOT, "dist-electron");
export const RENDERER_DIST = path.join(process.env.APP_ROOT, "dist");

const isProduction = app.isPackaged;

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, "public") : RENDERER_DIST;

let win: BrowserWindow | null;

function buildAppMenu() {
	if (process.platform !== "darwin") return;

	const template: Electron.MenuItemConstructorOptions[] = [
		{
			label: app.name,
			submenu: [
				{ role: "about" as any },
				{ type: "separator" },
				{ role: "services" as any, submenu: [] },
				{ type: "separator" },
				{ role: "hide" as any },
				{ role: "hideOthers" as any },
				{ role: "unhide" as any },
				{ type: "separator" },
				{ role: "quit" as any },
			],
		},
		{
			label: "Edit",
			submenu: [
				{ role: "undo" as any },
				{ role: "redo" as any },
				{ type: "separator" },
				{ role: "cut" as any },
				{ role: "copy" as any },
				{ role: "paste" as any },
				{ role: "selectAll" as any },
			],
		},
		{
			label: "View",
			submenu: [
				{ role: "toggleDevTools" as any },
				{ type: "separator" },
				{ role: "resetZoom" as any },
				{ role: "zoomIn" as any },
				{ role: "zoomOut" as any },
				{ type: "separator" },
				{ role: "togglefullscreen" as any },
			],
		},
		{
			label: "Window",
			submenu: [{ role: "minimize" as any }, { role: "zoom" as any }, { role: "close" as any }],
		},
	];

	const menu = Menu.buildFromTemplate(template);
	Menu.setApplicationMenu(menu);
}

function createWindow() {
	win = new BrowserWindow({
		width: 1200,
		height: 780,
		minWidth: 1200,
		minHeight: 780,
		webPreferences: {
			nodeIntegration: true,
			nodeIntegrationInWorker: false,
			contextIsolation: true,
			sandbox: false,
			enableBlinkFeatures: "WebRTC",
			preload: path.join(__dirname, "preload.mjs"),
			devTools: isProduction ? false : true,
			webSecurity: false,
			// 允许自动播放音频，无需用户交互
			autoplayPolicy: "no-user-gesture-required",
		},
		frame: false,
		...(process.platform === "darwin" ? { titleBarStyle: "hiddenInset" } : {}),
	});

	if (!isProduction) win.webContents.openDevTools();

	win.webContents.on("did-finish-load", () => {
		win?.webContents.send("main-process-message", new Date().toLocaleString());
	});

	if (VITE_DEV_SERVER_URL) {
		win.loadURL(VITE_DEV_SERVER_URL);
	} else {
		// win.loadFile("./dist/index.html");
		win.loadFile(path.join(RENDERER_DIST, "frontend/index.html")).catch((err) => {
			console.error("[加载页面失败]:", err);
			writeLogEntry(`[${formatLocalTime()}] [FATAL] 加载页面失败: ${err.message}\n`, true);
		});
	}

	win.on("enter-full-screen", () => {
		win!.webContents.send("fullscreen-changed", true);
	});

	win.on("leave-full-screen", () => {
		win!.webContents.send("fullscreen-changed", false);
	});

	autoUpdater.on("update-available", (info) => {
		win && win.webContents.send("update-status", {
			status: "available",
			info,
			sourceName: currentUpdateSource?.name,
		});
	});

	// 已经是最新
	autoUpdater.on("update-not-available", (info) => {
		win && win.webContents.send("update-status", {
			status: "not-available",
			info,
			sourceName: currentUpdateSource?.name,
		});
	});

	// 下载进度
	autoUpdater.on("download-progress", (progressObj) => {
		win && win.webContents.send("update-status", { status: "progress", progress: progressObj });
	});

	// 下载完成
	autoUpdater.on("update-downloaded", (info) => {
		win && win.webContents.send("update-status", { status: "downloaded", info });
	});

	// 错误 — fallback 期间的错误静默处理，由 checkForUpdatesWithFallback 循环接管
	autoUpdater.on("error", (err) => {
		if (isFallbackInProgress) return;
		win && win.webContents.send("update-status", { status: "error", error: err.message });
	});
}

app.on("window-all-closed", () => {
	if (process.platform !== "darwin") {
		app.quit();
		win = null;
	}
});

app.on("activate", () => {
	if (BrowserWindow.getAllWindows().length === 0) {
		createWindow();
	}
});

// ===== 游戏进程控制台 (dev only) =====
let inspectorWin: BrowserWindow | null = null;
let aiConsoleWin: BrowserWindow | null = null;

async function executeInMainWindow<T>(script: string): Promise<T> {
	if (!win || win.isDestroyed()) {
		throw new Error("Main window not available");
	}
	return await win.webContents.executeJavaScript(script);
}

async function executeAIControlBridge<T>(callExpression: string, missingResult: string): Promise<T> {
	return await executeInMainWindow(
		"(async function() {" +
			"  const bridge = window.__aiControlBridge;" +
			"  if (!bridge) {" +
			`    return ${missingResult};` +
			"  }" +
			`  return await ${callExpression};` +
			"})()",
	);
}

ipcMain.handle("open-inspector", async () => {
	if (app.isPackaged) return;
	if (inspectorWin && !inspectorWin.isDestroyed()) {
		inspectorWin.focus();
		return;
	}

	inspectorWin = new BrowserWindow({
		width: 900,
		height: 700,
		title: "游戏进程控制台",
		frame: false,
		webPreferences: {
			nodeIntegration: true,
			contextIsolation: false,
		},
	});

	inspectorWin.loadFile(path.join(process.env.APP_ROOT!, "electron", "inspector.html"));
	inspectorWin.on("closed", () => {
		inspectorWin = null;
	});

	// Handle close button from inspector window
	ipcMain.on("close-inspector", () => {
		if (inspectorWin && !inspectorWin.isDestroyed()) {
			inspectorWin.close();
		}
	});
});

ipcMain.handle("open-ai-console", async () => {
	if (aiConsoleWin && !aiConsoleWin.isDestroyed()) {
		aiConsoleWin.focus();
		return;
	}

	aiConsoleWin = new BrowserWindow({
		width: 1360,
		height: 820,
		minWidth: 1040,
		minHeight: 700,
		title: "AI 控制台",
		frame: false,
		webPreferences: {
			nodeIntegration: true,
			contextIsolation: false,
		},
	});

	aiConsoleWin.loadFile(path.join(process.env.APP_ROOT!, "electron", "ai-console.html"));
	aiConsoleWin.on("closed", () => {
		aiConsoleWin = null;
	});
});

ipcMain.on("close-ai-console", () => {
	if (aiConsoleWin && !aiConsoleWin.isDestroyed()) {
		aiConsoleWin.close();
	}
});

ipcMain.handle("inspector:get-state", async () => {
	try {
		const result = await executeInMainWindow(
			"(function() {" +
				"  const bridge = window.__gpBridge;" +
				"  if (!bridge || typeof bridge.requestState !== 'function') {" +
				"    return { __error: 'GameProcess not started yet' };" +
				"  }" +
				"  return new Promise((resolve) => {" +
				"    const timeout = setTimeout(() => {" +
				"      bridge.onState = null;" +
				"      resolve({ __error: 'Timeout: Worker did not respond' });" +
				"    }, 3000);" +
				"    bridge.onState = (state) => {" +
				"      clearTimeout(timeout);" +
				"      bridge.onState = null;" +
				"      resolve(state);" +
				"    };" +
				"    bridge.requestState();" +
				"  });" +
				"})()",
		);
		return result;
	} catch (e: any) {
		return { __error: e.message };
	}
});

ipcMain.handle("inspector:gm-action", async (event, action: GMAction) => {
	try {
		const result = await executeInMainWindow(
			"(function() {" +
				"  const room = window.__roomInstance;" +
				"  if (!room || typeof room.gmAction !== 'function') {" +
				"    return { success: false, error: 'Room not available or gmAction not supported' };" +
				"  }" +
				"  return new Promise((resolve) => {" +
				"    room.gmAction(" + JSON.stringify(action) + ").then(resolve);" +
				"  });" +
				"})()"
		);
		return result;
	} catch (e: any) {
		return { success: false, error: e.message };
	}
});

ipcMain.handle("ai-console:get-state", async () => {
	try {
		return await executeAIControlBridge(
			"bridge.getSnapshot()",
			"{ __error: 'AI control bridge not available' }",
		);
	} catch (e: any) {
		return { __error: e.message };
	}
});

ipcMain.handle("ai-console:apply-config", async (_event, config) => {
	try {
		return await executeAIControlBridge(
			"bridge.applyConfig(" + JSON.stringify(config) + ")",
			"{ success: false, error: 'AI control bridge not available' }",
		);
	} catch (e: any) {
		return { success: false, error: e.message };
	}
});

ipcMain.handle("ai-console:set-player-binding", async (_event, payload: { userId: string; binding: unknown }) => {
	try {
		return await executeAIControlBridge(
			"bridge.setPlayerBinding(" +
				JSON.stringify(payload?.userId) +
				", " +
				JSON.stringify(payload?.binding ?? {}) +
				")",
			"{ success: false, error: 'AI control bridge not available' }",
		);
	} catch (e: any) {
		return { success: false, error: e.message };
	}
});

ipcMain.handle("ai-console:clear-usage", async () => {
	try {
		return await executeAIControlBridge(
			"bridge.clearUsage()",
			"{ success: false, error: 'AI control bridge not available' }",
		);
	} catch (e: any) {
		return { success: false, error: e.message };
	}
});

ipcMain.handle("ai-console:clear-memory", async (_event, payload: { playerId?: string } | undefined) => {
	try {
		const playerId = payload?.playerId ?? null;
		return await executeAIControlBridge(
			"bridge.clearMemory(" + JSON.stringify(playerId) + " || undefined)",
			"{ success: false, error: 'AI control bridge not available' }",
		);
	} catch (e: any) {
		return { success: false, error: e.message };
	}
});
// ===== End 游戏进程控制台 =====

app.whenReady().then(async () => {
	protocol.handle("local", (request) => {
		const filePath = request.url.slice("local://".length);
		return net.fetch(url.pathToFileURL(path.join(__dirname, filePath)).toString());
	});

	try {
		await ensureLogsDir();
		buildAppMenu();
		createWindow();
	} catch (err: any) {
		console.error("[应用初始化失败]:", err);
		await writeLogEntry(`[${formatLocalTime()}] [FATAL] 应用初始化失败: ${err.message}\n${err.stack || ""}\n`, true);
		throw err;
	}
});

ipcMain.on("window-minimize", () => {
	if (win) win.minimize();
});

ipcMain.on("window-maximize", () => {
	if (win) {
		if (win.isMaximized()) {
			win.unmaximize();
		} else {
			win.maximize();
		}
	}
});

ipcMain.on("window-close", () => {
	if (win) win.close();
});

ipcMain.handle("window-is-maximized", () => {
	return win ? win.isMaximized() : false;
});

const cacheDir = path.join(app.getPath("userData"), "map-cache");
const indexFile = path.join(cacheDir, "index.json");
type IndexData = Record<string, string>;

async function loadIndex(): Promise<IndexData> {
	try {
		const raw = await fs.readFile(indexFile, "utf-8");
		return JSON.parse(raw) as IndexData;
	} catch {
		return {};
	}
}

ipcMain.handle("map-cache:save", async (_event, mapId: string, hash: string, buffer: ArrayBuffer) => {
	async function ensureCacheDir() {
		await fs.mkdir(cacheDir, { recursive: true });
	}

	async function saveIndex(index: IndexData) {
		await fs.writeFile(indexFile, JSON.stringify(index, null, 2), "utf-8");
	}

	await ensureCacheDir();
	const index = await loadIndex();
	const oldHash = index[mapId];

	// 删除旧文件
	if (oldHash && oldHash !== hash) {
		const oldFilePath = path.join(cacheDir, `${mapId}-${oldHash}.bin`);
		await fs.rm(oldFilePath, { force: true }).catch(() => {});
	}

	const filePath = path.join(cacheDir, `${mapId}-${hash}.bin`);
	await fs.writeFile(filePath, new Uint8Array(buffer));

	index[mapId] = hash;
	await saveIndex(index);
});

ipcMain.handle("map-cache:load", async (_event, mapId: string, hash: string) => {
	const index = await loadIndex();
	if (index[mapId] !== hash) return undefined;

	const filePath = path.join(cacheDir, `${mapId}-${hash}.bin`);
	try {
		const buf = await fs.readFile(filePath);
		return buf.buffer;
	} catch {
		return undefined;
	}
});

// ============================================================
// 多源自动 fallback 更新检查
// ============================================================
async function checkForUpdatesWithFallback() {
	const sources = loadUpdateSources(app.getPath("userData"));
	if (sources.length === 0) {
		win?.webContents.send("update-status", {
			status: "error",
			error: "没有可用的更新源，请联系客服",
		});
		return;
	}

	isFallbackInProgress = true;

	let lastError: string | null = null;

	for (const source of sources) {
		try {
			log.info(`[Updater] 尝试源: "${source.name}" (${source.url})`);
			autoUpdater.setFeedURL(source.url);
			currentUpdateSource = source;

			const result = await autoUpdater.checkForUpdates();

			// 成功：update-available 或 update-not-available 事件已在上面处理
			isFallbackInProgress = false;
			return result;
		} catch (err: any) {
			log.info(`[Updater] 源 "${source.name}" 失败: ${err.message}`);
			lastError = err.message;
			// 继续尝试下一个源
		}
	}

	isFallbackInProgress = false;
	currentUpdateSource = null;

	// 所有源均失败
	win?.webContents.send("update-status", {
		status: "error",
		error: `所有更新源均不可用（共 ${sources.length} 个）\n${lastError || "未知错误"}`,
		sourceName: "无",
	});
}

// A. 检查更新（可以由前端触发，也可以启动时触发）
ipcMain.handle("check-for-update", () => {
	if (!app.isPackaged) return "dev-mode"; // 开发环境不检查
	return checkForUpdatesWithFallback();
});

// B. 开始下载
ipcMain.handle("start-download-update", () => {
	autoUpdater.downloadUpdate();
});

// C. 退出并安装
ipcMain.handle("quit-and-install", () => {
	autoUpdater.quitAndInstall();
});

// --- 错误日志 IPC 处理 ---
ipcMain.on("log-error", (_event, error: LogErrorData) => {
	writeErrorLog(error);
});

// 主进程未捕获异常
process.on("uncaughtException", async (err) => {
	console.error("[主进程未捕获异常]:", err);

	await writeErrorLog({
		type: "Runtime",
		message: err.message,
		stack: err.stack,
		additionalData: {
			process: "main",
			uncaught: true,
		},
	});
});

// 主进程未处理的 Promise 拒绝
process.on("unhandledRejection", async (reason) => {
	console.error("[主进程未处理的 Promise 拒绝]:", reason);

	const errMessage = reason instanceof Error ? reason.message : String(reason);

	await writeErrorLog({
		type: "Promise",
		message: errMessage,
		stack: reason instanceof Error ? reason.stack : undefined,
		additionalData: {
			process: "main",
			unhandledRejection: true,
		},
	});
});

// 记录控制台输出到文件
ipcMain.on("log-console", async (_event, data: { level: string; message: string; stack?: string }) => {
	const timestamp = formatLocalTime();
	const logEntry = `[${timestamp}] [Console.${data.level}] ${data.message}\n`;

	if (data.stack) {
		const lines = data.stack.split("\n");
		for (const line of lines) {
			await writeLogEntry(`  ${line}\n`, false);
		}
	}
});

// 记录网络请求错误
ipcMain.on("log-network", async (_event, data: { url: string; method: string; status?: number; error: string }) => {
	await writeErrorLog({
		type: "Network",
		message: data.error,
		url: data.url,
		method: data.method,
		status: data.status,
		additionalData: {
			process: "renderer",
		},
	});
});

// 打开日志文件夹
ipcMain.handle("open-logs-folder", async () => {
	const { shell } = require("electron");
	await shell.openPath(logsDir);
	return logsDir;
});
