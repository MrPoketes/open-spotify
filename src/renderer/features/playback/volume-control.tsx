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
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-1">
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
      </div>
      {failure !== null && (
        <p role="alert" className="text-xs text-danger">
          {failure}
        </p>
      )}
    </div>
  )
}
