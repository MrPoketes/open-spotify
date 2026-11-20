import { contextBridge, ipcRenderer } from "electron"
import type { DesktopApi } from "./desktop-api"

const desktopApi: DesktopApi = {
  invoke: (channel, request) => ipcRenderer.invoke(channel, request),
}

contextBridge.exposeInMainWorld("desktop", desktopApi)
