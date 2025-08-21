import {
	ipcRenderer,
	contextBridge,
	OpenDialogOptions,
	SaveDialogOptions,
	OpenDialogReturnValue,
	SaveDialogReturnValue,
} from "electron";
import { version } from "../package.json";

// --------- Expose some API to the Renderer process ---------
contextBridge.exposeInMainWorld("electronAPI", {
	//窗口事件相关
	minimize: () => ipcRenderer.send("window-minimize"),
	isMaximized: () => ipcRenderer.invoke("window-is-maximized"),
	maximize: () => ipcRenderer.send("window-maximize"),
	unmaximize: () => ipcRenderer.send("window-unmaximize"),
	close: () => ipcRenderer.send("window-close"),

	//文件操作相关
	readFile: async (filePath: string) => ipcRenderer.invoke("read-file", filePath),
	saveFile: async (filePath: string, data: string): Promise<string> => ipcRenderer.invoke("write-file", filePath, data),
	saveLocalFile: async (filePath: string, data: string): Promise<string> =>
		ipcRenderer.invoke("write-local-file", filePath, data),
	copyFile: async (fromFilePath: string, toFilePath: string, newFileName: string) =>
		ipcRenderer.invoke("copy-file", fromFilePath, toFilePath, newFileName),
	clearTempDir: async () => ipcRenderer.invoke("clear-temp-dir"),

	//自定义文件操作
	showOpenDialog: async (options: OpenDialogOptions): Promise<OpenDialogReturnValue> =>
		ipcRenderer.invoke("open-load-dialog", options),
	showSaveDialog: async (options: SaveDialogOptions): Promise<SaveDialogReturnValue> =>
		ipcRenderer.invoke("open-save-dialog", options),

	getVersion: () => version,
	getImageBase64: async (filePath: string): Promise<string> => ipcRenderer.invoke("get-image-base64", filePath),
});
