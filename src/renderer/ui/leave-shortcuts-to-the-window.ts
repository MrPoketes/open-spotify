import type { BaseUIEvent } from "@base-ui/react/types"
import type { KeyboardEvent } from "react"
import { hasShortcutModifier } from "./has-shortcut-modifier"

// App-wide shortcuts, such as Alt+Left to go back or Ctrl+Down to turn the
// volume down, listen on the window, so a menu and its button leave keys held
// with Ctrl, Alt, or Cmd to them instead of letting Base UI act on them.
export const leaveShortcutsToTheWindow = (event: BaseUIEvent<KeyboardEvent>) => {
  if (hasShortcutModifier(event)) {
    event.preventBaseUIHandler()
  }
}
