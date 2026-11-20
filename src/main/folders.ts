import { Context, Effect, Layer, Option, Schema } from "effect"
import { SqlClient, type SqlError } from "effect/sql"
import type {
  AddFolderItemRequest,
  CreateFolderRequest,
  DeleteFolderRequest,
  FolderTree,
  MoveFolderItemRequest,
  MoveFolderRequest,
  RemoveFolderItemRequest,
  RenameFolderRequest,
} from "../shared/folders"
import { makeFolderEntriesTable } from "./folder-entries-table"
import { assembleFolderTree } from "./folder-tree-rows"

export class FolderNotFound extends Schema.TaggedError<FolderNotFound>()("FolderNotFound", {
  folderId: Schema.String,
}) {}

export class FolderItemNotFound extends Schema.TaggedError<FolderItemNotFound>()(
  "FolderItemNotFound",
  { folderId: Schema.String, uri: Schema.String },
) {}

export class FolderMovedIntoOwnSubtree extends Schema.TaggedError<FolderMovedIntoOwnSubtree>()(
  "FolderMovedIntoOwnSubtree",
  { folderId: Schema.String, parentFolderId: Schema.String },
) {}

type StorageError = SqlError.SqlError | Schema.SchemaError

export class Folders extends Context.Service<
  Folders,
  {
    readonly readTree: Effect.Effect<FolderTree, StorageError>
    readonly createFolder: (
      request: CreateFolderRequest,
    ) => Effect.Effect<string, FolderNotFound | StorageError>
    readonly renameFolder: (
      request: RenameFolderRequest,
    ) => Effect.Effect<void, FolderNotFound | StorageError>
    readonly deleteFolder: (
      request: DeleteFolderRequest,
    ) => Effect.Effect<void, FolderNotFound | StorageError>
    readonly addItem: (
      request: AddFolderItemRequest,
    ) => Effect.Effect<void, FolderNotFound | StorageError>
    readonly removeItem: (
      request: RemoveFolderItemRequest,
    ) => Effect.Effect<void, FolderItemNotFound | StorageError>
    readonly moveFolder: (
      request: MoveFolderRequest,
    ) => Effect.Effect<void, FolderNotFound | FolderMovedIntoOwnSubtree | StorageError>
    readonly moveItem: (
      request: MoveFolderItemRequest,
    ) => Effect.Effect<void, FolderNotFound | FolderItemNotFound | StorageError>
  }
>()("open-spotify/Folders") {
  static readonly layer = Layer.effect(
    Folders,
    Effect.gen(function* () {
      const sql = yield* SqlClient.SqlClient
      const table = yield* makeFolderEntriesTable

      const requireFolder = (folderId: string) =>
        table
          .findFolder(folderId)
          .pipe(Effect.filterOrFail(Option.isSome, () => new FolderNotFound({ folderId })))

      const requireItemEntryId = (folderId: string, uri: string) =>
        table.findItem({ folderId, uri }).pipe(
          Effect.filterOrFail(Option.isSome, () => new FolderItemNotFound({ folderId, uri })),
          Effect.map((itemEntry) => itemEntry.value.id),
        )

      const requireOutsideSubtree = (folderId: string, parentFolderId: string) =>
        table.listFolderAndAncestors(parentFolderId).pipe(
          Effect.filterOrFail(
            (lineage) => !lineage.some((ancestor) => ancestor.id === folderId),
            () => new FolderMovedIntoOwnSubtree({ folderId, parentFolderId }),
          ),
        )

      return Folders.of({
        readTree: table.listAllInPositionOrder().pipe(Effect.map(assembleFolderTree)),
        createFolder: Effect.fn("Folders.createFolder")(function* ({ name, parentFolderId }) {
          if (parentFolderId !== null) {
            yield* requireFolder(parentFolderId)
          }
          return yield* table.insertFolder({ name, parentId: parentFolderId })
        }, sql.withTransaction),
        renameFolder: Effect.fn("Folders.renameFolder")(function* ({ folderId, name }) {
          yield* requireFolder(folderId)
          yield* table.renameFolder(folderId, name)
        }, sql.withTransaction),
        deleteFolder: Effect.fn("Folders.deleteFolder")(function* ({ folderId }) {
          yield* requireFolder(folderId)
          yield* table.deleteEntry(folderId)
        }, sql.withTransaction),
        addItem: Effect.fn("Folders.addItem")(function* ({ folderId, item }) {
          yield* requireFolder(folderId)
          if (Option.isNone(yield* table.findItem({ folderId, uri: item.uri }))) {
            yield* table.insertItem(folderId, item)
          }
        }, sql.withTransaction),
        removeItem: Effect.fn("Folders.removeItem")(function* ({ folderId, uri }) {
          yield* table.deleteEntry(yield* requireItemEntryId(folderId, uri))
        }, sql.withTransaction),
        moveFolder: Effect.fn("Folders.moveFolder")(function* ({
          folderId,
          parentFolderId,
          position,
        }) {
          yield* requireFolder(folderId)
          if (parentFolderId !== null) {
            yield* requireFolder(parentFolderId)
            yield* requireOutsideSubtree(folderId, parentFolderId)
          }
          yield* table.placeEntry({ entryId: folderId, parentId: parentFolderId, position })
        }, sql.withTransaction),
        moveItem: Effect.fn("Folders.moveItem")(function* ({
          folderId,
          uri,
          targetFolderId,
          position,
        }) {
          const entryId = yield* requireItemEntryId(folderId, uri)
          yield* requireFolder(targetFolderId)
          // The target keeps a single copy of the item, at the requested position.
          const copyInTarget = yield* table.findItem({ folderId: targetFolderId, uri })
          if (Option.isSome(copyInTarget) && copyInTarget.value.id !== entryId) {
            yield* table.deleteEntry(copyInTarget.value.id)
          }
          yield* table.placeEntry({ entryId, parentId: targetFolderId, position })
        }, sql.withTransaction),
      })
    }),
  )
}
