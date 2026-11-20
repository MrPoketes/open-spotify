import { Schema } from "effect"
import type { DesktopApi } from "../../preload/desktop-api"
import type { FolderTree } from "../../shared/folders"
import { ipcChannels } from "../../shared/ipc-channels"
import { GetSettingRequest, SetSettingRequest } from "../../shared/settings"

// Stands in for the main process in renderer tests. It decodes settings
// requests with the same Schemas as the real one and keeps the values in
// memory, and it serves the given folder tree.
export const fakeMainProcess = (folderTree: FolderTree = []): DesktopApi => {
  const storedSettings = new Map<string, unknown>()
  return {
    invoke: (channel, request) => {
      if (channel === ipcChannels.getFolderTree) {
        return Promise.resolve(folderTree)
      }
      if (channel === ipcChannels.setSetting) {
        const { key, value } = Schema.decodeUnknownSync(SetSettingRequest)(request)
        storedSettings.set(key, value)
        return Promise.resolve(undefined)
      }
      const { key } = Schema.decodeUnknownSync(GetSettingRequest)(request)
      return Promise.resolve(storedSettings.get(key) ?? null)
    },
  }
}
