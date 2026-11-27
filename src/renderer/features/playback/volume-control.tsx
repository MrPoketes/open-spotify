import { Volume2, VolumeX } from "lucide-react"
import { clamp } from "../../lib/clamp"
import { Slider } from "../../ui/slider"
import { PlayerControlButton } from "./player-control-button"
import { usePlaybackShortcut } from "./use-playback-shortcut"
import type { PlayerStateOrLoading } from "./use-player-state"
import { useVolumeControl } from "./use-volume-control"

const shortcutStepPercent = 10

interface VolumeControlProps {
  readonly playerState: PlayerStateOrLoading
}

// Like the playback controls, an unavailable slider is aria-disabled rather
// than disabled, so it stays focusable and its title says why.
export function VolumeControl({ playerState }: VolumeControlProps) {
  const volumeControl = useVolumeControl(playerState)
  const { volume, isMuted, unavailableReason, failure } = volumeControl

  // The slider shows each step at once and sends the volume once the presses
  // stop, so quick presses and a held key add up to one request. At 0 or 100
  // there is nothing to send.
  const volumeShortcut = (stepPercent: number) => ({
    unavailableReason,
    run: () => {
      const targetVolume = clamp(volume + stepPercent, 0, 100)
      if (targetVolume !== volume) {
        volumeControl.changeVolume(targetVolume)
      }
    },
  })
  usePlaybackShortcut("volumeUp", volumeShortcut(shortcutStepPercent))
  usePlaybackShortcut("volumeDown", volumeShortcut(-shortcutStepPercent))

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
        <Slider
          label="Volume"
          valueText={`${volume}%`}
          unavailableReason={unavailableReason}
          max={100}
          step={1}
          value={volume}
          onValueChange={volumeControl.changeVolume}
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
