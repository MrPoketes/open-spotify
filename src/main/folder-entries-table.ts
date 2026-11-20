import { Effect, Schema } from "effect"
import { SqlClient, SqlSchema } from "effect/sql"
import type { SpotifyItem } from "../shared/folders"
import { FolderEntryRow } from "./folder-tree-rows"

const EntryId = Schema.Struct({ id: Schema.String })

const makeFolderEntryQueries = Effect.gen(function* () {
  const sql = yield* SqlClient.SqlClient

  const listAllInPositionOrder = SqlSchema.findAll({
    Request: Schema.Void,
    Result: FolderEntryRow,
    execute: () => sql`
      SELECT id, parent_id, name, spotify_uri, image_url FROM folder_entries ORDER BY position
    `,
  })

  const findFolder = SqlSchema.findOneOption({
    Request: Schema.String,
    Result: EntryId,
    execute: (folderId) => sql`
      SELECT id FROM folder_entries WHERE id = ${folderId} AND spotify_uri IS NULL
    `,
  })

  const findItem = SqlSchema.findOneOption({
    Request: Schema.Struct({ folderId: Schema.String, uri: Schema.String }),
    Result: EntryId,
    execute: ({ folderId, uri }) => sql`
      SELECT id FROM folder_entries WHERE parent_id = ${folderId} AND spotify_uri = ${uri}
    `,
  })

  const listFolderAndAncestors = SqlSchema.findAll({
    Request: Schema.String,
    Result: EntryId,
    execute: (folderId) => sql`
      WITH RECURSIVE lineage (id, parent_id) AS (
        SELECT id, parent_id FROM folder_entries WHERE id = ${folderId}
        UNION ALL
        SELECT folder_entries.id, folder_entries.parent_id
        FROM folder_entries JOIN lineage ON folder_entries.id = lineage.parent_id
      )
      SELECT id FROM lineage
    `,
  })

  const listChildIds = SqlSchema.findAll({
    Request: Schema.NullOr(Schema.String),
    Result: EntryId,
    execute: (parentId) => sql`
      SELECT id FROM folder_entries WHERE parent_id IS ${parentId} ORDER BY position
    `,
  })

  // Positions may have gaps after a delete, so a new entry goes past the
  // highest position rather than at the number of children.
  const findNextPosition = SqlSchema.findOne({
    Request: Schema.NullOr(Schema.String),
    Result: Schema.Struct({ position: Schema.Int }),
    execute: (parentId) => sql`
      SELECT COALESCE(MAX(position) + 1, 0) AS position
      FROM folder_entries WHERE parent_id IS ${parentId}
    `,
  })

  return {
    listAllInPositionOrder,
    findFolder,
    findItem,
    listFolderAndAncestors,
    listChildIds,
    findNextPosition,
  }
})

// The reads and writes behind the Folders service. The service decides
// whether an operation is allowed; this module only touches rows.
export const makeFolderEntriesTable = Effect.gen(function* () {
  const sql = yield* SqlClient.SqlClient
  const queries = yield* makeFolderEntryQueries

  const nextPosition = (parentId: string | null) =>
    queries.findNextPosition(parentId).pipe(
      Effect.map((row) => row.position),
      // An aggregate query always returns exactly one row.
      Effect.catchTag("NoSuchElementError", Effect.die),
    )

  const insertFolder = Effect.fn("FolderEntriesTable.insertFolder")(function* (folder: {
    readonly name: string
    readonly parentId: string | null
  }) {
    const folderId = crypto.randomUUID()
    const position = yield* nextPosition(folder.parentId)
    yield* sql`
      INSERT INTO folder_entries (id, parent_id, position, name)
      VALUES (${folderId}, ${folder.parentId}, ${position}, ${folder.name})
    `
    return folderId
  })

  const insertItem = Effect.fn("FolderEntriesTable.insertItem")(function* (
    folderId: string,
    item: SpotifyItem,
  ) {
    const position = yield* nextPosition(folderId)
    yield* sql`
      INSERT INTO folder_entries (id, parent_id, position, name, spotify_uri, image_url)
      VALUES (${crypto.randomUUID()}, ${folderId}, ${position}, ${item.name}, ${item.uri},
        ${item.imageUrl})
    `
  })

  const renameFolder = (folderId: string, name: string) =>
    sql`UPDATE folder_entries SET name = ${name} WHERE id = ${folderId}`

  // Deleting a folder cascades to everything inside it.
  const deleteEntry = (entryId: string) => sql`DELETE FROM folder_entries WHERE id = ${entryId}`

  // Rewrites the positions of every child of the parent, so the result does
  // not depend on the gaps left by earlier deletes.
  const placeEntry = Effect.fn("FolderEntriesTable.placeEntry")(function* (placement: {
    readonly entryId: string
    readonly parentId: string | null
    readonly position: number
  }) {
    const otherChildIds = (yield* queries.listChildIds(placement.parentId))
      .map((child) => child.id)
      .filter((childId) => childId !== placement.entryId)
    const orderedIds = otherChildIds.toSpliced(placement.position, 0, placement.entryId)
    yield* Effect.forEach(
      orderedIds,
      (entryId, position) => sql`
        UPDATE folder_entries SET parent_id = ${placement.parentId}, position = ${position}
        WHERE id = ${entryId}
      `,
      { discard: true },
    )
  })

  return {
    listAllInPositionOrder: queries.listAllInPositionOrder,
    findFolder: queries.findFolder,
    findItem: queries.findItem,
    listFolderAndAncestors: queries.listFolderAndAncestors,
    insertFolder,
    insertItem,
    renameFolder,
    deleteEntry,
    placeEntry,
  }
})
