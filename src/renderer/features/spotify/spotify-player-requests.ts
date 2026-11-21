import { Effect, Schema } from "effect"
import { HttpClientRequest } from "effect/http"
import { spotifyApiBaseUrl } from "./spotify-api-url"
import { Device } from "./spotify-device"
import type { RepeatMode } from "./spotify-playback-state"
import { PlayerQueue } from "./spotify-player-queue"

export const playerUrl = `${spotifyApiBaseUrl}/me/player`

const AvailableDevices = Schema.Struct({ devices: Schema.Array(Device) })

// Where playback starts in a context or a list of tracks: at a zero-based
// position, or at the item with a uri.
type PlaybackOffset = { readonly position: number } | { readonly uri: string }

// What to play: a context, which Spotify keeps playing through (an album,
// artist, playlist, or show), or a list of track URIs.
export type PlaybackStart =
  | { readonly contextUri: string; readonly offset?: PlaybackOffset }
  | { readonly uris: ReadonlyArray<string>; readonly offset?: PlaybackOffset }

const playbackStartBody = (start: PlaybackStart) =>
  "contextUri" in start
    ? { context_uri: start.contextUri, offset: start.offset }
    : { uris: start.uris, offset: start.offset }

export const playerReads = <E>(
  getJson: <A>(url: string, responseSchema: Schema.Decoder<A>) => Effect.Effect<A, E>,
) => ({
  getAvailableDevices: getJson(`${playerUrl}/devices`, AvailableDevices).pipe(
    Effect.map(({ devices }) => devices),
  ),
  getQueue: getJson(`${playerUrl}/queue`, PlayerQueue),
})

// Spotify answers each player command with 204 and no body.
export const playerCommands = <E>(
  sendCommand: (request: HttpClientRequest.HttpClientRequest) => Effect.Effect<void, E>,
) => ({
  transferPlayback: (deviceId: string) =>
    sendCommand(
      HttpClientRequest.put(playerUrl).pipe(
        HttpClientRequest.bodyJsonUnsafe({ device_ids: [deviceId] }),
      ),
    ),
  play: sendCommand(HttpClientRequest.put(`${playerUrl}/play`)),
  startPlayback: (start: PlaybackStart) =>
    sendCommand(
      HttpClientRequest.put(`${playerUrl}/play`).pipe(
        HttpClientRequest.bodyJsonUnsafe(playbackStartBody(start)),
      ),
    ),
  pause: sendCommand(HttpClientRequest.put(`${playerUrl}/pause`)),
  skipToNext: sendCommand(HttpClientRequest.post(`${playerUrl}/next`)),
  skipToPrevious: sendCommand(HttpClientRequest.post(`${playerUrl}/previous`)),
  // A position past the end of the item makes Spotify play the next one.
  seek: (positionMs: number) =>
    sendCommand(HttpClientRequest.put(`${playerUrl}/seek?position_ms=${positionMs}`)),
  setShuffle: (isOn: boolean) =>
    sendCommand(HttpClientRequest.put(`${playerUrl}/shuffle?state=${isOn}`)),
  setRepeat: (mode: RepeatMode) =>
    sendCommand(HttpClientRequest.put(`${playerUrl}/repeat?state=${mode}`)),
  setVolume: (volumePercent: number) =>
    sendCommand(HttpClientRequest.put(`${playerUrl}/volume?volume_percent=${volumePercent}`)),
  addToQueue: (uri: string) =>
    sendCommand(HttpClientRequest.post(`${playerUrl}/queue?uri=${encodeURIComponent(uri)}`)),
})
