import type { PlaybackActions } from "./use-playback-actions"
import { usePlaybackShortcut } from "./use-playback-shortcut"

export function usePlaybackShortcuts(playback: PlaybackActions) {
  usePlaybackShortcut("playOrPause", playback.playOrPause)
  usePlaybackShortcut("nextTrack", playback.next)
  usePlaybackShortcut("previousTrack", playback.previous)
  usePlaybackShortcut("toggleShuffle", playback.toggleShuffle)
  usePlaybackShortcut("cycleRepeat", playback.cycleRepeat)
}
