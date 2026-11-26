import { Schema } from "effect"
import { Folder, type FolderTree, SpotifyItem } from "../shared/folders"

const FolderRow = Schema.Struct({
  id: Folder.fields.id,
  parentId: Schema.NullOr(Folder.fields.id),
  name: Folder.fields.name,
  spotifyUri: Schema.Null,
})

type FolderRow = typeof FolderRow.Type

const SpotifyItemRow = Schema.Struct({
  parentId: Folder.fields.id,
  name: SpotifyItem.fields.name,
  spotifyUri: SpotifyItem.fields.uri,
  imageUrl: SpotifyItem.fields.imageUrl,
})

type SpotifyItemRow = typeof SpotifyItemRow.Type

export const FolderEntryRow = Schema.Union([FolderRow, SpotifyItemRow])

type FolderEntryRow = typeof FolderEntryRow.Type

const toSpotifyItem = (row: SpotifyItemRow): SpotifyItem => ({
  _tag: "SpotifyItem",
  uri: row.spotifyUri,
  name: row.name,
  imageUrl: row.imageUrl,
})

export const assembleFolderTree = (
  rowsInPositionOrder: ReadonlyArray<FolderEntryRow>,
): FolderTree => {
  const rowsByParentId = new Map<string | null, Array<FolderEntryRow>>()
  for (const row of rowsInPositionOrder) {
    const siblingRows = rowsByParentId.get(row.parentId) ?? []
    siblingRows.push(row)
    rowsByParentId.set(row.parentId, siblingRows)
  }

  const toFolder = (row: FolderRow): Folder => ({
    _tag: "Folder",
    id: row.id,
    name: row.name,
    entries: (rowsByParentId.get(row.id) ?? []).map((childRow) =>
      childRow.spotifyUri === null ? toFolder(childRow) : toSpotifyItem(childRow),
    ),
  })

  // The table rejects Spotify items without a parent, so this filter removes
  // nothing. It tells TypeScript that the top-level rows are folders.
  return (rowsByParentId.get(null) ?? []).filter((row) => row.spotifyUri === null).map(toFolder)
}
