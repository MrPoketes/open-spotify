import { Effect, FileSystem, Option, Schema } from "effect"
import { ExportFoldersReply, ImportFoldersReply } from "../shared/folders-file-replies"
import { FileDialogs } from "./file-dialogs"
import { Folders } from "./folders"
import { decodeFoldersFile, encodeFoldersFile } from "./folders-file"

const fileDialogCanceled = { _tag: "FileDialogCanceled" } as const

export const exportFoldersFromIpc = Effect.gen(function* () {
  const fileDialogs = yield* FileDialogs
  const filePath = yield* fileDialogs.chooseFoldersExportPath
  if (Option.isNone(filePath)) {
    return yield* Schema.encodeEffect(ExportFoldersReply)(fileDialogCanceled)
  }
  const folders = yield* Folders
  const fileSystem = yield* FileSystem.FileSystem
  const fileText = yield* encodeFoldersFile(yield* folders.readTree)
  yield* fileSystem.writeFileString(filePath.value, fileText)
  return yield* Schema.encodeEffect(ExportFoldersReply)({ _tag: "FoldersExported" })
})

export const importFoldersFromIpc = Effect.gen(function* () {
  const fileDialogs = yield* FileDialogs
  const filePath = yield* fileDialogs.chooseFoldersImportPath
  if (Option.isNone(filePath)) {
    return yield* Schema.encodeEffect(ImportFoldersReply)(fileDialogCanceled)
  }
  const folders = yield* Folders
  const fileSystem = yield* FileSystem.FileSystem
  const fileText = yield* fileSystem.readFileString(filePath.value)
  const reply = yield* decodeFoldersFile(fileText).pipe(
    Effect.tap(folders.importFolders),
    Effect.map((importedFolders) => ({
      _tag: "FoldersImported" as const,
      folderCount: importedFolders.length,
    })),
    Effect.catchTag(
      ["FoldersFileNotJson", "FoldersFileUnsupportedVersion", "FoldersFileInvalid"],
      Effect.succeed,
    ),
  )
  return yield* Schema.encodeEffect(ImportFoldersReply)(reply)
})
