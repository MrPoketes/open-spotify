import { usePlayerState } from "./use-player-state"

interface NowPlaying {
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
  const { context, isPlaying } = playerState.playback
  return { contextUri: context?.uri ?? null, isPlaying }
}
