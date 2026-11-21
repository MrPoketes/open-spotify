// jsdom's window is always visible, so a test hides or shows it as Electron
// does when the window is minimized or restored. A test that hides it shows
// it again afterwards, or the next test starts with a hidden window.
export const setWindowVisibility = (visibility: DocumentVisibilityState) => {
  Object.defineProperty(document, "visibilityState", { configurable: true, value: visibility })
  document.dispatchEvent(new Event("visibilitychange"))
}
