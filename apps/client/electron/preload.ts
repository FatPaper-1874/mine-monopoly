import { ipcRenderer, contextBridge } from "electron";
import { version } from "../package.json";

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
