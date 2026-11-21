import { usePlayerCommandFromPage } from "../playback/use-player-command-from-page"
import { usePlayingItemId } from "../playback/use-playing-item-id"
import type { PlaybackStart } from "../spotify/spotify-player-requests"
import type { TrackListEntry } from "./track-row"

// Plays a list's tracks where the list says, and tells which of its rows
// holds the track that the active device plays or has paused.
export function useTrackPlayback(playbackStartAt: (index: number) => PlaybackStart) {
  const playingTrackId = usePlayingItemId()
  const sendCommand = usePlayerCommandFromPage()

  return {
    isCurrentItem: (entry: TrackListEntry | undefined) =>
      playingTrackId !== null && entry?.trackId === playingTrackId,
    play: (index: number) =>
      sendCommand(
        (player) => player.startPlayback(playbackStartAt(index)),
        "Couldn't play this track.",
      ),
  }
}
