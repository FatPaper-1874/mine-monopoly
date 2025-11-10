"use strict";
const electron = require("electron");
const version = "1.0.0";
electron.contextBridge.exposeInMainWorld("electronAPI", {
  //窗口事件相关
  minimize: () => electron.ipcRenderer.send("window-minimize"),
  isMaximized: () => electron.ipcRenderer.invoke("window-is-maximized"),
  maximize: () => electron.ipcRenderer.send("window-maximize"),
  unmaximize: () => electron.ipcRenderer.send("window-unmaximize"),
  close: () => electron.ipcRenderer.send("window-close"),
  getVersion: () => version,
  onFullScreenChange: (callback) => electron.ipcRenderer.on("fullscreen-changed", (_, isFull) => callback(isFull))
});
electron.contextBridge.exposeInMainWorld("mapCacheLoader", {
  async save(mapId, hash, arrayBuffer) {
    await electron.ipcRenderer.invoke("map-cache:save", mapId, hash, arrayBuffer);
  },
  async load(mapId, hash) {
    const buffer = await electron.ipcRenderer.invoke("map-cache:load", mapId, hash);
    if (buffer) {
      return buffer;
    }
    return void 0;
  }
});
