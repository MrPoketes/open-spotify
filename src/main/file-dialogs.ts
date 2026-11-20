import type { BaseWindow, Dialog, FileFilter, OpenDialogOptions, SaveDialogOptions } from "electron"
import { Context, Effect, Layer, Option, Schema } from "effect"

export class FileDialogError extends Schema.TaggedError<FileDialogError>()("FileDialogError", {
  cause: Schema.Defect(),
}) {}

type DialogModule = Pick<Dialog, "showSaveDialog" | "showOpenDialog">

const foldersFileFilters: Array<FileFilter> = [
  { name: "Open Spotify folders", extensions: ["json"] },
]

// A dialog is modal to the window that asked for it, so the user cannot start
// a second import while the first dialog is open. Electron reports no window
// for a request from web contents that have none.
const showSaveDialog = (
  dialog: DialogModule,
  parentWindow: BaseWindow | null,
  options: SaveDialogOptions,
) =>
  parentWindow === null
    ? dialog.showSaveDialog(options)
    : dialog.showSaveDialog(parentWindow, options)

const showOpenDialog = (
  dialog: DialogModule,
  parentWindow: BaseWindow | null,
  options: OpenDialogOptions,
) =>
  parentWindow === null
    ? dialog.showOpenDialog(options)
    : dialog.showOpenDialog(parentWindow, options)

// Takes Electron's dialog module as a parameter so that it can be tested with
// a fake dialog module in plain Node.
export class FileDialogs extends Context.Service<
  FileDialogs,
  {
    readonly chooseFoldersExportPath: (
      parentWindow: BaseWindow | null,
    ) => Effect.Effect<Option.Option<string>, FileDialogError>
    readonly chooseFoldersImportPath: (
      parentWindow: BaseWindow | null,
    ) => Effect.Effect<Option.Option<string>, FileDialogError>
  }
>()("open-spotify/FileDialogs") {
  static readonly layer = (dialog: DialogModule) =>
    Layer.succeed(
      FileDialogs,
      FileDialogs.of({
        chooseFoldersExportPath: (parentWindow) =>
          Effect.tryPromise({
            try: () =>
              showSaveDialog(dialog, parentWindow, {
                title: "Export folders",
                defaultPath: "open-spotify-folders.json",
                filters: foldersFileFilters,
              }),
            catch: (cause) => new FileDialogError({ cause }),
          }).pipe(
            Effect.map((choice) =>
              choice.canceled ? Option.none() : Option.some(choice.filePath),
            ),
          ),
        chooseFoldersImportPath: (parentWindow) =>
          Effect.tryPromise({
            try: () =>
              showOpenDialog(dialog, parentWindow, {
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
