import { Schema } from "effect"

export const LibraryEntryKind = Schema.Literals([
  "liked-songs",
  "playlist",
  "album",
  "artist",
  "show",
])

export type LibraryEntryKind = typeof LibraryEntryKind.Type

// Pinned entries are listed at the top of the sidebar in this order.
export const PinnedLibraryEntries = Schema.Array(
  Schema.String.check(Schema.isPattern(/^spotify:/, { expected: "a Spotify URI" })),
)

export const LibrarySection = Schema.Struct({
  kind: LibraryEntryKind,
  hidden: Schema.Boolean,
  collapsed: Schema.Boolean,
})

export type LibrarySection = typeof LibrarySection.Type

const holdsEveryKindOnce = (sections: ReadonlyArray<LibrarySection>) =>
  sections.length === LibraryEntryKind.literals.length &&
  LibraryEntryKind.literals.every((kind) => sections.some((section) => section.kind === kind))

// The sections in the order the sidebar shows them. A list that misses a kind
// would make that kind's entries vanish with no way to bring them back.
export const LibrarySections = Schema.Array(LibrarySection).check(
  Schema.makeFilter(holdsEveryKindOnce, { expected: "each library section exactly once" }),
)

export const defaultLibrarySections: ReadonlyArray<LibrarySection> = LibraryEntryKind.literals.map(
  (kind) => ({ kind, hidden: false, collapsed: false }),
)
