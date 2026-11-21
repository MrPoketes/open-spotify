import { use, useEffect, useEffectEvent } from "react"
import { IsMacContext } from "./is-mac-context"
import { matchesKeyCombo } from "./key-combo"
import { type KeyboardShortcutName, keyboardShortcuts, shortcutKeys } from "./keyboard-shortcuts"

const isTextEntry = (target: EventTarget | null) =>
  target instanceof HTMLElement &&
  (target.isContentEditable ||
    target.matches("textarea, select, input:not([type='checkbox'], [type='radio'])"))

const spacePressedControl = "button, input, [role='menuitem']"

// Space presses the focused button, radio button, or menu item, so a shortcut
// on Space gives way to it. A link only scrolls the page on Space, so it does
// not.
const isKeyForFocusedElement = (event: KeyboardEvent) =>
  isTextEntry(event.target) ||
  (event.key === " " &&
    event.target instanceof Element &&
    event.target.matches(spacePressedControl))

// Runs the action when the user presses the shortcut's keys anywhere in the
// window, except while typing. Holding the keys down runs the action once.
export function useKeyboardShortcut(name: KeyboardShortcutName, action: () => void) {
  const isMac = use(IsMacContext)
  const runAction = useEffectEvent(action)

  useEffect(() => {
    const keys = shortcutKeys(keyboardShortcuts[name], isMac)
    const runOnShortcut = (event: KeyboardEvent) => {
      if (event.repeat || !matchesKeyCombo(event, keys, isMac)) {
        return
      }
      if (isKeyForFocusedElement(event)) {
        return
      }
      event.preventDefault()
      runAction()
    }
    window.addEventListener("keydown", runOnShortcut)
    return () => window.removeEventListener("keydown", runOnShortcut)
  }, [name, isMac])
}
