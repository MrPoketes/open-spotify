import { Schema } from "effect"
import {
  AddFolderItemRequest,
  CreateFolderRequest,
  DeleteFolderRequest,
  type Folder,
  type FolderEntry,
  type FolderTree,
  MoveFolderItemRequest,
  MoveFolderRequest,
  RemoveFolderItemRequest,
  RenameFolderRequest,
} from "../../shared/folders"
import { type IpcChannel, ipcChannels } from "../../shared/ipc-channels"
import { locateFolder } from "../features/folders/folder-location"

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

const withoutItem = (folder: Folder, uri: string) =>
  withEntries(
    folder,
    folder.entries.filter((entry) => entry._tag === "Folder" || entry.uri !== uri),
  )

// The tree the fake channels share, kept in memory.
const makeFolderStore = (initialTree: FolderTree) => {
  let tree = initialTree
  return {
    read: () => tree,
    replace: (newTree: FolderTree) => {
      tree = newTree
    },
    changeFolder: (folderId: string, change: FolderChange) => {
      if (!holdsFolder(tree, folderId)) return folderNotFound(folderId)
      tree = tree.map((folder) => changeFolder(folder, folderId, change))
      return succeeded(undefined)
    },
    withoutFolder: (folderId: string) =>
      tree
        .filter((folder) => folder.id !== folderId)
        .map((folder) => withEntries(folder, withoutFolder(folder.entries, folderId))),
  }
}

type FolderStore = ReturnType<typeof makeFolderStore>

// Like the real main process, puts a moved entry at its position among the
// new parent's other entries.
const moveChannels = (store: FolderStore) => ({
  [ipcChannels.moveFolder]: (request: unknown) => {
    const { folderId, parentFolderId, position } =
      Schema.decodeUnknownSync(MoveFolderRequest)(request)
    const moved = locateFolder(store.read(), folderId)?.folder
    if (moved === undefined) return folderNotFound(folderId)
    if (parentFolderId === null) {
      store.replace(store.withoutFolder(folderId).toSpliced(position, 0, moved))
      return succeeded(undefined)
    }
    if (!holdsFolder(store.read(), parentFolderId)) return folderNotFound(parentFolderId)
    store.replace(store.withoutFolder(folderId))
    return store.changeFolder(parentFolderId, (parent) =>
      withEntries(parent, parent.entries.toSpliced(position, 0, moved)),
    )
  },
  [ipcChannels.moveFolderItem]: (request: unknown) => {
    const { folderId, uri, targetFolderId, position } =
      Schema.decodeUnknownSync(MoveFolderItemRequest)(request)
    const item = locateFolder(store.read(), folderId)?.folder.entries.find(
      (entry) => entry._tag === "SpotifyItem" && entry.uri === uri,
    )
    if (item === undefined) {
      return { _tag: "IpcFailed", error: { _tag: "FolderItemNotFound", folderId, uri } }
    }
    if (!holdsFolder(store.read(), targetFolderId)) return folderNotFound(targetFolderId)
    store.changeFolder(folderId, (folder) => withoutItem(folder, uri))
    // The target keeps a single copy of the item.
    return store.changeFolder(targetFolderId, (target) =>
      withEntries(target, withoutItem(target, uri).entries.toSpliced(position, 0, item)),
    )
  },
})

// Answers the folder channels from a tree kept in memory, decoding requests
// with the same Schemas as the real main process. Like the real one, it adds
// an item to a folder at most once, deletes a folder with everything inside
// it, and fails with FolderNotFound for a folder the tree does not hold.
export const fakeFolderChannels = (
  initialTree: FolderTree,
): Partial<Record<IpcChannel, (request: unknown) => unknown>> => {
  const store = makeFolderStore(initialTree)

  return {
    [ipcChannels.getFolderTree]: () => store.read(),
    [ipcChannels.createFolder]: (request) => {
      const { name, parentFolderId } = Schema.decodeUnknownSync(CreateFolderRequest)(request)
      const created: Folder = { _tag: "Folder", id: crypto.randomUUID(), name, entries: [] }
      if (parentFolderId === null) {
        store.replace([...store.read(), created])
        return succeeded(created.id)
      }
      const reply = store.changeFolder(parentFolderId, (parent) =>
        withEntries(parent, [...parent.entries, created]),
      )
      return reply._tag === "IpcSucceeded" ? succeeded(created.id) : reply
    },
    [ipcChannels.renameFolder]: (request) => {
      const { folderId, name } = Schema.decodeUnknownSync(RenameFolderRequest)(request)
      return store.changeFolder(folderId, (folder) => ({
        _tag: "Folder",
        id: folder.id,
        name,
        entries: folder.entries,
      }))
    },
    [ipcChannels.deleteFolder]: (request) => {
      const { folderId } = Schema.decodeUnknownSync(DeleteFolderRequest)(request)
      if (!holdsFolder(store.read(), folderId)) return folderNotFound(folderId)
      store.replace(store.withoutFolder(folderId))
      return succeeded(undefined)
    },
    [ipcChannels.addFolderItem]: (request) => {
      const { folderId, item } = Schema.decodeUnknownSync(AddFolderItemRequest)(request)
      return store.changeFolder(folderId, (folder) =>
        folder.entries.some((entry) => entry._tag === "SpotifyItem" && entry.uri === item.uri)
          ? folder
          : withEntries(folder, [...folder.entries, item]),
      )
    },
    [ipcChannels.removeFolderItem]: (request) => {
      const { folderId, uri } = Schema.decodeUnknownSync(RemoveFolderItemRequest)(request)
      return store.changeFolder(folderId, (folder) => withoutItem(folder, uri))
    },
    ...moveChannels(store),
  }
}
