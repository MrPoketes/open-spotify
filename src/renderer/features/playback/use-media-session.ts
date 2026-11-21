import { useEffect, useEffectEvent, useRef } from "react"
import { formatArtistNames } from "../spotify/format-artist-names"
import type { PlayableItem } from "../spotify/spotify-playable-item"
import type { PlaybackAction, PlaybackActions } from "./use-playback-actions"
import type { PlayerStateOrLoading } from "./use-player-state"
import { useSilentClip } from "./use-silent-clip"

const mediaKeyActions = ["play", "pause", "nexttrack", "previoustrack"] as const

type MediaKeyAction = (typeof mediaKeyActions)[number]

const mediaMetadata = (item: PlayableItem) => {
  const isTrack = item.type === "track"
  const images = isTrack ? item.album.images : item.images
  return new MediaMetadata({
    title: item.name,
    artist: isTrack ? formatArtistNames(item.artists) : "Podcast episode",
    album: isTrack ? item.album.name : "",
    artwork: images.map(({ url, width, height }) =>
      width === null || height === null ? { src: url } : { src: url, sizes: `${width}x${height}` },
    ),
  })
}

const playbackState = (isActive: boolean, isPlaying: boolean): MediaSessionPlaybackState => {
  if (!isActive) {
    return "none"
  }
  return isPlaying ? "playing" : "paused"
}

// Lets the operating system's media keys control playback, even while the
// window is in the background, and shows what plays in its media overlay.
export function useMediaSession(playerState: PlayerStateOrLoading, playback: PlaybackActions) {
  const isActive = playerState.status === "active"
  const item = isActive ? playerState.playback.item : null
  const shownItemUri = useRef<string | null>(null)
  useSilentClip(isActive, playback.isPlaying)

  const pressMediaKey = useEffectEvent((action: MediaKeyAction) => {
    const playbackActions: Record<MediaKeyAction, PlaybackAction> = {
      play: playback.play,
      pause: playback.pause,
      nexttrack: playback.next,
      previoustrack: playback.previous,
    }
    const { unavailableReason, run } = playbackActions[action]
    if (unavailableReason === null) {
      run()
    }
  })

  useEffect(() => {
    for (const action of mediaKeyActions) {
      navigator.mediaSession.setActionHandler(action, () => pressMediaKey(action))
    }
    return () => {
      for (const action of mediaKeyActions) {
        navigator.mediaSession.setActionHandler(action, null)
      }
      navigator.mediaSession.metadata = null
      shownItemUri.current = null
    }
  }, [])

  // Polls decode a new item every time, so the operating system would
  // otherwise get new metadata every two seconds.
  useEffect(() => {
    const itemUri = item?.uri ?? null
    if (itemUri === shownItemUri.current) {
      return
    }
    shownItemUri.current = itemUri
    navigator.mediaSession.metadata = item === null ? null : mediaMetadata(item)
  }, [item])

  useEffect(() => {
    navigator.mediaSession.playbackState = playbackState(isActive, playback.isPlaying)
  }, [isActive, playback.isPlaying])
}
