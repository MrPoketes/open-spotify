import { Schema } from "effect"
import type { DesktopApi } from "../../preload/desktop-api"
import { type IpcChannel, ipcChannels } from "../../shared/ipc-channels"
import { GetSettingRequest, SetSettingRequest } from "../../shared/settings"
import type { ExportThemeReply, ImportThemeReply } from "../../shared/theme-file-replies"

// What the theme file channels reply, as if the user had answered their
// dialogs. Both default to the user canceling.
interface FakeMainProcessOptions {
  readonly importThemeReply?: typeof ImportThemeReply.Encoded
  readonly exportThemeReply?: typeof ExportThemeReply.Encoded
}

// Stands in for the main process in renderer tests. It decodes settings
// requests with the same Schemas as the real one and keeps settings and
// imported themes in memory.
export const fakeMainProcess = ({
  importThemeReply = { _tag: "ThemeImportCanceled" },
  exportThemeReply = null,
}: FakeMainProcessOptions = {}): DesktopApi => {
  const storedSettings = new Map<string, unknown>()
  const importedThemes = new Map<string, unknown>()
  const answerByChannel: Partial<Record<IpcChannel, (request: unknown) => unknown>> = {
    [ipcChannels.getSetting]: (request) => {
      const { key } = Schema.decodeUnknownSync(GetSettingRequest)(request)
      return storedSettings.get(key) ?? null
    },
    [ipcChannels.setSetting]: (request) => {
      const { key, value } = Schema.decodeUnknownSync(SetSettingRequest)(request)
      storedSettings.set(key, value)
    },
    [ipcChannels.listImportedThemes]: () => [...importedThemes.values()],
    [ipcChannels.importThemeFile]: () => {
      // Like the real main process, a theme imported again replaces its row.
      if (importThemeReply._tag === "ThemeImported") {
        importedThemes.set(importThemeReply.importedTheme.id, importThemeReply.importedTheme)
      }
      return importThemeReply
    },
    [ipcChannels.exportCurrentTheme]: () => exportThemeReply,
  }
  return {
    invoke: (channel, request) => {
      const answer = answerByChannel[channel]
      if (answer === undefined) {
        return Promise.reject(new Error(`The fake main process does not handle ${channel}`))
      }
      return Promise.resolve(answer(request))
    },
  }
}
