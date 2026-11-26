import { assert, describe, it } from "@effect/vitest"
import { eq } from "drizzle-orm"
import { Effect, Schema } from "effect"
import type { FolderEntry, FolderTree } from "../shared/folders"
import { Database } from "./database"
import { folderEntriesTable } from "./database-schema"
import { Folders } from "./folders"
import { album, artist, freshFolders, playlist } from "./folders-fakes"

const unknownFolderId = "3f1c1b9e-6a51-4d3e-9a43-2f6f0f3d5c11"

const namesOf = (entries: ReadonlyArray<FolderEntry>) => entries.map((entry) => entry.name)

const entriesOf = (tree: FolderTree) => tree.map((folder) => folder.entries)

describe("Folders", () => {
  it.effect("reads back nested folders and items in the order they were added", () =>
    Effect.gen(function* () {
      const folders = yield* Folders

      const rockId = yield* folders.createFolder({ name: "Rock", parentFolderId: null })
      const jazzId = yield* folders.createFolder({ name: "Jazz", parentFolderId: null })
      const classicsId = yield* folders.createFolder({ name: "Classics", parentFolderId: rockId })
      yield* folders.addItem({ folderId: rockId, item: album })

      assert.deepStrictEqual(yield* folders.readTree, [
        {
          _tag: "Folder",
          id: rockId,
          name: "Rock",
          entries: [{ _tag: "Folder", id: classicsId, name: "Classics", entries: [] }, album],
        },
        { _tag: "Folder", id: jazzId, name: "Jazz", entries: [] },
      ])
    }).pipe(Effect.provide(freshFolders())),
  )

  // Drag and drop computes the target index from what is on screen, which
  // may be past the end of the list.
  it.effect("moves a folder to the requested position, or to the end when it is past it", () =>
    Effect.gen(function* () {
      const folders = yield* Folders
      const firstId = yield* folders.createFolder({ name: "First", parentFolderId: null })
      yield* folders.createFolder({ name: "Second", parentFolderId: null })
      const thirdId = yield* folders.createFolder({ name: "Third", parentFolderId: null })

      yield* folders.moveFolder({ folderId: thirdId, parentFolderId: null, position: 0 })
      const treeAfterFirstMove = yield* folders.readTree
      yield* folders.moveFolder({ folderId: firstId, parentFolderId: null, position: 99 })
      const treeAfterSecondMove = yield* folders.readTree

      assert.deepStrictEqual(namesOf(treeAfterFirstMove), ["Third", "First", "Second"])
      assert.deepStrictEqual(namesOf(treeAfterSecondMove), ["Third", "Second", "First"])
    }).pipe(Effect.provide(freshFolders())),
  )

  it.effect("moves a folder into another folder and an item into another folder", () =>
    Effect.gen(function* () {
      const folders = yield* Folders
      const sourceId = yield* folders.createFolder({ name: "Source", parentFolderId: null })
      const targetId = yield* folders.createFolder({ name: "Target", parentFolderId: null })
      const nestedId = yield* folders.createFolder({ name: "Nested", parentFolderId: null })
      yield* folders.addItem({ folderId: sourceId, item: album })
      yield* folders.addItem({ folderId: sourceId, item: playlist })
      yield* folders.addItem({ folderId: targetId, item: artist })

      yield* folders.moveItem({
        folderId: sourceId,
        uri: album.uri,
        targetFolderId: targetId,
        position: 0,
      })
      yield* folders.moveFolder({ folderId: nestedId, parentFolderId: targetId, position: 1 })

      const tree = yield* folders.readTree
      assert.deepStrictEqual(
        tree.map((folder) => namesOf(folder.entries)),
        [[playlist.name], [album.name, "Nested", artist.name]],
      )
    }).pipe(Effect.provide(freshFolders())),
  )

  it.effect("reorders an item within its own folder without losing it", () =>
    Effect.gen(function* () {
      const folders = yield* Folders
      const folderId = yield* folders.createFolder({ name: "Rock", parentFolderId: null })
      yield* folders.addItem({ folderId, item: album })
      yield* folders.addItem({ folderId, item: playlist })

      yield* folders.moveItem({
        folderId,
        uri: playlist.uri,
        targetFolderId: folderId,
        position: 0,
      })

      const tree = yield* folders.readTree
      assert.deepStrictEqual(entriesOf(tree), [[playlist, album]])
    }).pipe(Effect.provide(freshFolders())),
  )

  it.effect("deletes a folder with everything inside it", () =>
    Effect.gen(function* () {
      const database = yield* Database
      const folders = yield* Folders
      const rockId = yield* folders.createFolder({ name: "Rock", parentFolderId: null })
      const classicsId = yield* folders.createFolder({ name: "Classics", parentFolderId: rockId })
      yield* folders.addItem({ folderId: classicsId, item: album })
      yield* folders.createFolder({ name: "Jazz", parentFolderId: null })

      yield* folders.deleteFolder({ folderId: rockId })

      const storedRows = yield* database.run((drizzle) =>
        drizzle.select({ id: folderEntriesTable.id }).from(folderEntriesTable),
      )
      assert.deepStrictEqual(namesOf(yield* folders.readTree), ["Jazz"])
      assert.strictEqual(storedRows.length, 1)
    }).pipe(Effect.provide(freshFolders())),
  )

  // Deletes leave gaps in the positions. A new folder placed at the number of
  // remaining folders would land before the last one.
  it.effect("adds a new folder after the others when earlier folders were deleted", () =>
    Effect.gen(function* () {
      const folders = yield* Folders
      const firstId = yield* folders.createFolder({ name: "First", parentFolderId: null })
      const secondId = yield* folders.createFolder({ name: "Second", parentFolderId: null })
      yield* folders.createFolder({ name: "Third", parentFolderId: null })

      yield* folders.deleteFolder({ folderId: firstId })
      yield* folders.deleteFolder({ folderId: secondId })
      yield* folders.createFolder({ name: "Fourth", parentFolderId: null })

      assert.deepStrictEqual(namesOf(yield* folders.readTree), ["Third", "Fourth"])
    }).pipe(Effect.provide(freshFolders())),
  )

  // A folder inside its own subtree would detach the whole branch from the
  // tree, and the user would lose it.
  it.effect("refuses to move a folder into itself or one of its descendants", () =>
    Effect.gen(function* () {
      const folders = yield* Folders
      const rockId = yield* folders.createFolder({ name: "Rock", parentFolderId: null })
      const classicsId = yield* folders.createFolder({ name: "Classics", parentFolderId: rockId })
      const deepCutsId = yield* folders.createFolder({ name: "Deep", parentFolderId: classicsId })
      const treeBeforeMoves = yield* folders.readTree

      const intoDescendant = yield* Effect.flip(
        folders.moveFolder({ folderId: rockId, parentFolderId: deepCutsId, position: 0 }),
      )
      const intoItself = yield* Effect.flip(
        folders.moveFolder({ folderId: rockId, parentFolderId: rockId, position: 0 }),
      )

      assert.strictEqual(intoDescendant._tag, "FolderMovedIntoOwnSubtree")
      assert.strictEqual(intoItself._tag, "FolderMovedIntoOwnSubtree")
      assert.deepStrictEqual(yield* folders.readTree, treeBeforeMoves)
    }).pipe(Effect.provide(freshFolders())),
  )

  // The renderer may act on a folder that another window just deleted.
  it.effect("fails with FolderNotFound when the folder does not exist", () =>
    Effect.gen(function* () {
      const folders = yield* Folders

      const addError = yield* Effect.flip(
        folders.addItem({ folderId: unknownFolderId, item: album }),
      )
      const createError = yield* Effect.flip(
        folders.createFolder({ name: "Rock", parentFolderId: unknownFolderId }),
      )
      const moveError = yield* Effect.flip(
        folders.moveFolder({ folderId: unknownFolderId, parentFolderId: null, position: 0 }),
      )

      assert.strictEqual(addError._tag, "FolderNotFound")
      assert.strictEqual(createError._tag, "FolderNotFound")
      assert.strictEqual(moveError._tag, "FolderNotFound")
    }).pipe(Effect.provide(freshFolders())),
  )

  it.effect("ignores an item that the folder already contains", () =>
    Effect.gen(function* () {
      const folders = yield* Folders
      const folderId = yield* folders.createFolder({ name: "Rock", parentFolderId: null })

      yield* folders.addItem({ folderId, item: album })
      yield* folders.addItem({ folderId, item: { ...album, name: "Renamed album" } })

      const tree = yield* folders.readTree
      assert.deepStrictEqual(entriesOf(tree), [[album]])
    }).pipe(Effect.provide(freshFolders())),
  )

  it.effect("keeps an item in other folders when it is removed from one", () =>
    Effect.gen(function* () {
      const folders = yield* Folders
      const rockId = yield* folders.createFolder({ name: "Rock", parentFolderId: null })
      const favouritesId = yield* folders.createFolder({ name: "Favs", parentFolderId: null })
      yield* folders.addItem({ folderId: rockId, item: album })
      yield* folders.addItem({ folderId: favouritesId, item: album })

      yield* folders.removeItem({ folderId: rockId, uri: album.uri })

      const tree = yield* folders.readTree
      assert.deepStrictEqual(entriesOf(tree), [[], [album]])
    }).pipe(Effect.provide(freshFolders())),
  )

  it.effect("keeps one copy when an item moves into a folder that already contains it", () =>
    Effect.gen(function* () {
      const folders = yield* Folders
      const rockId = yield* folders.createFolder({ name: "Rock", parentFolderId: null })
      const favouritesId = yield* folders.createFolder({ name: "Favs", parentFolderId: null })
      yield* folders.addItem({ folderId: rockId, item: album })
      yield* folders.addItem({ folderId: favouritesId, item: playlist })
      yield* folders.addItem({ folderId: favouritesId, item: album })

      yield* folders.moveItem({
        folderId: rockId,
        uri: album.uri,
        targetFolderId: favouritesId,
        position: 0,
      })

      const tree = yield* folders.readTree
      assert.deepStrictEqual(entriesOf(tree), [[], [album, playlist]])
    }).pipe(Effect.provide(freshFolders())),
  )

  it.effect("fails with FolderItemNotFound when the folder does not contain the item", () =>
    Effect.gen(function* () {
      const folders = yield* Folders
      const folderId = yield* folders.createFolder({ name: "Rock", parentFolderId: null })

      const error = yield* Effect.flip(folders.removeItem({ folderId, uri: album.uri }))

      assert.strictEqual(error._tag, "FolderItemNotFound")
    }).pipe(Effect.provide(freshFolders())),
  )

  // A database edited by hand or by an older build must not reach the UI as
  // a malformed tree.
  it.effect("fails with SchemaError when a stored entry does not match its schema", () =>
    Effect.gen(function* () {
      const database = yield* Database
      const folders = yield* Folders
      const folderId = yield* folders.createFolder({ name: "Rock", parentFolderId: null })
      yield* database.run((drizzle) =>
        drizzle
          .update(folderEntriesTable)
          .set({ name: "" })
          .where(eq(folderEntriesTable.id, folderId)),
      )

      const error = yield* Effect.flip(folders.readTree)

      assert.instanceOf(error, Schema.SchemaError)
    }).pipe(Effect.provide(freshFolders())),
  )
})
