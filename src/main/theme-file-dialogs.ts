import type { Dialog } from "electron"
import { Context, Effect, Layer, Option } from "effect"
import type { Theme } from "../shared/theme"

const themeFileFilters = [{ name: "Theme", extensions: ["json"] }]

// Takes Electron's dialog module as a parameter so that importing and
// exporting can be tested with fake answers in plain Node.
export class ThemeFileDialogs extends Context.Service<
  ThemeFileDialogs,
  {
    readonly chooseFileToImport: Effect.Effect<Option.Option<string>>
    readonly chooseExportFile: (suggestedFileName: string) => Effect.Effect<Option.Option<string>>
    readonly confirmReplace: (theme: Theme) => Effect.Effect<boolean>
  }
>()("open-spotify/ThemeFileDialogs") {
  static readonly layer = (
    dialog: Pick<Dialog, "showOpenDialog" | "showSaveDialog" | "showMessageBox">,
  ) =>
    Layer.succeed(
      ThemeFileDialogs,
      ThemeFileDialogs.of({
        chooseFileToImport: Effect.promise(() =>
          dialog.showOpenDialog({
            title: "Import theme",
            properties: ["openFile"],
            filters: themeFileFilters,
          }),
        ).pipe(Effect.map(({ filePaths }) => Option.fromUndefinedOr(filePaths[0]))),
        chooseExportFile: (suggestedFileName) =>
          Effect.promise(() =>
            dialog.showSaveDialog({
              title: "Export current theme",
              defaultPath: suggestedFileName,
              filters: themeFileFilters,
            }),
          ).pipe(
            Effect.map(({ canceled, filePath }) =>
              canceled ? Option.none() : Option.some(filePath),
            ),
          ),
        confirmReplace: (theme) =>
          Effect.promise(() =>
            dialog.showMessageBox({
              type: "question",
              message: `Replace “${theme.name}” by ${theme.author}?`,
              detail: "You already imported a theme with this name and author.",
              buttons: ["Replace", "Cancel"],
              defaultId: 1,
              cancelId: 1,
            }),
          ).pipe(Effect.map(({ response }) => response === 0)),
      }),
    )
}
