import { Volume2, VolumeX } from "lucide-react"
import { RangeSlider } from "../../ui/range-slider"
import { PlayerControlButton } from "./player-control-button"
import type { PlayerStateOrLoading } from "./use-player-state"
import { useVolumeControl } from "./use-volume-control"

interface VolumeControlProps {
  readonly playerState: PlayerStateOrLoading
}

// Like the playback controls, an unavailable slider is aria-disabled rather
// than disabled, so it stays focusable and its title says why.
export function VolumeControl({ playerState }: VolumeControlProps) {
  const volumeControl = useVolumeControl(playerState)
  const { volume, isMuted, unavailableReason, failure } = volumeControl
  const isUnavailable = unavailableReason !== null

  return (
    // The alert hangs below the controls, so it does not push the queue
    // button and the device picker aside when it appears.
    <div className="relative flex items-center gap-1">
      <PlayerControlButton
        label={isMuted ? "Unmute" : "Mute"}
        icon={isMuted ? VolumeX : Volume2}
        unavailableReason={unavailableReason}
        onPress={volumeControl.toggleMute}
      />
      <div className="flex w-24">
        <RangeSlider
          filledFraction={volume / 100}
          aria-label="Volume"
          aria-valuetext={`${volume}%`}
          aria-disabled={isUnavailable}
          title={unavailableReason ?? "Volume"}
          min={0}
          max={100}
          step={1}
          value={volume}
          onChange={(event) => {
            if (!isUnavailable) {
              volumeControl.changeVolume(event.target.valueAsNumber)
            }
          }}
        />
      </div>
      {failure !== null && (
        <p
          role="alert"
          className="absolute top-full right-0 mt-1 text-xs whitespace-nowrap text-danger"
        >
          {failure}
        </p>
      )}
    </div>
  )
}
