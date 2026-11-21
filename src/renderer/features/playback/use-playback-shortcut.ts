import { useShowStatusMessage } from "../../ui/status-message-context"
import type { WindowShortcutName } from "../shortcuts/keyboard-shortcuts"
import { useKeyboardShortcut } from "../shortcuts/use-keyboard-shortcut"
import type { PlaybackAction } from "./use-playback-actions"

// A control that cannot be used says why in its tooltip, which a keyboard
// user who never looked at it would miss, so its shortcut shows it as a
// status message.
export function usePlaybackShortcut(
  name: WindowShortcutName,
  { unavailableReason, run }: PlaybackAction,
) {
  const showStatusMessage = useShowStatusMessage()

  useKeyboardShortcut(name, () => {
    if (unavailableReason !== null) {
      showStatusMessage({ text: unavailableReason, isFailure: true })
      return
    }
    run()
  })
}
