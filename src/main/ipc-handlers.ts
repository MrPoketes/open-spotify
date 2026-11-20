import { app, ipcMain } from "electron"
import type { Effect } from "effect"
import type { AppInfo } from "../shared/app-info"
import { ipcChannels } from "../shared/ipc-channels"
import { getAccessTokenFromIpc, logInFromIpc, logOutFromIpc } from "./auth/spotify-session-ipc"
import type { Folders } from "./folders"
import { folderIpcOperations } from "./folders-ipc"
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
  ipcMain.handle(ipcChannels.logIn, () => mainRuntime.runPromise(logInFromIpc))
  ipcMain.handle(ipcChannels.getAccessToken, () => mainRuntime.runPromise(getAccessTokenFromIpc))
  ipcMain.handle(ipcChannels.logOut, () => mainRuntime.runPromise(logOutFromIpc))
  const folderOperations =
    Object.entries<(request: unknown) => Effect.Effect<unknown, unknown, Folders>>(
      folderIpcOperations,
    )
  for (const [channel, folderOperation] of folderOperations) {
    ipcMain.handle(channel, (_event, request: unknown) =>
      mainRuntime.runPromise(folderOperation(request)),
    )
  }
}
