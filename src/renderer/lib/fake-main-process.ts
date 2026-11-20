import { Schema } from "effect"
import type { DesktopApi } from "../../preload/desktop-api"
import { type IpcChannel, ipcChannels } from "../../shared/ipc-channels"
import { GetSettingRequest, SetSettingRequest } from "../../shared/settings"
import type { ImportThemeReply } from "../../shared/theme-file-replies"

interface FakeMainProcessOptions {
  // What importing a theme file replies, as if the user had chosen that file.
  readonly importThemeReply?: typeof ImportThemeReply.Encoded
}

// Stands in for the main process in renderer tests. It decodes settings
// requests with the same Schemas as the real one and keeps settings and
// imported themes in memory.
export const fakeMainProcess = ({
  importThemeReply = { _tag: "ThemeImportCanceled" },
}: FakeMainProcessOptions = {}): DesktopApi => {
  const storedSettings = new Map<string, unknown>()
  const importedThemes: Array<unknown> = []
  const replies: Partial<Record<IpcChannel, (request: unknown) => unknown>> = {
    [ipcChannels.getSetting]: (request) => {
      const { key } = Schema.decodeUnknownSync(GetSettingRequest)(request)
      return storedSettings.get(key) ?? null
    },
    [ipcChannels.setSetting]: (request) => {
      const { key, value } = Schema.decodeUnknownSync(SetSettingRequest)(request)
      storedSettings.set(key, value)
    },
    [ipcChannels.listImportedThemes]: () => importedThemes,
    [ipcChannels.importThemeFile]: () => {
      if (importThemeReply._tag === "ThemeImported") {
        importedThemes.push(importThemeReply.importedTheme)
      }
      return importThemeReply
    },
  }
  return {
    invoke: (channel, request) => {
      const reply = replies[channel]
      if (reply === undefined) {
        return Promise.reject(new Error(`The fake main process does not handle ${channel}`))
      }
      return Promise.resolve(reply(request))
    },
  }
}
