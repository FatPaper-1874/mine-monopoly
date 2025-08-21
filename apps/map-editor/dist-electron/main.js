import { app, BrowserWindow, protocol, net, ipcMain, dialog } from "electron";
import { createRequire } from "node:module";
import url, { fileURLToPath } from "node:url";
import { readFile, writeFile } from "fs/promises";
import path from "node:path";
import fs from "node:fs";
createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
process.env.APP_ROOT = path.join(__dirname, "..");
const VITE_DEV_SERVER_URL = process.env["VITE_DEV_SERVER_URL"];
const MAIN_DIST = path.join(process.env.APP_ROOT, "dist-electron");
const RENDERER_DIST = path.join(process.env.APP_ROOT, "dist");
process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, "public") : RENDERER_DIST;
let win;
function createWindow() {
  win = new BrowserWindow({
    width: 1200,
    height: 860,
    webPreferences: {
      nodeIntegration: true,
      nodeIntegrationInWorker: false,
      preload: path.join(__dirname, "preload.mjs"),
      devTools: true,
      webSecurity: false
    },
    frame: false
  });
  win.webContents.on("did-finish-load", () => {
    win == null ? void 0 : win.webContents.send("main-process-message", new Date().toLocaleString());
  });
  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL);
  } else {
    win.loadFile(path.join(RENDERER_DIST, "frontend/index.html"));
  }
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
  if (win)
    win.minimize();
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
  if (win)
    win.close();
});
ipcMain.handle("window-is-maximized", () => {
  return win ? win.isMaximized() : false;
});
ipcMain.handle("read-file", async (event, path2) => {
  return await readFile(path2);
});
ipcMain.handle("write-file", async (event, targetPath, data) => {
  await writeFile(targetPath, data);
  return targetPath;
});
ipcMain.handle("write-local-file", async (event, targetPath, data) => {
  targetPath = path.join(process.cwd(), targetPath);
  await writeFile(targetPath, data);
  return targetPath;
});
ipcMain.handle("copy-file", async (event, fromFilePath, toFilePathtoFilePath, newFileName) => {
  if (!toFilePathtoFilePath) {
    toFilePathtoFilePath = path.join(process.cwd(), "temp");
    fs.mkdirSync(toFilePathtoFilePath, { recursive: true });
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
ipcMain.handle("open-load-dialog", async (event, options) => {
  return await dialog.showOpenDialog(options);
});
ipcMain.handle("open-save-dialog", async (event, options) => {
  return await dialog.showSaveDialog(options);
});
app.whenReady().then(createWindow);
async function cleanTempDir() {
  const tempDir = path.join(process.cwd(), "temp");
  try {
    await fs.accessSync(tempDir);
    const files = await fs.readdirSync(tempDir);
    await Promise.all(
      files.map(async (file) => {
        const filePath = path.join(tempDir, file);
        const stats = await fs.statSync(filePath);
        if (stats.isDirectory()) {
          await fs.rmSync(filePath, { recursive: true });
        } else {
          await fs.unlinkSync(filePath);
        }
      })
    );
    console.log(`已清空临时目录: ${tempDir}`);
  } catch (error) {
    if (error.code === "ENOENT") {
      console.log("临时目录不存在，无需清理");
    } else {
      console.error("清理临时目录失败:", error);
    }
  }
}
export {
  MAIN_DIST,
  RENDERER_DIST,
  VITE_DEV_SERVER_URL,
  cleanTempDir
};
