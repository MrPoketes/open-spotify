import { Effect, Option, Schema } from "effect"
import type {
  BaseWindow,
  Dialog,
  MessageBoxOptions,
  OpenDialogOptions,
  SaveDialogOptions,
} from "electron"

export class ModalDialogError extends Schema.TaggedError<ModalDialogError>()("ModalDialogError", {
  cause: Schema.Defect(),
}) {}

// A dialog is modal to the window that asked for it, so the user cannot open
// a second dialog while the first is open. Electron reports no window
// for a request from web contents that have none.

export const choosePathToOpen = (
  dialog: Pick<Dialog, "showOpenDialog">,
  parentWindow: BaseWindow | null,
  options: Pick<OpenDialogOptions, "title" | "filters">,
) =>
  Effect.tryPromise({
    try: () => {
      const openFileOptions: OpenDialogOptions = { ...options, properties: ["openFile"] }
      return parentWindow === null
        ? dialog.showOpenDialog(openFileOptions)
        : dialog.showOpenDialog(parentWindow, openFileOptions)
    },
    catch: (cause) => new ModalDialogError({ cause }),
  }).pipe(
    Effect.map(({ canceled, filePaths }) =>
      canceled ? Option.none() : Option.fromUndefinedOr(filePaths[0]),
    ),
  )

export const choosePathToSave = (
  dialog: Pick<Dialog, "showSaveDialog">,
  parentWindow: BaseWindow | null,
  options: Pick<SaveDialogOptions, "title" | "filters" | "defaultPath">,
) =>
  Effect.tryPromise({
    try: () =>
      parentWindow === null
        ? dialog.showSaveDialog(options)
        : dialog.showSaveDialog(parentWindow, options),
    catch: (cause) => new ModalDialogError({ cause }),
  }).pipe(
    Effect.map(({ canceled, filePath }) => (canceled ? Option.none() : Option.some(filePath))),
  )

export const chooseMessageBoxButton = (
  dialog: Pick<Dialog, "showMessageBox">,
  parentWindow: BaseWindow | null,
  options: MessageBoxOptions,
) =>
  Effect.tryPromise({
    try: () =>
      parentWindow === null
        ? dialog.showMessageBox(options)
        : dialog.showMessageBox(parentWindow, options),
    catch: (cause) => new ModalDialogError({ cause }),
  }).pipe(Effect.map(({ response }) => response))
