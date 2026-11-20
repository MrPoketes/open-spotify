import { contextBridge, ipcRenderer } from "electron"
import type { DesktopApi } from "./desktop-api"

const desktopApi: DesktopApi = {
  invoke: (channel) => ipcRenderer.invoke(channel),
}

contextBridge.exposeInMainWorld("desktop", desktopApi)
