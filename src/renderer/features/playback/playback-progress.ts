import type { PlaybackState } from "../spotify/spotify-playback-state"

// The playback state, and when on the local clock its progress was true.
export interface TimedPlayback {
  readonly playback: PlaybackState
  readonly progressReadAt: number
}

export interface PlaybackProgress {
  readonly positionMs: number
  readonly durationMs: number
}

// Spotify reports the position only when it is polled, so between polls it
// is worked out from the time that has passed while playing.
export const positionAt = ({ playback, progressReadAt }: TimedPlayback, now: number) => {
  if (playback.progressMs === null) {
    return null
  }
  const elapsedMs = playback.isPlaying ? now - progressReadAt : 0
  return playback.progressMs + elapsedMs
}

export const progressAt = (timedPlayback: TimedPlayback, now: number): PlaybackProgress | null => {
  const { item } = timedPlayback.playback
  const positionMs = positionAt(timedPlayback, now)
  if (item === null || positionMs === null) {
    return null
  }
  return { positionMs: Math.min(positionMs, item.durationMs), durationMs: item.durationMs }
}
