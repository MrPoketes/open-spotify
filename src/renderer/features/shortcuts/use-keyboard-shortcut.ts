import { use, useEffect, useEffectEvent } from "react"
import { IsMacContext } from "./is-mac-context"
import { matchesKeyCombo } from "./key-combo"
import { shortcutKeys, type WindowShortcutName, windowShortcuts } from "./keyboard-shortcuts"

const isTextEntry = (target: EventTarget | null) =>
  target instanceof HTMLElement &&
  (target.isContentEditable ||
    target.matches("textarea, select, input:not([type='checkbox'], [type='radio'])"))

// Space presses a focused button, so a shortcut on Space gives way to it. On
// a link Space only scrolls, and a focused radio button is already checked, so
// there the shortcut runs.
const isKeyForFocusedElement = (event: KeyboardEvent) =>
  isTextEntry(event.target) || (event.key === " " && event.target instanceof HTMLButtonElement)

// Runs the action when the user presses the shortcut's keys anywhere in the
// window, except while typing. Holding the keys down runs the action once.
export function useKeyboardShortcut(name: WindowShortcutName, action: () => void) {
  const isMac = use(IsMacContext)
  const runAction = useEffectEvent(action)

  useEffect(() => {
    const keys = shortcutKeys(windowShortcuts[name], isMac)
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
