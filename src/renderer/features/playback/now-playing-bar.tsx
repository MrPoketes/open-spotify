import { Navigate } from "@tanstack/react-router"
import { ListMusic } from "lucide-react"
import { use, type RefObject } from "react"
import { ArtworkWash } from "../../ui/artwork-wash"
import { Button } from "../../ui/button"
import { loginDestinationFor } from "../login/login-destination"
import type { SpotifyAccessDenied, SpotifyApiError } from "../spotify/spotify-api"
import { SpotifyDashboardLink } from "../spotify/spotify-dashboard-link"
import { spotifyErrorDetail } from "../spotify/spotify-error-detail"
import { shownDeviceName } from "../this-computer/this-computer-device"
import { ThisComputerDeviceIdContext } from "../this-computer/this-computer-device-id-context"
import { DevicePicker } from "./device-picker"
import { NowPlayingItemSummary } from "./now-playing-item-summary"
import { playableItemArtwork } from "./playable-item-description"
import { PlaybackControls } from "./playback-controls"
import { PlayerControlButton } from "./player-control-button"
import { usePlayerState, type PlayerStateOrLoading } from "./use-player-state"
import { VolumeControl } from "./volume-control"

const deviceLabel = (playerState: PlayerStateOrLoading, thisComputerDeviceId: string | null) => {
  if (playerState.status === "active") {
    return `Playing on ${shownDeviceName(playerState.playback.device, thisComputerDeviceId)}`
  }
  if (playerState.status === "noActiveDevice") {
    return "No active device"
  }
  return "Devices"
}

const playingArtwork = (playerState: PlayerStateOrLoading) => {
  if (playerState.status !== "active" || playerState.playback.item === null) {
    return []
  }
  return playableItemArtwork(playerState.playback.item)
}

interface NowPlayingBarProps {
  readonly isQueueOpen: boolean
  readonly onQueueToggle: () => void
  readonly queueButtonRef: RefObject<HTMLButtonElement | null>
  // The app shell holds whether the picker is open, because playing from a
  // page with no active device opens it too.
  readonly isDevicePickerOpen: boolean
  readonly onDevicePickerOpenChange: (isOpen: boolean) => void
}

export function NowPlayingBar({
  isQueueOpen,
  onQueueToggle,
  queueButtonRef,
  isDevicePickerOpen,
  onDevicePickerOpenChange,
}: NowPlayingBarProps) {
  const playerState = usePlayerState()
  const thisComputerDeviceId = use(ThisComputerDeviceIdContext)

  return (
    <section
      aria-label="Now playing"
      className="relative isolate grid h-20 shrink-0 grid-cols-[1fr_auto_1fr] items-center gap-4 px-3"
    >
      <ArtworkWash placement="nowPlaying" sources={playingArtwork(playerState)} />
      <div className="min-w-0">
        <NowPlayingSummary
          playerState={playerState}
          onChooseDevice={() => onDevicePickerOpenChange(true)}
        />
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
          deviceLabel={deviceLabel(playerState, thisComputerDeviceId)}
          isOpen={isDevicePickerOpen}
          onOpenChange={onDevicePickerOpenChange}
        />
        <VolumeControl playerState={playerState} />
      </div>
    </section>
  )
}

function UnreachableAccessDenied({ error }: { readonly error: SpotifyAccessDenied }) {
  const detail = spotifyErrorDetail(error)
  const heading =
    error.denial === "userNotRegistered"
      ? "Account not added under User Management."
      : "Spotify Premium is required."
  return (
    <div role="alert" className="flex min-w-0 flex-col">
      <p className="truncate text-sm">
        {heading} <SpotifyDashboardLink />
      </p>
      <p className="truncate text-xs text-muted" title={detail}>
        {detail}
      </p>
    </div>
  )
}

function UnreachableSummary({ error }: { readonly error: SpotifyApiError }) {
  const destination = loginDestinationFor(error)
  if (destination !== null) {
    return <Navigate {...destination} />
  }
  if (error._tag === "SpotifyAccessDenied") {
    return <UnreachableAccessDenied error={error} />
  }
  const detail = spotifyErrorDetail(error)
  return (
    <div className="flex min-w-0 flex-col">
      <p className="text-sm text-muted">Can&apos;t reach Spotify right now.</p>
      <p className="truncate text-xs text-muted" title={detail}>
        {detail}
      </p>
    </div>
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
    return <UnreachableSummary error={playerState.error} />
  }

  if (playerState.status === "noActiveDevice") {
    return (
      <div className="flex min-w-0 items-center gap-4">
        <div className="flex min-w-0 flex-col">
          <p className="text-sm font-semibold">No device is playing</p>
          <p className="text-xs text-muted">Audio plays in the Spotify app or on another device.</p>
        </div>
        <div className="shrink-0">
          <Button onClick={onChooseDevice}>Choose a device</Button>
        </div>
      </div>
    )
  }

  const { item } = playerState.playback
  if (item === null) {
    return <p className="text-sm text-muted">Nothing is playing</p>
  }

  return <NowPlayingItemSummary item={item} />
}
