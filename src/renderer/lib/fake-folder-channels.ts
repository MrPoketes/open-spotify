import { Schema } from "effect"
import {
  AddFolderItemRequest,
  CreateFolderRequest,
  type Folder,
  type FolderEntry,
  type FolderTree,
  RemoveFolderItemRequest,
} from "../../shared/folders"
import { type IpcChannel, ipcChannels } from "../../shared/ipc-channels"

type EntriesChange = (entries: ReadonlyArray<FolderEntry>) => ReadonlyArray<FolderEntry>

const changeEntries = (folder: Folder, folderId: string, change: EntriesChange): Folder => {
  const entries = folder.entries.map((entry) =>
    entry._tag === "Folder" ? changeEntries(entry, folderId, change) : entry,
  )
  return {
    _tag: "Folder",
    id: folder.id,
    name: folder.name,
    entries: folder.id === folderId ? change(entries) : entries,
  }
}

// Answers the folder channels from a tree kept in memory, decoding requests
// with the same Schemas as the real main process. Like the real one, it adds
// an item to a folder at most once.
export const fakeFolderChannels = (
  initialTree: FolderTree,
): Partial<Record<IpcChannel, (request: unknown) => unknown>> => {
  let tree = initialTree
  const changeTree = (folderId: string, change: EntriesChange) => {
    tree = tree.map((folder) => changeEntries(folder, folderId, change))
  }

  return {
    [ipcChannels.getFolderTree]: () => tree,
    [ipcChannels.createFolder]: (request) => {
      const { name, parentFolderId } = Schema.decodeUnknownSync(CreateFolderRequest)(request)
      const folder: Folder = { _tag: "Folder", id: crypto.randomUUID(), name, entries: [] }
      if (parentFolderId === null) {
        tree = [...tree, folder]
      } else {
        changeTree(parentFolderId, (entries) => [...entries, folder])
      }
      return folder.id
    },
    [ipcChannels.addFolderItem]: (request) => {
      const { folderId, item } = Schema.decodeUnknownSync(AddFolderItemRequest)(request)
      changeTree(folderId, (entries) =>
        entries.some((entry) => entry._tag === "SpotifyItem" && entry.uri === item.uri)
          ? entries
          : [...entries, item],
      )
    },
    [ipcChannels.removeFolderItem]: (request) => {
      const { folderId, uri } = Schema.decodeUnknownSync(RemoveFolderItemRequest)(request)
      changeTree(folderId, (entries) =>
        entries.filter((entry) => entry._tag === "Folder" || entry.uri !== uri),
      )
    },
  }
}
