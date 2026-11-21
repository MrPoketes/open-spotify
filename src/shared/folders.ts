import { Schema } from "effect"
import { MalformedIpcRequest } from "./malformed-ipc-request"

// The main process generates folder ids with crypto.randomUUID().
export const FolderId = Schema.String.check(Schema.isUUID(4))

// A trimmed, non-empty name rules out folders that look blank in the sidebar.
export const FolderName = Schema.String.check(Schema.isNonEmpty(), Schema.isTrimmed())

const SpotifyUri = Schema.String.check(
  Schema.isPattern(/^spotify:(playlist|artist|album|show|track):[0-9A-Za-z]{22}$/, {
    expected: "a Spotify URI like spotify:album:4aawyAB9vmqN3uQ7FjRGTy",
  }),
)

const ImageUrl = Schema.String.check(
  Schema.isPattern(/^https:\/\//, { expected: "an https image URL" }),
)

// The name and image are cached so a folder renders without a network call.
export const SpotifyItem = Schema.TaggedStruct("SpotifyItem", {
  uri: SpotifyUri,
  name: Schema.String,
  imageUrl: Schema.NullOr(ImageUrl),
})

export type SpotifyItem = typeof SpotifyItem.Type

export interface Folder {
  readonly _tag: "Folder"
  readonly id: string
  readonly name: string
  readonly entries: ReadonlyArray<FolderEntry>
}

export type FolderEntry = Folder | SpotifyItem

export const Folder = Schema.TaggedStruct("Folder", {
  id: FolderId,
  name: FolderName,
  entries: Schema.Array(Schema.suspend((): Schema.Codec<FolderEntry> => FolderEntry)),
})

const FolderEntry = Schema.Union([Folder, SpotifyItem])

// Spotify items live only inside folders, so the top level holds folders.
export const FolderTree = Schema.Array(Folder)

export type FolderTree = typeof FolderTree.Type

// Moves insert at this index among the new parent's entries. An index past
// the end appends, like Array.prototype.splice.
const EntryPosition = Schema.Int.check(Schema.isGreaterThanOrEqualTo(0))

export const CreateFolderRequest = Schema.Struct({
  name: FolderName,
  parentFolderId: Schema.NullOr(FolderId),
})

export const RenameFolderRequest = Schema.Struct({ folderId: FolderId, name: FolderName })

export const DeleteFolderRequest = Schema.Struct({ folderId: FolderId })

export const AddFolderItemRequest = Schema.Struct({ folderId: FolderId, item: SpotifyItem })

export const RemoveFolderItemRequest = Schema.Struct({ folderId: FolderId, uri: SpotifyUri })

export const MoveFolderRequest = Schema.Struct({
  folderId: FolderId,
  parentFolderId: Schema.NullOr(FolderId),
  position: EntryPosition,
})

export const MoveFolderItemRequest = Schema.Struct({
  folderId: FolderId,
  uri: SpotifyUri,
  targetFolderId: FolderId,
  position: EntryPosition,
})

export type CreateFolderRequest = typeof CreateFolderRequest.Type
export type RenameFolderRequest = typeof RenameFolderRequest.Type
export type DeleteFolderRequest = typeof DeleteFolderRequest.Type
export type AddFolderItemRequest = typeof AddFolderItemRequest.Type
export type RemoveFolderItemRequest = typeof RemoveFolderItemRequest.Type
export type MoveFolderRequest = typeof MoveFolderRequest.Type
export type MoveFolderItemRequest = typeof MoveFolderItemRequest.Type

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

// What a folder change can fail with that the sidebar reacts to, for example
// by reloading a tree that no longer holds the folder.
export const FolderChangeError = Schema.Union([
  MalformedIpcRequest,
  FolderNotFound,
  FolderItemNotFound,
  FolderMovedIntoOwnSubtree,
])

export type FolderChangeError = typeof FolderChangeError.Type
