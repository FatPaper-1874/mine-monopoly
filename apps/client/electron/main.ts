import { app, ipcMain, BrowserWindow, dialog, OpenDialogOptions, SaveDialogOptions, protocol, net } from "electron";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import path from "node:path";
import fs from "fs/promises";
import fsSync from "fs";
import url from "node:url";
import { autoUpdater } from "electron-updater";
import log from "electron-log";

// --------- 错误日志处理 ---------

interface LogErrorData {
	type: "Vue" | "Promise" | "Runtime";
	message: string;
	stack?: string;
	info?: string;
	filename?: string;
	lineno?: number;
	colno?: number;
}

// 日志目录：在可执行文件所在目录下（安装目录，可写）
const logsDir = path.join(path.dirname(app.getPath("exe")), "logs");

// 确保日志目录存在
async function ensureLogsDir() {
	try {
		await fs.mkdir(logsDir, { recursive: true });
	} catch (err) {
		console.error("Failed to create logs directory:", err);
	}
}

// 格式化日志条目
function formatLogEntry(error: LogErrorData): string {
	const now = new Date();
	const timestamp = now.toISOString().replace("T", " ").substring(0, 19);

	let log = `[${timestamp}] [${error.type}] ${error.message}\n`;

	if (error.stack) {
		log += `Stack: ${error.stack}\n`;
	}
	if (error.info) {
		log += `Info: ${error.info}\n`;
	}
	if (error.filename) {
		log += `File: ${error.filename}:${error.lineno}:${error.colno}\n`;
	}

	log += "-".repeat(80) + "\n";
	return log;
}

// 写入错误日志
async function writeErrorLog(error: LogErrorData): Promise<string | null> {
	const today = new Date().toISOString().substring(0, 10);
	const logFilePath = path.join(logsDir, `error-${today}.log`);

	const logEntry = formatLogEntry(error);

	try {
		await fs.appendFile(logFilePath, logEntry, "utf-8");
		return logFilePath;
	} catch (err) {
		console.error("Failed to write error log:", err);
		return null;
	}
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
			enableBlinkFeatures: "WebRTC",
			preload: path.join(__dirname, "preload.mjs"),
			devTools: isProduction ? false : true,
			webSecurity: false,
			// 允许自动播放音频，无需用户交互
			autoplayPolicy: "no-user-gesture-required",
		},
		frame: false,
	});

	if (!isProduction) win.webContents.openDevTools();

	win.webContents.on("did-finish-load", () => {
		win?.webContents.send("main-process-message", new Date().toLocaleString());
	});

	if (VITE_DEV_SERVER_URL) {
		win.loadURL(VITE_DEV_SERVER_URL);
	} else {
		// win.loadFile("./dist/index.html");
		win.loadFile(path.join(RENDERER_DIST, "frontend/index.html"));
	}

	win.on("enter-full-screen", () => {
		win!.webContents.send("fullscreen-changed", true);
	});

	win.on("leave-full-screen", () => {
		win!.webContents.send("fullscreen-changed", false);
	});

	autoUpdater.on("update-available", (info) => {
		win && win.webContents.send("update-status", { status: "available", info });
	});

	// 已经是最新
	autoUpdater.on("update-not-available", (info) => {
		win && win.webContents.send("update-status", { status: "not-available", info });
	});

	// 下载进度
	autoUpdater.on("download-progress", (progressObj) => {
		win && win.webContents.send("update-status", { status: "progress", progress: progressObj });
	});

	// 下载完成
	autoUpdater.on("update-downloaded", (info) => {
		win && win.webContents.send("update-status", { status: "downloaded", info });
	});

	// 错误
	autoUpdater.on("error", (err) => {
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

app.whenReady().then(async () => {
	protocol.handle("local", (request) => {
		const filePath = request.url.slice("local://".length);
		return net.fetch(url.pathToFileURL(path.join(__dirname, filePath)).toString());
	});

	await ensureLogsDir();
	createWindow();
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

const cacheDir = path.join(app.getAppPath(), "map-cache");
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

// A. 检查更新（可以由前端触发，也可以启动时触发）
ipcMain.handle("check-for-update", () => {
	if (!app.isPackaged) return "dev-mode"; // 开发环境不检查
	return autoUpdater.checkForUpdates();
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

// 打开日志文件夹
ipcMain.handle("open-logs-folder", async () => {
	const { shell } = require("electron");
	await shell.openPath(logsDir);
	return logsDir;
});
