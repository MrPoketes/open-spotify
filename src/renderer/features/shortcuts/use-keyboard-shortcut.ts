import { use, useEffect, useEffectEvent } from "react"
import { hasShortcutModifier } from "../../ui/has-shortcut-modifier"
import { IsMacContext } from "./is-mac-context"
import { matchesKeyCombo } from "./key-combo"
import {
  shortcutKeys,
  windowShortcuts,
  type KeyboardShortcut,
  type WindowShortcutName,
} from "./keyboard-shortcuts"

const isTextEntry = (target: EventTarget | null) =>
  target instanceof HTMLElement &&
  (target.isContentEditable ||
    target.matches(
      "textarea, select, input:not([type='checkbox'], [type='radio'], [type='range'])",
    ))

// An open menu takes every key held without Ctrl, Alt, or Cmd: Space chooses
// the focused item and a letter jumps to one.
const isKeyForOpenMenu = (event: KeyboardEvent) =>
  event.target instanceof Element &&
  event.target.closest("[role=menu]") !== null &&
  !hasShortcutModifier(event)

// Space presses a focused button, flips a switch, and chooses a select's
// option, so a shortcut on Space gives way to them. Base UI draws switches and
// options as spans, so they are found by role. On a link Space only scrolls,
// and a focused radio button is already checked, so there the shortcut runs.
const isPressedBySpace = (target: EventTarget | null) =>
  target instanceof Element && target.matches("button, [role=switch], [role=option]")

const isKeyForFocusedElement = (event: KeyboardEvent) =>
  isTextEntry(event.target) ||
  isKeyForOpenMenu(event) ||
  (event.key === " " && isPressedBySpace(event.target))

// Runs the action when the user presses the shortcut's keys anywhere in the
// window, except while typing. Holding the keys down runs the action once,
// unless the shortcut repeats while held.
export function useKeyboardShortcut(
  name: WindowShortcutName,
  action: (event: KeyboardEvent) => void,
) {
  const isMac = use(IsMacContext)
  const runAction = useEffectEvent(action)

  useEffect(() => {
    const shortcut: KeyboardShortcut = windowShortcuts[name]
    const keys = shortcutKeys(shortcut, isMac)
    const runOnShortcut = (event: KeyboardEvent) => {
      const isIgnoredRepeat = event.repeat && shortcut.repeatsWhileHeld !== true
      if (isIgnoredRepeat || !matchesKeyCombo(event, keys, isMac)) {
        return
      }
      if (isKeyForFocusedElement(event)) {
        return
      }
      event.preventDefault()
      runAction(event)
    }
    window.addEventListener("keydown", runOnShortcut)
    return () => window.removeEventListener("keydown", runOnShortcut)
  }, [name, isMac])
}
