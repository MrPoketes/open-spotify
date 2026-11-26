import { use, type KeyboardEvent } from "react"
import { IsMacContext } from "./is-mac-context"
import { ariaKeyShortcut, keyComboLabels, matchesKeyCombo } from "./key-combo"
import { rowShortcuts, shortcutKeys, type RowShortcutName } from "./keyboard-shortcuts"

// A row shortcut acts on the row that has focus, so the row checks its own
// keydown events instead of listening on the window.
export function useRowShortcut(name: RowShortcutName) {
  const isMac = use(IsMacContext)
  const keys = shortcutKeys(rowShortcuts[name], isMac)
  return {
    isPressed: (event: KeyboardEvent) => matchesKeyCombo(event.nativeEvent, keys, isMac),
    label: keyComboLabels(keys, isMac).join("+"),
    ariaKeyShortcuts: ariaKeyShortcut(keys, isMac),
  }
}
