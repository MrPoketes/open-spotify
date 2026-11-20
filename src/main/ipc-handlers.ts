import { BrowserWindow, app, ipcMain } from "electron"
import type { Effect } from "effect"
import type { AppInfo } from "../shared/app-info"
import { ipcChannels } from "../shared/ipc-channels"
import {
  cancelLogInFromIpc,
  getAccessTokenFromIpc,
  logInFromIpc,
  logOutFromIpc,
} from "./auth/spotify-session-ipc"
import type { Folders } from "./folders"
import { exportFoldersFromIpc, importFoldersFromIpc } from "./folders-file-ipc"
import { folderIpcOperations } from "./folders-ipc"
import { mainRuntime } from "./main-runtime"
import { getSettingFromIpc, setSettingFromIpc } from "./settings-ipc"
import {
  exportCurrentThemeFromIpc,
  importThemeFileFromIpc,
  listImportedThemesFromIpc,
} from "./themes-ipc"

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
  // Lets developers skip pasting their Client ID on every fresh profile. The
  // renderer cannot read the environment itself.
  ipcMain.handle(
    ipcChannels.getEnvironmentClientId,
    () => process.env["OPEN_SPOTIFY_CLIENT_ID"] || null,
  )
  ipcMain.handle(ipcChannels.logIn, () => mainRuntime.runPromise(logInFromIpc))
  ipcMain.handle(ipcChannels.cancelLogIn, () => mainRuntime.runPromise(cancelLogInFromIpc))
  ipcMain.handle(ipcChannels.getAccessToken, () => mainRuntime.runPromise(getAccessTokenFromIpc))
  ipcMain.handle(ipcChannels.logOut, () => mainRuntime.runPromise(logOutFromIpc))
  ipcMain.handle(ipcChannels.listImportedThemes, () =>
    mainRuntime.runPromise(listImportedThemesFromIpc),
  )
  ipcMain.handle(ipcChannels.importThemeFile, () => mainRuntime.runPromise(importThemeFileFromIpc))
  ipcMain.handle(ipcChannels.exportCurrentTheme, () =>
    mainRuntime.runPromise(exportCurrentThemeFromIpc),
  )
  ipcMain.handle(ipcChannels.exportFolders, (event) =>
    mainRuntime.runPromise(exportFoldersFromIpc(BrowserWindow.fromWebContents(event.sender))),
  )
  ipcMain.handle(ipcChannels.importFolders, (event) =>
    mainRuntime.runPromise(importFoldersFromIpc(BrowserWindow.fromWebContents(event.sender))),
  )
  // Each operation returns its own reply type. Widening them to one function
  // type lets TypeScript call any of them in this loop.
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
