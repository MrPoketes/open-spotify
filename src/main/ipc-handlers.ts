import { app, ipcMain } from "electron"
import type { AppInfo } from "../shared/app-info"
import { ipcChannels } from "../shared/ipc-channels"
import { mainRuntime } from "./main-runtime"
import { getSettingFromIpc, setSettingFromIpc } from "./settings-ipc"

export function registerIpcHandlers(): void {
  ipcMain.handle(ipcChannels.getAppInfo, (): AppInfo => ({
    name: app.getName(),
    version: app.getVersion(),
    platform: process.platform,
  }))
  ipcMain.handle(ipcChannels.getSetting, (_event, request: unknown) =>
    mainRuntime.runPromise(getSettingFromIpc(request)),
  )
  ipcMain.handle(ipcChannels.setSetting, (_event, request: unknown) =>
    mainRuntime.runPromise(setSettingFromIpc(request)),
  )
}
