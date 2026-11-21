import { useShowStatusMessage } from "../../ui/status-message-context"
import { useKeyboardShortcut } from "../shortcuts/use-keyboard-shortcut"
import type { PlaybackAction, PlaybackActions } from "./use-playback-actions"

export function usePlaybackShortcuts(playback: PlaybackActions) {
  const showStatusMessage = useShowStatusMessage()

  // A control that cannot be used says why in its tooltip, which a keyboard
  // user who never looked at it would miss.
  const runOrSayWhyNot = ({ unavailableReason, run }: PlaybackAction) => {
    if (unavailableReason !== null) {
      showStatusMessage({ text: unavailableReason, isFailure: true })
      return
    }
    run()
  }

  useKeyboardShortcut("playOrPause", () => runOrSayWhyNot(playback.playOrPause))
  useKeyboardShortcut("nextTrack", () => runOrSayWhyNot(playback.next))
  useKeyboardShortcut("previousTrack", () => runOrSayWhyNot(playback.previous))
  useKeyboardShortcut("toggleShuffle", () => runOrSayWhyNot(playback.toggleShuffle))
  useKeyboardShortcut("cycleRepeat", () => runOrSayWhyNot(playback.cycleRepeat))
}
