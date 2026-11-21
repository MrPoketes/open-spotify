import { Effect } from "effect"
import { useEffect, useRef, useState } from "react"
import { unavailableReason } from "./use-playback-actions"
import { usePlayerCommand } from "./use-player-command"
import type { PlayerStateOrLoading } from "./use-player-state"

// Long enough that a drag or a held arrow key sends one request, short enough
// that the device follows the slider closely.
const settlePauseMs = 250

// Used when Spotify has reported no volume above zero since the app opened, so
// there is no earlier volume to go back to.
const unmuteFallbackVolume = 50

const volumeUnavailableReason = (playerState: PlayerStateOrLoading) => {
  const playbackUnavailableReason = unavailableReason(playerState)
  if (playbackUnavailableReason !== null) {
    return playbackUnavailableReason
  }
  if (playerState.status === "active" && !playerState.playback.device.supportsVolume) {
    return "This device doesn't let Spotify change its volume."
  }
  return null
}

// The volume of the active device, which the slider changes once it settles
// and mute turns down to zero and back.
export function useVolumeControl(playerState: PlayerStateOrLoading) {
  const { failure, send } = usePlayerCommand()
  // What the slider shows while the user moves it and until its request ends.
  const [draftVolume, setDraftVolume] = useState<number | null>(null)
  const pendingSend = useRef<ReturnType<typeof setTimeout>>(undefined)
  const lastAudibleVolume = useRef(unmuteFallbackVolume)
  const reportedVolume =
    playerState.status === "active" ? playerState.playback.device.volumePercent : null
  // Spotify can report no volume, which the slider shows as zero.
  const volume = draftVolume ?? reportedVolume ?? 0

  useEffect(() => {
    if (reportedVolume !== null && reportedVolume > 0) {
      lastAudibleVolume.current = reportedVolume
    }
  }, [reportedVolume])

  useEffect(() => () => clearTimeout(pendingSend.current), [])

  // Once the request ends, the player state shows the volume Spotify
  // accepted, or the one from before it rejected the change. A draft the user
  // made since then stays.
  const sendVolume = (volumePercent: number) => {
    clearTimeout(pendingSend.current)
    setDraftVolume(volumePercent)
    const forgetDraft = Effect.sync(() =>
      setDraftVolume((draft) => (draft === volumePercent ? null : draft)),
    )
    send(
      (player) => player.setVolume(volumePercent).pipe(Effect.ensuring(forgetDraft)),
      "Couldn't change the volume.",
    )
  }

  const changeVolume = (volumePercent: number) => {
    setDraftVolume(volumePercent)
    clearTimeout(pendingSend.current)
    pendingSend.current = setTimeout(() => sendVolume(volumePercent), settlePauseMs)
  }

  // With no device there is nothing to unmute, so the button offers Mute.
  const isMuted = playerState.status === "active" && volume === 0

  return {
    volume,
    isMuted,
    unavailableReason: volumeUnavailableReason(playerState),
    failure,
    changeVolume,
    toggleMute: () => sendVolume(isMuted ? lastAudibleVolume.current : 0),
  }
}
