import type { Dialog, FileFilter } from "electron"
import { Context, Effect, Layer, Option, Schema } from "effect"

export class FileDialogError extends Schema.TaggedError<FileDialogError>()("FileDialogError", {
  cause: Schema.Defect(),
}) {}

const foldersFileFilters: Array<FileFilter> = [
  { name: "Open Spotify folders", extensions: ["json"] },
]

// Takes Electron's dialog module as a parameter so that importing and
// exporting can be tested with fake dialogs in plain Node.
export class FileDialogs extends Context.Service<
  FileDialogs,
  {
    readonly chooseFoldersExportPath: Effect.Effect<Option.Option<string>, FileDialogError>
    readonly chooseFoldersImportPath: Effect.Effect<Option.Option<string>, FileDialogError>
  }
>()("open-spotify/FileDialogs") {
  static readonly layer = (dialog: Pick<Dialog, "showSaveDialog" | "showOpenDialog">) =>
    Layer.succeed(
      FileDialogs,
      FileDialogs.of({
        chooseFoldersExportPath: Effect.tryPromise({
          try: () =>
            dialog.showSaveDialog({
              title: "Export folders",
              defaultPath: "open-spotify-folders.json",
              filters: foldersFileFilters,
            }),
          catch: (cause) => new FileDialogError({ cause }),
        }).pipe(
          Effect.map((choice) => (choice.canceled ? Option.none() : Option.some(choice.filePath))),
        ),
        chooseFoldersImportPath: Effect.tryPromise({
          try: () =>
            dialog.showOpenDialog({
              title: "Import folders",
              properties: ["openFile"],
              filters: foldersFileFilters,
            }),
          catch: (cause) => new FileDialogError({ cause }),
        }).pipe(
          Effect.map((choice) =>
            choice.canceled ? Option.none() : Option.fromNullishOr(choice.filePaths[0]),
          ),
        ),
      }),
    )
}
