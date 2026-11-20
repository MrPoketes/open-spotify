import type { BaseWindow, Dialog, FileFilter, OpenDialogOptions, SaveDialogOptions } from "electron"
import { Context, Effect, Layer, Option, Schema } from "effect"

export class FoldersFileDialogError extends Schema.TaggedError<FoldersFileDialogError>()(
  "FoldersFileDialogError",
  {
    cause: Schema.Defect(),
  },
) {}

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
export class FoldersFileDialogs extends Context.Service<
  FoldersFileDialogs,
  {
    readonly chooseExportPath: (
      parentWindow: BaseWindow | null,
    ) => Effect.Effect<Option.Option<string>, FoldersFileDialogError>
    readonly chooseImportPath: (
      parentWindow: BaseWindow | null,
    ) => Effect.Effect<Option.Option<string>, FoldersFileDialogError>
  }
>()("open-spotify/FoldersFileDialogs") {
  static readonly layer = (dialog: DialogModule) =>
    Layer.succeed(
      FoldersFileDialogs,
      FoldersFileDialogs.of({
        chooseExportPath: (parentWindow) =>
          Effect.tryPromise({
            try: () =>
              showSaveDialog(dialog, parentWindow, {
                title: "Export folders",
                defaultPath: "open-spotify-folders.json",
                filters: foldersFileFilters,
              }),
            catch: (cause) => new FoldersFileDialogError({ cause }),
          }).pipe(
            Effect.map((choice) =>
              choice.canceled ? Option.none() : Option.some(choice.filePath),
            ),
          ),
        chooseImportPath: (parentWindow) =>
          Effect.tryPromise({
            try: () =>
              showOpenDialog(dialog, parentWindow, {
                title: "Import folders",
                properties: ["openFile"],
                filters: foldersFileFilters,
              }),
            catch: (cause) => new FoldersFileDialogError({ cause }),
          }).pipe(
            Effect.map((choice) =>
              choice.canceled ? Option.none() : Option.fromNullishOr(choice.filePaths[0]),
            ),
          ),
      }),
    )
}
