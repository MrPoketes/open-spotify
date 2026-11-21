import type { BaseWindow, Dialog } from "electron"
import { Context, Effect, Layer, Option, Schema } from "effect"
import type { Theme } from "../shared/theme"
import { showModalMessageBox, showModalOpenDialog, showModalSaveDialog } from "./modal-dialogs"

class ThemeFileDialogError extends Schema.TaggedError<ThemeFileDialogError>()(
  "ThemeFileDialogError",
  {
    cause: Schema.Defect(),
  },
) {}

const themeFileFilters = [{ name: "Theme", extensions: ["json"] }]

// Takes Electron's dialog module as a parameter, so this module loads in
// plain Node and tests can provide the service with fake answers instead.
export class ThemeFileDialogs extends Context.Service<
  ThemeFileDialogs,
  {
    readonly chooseFileToImport: (
      parentWindow: BaseWindow | null,
    ) => Effect.Effect<Option.Option<string>, ThemeFileDialogError>
    readonly chooseExportFile: (
      parentWindow: BaseWindow | null,
      suggestedFileName: string,
    ) => Effect.Effect<Option.Option<string>, ThemeFileDialogError>
    readonly confirmReplace: (
      parentWindow: BaseWindow | null,
      theme: Theme,
    ) => Effect.Effect<boolean, ThemeFileDialogError>
  }
>()("open-spotify/ThemeFileDialogs") {
  static readonly layer = (
    dialog: Pick<Dialog, "showOpenDialog" | "showSaveDialog" | "showMessageBox">,
  ) =>
    Layer.succeed(
      ThemeFileDialogs,
      ThemeFileDialogs.of({
        chooseFileToImport: (parentWindow) =>
          Effect.tryPromise({
            try: () =>
              showModalOpenDialog(dialog, parentWindow, {
                title: "Import theme",
                properties: ["openFile"],
                filters: themeFileFilters,
              }),
            catch: (cause) => new ThemeFileDialogError({ cause }),
          }).pipe(Effect.map(({ filePaths }) => Option.fromUndefinedOr(filePaths[0]))),
        chooseExportFile: (parentWindow, suggestedFileName) =>
          Effect.tryPromise({
            try: () =>
              showModalSaveDialog(dialog, parentWindow, {
                title: "Export current theme",
                defaultPath: suggestedFileName,
                filters: themeFileFilters,
              }),
            catch: (cause) => new ThemeFileDialogError({ cause }),
          }).pipe(
            Effect.map(({ canceled, filePath }) =>
              canceled ? Option.none() : Option.some(filePath),
            ),
          ),
        confirmReplace: (parentWindow, theme) =>
          Effect.tryPromise({
            try: () =>
              showModalMessageBox(dialog, parentWindow, {
                type: "question",
                message: `Replace “${theme.name}” by ${theme.author}?`,
                detail: "You already imported a theme with this name and author.",
                buttons: ["Replace", "Cancel"],
                defaultId: 1,
                cancelId: 1,
              }),
            catch: (cause) => new ThemeFileDialogError({ cause }),
          }).pipe(Effect.map(({ response }) => response === 0)),
      }),
    )
}
