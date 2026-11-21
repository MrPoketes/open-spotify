import { Schema } from "effect"
import {
  AddFolderItemRequest,
  CreateFolderRequest,
  DeleteFolderRequest,
  type Folder,
  type FolderEntry,
  type FolderTree,
  RemoveFolderItemRequest,
  RenameFolderRequest,
} from "../../shared/folders"
import { type IpcChannel, ipcChannels } from "../../shared/ipc-channels"

type FolderChange = (folder: Folder) => Folder

const succeeded = (value: unknown) => ({ _tag: "IpcSucceeded", value })

const withEntries = (folder: Folder, entries: ReadonlyArray<FolderEntry>): Folder => ({
  _tag: "Folder",
  id: folder.id,
  name: folder.name,
  entries,
})

const folderNotFound = (folderId: string) => ({
  _tag: "IpcFailed",
  error: { _tag: "FolderNotFound", folderId },
})

const holdsFolder = (entries: ReadonlyArray<FolderEntry>, folderId: string): boolean =>
  entries.some(
    (entry) =>
      entry._tag === "Folder" && (entry.id === folderId || holdsFolder(entry.entries, folderId)),
  )

const changeFolder = (folder: Folder, folderId: string, change: FolderChange): Folder => {
  const changed = withEntries(
    folder,
    folder.entries.map((entry) =>
      entry._tag === "Folder" ? changeFolder(entry, folderId, change) : entry,
    ),
  )
  return folder.id === folderId ? change(changed) : changed
}

const withoutFolder = (entries: ReadonlyArray<FolderEntry>, folderId: string) =>
  entries.flatMap((entry): ReadonlyArray<FolderEntry> => {
    if (entry._tag !== "Folder") return [entry]
    if (entry.id === folderId) return []
    return [withEntries(entry, withoutFolder(entry.entries, folderId))]
  })

// Answers the folder channels from a tree kept in memory, decoding requests
// with the same Schemas as the real main process. Like the real one, it adds
// an item to a folder at most once, deletes a folder with everything inside
// it, and fails with FolderNotFound for a folder the tree does not hold.
export const fakeFolderChannels = (
  initialTree: FolderTree,
): Partial<Record<IpcChannel, (request: unknown) => unknown>> => {
  let tree = initialTree
  const changeTree = (folderId: string, change: FolderChange) => {
    if (!holdsFolder(tree, folderId)) return folderNotFound(folderId)
    tree = tree.map((folder) => changeFolder(folder, folderId, change))
    return succeeded(undefined)
  }

  return {
    [ipcChannels.getFolderTree]: () => tree,
    [ipcChannels.createFolder]: (request) => {
      const { name, parentFolderId } = Schema.decodeUnknownSync(CreateFolderRequest)(request)
      const created: Folder = { _tag: "Folder", id: crypto.randomUUID(), name, entries: [] }
      if (parentFolderId === null) {
        tree = [...tree, created]
        return succeeded(created.id)
      }
      const reply = changeTree(parentFolderId, (parent) =>
        withEntries(parent, [...parent.entries, created]),
      )
      return reply._tag === "IpcSucceeded" ? succeeded(created.id) : reply
    },
    [ipcChannels.renameFolder]: (request) => {
      const { folderId, name } = Schema.decodeUnknownSync(RenameFolderRequest)(request)
      return changeTree(folderId, (folder) => ({
        _tag: "Folder",
        id: folder.id,
        name,
        entries: folder.entries,
      }))
    },
    [ipcChannels.deleteFolder]: (request) => {
      const { folderId } = Schema.decodeUnknownSync(DeleteFolderRequest)(request)
      if (!holdsFolder(tree, folderId)) return folderNotFound(folderId)
      tree = tree
        .filter((folder) => folder.id !== folderId)
        .map((folder) => withEntries(folder, withoutFolder(folder.entries, folderId)))
      return succeeded(undefined)
    },
    [ipcChannels.addFolderItem]: (request) => {
      const { folderId, item } = Schema.decodeUnknownSync(AddFolderItemRequest)(request)
      return changeTree(folderId, (folder) =>
        folder.entries.some((entry) => entry._tag === "SpotifyItem" && entry.uri === item.uri)
          ? folder
          : withEntries(folder, [...folder.entries, item]),
      )
    },
    [ipcChannels.removeFolderItem]: (request) => {
      const { folderId, uri } = Schema.decodeUnknownSync(RemoveFolderItemRequest)(request)
      return changeTree(folderId, (folder) =>
        withEntries(
          folder,
          folder.entries.filter((entry) => entry._tag === "Folder" || entry.uri !== uri),
        ),
      )
    },
  }
}
