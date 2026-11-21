import type { PlaybackState, RepeatMode } from "../spotify/spotify-playback-state"
import { usePlayerCommand } from "./use-player-command"
import type { PlayerStateOrLoading } from "./use-player-state"

const nextRepeatMode: Record<RepeatMode, RepeatMode> = {
  off: "context",
  context: "track",
  track: "off",
}

const disallowedReason = "Spotify doesn't allow this right now."

const seekFailure = "Couldn't move to that position."

const unavailableReasons = {
  loading: "Checking what's playing…",
  unreachable: "Can't reach Spotify right now.",
  noActiveDevice: "Choose a device to control playback.",
} as const

export const unavailableReason = (playerState: PlayerStateOrLoading): string | null => {
  if (playerState.status !== "active") {
    return unavailableReasons[playerState.status]
  }
  if (playerState.playback.device.isRestricted) {
    return "Spotify doesn't allow controlling this device from other apps."
  }
  return null
}

// Stands in while there is no playback to control, so the controls keep
// their place and shape.
const idlePlayback: Pick<PlaybackState, "isPlaying" | "shuffle" | "repeat" | "actions"> = {
  isPlaying: false,
  shuffle: false,
  repeat: "off",
  actions: {},
}

export interface PlaybackAction<Arguments extends ReadonlyArray<unknown> = []> {
  // Why the action cannot run right now, or null when it can.
  readonly unavailableReason: string | null
  readonly run: (...args: Arguments) => void
}

// What the playback controls, the keyboard shortcuts, and the media keys can
// do, with one failure message for the last command any of them sent.
export function usePlaybackActions(playerState: PlayerStateOrLoading) {
  const { failure, send } = usePlayerCommand()
  const { isPlaying, shuffle, repeat, actions } =
    playerState.status === "active" ? playerState.playback : idlePlayback
  const disallows = actions.disallows ?? {}
  const playbackUnavailableReason = unavailableReason(playerState)
  const action = <Arguments extends ReadonlyArray<unknown>>(
    run: (...args: Arguments) => void,
    isDisallowed: boolean | undefined = false,
  ): PlaybackAction<Arguments> => ({
    unavailableReason: playbackUnavailableReason ?? (isDisallowed ? disallowedReason : null),
    run,
  })

  const play = action(() => send((player) => player.play, "Couldn't resume playback."))
  const pause = action(() => send((player) => player.pause, "Couldn't pause playback."))

  return {
    failure,
    isPlaying,
    shuffle,
    repeat,
    play,
    pause,
    playOrPause: isPlaying ? pause : play,
    previous: action(
      () => send((player) => player.skipToPrevious, "Couldn't go back."),
      disallows.skippingPrev,
    ),
    next: action(
      () => send((player) => player.skipToNext, "Couldn't skip to the next track."),
      disallows.skippingNext,
    ),
    toggleShuffle: action(
      () => send((player) => player.setShuffle(!shuffle), "Couldn't change shuffle."),
      disallows.togglingShuffle,
    ),
    seek: action(
      (positionMs: number) => send((player) => player.seek(positionMs), seekFailure),
      disallows.seeking,
    ),
    seekBy: action(
      (offsetMs: number) => send((player) => player.seekBy(offsetMs), seekFailure),
      disallows.seeking,
    ),
    // From off, repeat turns on for the context. From the other modes, it
    // turns on or off for the track.
    cycleRepeat: action(
      () => send((player) => player.setRepeat(nextRepeatMode[repeat]), "Couldn't change repeat."),
      repeat === "off" ? disallows.togglingRepeatContext : disallows.togglingRepeatTrack,
    ),
  }
}

export type PlaybackActions = ReturnType<typeof usePlaybackActions>
