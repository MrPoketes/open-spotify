import type { BaseWindow, Dialog } from "electron"
import { Context, Effect, Layer, type Option } from "effect"
import type { Theme } from "../shared/theme"
import {
  chooseMessageBoxButton,
  choosePathToOpen,
  choosePathToSave,
  type ModalDialogError,
} from "./modal-dialogs"

const themeFileFilters = [{ name: "Theme", extensions: ["json"] }]

// Takes Electron's dialog module as a parameter, so this module loads in
// plain Node and tests can provide the service with fake answers instead.
export class ThemeFileDialogs extends Context.Service<
  ThemeFileDialogs,
  {
    readonly chooseFileToImport: (
      parentWindow: BaseWindow | null,
    ) => Effect.Effect<Option.Option<string>, ModalDialogError>
    readonly chooseExportFile: (
      parentWindow: BaseWindow | null,
      suggestedFileName: string,
    ) => Effect.Effect<Option.Option<string>, ModalDialogError>
    readonly confirmReplace: (
      parentWindow: BaseWindow | null,
      theme: Theme,
    ) => Effect.Effect<boolean, ModalDialogError>
  }
>()("open-spotify/ThemeFileDialogs") {
  static readonly layer = (
    dialog: Pick<Dialog, "showOpenDialog" | "showSaveDialog" | "showMessageBox">,
  ) =>
    Layer.succeed(
      ThemeFileDialogs,
      ThemeFileDialogs.of({
        chooseFileToImport: (parentWindow) =>
          choosePathToOpen(dialog, parentWindow, {
            title: "Import theme",
            filters: themeFileFilters,
          }),
        chooseExportFile: (parentWindow, suggestedFileName) =>
          choosePathToSave(dialog, parentWindow, {
            title: "Export current theme",
            defaultPath: suggestedFileName,
            filters: themeFileFilters,
          }),
        confirmReplace: (parentWindow, theme) =>
          chooseMessageBoxButton(dialog, parentWindow, {
            type: "question",
            message: `Replace “${theme.name}” by ${theme.author}?`,
            detail: "You already imported a theme with this name and author.",
            buttons: ["Replace", "Cancel"],
            defaultId: 1,
            cancelId: 1,
          }).pipe(Effect.map((pressedButton) => pressedButton === 0)),
      }),
    )
}
