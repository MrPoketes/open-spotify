import type {
  BaseWindow,
  Dialog,
  MessageBoxOptions,
  OpenDialogOptions,
  SaveDialogOptions,
} from "electron"

// A dialog is modal to the window that asked for it, so the user cannot open
// a second dialog while the first is open. Electron reports no window
// for a request from web contents that have none.

export const showModalSaveDialog = (
  dialog: Pick<Dialog, "showSaveDialog">,
  parentWindow: BaseWindow | null,
  options: SaveDialogOptions,
) =>
  parentWindow === null
    ? dialog.showSaveDialog(options)
    : dialog.showSaveDialog(parentWindow, options)

export const showModalOpenDialog = (
  dialog: Pick<Dialog, "showOpenDialog">,
  parentWindow: BaseWindow | null,
  options: OpenDialogOptions,
) =>
  parentWindow === null
    ? dialog.showOpenDialog(options)
    : dialog.showOpenDialog(parentWindow, options)

export const showModalMessageBox = (
  dialog: Pick<Dialog, "showMessageBox">,
  parentWindow: BaseWindow | null,
  options: MessageBoxOptions,
) =>
  parentWindow === null
    ? dialog.showMessageBox(options)
    : dialog.showMessageBox(parentWindow, options)
