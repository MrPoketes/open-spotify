import path from "node:path"
import * as NodeFileSystem from "@effect/platform-node/NodeFileSystem"
import { assert, layer } from "@effect/vitest"
import { Effect, FileSystem, Layer, Option } from "effect"
import type { FolderEntry, SpotifyItem } from "../shared/folders"
import { databaseLayer } from "./database"
import { FoldersFileDialogs } from "./folders-file-dialogs"
import { Folders } from "./folders"
import { exportFoldersFromIpc, importFoldersFromIpc } from "./folders-file-ipc"

const freshFolders = () => Folders.layer.pipe(Layer.provide(databaseLayer(":memory:")))

// Both dialogs answer as if the user had chosen this path, or cancelled.
const fileDialogsChoosing = (filePath: Option.Option<string>) =>
  Layer.succeed(
    FoldersFileDialogs,
    FoldersFileDialogs.of({
      chooseExportPath: () => Effect.succeed(filePath),
      chooseImportPath: () => Effect.succeed(filePath),
    }),
  )

const exportTo = (filePath: string) =>
  exportFoldersFromIpc(null).pipe(Effect.provide(fileDialogsChoosing(Option.some(filePath))))

const importFrom = (filePath: string) =>
  importFoldersFromIpc(null).pipe(Effect.provide(fileDialogsChoosing(Option.some(filePath))))

const tempFilePath = Effect.gen(function* () {
  const fileSystem = yield* FileSystem.FileSystem
  return path.join(yield* fileSystem.makeTempDirectoryScoped(), "folders.json")
})

const writeTempFile = Effect.fn("writeTempFile")(function* (fileText: string) {
  const filePath = yield* tempFilePath
  const fileSystem = yield* FileSystem.FileSystem
  yield* fileSystem.writeFileString(filePath, fileText)
  return filePath
})

const album: SpotifyItem = {
  _tag: "SpotifyItem",
  uri: "spotify:album:4aawyAB9vmqN3uQ7FjRGTy",
  name: "Global Warming",
  imageUrl: "https://i.scdn.co/image/global-warming",
}
const playlist: SpotifyItem = {
  _tag: "SpotifyItem",
  uri: "spotify:playlist:37i9dQZF1DXcBWIGoYBM5M",
  name: "Today's Top Hits",
  imageUrl: null,
}

const withoutIds = (entries: ReadonlyArray<FolderEntry>): ReadonlyArray<unknown> =>
  entries.map((entry) =>
    entry._tag === "Folder" ? { name: entry.name, entries: withoutIds(entry.entries) } : entry,
  )

const foldersFile = (folders: ReadonlyArray<unknown>) =>
  JSON.stringify({ format: "open-spotify-folders", version: 1, folders })

// Every rejected file must leave the user's folders exactly as they were.
const expectRejectedWithoutChanges = Effect.fn("expectRejectedWithoutChanges")(function* (
  fileText: string,
) {
  const folders = yield* Folders
  yield* folders.createFolder({ name: "Rock", parentFolderId: null })
  const treeBeforeImport = yield* folders.readTree

  const reply = yield* importFrom(yield* writeTempFile(fileText))

  assert.deepStrictEqual(yield* folders.readTree, treeBeforeImport)
  return reply
})

