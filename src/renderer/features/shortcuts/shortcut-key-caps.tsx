import { keyComboLabels } from "./key-combo"
import { shortcutKeys, type KeyboardShortcut } from "./keyboard-shortcuts"

interface ShortcutKeyCapsProps {
  readonly shortcut: KeyboardShortcut
  readonly isMac: boolean
}

// The keys of a shortcut as this platform names them, each set like a key cap.
export function ShortcutKeyCaps({ shortcut, isMac }: ShortcutKeyCapsProps) {
  return keyComboLabels(shortcutKeys(shortcut, isMac), isMac).map((label) => (
    <kbd
      key={label}
      className="min-w-6 rounded-small bg-surface-raised px-2 text-center text-xs font-semibold"
    >
      {label}
    </kbd>
  ))
}
