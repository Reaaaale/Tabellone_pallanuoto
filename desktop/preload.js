const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  openDisplay: () => ipcRenderer.send("open-display"),
});
