import type { LibraryEntry, LibraryEntryKind } from "./library-entries"

export type LibraryKindFilter = Exclude<LibraryEntryKind, "liked-songs">

export interface LibraryFilters {
  readonly kind: LibraryKindFilter | null
  readonly nameQuery: string
}

export const noLibraryFilters: LibraryFilters = { kind: null, nameQuery: "" }

// Spotify keeps Liked Songs apart from playlists, but users think of it as one.
const kindFilterOf = (kind: LibraryEntryKind): LibraryKindFilter =>
  kind === "liked-songs" ? "playlist" : kind

export const filterLibraryEntries = (
  entries: ReadonlyArray<LibraryEntry>,
  { kind, nameQuery }: LibraryFilters,
) => {
  const query = nameQuery.trim().toLocaleLowerCase()
  return entries.filter(
    (entry) =>
      (kind === null || kindFilterOf(entry.kind) === kind) &&
      entry.name.toLocaleLowerCase().includes(query),
  )
}
