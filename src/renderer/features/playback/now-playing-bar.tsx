import { ListMusic } from "lucide-react"
import { type RefObject, useState } from "react"
import { AccentButton } from "../../ui/accent-button"
import { DevicePicker } from "./device-picker"
import { PlayableItemSummary } from "./playable-item-summary"
import { PlaybackControls } from "./playback-controls"
import { PlayerControlButton } from "./player-control-button"
import { type PlayerStateOrLoading, usePlayerState } from "./use-player-state"

const deviceLabel = (playerState: PlayerStateOrLoading) => {
  if (playerState.status === "active") {
    return `Playing on ${playerState.playback.device.name}`
  }
  if (playerState.status === "noActiveDevice") {
    return "No active device"
  }
  return "Devices"
}

interface NowPlayingBarProps {
  readonly isQueueOpen: boolean
  readonly onQueueToggle: () => void
  readonly queueButtonRef: RefObject<HTMLButtonElement | null>
}

export function NowPlayingBar({ isQueueOpen, onQueueToggle, queueButtonRef }: NowPlayingBarProps) {
  const playerState = usePlayerState()
  const [isPickerOpen, setPickerOpen] = useState(false)

  return (
    <section
      aria-label="Now playing"
      className="grid h-18 shrink-0 grid-cols-[1fr_auto_1fr] items-center gap-4 rounded-medium bg-surface-raised px-4 shadow-raised"
    >
      <div className="min-w-0">
        <NowPlayingSummary playerState={playerState} onChooseDevice={() => setPickerOpen(true)} />
      </div>
      <PlaybackControls playerState={playerState} />
      <div className="flex items-center justify-end gap-2">
        <PlayerControlButton
          ref={queueButtonRef}
          label="Queue"
          icon={ListMusic}
          isOn={isQueueOpen}
          unavailableReason={null}
          onPress={onQueueToggle}
        />
        <DevicePicker
          deviceLabel={deviceLabel(playerState)}
          isOpen={isPickerOpen}
          onOpenChange={setPickerOpen}
        />
      </div>
    </section>
  )
}

interface NowPlayingSummaryProps {
  readonly playerState: PlayerStateOrLoading
  readonly onChooseDevice: () => void
}

function NowPlayingSummary({ playerState, onChooseDevice }: NowPlayingSummaryProps) {
  if (playerState.status === "loading") {
    return null
  }

  if (playerState.status === "unreachable") {
    return <p className="text-sm text-muted">Can't reach Spotify right now.</p>
  }

  if (playerState.status === "noActiveDevice") {
    return (
      <div className="flex min-w-0 items-center gap-4">
        <div className="flex min-w-0 flex-col">
          <p className="text-sm font-semibold">No device is playing</p>
          <p className="text-xs text-muted">Audio plays in the Spotify app or on another device.</p>
        </div>
        <div className="shrink-0">
          <AccentButton label="Choose a device" onClick={onChooseDevice} />
        </div>
      </div>
    )
  }

  const { item } = playerState.playback
  if (item === null) {
    return <p className="text-sm text-muted">Nothing is playing</p>
  }

  return <PlayableItemSummary item={item} />
}
