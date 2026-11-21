import { useNowPlaying } from "../playback/use-now-playing"
import { usePlayerCommandFromPage } from "../playback/use-player-command-from-page"
import type { PlaybackStart } from "../spotify/spotify-player-requests"
import type { TrackListEntry } from "./track-row"

// Plays a list's tracks where the list says, and tells which of its rows
// holds the track that plays.
export function useTrackPlayback(playbackStartAt: (index: number) => PlaybackStart) {
  const playingTrackId = useNowPlaying()?.itemId ?? null
  const sendCommand = usePlayerCommandFromPage()

  return {
    isPlaying: (entry: TrackListEntry | undefined) =>
      playingTrackId !== null && entry?.trackId === playingTrackId,
    play: (index: number) =>
      sendCommand(
        (player) => player.startPlayback(playbackStartAt(index)),
        "Couldn't play this track.",
      ),
  }
}
