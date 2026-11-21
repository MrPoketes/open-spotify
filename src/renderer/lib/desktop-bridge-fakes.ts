import { Effect, Layer } from "effect"
import type { DesktopApi } from "../../preload/desktop-api"
import type { SettingKey } from "../../shared/settings"
import { DesktopBridge } from "./desktop-bridge"

export const desktopBridgeOver = (mainProcess: DesktopApi) =>
  Layer.succeed(DesktopBridge)(DesktopBridge.make(mainProcess))

// Reads what the main process stored the way the renderer would, so a test
// checks the setting the next launch will see.
export const readSavedSetting = <K extends SettingKey>(mainProcess: DesktopApi, key: K) =>
  Effect.runPromise(DesktopBridge.make(mainProcess).getSetting(key))

export const readImportedThemes = (mainProcess: DesktopApi) =>
  Effect.runPromise(DesktopBridge.make(mainProcess).listImportedThemes)
