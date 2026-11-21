import { Stream } from "effect"
import { useStreamValue } from "../../lib/use-stream-value"
import { playerStates } from "./use-player-state"

// Every poll is a new player state, every two seconds, but the playing item
// changes far less often. A list that marks the playing row reads only its
// id, so a poll that finds the same item does not re-render every row.
const playingItemIds = playerStates.pipe(
  Stream.map((playerState) =>
    playerState.status === "active" ? (playerState.playback.item?.id ?? null) : null,
  ),
  Stream.changes,
)

// What the active device plays or has paused. Null while there is no active
// device, when Spotify cannot say what plays, or for a local file.
export function usePlayingItemId(): string | null {
  return useStreamValue(playingItemIds, null)
}
