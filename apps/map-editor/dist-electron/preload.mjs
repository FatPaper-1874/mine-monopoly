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
  //文件操作相关
  readFile: async (filePath) => electron.ipcRenderer.invoke("read-file", filePath),
  saveFile: async (filePath, data) => electron.ipcRenderer.invoke("write-file", filePath, data),
  saveLocalFile: async (filePath, data) => electron.ipcRenderer.invoke("write-local-file", filePath, data),
  copyFile: async (fromFilePath, toFilePath, newFileName) => electron.ipcRenderer.invoke("copy-file", fromFilePath, toFilePath, newFileName),
  clearTempDir: async () => electron.ipcRenderer.invoke("clear-temp-dir"),
  //自定义文件操作
  showOpenDialog: async (options) => electron.ipcRenderer.invoke("open-load-dialog", options),
  showSaveDialog: async (options) => electron.ipcRenderer.invoke("open-save-dialog", options),
  getVersion: () => version,
  getImageBase64: async (filePath) => electron.ipcRenderer.invoke("get-image-base64", filePath)
});
