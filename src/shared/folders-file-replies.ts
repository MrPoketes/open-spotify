import { Schema } from "effect"

export class FoldersFileNotJson extends Schema.TaggedError<FoldersFileNotJson>()(
  "FoldersFileNotJson",
  {},
) {}

// A file written by a newer Open Spotify can carry a format this build cannot
// read. Guessing at it could import a damaged tree, so it is refused.
export class FoldersFileUnsupportedVersion extends Schema.TaggedError<FoldersFileUnsupportedVersion>()(
  "FoldersFileUnsupportedVersion",
  { version: Schema.Number },
) {}

// The JSON is not a folders file at all, such as a theme.
export class FoldersFileInvalid extends Schema.TaggedError<FoldersFileInvalid>()(
  "FoldersFileInvalid",
  {},
) {}

// A folders file of a known version holds a folder or item that is not valid,
// for example after a hand edit.
export class FoldersFileDamaged extends Schema.TaggedError<FoldersFileDamaged>()(
  "FoldersFileDamaged",
  {},
) {}

export const ImportFoldersError = Schema.Union([
  FoldersFileNotJson,
  FoldersFileUnsupportedVersion,
  FoldersFileInvalid,
  FoldersFileDamaged,
])

export type ImportFoldersError = typeof ImportFoldersError.Type

const FoldersImported = Schema.TaggedStruct("FoldersImported", { folderCount: Schema.Int })

// The user closed the file dialog without choosing a file.
const FileDialogCanceled = Schema.TaggedStruct("FileDialogCanceled", {})

export type FoldersImportOutcome = typeof FoldersImported.Type | typeof FileDialogCanceled.Type

export const ExportFoldersReply = Schema.Union([
  Schema.TaggedStruct("FoldersExported", {}),
  FileDialogCanceled,
])

export type ExportFoldersReply = typeof ExportFoldersReply.Type

// A rejected invoke loses its error type, so the errors a user can cause by
// choosing the wrong file travel inside the reply.
export const ImportFoldersReply = Schema.Union([
  FoldersImported,
  FileDialogCanceled,
  ImportFoldersError,
])
