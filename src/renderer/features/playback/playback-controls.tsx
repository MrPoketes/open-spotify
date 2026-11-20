import { Pause, Play, Repeat, Repeat1, Shuffle, SkipBack, SkipForward } from "lucide-react"
import type { PlaybackState, RepeatMode } from "../spotify/spotify-playback-state"
import { PlayerControlButton } from "./player-control-button"
import { usePlayerCommand } from "./use-player-command"
import type { PlayerStateOrLoading } from "./use-player-state"

const nextRepeatMode: Record<RepeatMode, RepeatMode> = {
  off: "context",
  context: "track",
  track: "off",
}

const disallowedReason = "Spotify doesn't allow this right now."

const unavailableReasons = {
  loading: "Checking what's playing…",
  unreachable: "Can't reach Spotify right now.",
  noActiveDevice: "Choose a device to control playback.",
} as const

const unavailableReason = (playerState: PlayerStateOrLoading): string | null => {
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

interface PlaybackControlsProps {
  readonly playerState: PlayerStateOrLoading
}

export function PlaybackControls({ playerState }: PlaybackControlsProps) {
  const { failure, send } = usePlayerCommand()
  const { isPlaying, shuffle, repeat, actions } =
    playerState.status === "active" ? playerState.playback : idlePlayback
  const disallows = actions.disallows ?? {}
  const controlsUnavailableReason = unavailableReason(playerState)
  const unavailableReasonFor = (isDisallowed: boolean | undefined) =>
    controlsUnavailableReason ?? (isDisallowed === true ? disallowedReason : null)

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="flex items-center gap-2">
        <PlayerControlButton
          label="Shuffle"
          icon={Shuffle}
          isOn={shuffle}
          unavailableReason={unavailableReasonFor(disallows.togglingShuffle)}
          onPress={() => send((player) => player.setShuffle(!shuffle), "Couldn't change shuffle.")}
        />
        <PlayerControlButton
          label="Previous"
          icon={SkipBack}
          unavailableReason={unavailableReasonFor(disallows.skippingPrev)}
          onPress={() => send((player) => player.skipToPrevious, "Couldn't go back.")}
        />
        <PlayerControlButton
          label={isPlaying ? "Pause" : "Play"}
          icon={isPlaying ? Pause : Play}
          isPrimary
          unavailableReason={controlsUnavailableReason}
          onPress={() =>
            isPlaying
              ? send((player) => player.pause, "Couldn't pause playback.")
              : send((player) => player.play, "Couldn't resume playback.")
          }
        />
        <PlayerControlButton
          label="Next"
          icon={SkipForward}
          unavailableReason={unavailableReasonFor(disallows.skippingNext)}
          onPress={() => send((player) => player.skipToNext, "Couldn't skip to the next track.")}
        />
        <PlayerControlButton
          label={repeat === "track" ? "Repeat one track" : "Repeat"}
          icon={repeat === "track" ? Repeat1 : Repeat}
          isOn={repeat !== "off"}
          // From off, a press turns on repeat for the context. From the other
          // modes, it turns repeat for the track on or off.
          unavailableReason={unavailableReasonFor(
            repeat === "off" ? disallows.togglingRepeatContext : disallows.togglingRepeatTrack,
          )}
          onPress={() =>
            send((player) => player.setRepeat(nextRepeatMode[repeat]), "Couldn't change repeat.")
          }
        />
      </div>
      {failure !== null && (
        <p role="alert" className="text-xs text-danger">
          {failure}
        </p>
      )}
    </div>
  )
}
