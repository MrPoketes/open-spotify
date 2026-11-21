import { usePlayerState } from "./use-player-state"

interface NowPlaying {
  // Null when Spotify cannot say what plays, or for a local file.
  readonly itemId: string | null
  // Null when what plays is not a context, such as Liked Songs.
  readonly contextUri: string | null
  readonly isPlaying: boolean
}

// What the active device plays, or null while there is no active device.
export function useNowPlaying(): NowPlaying | null {
  const playerState = usePlayerState()
  if (playerState.status !== "active") {
    return null
  }
  const { item, context, isPlaying } = playerState.playback
  return { itemId: item?.id ?? null, contextUri: context?.uri ?? null, isPlaying }
}
