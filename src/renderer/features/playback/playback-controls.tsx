import { Pause, Play, Repeat, Repeat1, Shuffle, SkipBack, SkipForward } from "lucide-react"
import { PlayerControlButton } from "./player-control-button"
import { useMediaSession } from "./use-media-session"
import { usePlaybackActions } from "./use-playback-actions"
import { usePlaybackShortcuts } from "./use-playback-shortcuts"
import { SeekBar } from "./seek-bar"
import type { PlayerStateOrLoading } from "./use-player-state"

interface PlaybackControlsProps {
  readonly playerState: PlayerStateOrLoading
}

export function PlaybackControls({ playerState }: PlaybackControlsProps) {
  const playback = usePlaybackActions(playerState)
  usePlaybackShortcuts(playback)
  useMediaSession(playerState, playback)
  const { isPlaying, shuffle, repeat, failure } = playback

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="flex items-center gap-2">
        <PlayerControlButton
          label="Shuffle"
          icon={Shuffle}
          isOn={shuffle}
          unavailableReason={playback.toggleShuffle.unavailableReason}
          onPress={playback.toggleShuffle.run}
        />
        <PlayerControlButton
          label="Previous"
          icon={SkipBack}
          unavailableReason={playback.previous.unavailableReason}
          onPress={playback.previous.run}
        />
        <PlayerControlButton
          label={isPlaying ? "Pause" : "Play"}
          icon={isPlaying ? Pause : Play}
          isPrimary
          unavailableReason={playback.playOrPause.unavailableReason}
          onPress={playback.playOrPause.run}
        />
        <PlayerControlButton
          label="Next"
          icon={SkipForward}
          unavailableReason={playback.next.unavailableReason}
          onPress={playback.next.run}
        />
        <PlayerControlButton
          label={repeat === "track" ? "Repeat one track" : "Repeat"}
          icon={repeat === "track" ? Repeat1 : Repeat}
          isOn={repeat !== "off"}
          unavailableReason={playback.cycleRepeat.unavailableReason}
          onPress={playback.cycleRepeat.run}
        />
      </div>
      <SeekBar
        unavailableReason={playback.seek.unavailableReason}
        onSeek={playback.seek.run}
        onSeekBy={playback.seekBy.run}
      />
      {failure !== null && (
        <p role="alert" className="text-xs text-danger">
          {failure}
        </p>
      )}
    </div>
  )
}
