import { app, ipcMain, BrowserWindow, dialog, OpenDialogOptions, SaveDialogOptions, protocol, net } from "electron";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { readFile, writeFile, copyFile, mkdir } from "fs/promises";
import path from "node:path";
import fs from "node:fs";
import url from "node:url";
import { autoUpdater } from "electron-updater";
import log from "electron-log";

autoUpdater.logger = log;
autoUpdater.autoDownload = false; // 关键：设为 false，防止游戏过程中自动抢网速
autoUpdater.autoInstallOnAppQuit = true; // 退出时自动安装

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

process.env.APP_ROOT = path.join(__dirname, "..");

export const VITE_DEV_SERVER_URL = process.env["VITE_DEV_SERVER_URL"];
export const MAIN_DIST = path.join(process.env.APP_ROOT, "dist-electron");
export const RENDERER_DIST = path.join(process.env.APP_ROOT, "dist");

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, "public") : RENDERER_DIST;

let win: BrowserWindow | null;

function createWindow() {
	win = new BrowserWindow({
		width: 1200,
		height: 860,
		webPreferences: {
			nodeIntegration: true,
			nodeIntegrationInWorker: false,
			preload: path.join(__dirname, "preload.mjs"),
			devTools: true,
			webSecurity: false,
			zoomFactor: 1.0,
		},
		frame: false,
	});

	win.webContents.on("did-finish-load", () => {
		win?.webContents.send("main-process-message", new Date().toLocaleString());
	});

	if (VITE_DEV_SERVER_URL) {
		win.loadURL(VITE_DEV_SERVER_URL);
	} else {
		// win.loadFile("./dist/index.html");
		win.loadFile(path.join(RENDERER_DIST, "frontend/index.html"));
	}

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

	win.webContents.openDevTools();
}

app.on("window-all-closed", () => {
	if (process.platform !== "darwin") {
		cleanTempDir();
		app.quit();
		win = null;
	}
});

app.on("activate", () => {
	if (BrowserWindow.getAllWindows().length === 0) {
		createWindow();
	}
});

app.whenReady().then(() => {
	protocol.handle("local", (request) => {
		const filePath = request.url.slice("local://".length);
		console.log("🚀 ~ filePath:", filePath);
		return net.fetch(url.pathToFileURL(path.join(__dirname, filePath)).toString());
	});
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

// ipcMain.on("window-unmaximize", () => {
// 	if (win) win.unmaximize();
// });

ipcMain.on("window-close", () => {
	if (win) win.close();
});

ipcMain.handle("window-is-maximized", () => {
	return win ? win.isMaximized() : false;
});

ipcMain.handle("read-file", async (event, path: string) => {
	return await readFile(path);
});

ipcMain.handle("write-file", async (event, targetPath: string, data: string) => {
	await writeFile(targetPath, data);
	return targetPath;
});

ipcMain.handle("write-local-file", async (event, targetPath: string, data: Uint8Array) => {
	const finalPath = path.isAbsolute(targetPath) ? targetPath : path.join(process.cwd(), targetPath);
	const dir = path.dirname(finalPath);
	await mkdir(dir, { recursive: true });
	await writeFile(finalPath, data);
	return finalPath;
});

ipcMain.handle("copy-file", async (event, fromFilePath: string, toFilePathtoFilePath: string, newFileName: string) => {
	if (!toFilePathtoFilePath) {
		toFilePathtoFilePath = path.join(process.cwd(), "temp");
		fs.mkdirSync(toFilePathtoFilePath, { recursive: true }); // 如果目录不存在则创建
	}

	const fileType = path.extname(fromFilePath);
	const newFilePath = path.join(toFilePathtoFilePath, newFileName + fileType);

	fs.copyFileSync(fromFilePath, newFilePath);

	return { filePath: newFilePath, fileType: fileType.slice(1) };
});

ipcMain.handle("get-image-base64", async (event, filePath) => {
	const fileContent = await readFile(filePath);
	return fileContent.toString("base64");
});

ipcMain.handle("clear-temp-dir", async (event) => {
	await cleanTempDir();
});

ipcMain.handle("open-load-dialog", async (event, options: OpenDialogOptions) => {
	return await dialog.showOpenDialog(options);
});

ipcMain.handle("open-save-dialog", async (event, options: SaveDialogOptions) => {
	return await dialog.showSaveDialog(options);
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

app.whenReady().then(createWindow);

export async function cleanTempDir() {
	const tempDir = path.join(process.cwd(), "temp");

	try {
		// 1. 检查目录是否存在
		await fs.accessSync(tempDir);

		// 2. 读取目录内容
		const files = await fs.readdirSync(tempDir);

		// 3. 并行删除所有文件和子目录
		await Promise.all(
			files.map(async (file) => {
				const filePath = path.join(tempDir, file);
				const stats = await fs.statSync(filePath);

				if (stats.isDirectory()) {
					await fs.rmSync(filePath, { recursive: true }); // 删除子目录
				} else {
					await fs.unlinkSync(filePath); // 删除文件
				}
			})
		);

		console.log(`已清空临时目录: ${tempDir}`);
	} catch (error: any) {
		if (error.code === "ENOENT") {
			console.log("临时目录不存在，无需清理");
		} else {
			console.error("清理临时目录失败:", error);
		}
	}
}
