import { Volume2, VolumeX } from "lucide-react"
import { PlayerControlButton } from "./player-control-button"
import type { PlayerStateOrLoading } from "./use-player-state"
import { useVolumeControl } from "./use-volume-control"

// Electron renders with Chromium, so the WebKit thumb pseudo-element reaches
// every slider. The input stays 24 px tall as a pointer target, and its
// background draws a 4 px track across the middle.
const sliderClassName =
  "h-6 w-24 cursor-pointer appearance-none bg-size-[100%_4px] bg-center bg-no-repeat aria-disabled:cursor-default aria-disabled:opacity-50 [&::-webkit-slider-thumb]:size-3 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-foreground"

// The track fills with the accent up to the thumb.
const trackFill = (volume: number) => ({
  backgroundImage: `linear-gradient(to right, var(--theme-color-accent) ${volume}%, var(--theme-color-muted) ${volume}%)`,
})

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
        <input
          type="range"
          min={0}
          max={100}
          step={1}
          value={volume}
          aria-label="Volume"
          aria-valuetext={`${volume}%`}
          aria-disabled={isUnavailable}
          title={unavailableReason ?? "Volume"}
          onChange={(event) => {
            if (!isUnavailable) {
              volumeControl.changeVolume(Number(event.target.value))
            }
          }}
          style={trackFill(volume)}
          className={sliderClassName}
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
