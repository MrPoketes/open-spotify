import { Context, type Effect, Layer, type Option } from "effect"
import type { BaseWindow, Dialog, FileFilter } from "electron"
import { choosePathToOpen, choosePathToSave, type ModalDialogError } from "./modal-dialogs"

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
    ) => Effect.Effect<Option.Option<string>, ModalDialogError>
    readonly chooseImportPath: (
      parentWindow: BaseWindow | null,
    ) => Effect.Effect<Option.Option<string>, ModalDialogError>
  }
>()("open-spotify/FoldersFileDialogs") {
  static readonly layer = (dialog: Pick<Dialog, "showSaveDialog" | "showOpenDialog">) =>
    Layer.succeed(
      FoldersFileDialogs,
      FoldersFileDialogs.of({
        chooseExportPath: (parentWindow) =>
          choosePathToSave(dialog, parentWindow, {
            title: "Export folders",
            defaultPath: "open-spotify-folders.json",
            filters: foldersFileFilters,
          }),
        chooseImportPath: (parentWindow) =>
          choosePathToOpen(dialog, parentWindow, {
            title: "Import folders",
            filters: foldersFileFilters,
          }),
      }),
    )
}
