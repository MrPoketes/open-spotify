import { useState } from "react"
import { AccentButton } from "../../ui/accent-button"
import { LibraryEntryArtwork } from "../library/library-entry-artwork"
import type { PlaybackState } from "../spotify/spotify-playback-state"
import { DevicePicker } from "./device-picker"
import { PlaybackControls } from "./playback-controls"
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

export function NowPlayingBar() {
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
      <DevicePicker
        deviceLabel={deviceLabel(playerState)}
        isOpen={isPickerOpen}
        onOpenChange={setPickerOpen}
      />
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

  return <PlayingItem item={item} />
}

function PlayingItem({ item }: { readonly item: NonNullable<PlaybackState["item"]> }) {
  const isTrack = item.type === "track"
  return (
    <div className="flex min-w-0 items-center gap-3">
      <LibraryEntryArtwork
        kind={isTrack ? "album" : "show"}
        images={isTrack ? item.album.images : item.images}
      />
      <div className="flex min-w-0 flex-col">
        <p className="truncate text-sm">{item.name}</p>
        {isTrack && (
          <p className="truncate text-xs text-muted">
            {item.artists.map(({ name }) => name).join(", ")}
          </p>
        )}
      </div>
    </div>
  )
}
