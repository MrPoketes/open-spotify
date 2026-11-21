import { Effect, Option } from "effect"
import type { SpotifyApi } from "../spotify/spotify-api"
import { spotifyApiFakeWith } from "../spotify/spotify-api-fake"
import type { PlaybackState } from "../spotify/spotify-playback-state"

// Paused playback keeps the position still, so the times a test reads do not
// move on while it runs. The fake's first track stays at 0:42 of 2:30, and
// 2:30 divides evenly into the seek bar's page steps.
type PlaybackChange = (playback: PlaybackState) => PlaybackState

const unchanged: PlaybackChange = (playback) => playback

export const pausedPlaybackWithSeek = (
  seek: (spotify: SpotifyApi["Service"]) => SpotifyApi["Service"]["seek"],
  change: PlaybackChange = unchanged,
) =>
  spotifyApiFakeWith((spotify) => ({
    getPlaybackState: spotify.getPlaybackState.pipe(
      Effect.map(Option.map((playback) => ({ ...change(playback), isPlaying: false }))),
    ),
    seek: seek(spotify),
  }))

export const pausedPlayback = pausedPlaybackWithSeek((spotify) => spotify.seek)

export const pausedPlaybackRecordingSeeks = (change: PlaybackChange = unchanged) => {
  const seekPositions: Array<number> = []
  const spotifyApi = pausedPlaybackWithSeek(
    (spotify) => (positionMs) => {
      seekPositions.push(positionMs)
      return spotify.seek(positionMs)
    },
    change,
  )
  return { seekPositions, spotifyApi }
}

export const lastingMs =
  (durationMs: number): PlaybackChange =>
  (playback) =>
    playback.item === null ? playback : { ...playback, item: { ...playback.item, durationMs } }
