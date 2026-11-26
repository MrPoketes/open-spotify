import { and, asc, eq, isNull, max } from "drizzle-orm"
import { Effect, Option, Schema } from "effect"
import type { SpotifyItem } from "../shared/folders"
import { Database } from "./database"
import { folderEntriesTable } from "./database-schema"
import { FolderEntryRow } from "./folder-tree-rows"

const sameParent = (parentId: string | null) =>
  parentId === null
    ? isNull(folderEntriesTable.parentId)
    : eq(folderEntriesTable.parentId, parentId)

const collectLineage = (
  folderRows: ReadonlyArray<{ readonly id: string; readonly parentId: string | null }>,
  folderId: string,
) => {
  const parentById = new Map(folderRows.map((row) => [row.id, row.parentId]))
  const lineage: Array<{ readonly id: string }> = []
  let currentId: string | null = folderId
  while (currentId !== null && parentById.has(currentId)) {
    lineage.push({ id: currentId })
    currentId = parentById.get(currentId) ?? null
  }
  return lineage
}

const makeFolderEntryQueries = Effect.gen(function* () {
  const database = yield* Database

  const listAllInPositionOrder = () =>
    database
      .run((drizzle) =>
        drizzle
          .select({
            id: folderEntriesTable.id,
            parentId: folderEntriesTable.parentId,
            name: folderEntriesTable.name,
            spotifyUri: folderEntriesTable.spotifyUri,
            imageUrl: folderEntriesTable.imageUrl,
          })
          .from(folderEntriesTable)
          .orderBy(asc(folderEntriesTable.position)),
      )
      .pipe(Effect.flatMap(Schema.decodeUnknownEffect(Schema.Array(FolderEntryRow))))

  const findFolder = (folderId: string) =>
    database
      .run((drizzle) =>
        drizzle
          .select({ id: folderEntriesTable.id })
          .from(folderEntriesTable)
          .where(and(eq(folderEntriesTable.id, folderId), isNull(folderEntriesTable.spotifyUri)))
          .limit(1),
      )
      .pipe(Effect.map((rows) => Option.fromUndefinedOr(rows[0])))

  const findItem = ({ folderId, uri }: { readonly folderId: string; readonly uri: string }) =>
    database
      .run((drizzle) =>
        drizzle
          .select({ id: folderEntriesTable.id })
          .from(folderEntriesTable)
          .where(
            and(eq(folderEntriesTable.parentId, folderId), eq(folderEntriesTable.spotifyUri, uri)),
          )
          .limit(1),
      )
      .pipe(Effect.map((rows) => Option.fromUndefinedOr(rows[0])))

  const listFolderAndAncestors = (folderId: string) =>
    database
      .run((drizzle) =>
        drizzle
          .select({ id: folderEntriesTable.id, parentId: folderEntriesTable.parentId })
          .from(folderEntriesTable)
          .where(isNull(folderEntriesTable.spotifyUri)),
      )
      .pipe(Effect.map((folderRows) => collectLineage(folderRows, folderId)))

  const listChildIds = (parentId: string | null) =>
    database.run((drizzle) =>
      drizzle
        .select({ id: folderEntriesTable.id })
        .from(folderEntriesTable)
        .where(sameParent(parentId))
        .orderBy(asc(folderEntriesTable.position)),
    )

  // Positions may have gaps after a delete, so a new entry goes past the
  // highest position rather than at the number of children.
  const nextPosition = (parentId: string | null) =>
    database
      .run((drizzle) =>
        drizzle
          .select({ maxPosition: max(folderEntriesTable.position) })
          .from(folderEntriesTable)
          .where(sameParent(parentId)),
      )
      .pipe(
        Effect.map((rows) => {
          const highestPosition = rows[0]?.maxPosition
          return typeof highestPosition === "number" ? highestPosition + 1 : 0
        }),
      )

  return {
    listAllInPositionOrder,
    findFolder,
    findItem,
    listFolderAndAncestors,
    listChildIds,
    nextPosition,
  }
})

const makeFolderEntryWrites = (
  database: Database["Service"],
  queries: Effect.Success<typeof makeFolderEntryQueries>,
) => {
  const insertFolder = Effect.fn("FolderEntriesTable.insertFolder")(function* (folder: {
    readonly name: string
    readonly parentId: string | null
  }) {
    const folderId = crypto.randomUUID()
    const position = yield* queries.nextPosition(folder.parentId)
    yield* database.run((drizzle) =>
      drizzle.insert(folderEntriesTable).values({
        id: folderId,
        parentId: folder.parentId,
        position,
        name: folder.name,
      }),
    )
    return folderId
  })

  // A folder holds each item once, so inserting a held item changes nothing.
  const insertItem = Effect.fn("FolderEntriesTable.insertItem")(function* (
    folderId: string,
    item: SpotifyItem,
  ) {
    const position = yield* queries.nextPosition(folderId)
    yield* database.run((drizzle) =>
      drizzle
        .insert(folderEntriesTable)
        .values({
          id: crypto.randomUUID(),
          parentId: folderId,
          position,
          name: item.name,
          spotifyUri: item.uri,
          imageUrl: item.imageUrl,
        })
        .onConflictDoNothing({
          target: [folderEntriesTable.parentId, folderEntriesTable.spotifyUri],
        }),
    )
  })

  const renameFolder = (folderId: string, name: string) =>
    database
      .run((drizzle) =>
        drizzle.update(folderEntriesTable).set({ name }).where(eq(folderEntriesTable.id, folderId)),
      )
      .pipe(Effect.asVoid)

  // Deleting a folder cascades to everything inside it.
  const deleteEntry = (entryId: string) =>
    database
      .run((drizzle) =>
        drizzle.delete(folderEntriesTable).where(eq(folderEntriesTable.id, entryId)),
      )
      .pipe(Effect.asVoid)

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
    for (const [position, entryId] of orderedIds.entries()) {
      yield* database.run((drizzle) =>
        drizzle
          .update(folderEntriesTable)
          .set({ parentId: placement.parentId, position })
          .where(eq(folderEntriesTable.id, entryId)),
      )
    }
  })

  return { insertFolder, insertItem, renameFolder, deleteEntry, placeEntry }
}

// The reads and writes behind the Folders service. The service decides
// whether an operation is allowed; this module only touches rows.
export const makeFolderEntriesTable = Effect.gen(function* () {
  const database = yield* Database
  const queries = yield* makeFolderEntryQueries
  const writes = makeFolderEntryWrites(database, queries)

  return {
    listAllInPositionOrder: queries.listAllInPositionOrder,
    findFolder: queries.findFolder,
    findItem: queries.findItem,
    listFolderAndAncestors: queries.listFolderAndAncestors,
    ...writes,
  }
})

export type FolderEntriesTable = Effect.Success<typeof makeFolderEntriesTable>
