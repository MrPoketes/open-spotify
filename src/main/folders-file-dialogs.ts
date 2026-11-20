import type { BaseWindow, Dialog, FileFilter } from "electron"
import { Context, Effect, Layer, Option, Schema } from "effect"
import { showModalOpenDialog, showModalSaveDialog } from "./modal-dialogs"

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
              showModalSaveDialog(dialog, parentWindow, {
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
              showModalOpenDialog(dialog, parentWindow, {
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
