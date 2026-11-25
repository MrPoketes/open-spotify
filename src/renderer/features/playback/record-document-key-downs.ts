import { onTestFinished } from "vitest"

// Runs after React's root handler and before window shortcut listeners so
// slider tests can check which key presses Chromium's own step is held back for.
export function recordDocumentKeyDowns() {
  const keyDowns: Array<readonly [string, boolean]> = []
  const recordKeyDown = (event: KeyboardEvent) => {
    keyDowns.push([event.key, event.defaultPrevented])
  }
  document.addEventListener("keydown", recordKeyDown)
  onTestFinished(() => document.removeEventListener("keydown", recordKeyDown))
  return keyDowns
}
