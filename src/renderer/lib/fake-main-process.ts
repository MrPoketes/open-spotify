import { Schema } from "effect"
import type { DesktopApi } from "../../preload/desktop-api"
import type { FolderTree } from "../../shared/folders"
import { type IpcChannel, ipcChannels } from "../../shared/ipc-channels"
import { GetSettingRequest, SetSettingRequest } from "../../shared/settings"
import { SpotifyFailureLog } from "../../shared/spotify-failure-log"
import { Theme } from "../../shared/theme"
import type { ExportThemeReply, ImportThemeReply } from "../../shared/theme-file-replies"
import { ImportedThemeId, type LibraryTheme } from "../../shared/theme-library"
import { fakeFolderChannels } from "./fake-folder-channels"

// The theme file channels reply as if the user had answered their dialogs.
// Both default to the user canceling.
interface FakeMainProcessOptions {
  readonly environmentClientId?: string
  readonly folderTree?: FolderTree
  readonly importedThemes?: ReadonlyArray<LibraryTheme>
  readonly importThemeReply?: typeof ImportThemeReply.Encoded
  readonly exportThemeReply?: typeof ExportThemeReply.Encoded
}

// Stands in for the main process in renderer tests. It decodes settings,
// theme, and folder requests with the same Schemas as the real one, and keeps
// settings, imported and edited themes, and folders in memory, starting from
// the given imported themes and folder tree, and serves the given
// OPEN_SPOTIFY_CLIENT_ID.
export const fakeMainProcess = ({
  environmentClientId,
  folderTree = [],
  importedThemes: storedImportedThemes = [],
  importThemeReply = { _tag: "ThemeImportCanceled" },
  exportThemeReply = null,
}: FakeMainProcessOptions = {}): DesktopApi => {
  const storedSettings = new Map<string, unknown>()
  const importedThemes = new Map<string, unknown>(
    storedImportedThemes.map((libraryTheme) => [libraryTheme.id, libraryTheme]),
  )
  const answerByChannel: Partial<Record<IpcChannel, (request: unknown) => unknown>> = {
    [ipcChannels.getSetting]: (request) => {
      const { key } = Schema.decodeUnknownSync(GetSettingRequest)(request)
      return { _tag: "IpcSucceeded", value: storedSettings.get(key) ?? null }
    },
    [ipcChannels.setSetting]: (request) => {
      const { key, value } = Schema.decodeUnknownSync(SetSettingRequest)(request)
      storedSettings.set(key, value)
      return { _tag: "IpcSucceeded", value: undefined }
    },
    [ipcChannels.getEnvironmentClientId]: () => environmentClientId ?? null,
    ...fakeFolderChannels(folderTree),
    [ipcChannels.listImportedThemes]: () => [...importedThemes.values()],
    [ipcChannels.importThemeFile]: () => {
      // Like the real main process, a theme imported again replaces its row.
      if (importThemeReply._tag === "ThemeImported") {
        importedThemes.set(importThemeReply.importedTheme.id, importThemeReply.importedTheme)
      }
      return importThemeReply
    },
    [ipcChannels.saveEditedTheme]: (request) => {
      const importedTheme = {
        id: crypto.randomUUID(),
        theme: Schema.decodeUnknownSync(Theme)(request),
      }
      importedThemes.set(importedTheme.id, importedTheme)
      return { _tag: "ThemeImported", importedTheme }
    },
    [ipcChannels.deleteImportedTheme]: (request) => {
      importedThemes.delete(Schema.decodeUnknownSync(ImportedThemeId)(request))
    },
    [ipcChannels.exportCurrentTheme]: () => exportThemeReply,
    [ipcChannels.logSpotifyFailure]: (request) => {
      Schema.decodeUnknownSync(SpotifyFailureLog)(request)
    },
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
