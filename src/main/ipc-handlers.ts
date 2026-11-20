import { app, ipcMain } from "electron"
import type { AppInfo } from "../shared/app-info"
import { ipcChannels } from "../shared/ipc-channels"

export function registerIpcHandlers(): void {
  ipcMain.handle(ipcChannels.getAppInfo, (): AppInfo => ({
    name: app.getName(),
    version: app.getVersion(),
    platform: process.platform,
  }))
}
