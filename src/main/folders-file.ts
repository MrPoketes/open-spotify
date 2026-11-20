import { Effect, Schema } from "effect"
import { type Folder, FolderName, type FolderTree, SpotifyItem } from "../shared/folders"
import {
  FoldersFileDamaged,
  FoldersFileInvalid,
  FoldersFileNotJson,
  FoldersFileUnsupportedVersion,
} from "../shared/folders-file-replies"

// A folder as it is written to a file. It has no id: imported folders get
// fresh ids, so importing a file never collides with the folders already
// stored, even when it is the user's own export.
export interface PortableFolder {
  readonly _tag: "Folder"
  readonly name: string
  readonly entries: ReadonlyArray<PortableFolderEntry>
}

export type PortableFolderEntry = PortableFolder | SpotifyItem

const PortableFolder = Schema.TaggedStruct("Folder", {
  name: FolderName,
  entries: Schema.Array(
    Schema.suspend((): Schema.Codec<PortableFolderEntry> => PortableFolderEntry),
  ),
})

const PortableFolderEntry = Schema.Union([PortableFolder, SpotifyItem])

// The format name tells a folders file apart from other JSON files, such as
// themes. The version changes whenever the shape of `folders` does.
const fileFormat = "open-spotify-folders"
const currentVersion = 1

const FoldersFileHeader = Schema.Struct({
  format: Schema.Literal(fileFormat),
  version: Schema.Number,
})

const FoldersFileContents = Schema.Struct({
  format: Schema.Literal(fileFormat),
  version: Schema.Literal(currentVersion),
  folders: Schema.Array(PortableFolder),
})

const Json = Schema.fromJsonString(Schema.Unknown)

const toPortableFolder = (folder: Folder): PortableFolder => ({
  _tag: "Folder",
  name: folder.name,
  entries: folder.entries.map((entry) =>
    entry._tag === "Folder" ? toPortableFolder(entry) : entry,
  ),
})

export const encodeFoldersFile = (tree: FolderTree) =>
  Schema.encodeEffect(Schema.fromJsonString(FoldersFileContents, { space: 2 }))({
    format: fileFormat,
    version: currentVersion,
    folders: tree.map(toPortableFolder),
  })

// Decodes in steps so the user learns why a file was refused: it is not JSON,
// it is not a folders file, it comes from an unknown version, or it is damaged.
export const decodeFoldersFile = Effect.fn("decodeFoldersFile")(function* (fileText: string) {
  const json = yield* Schema.decodeEffect(Json)(fileText).pipe(
    Effect.mapError(() => new FoldersFileNotJson()),
  )
  const header = yield* Schema.decodeUnknownEffect(FoldersFileHeader)(json).pipe(
    Effect.mapError(() => new FoldersFileInvalid()),
  )
  if (header.version !== currentVersion) {
    return yield* new FoldersFileUnsupportedVersion({ version: header.version })
  }
  const contents = yield* Schema.decodeUnknownEffect(FoldersFileContents)(json).pipe(
    Effect.mapError(() => new FoldersFileDamaged()),
  )
  return contents.folders
})
