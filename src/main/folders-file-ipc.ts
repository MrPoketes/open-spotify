import type { BaseWindow } from "electron"
import { Effect, FileSystem, Option, Schema } from "effect"
import { ExportFoldersReply, ImportFoldersReply } from "../shared/folders-file-replies"
import { FoldersFileDialogs } from "./folders-file-dialogs"
import { Folders } from "./folders"
import { decodeFoldersFile, encodeFoldersFile, type PortableFolderEntry } from "./folders-file"

const fileDialogCanceled = { _tag: "FileDialogCanceled" } as const

// Nested folders count too, so the number matches the folders the user sees added.
const countFolders = (entries: ReadonlyArray<PortableFolderEntry>): number => {
  let folderCount = 0
  for (const entry of entries) {
    if (entry._tag === "Folder") {
      folderCount += 1 + countFolders(entry.entries)
    }
  }
  return folderCount
}

export const exportFoldersFromIpc = Effect.fn("exportFoldersFromIpc")(function* (
  parentWindow: BaseWindow | null,
) {
  const fileDialogs = yield* FoldersFileDialogs
  const filePath = yield* fileDialogs.chooseExportPath(parentWindow)
  if (Option.isNone(filePath)) {
    return yield* Schema.encodeEffect(ExportFoldersReply)(fileDialogCanceled)
  }
  const folders = yield* Folders
  const fileSystem = yield* FileSystem.FileSystem
  const fileText = yield* encodeFoldersFile(yield* folders.readTree)
  yield* fileSystem.writeFileString(filePath.value, fileText)
  return yield* Schema.encodeEffect(ExportFoldersReply)({ _tag: "FoldersExported" })
})

export const importFoldersFromIpc = Effect.fn("importFoldersFromIpc")(function* (
  parentWindow: BaseWindow | null,
) {
  const fileDialogs = yield* FoldersFileDialogs
  const filePath = yield* fileDialogs.chooseImportPath(parentWindow)
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
      folderCount: countFolders(importedFolders),
    })),
    Effect.catchTag(
      [
        "FoldersFileNotJson",
        "FoldersFileUnsupportedVersion",
        "FoldersFileInvalid",
        "FoldersFileDamaged",
      ],
      Effect.succeed,
    ),
  )
  return yield* Schema.encodeEffect(ImportFoldersReply)(reply)
})