layer(NodeFileSystem.layer)("folders file IPC", (it) => {
  it.effect("imports an exported file as the same folder tree on another computer", () =>
    Effect.gen(function* () {
      const filePath = yield* tempFilePath
      const exportedTree = yield* Effect.gen(function* () {
        const folders = yield* Folders
        const rockId = yield* folders.createFolder({ name: "Rock", parentFolderId: null })
        const classicsId = yield* folders.createFolder({ name: "Classics", parentFolderId: rockId })
        yield* folders.addItem({ folderId: classicsId, item: playlist })
        yield* folders.addItem({ folderId: rockId, item: album })
        yield* folders.createFolder({ name: "Jazz", parentFolderId: null })
        assert.deepStrictEqual(yield* exportTo(filePath), { _tag: "FoldersExported" })
        return yield* folders.readTree
      }).pipe(Effect.provide(freshFolders()))

      const { importReply, importedTree } = yield* Effect.gen(function* () {
        const folders = yield* Folders
        return { importReply: yield* importFrom(filePath), importedTree: yield* folders.readTree }
      }).pipe(Effect.provide(freshFolders()))

      assert.deepStrictEqual(importReply, { _tag: "FoldersImported", folderCount: 3 })
      assert.deepStrictEqual(withoutIds(importedTree), withoutIds(exportedTree))
    }),
  )

  it.effect("adds imported folders after the existing ones and keeps the existing ones", () =>
    Effect.gen(function* () {
      const folders = yield* Folders
      const rockId = yield* folders.createFolder({ name: "Rock", parentFolderId: null })
      yield* folders.addItem({ folderId: rockId, item: album })
      const filePath = yield* tempFilePath
      yield* exportTo(filePath)
      yield* folders.createFolder({ name: "Jazz", parentFolderId: null })
      const treeBeforeImport = yield* folders.readTree

      yield* importFrom(filePath)

      const treeAfterImport = yield* folders.readTree
      assert.deepStrictEqual(treeAfterImport.slice(0, 2), treeBeforeImport)
      const importedFolders = treeAfterImport.slice(2)
      assert.deepStrictEqual(withoutIds(importedFolders), [{ name: "Rock", entries: [album] }])
      assert.notInclude(
        importedFolders.map((folder) => folder.id),
        rockId,
      )
    }).pipe(Effect.provide(freshFolders())),
  )

  it.effect("rejects a file that is not JSON", () =>
    Effect.gen(function* () {
      const reply = yield* expectRejectedWithoutChanges("Rock, Jazz, Classics")

      assert.deepStrictEqual(reply, { _tag: "FoldersFileNotJson" })
    }).pipe(Effect.provide(freshFolders())),
  )

  // A file from a newer app version may describe folders in a shape this
  // version would misread.
  it.effect("rejects a file from an unknown format version", () =>
    Effect.gen(function* () {
      const reply = yield* expectRejectedWithoutChanges(
        JSON.stringify({ format: "open-spotify-folders", version: 2, folders: [] }),
      )

      assert.deepStrictEqual(reply, { _tag: "FoldersFileUnsupportedVersion", version: 2 })
    }).pipe(Effect.provide(freshFolders())),
  )

  it.effect("rejects a damaged folders file in which any folder is invalid", () =>
    Effect.gen(function* () {
      const reply = yield* expectRejectedWithoutChanges(
        foldersFile([
          { _tag: "Folder", name: "Jazz", entries: [] },
          { _tag: "Folder", name: "", entries: [] },
        ]),
      )

      assert.deepStrictEqual(reply, { _tag: "FoldersFileDamaged" })
    }).pipe(Effect.provide(freshFolders())),
  )

  it.effect("rejects a JSON file that is not a folders file", () =>
    Effect.gen(function* () {
      const reply = yield* expectRejectedWithoutChanges(JSON.stringify({ name: "Midnight" }))

      assert.deepStrictEqual(reply, { _tag: "FoldersFileInvalid" })
    }).pipe(Effect.provide(freshFolders())),
  )

  // Storage allows an item once per folder, so a hand-edited file that repeats
  // one must not make the whole import fail.
  it.effect("imports an item that a file repeats within one folder once", () =>
    Effect.gen(function* () {
      const folders = yield* Folders
      const filePath = yield* writeTempFile(
        foldersFile([{ _tag: "Folder", name: "Rock", entries: [album, album] }]),
      )

      yield* importFrom(filePath)

      assert.deepStrictEqual(withoutIds(yield* folders.readTree), [
        { name: "Rock", entries: [album] },
      ])
    }).pipe(Effect.provide(freshFolders())),
  )

  // The renderer shows no message for a cancelled dialog, so a cancel must not
  // come back as a failure.
  it.effect("replies that the save dialog was cancelled when the user cancels it", () =>
    Effect.gen(function* () {
      const reply = yield* exportFoldersFromIpc(null).pipe(
        Effect.provide(fileDialogsChoosing(Option.none())),
      )

      assert.deepStrictEqual(reply, { _tag: "FileDialogCanceled" })
    }).pipe(Effect.provide(freshFolders())),
  )

  it.effect("replies that the open dialog was cancelled when the user cancels it", () =>
    Effect.gen(function* () {
      const reply = yield* importFoldersFromIpc(null).pipe(
        Effect.provide(fileDialogsChoosing(Option.none())),
      )

      assert.deepStrictEqual(reply, { _tag: "FileDialogCanceled" })
    }).pipe(Effect.provide(freshFolders())),
  )
})
