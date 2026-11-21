import { Effect, Schema } from "effect"
import { HttpClientRequest } from "effect/http"
import { spotifyApiBaseUrl } from "./spotify-api-url"
import { Device } from "./spotify-device"
import type { RepeatMode } from "./spotify-playback-state"
import { PlayerQueue } from "./spotify-player-queue"

export const playerUrl = `${spotifyApiBaseUrl}/me/player`

const AvailableDevices = Schema.Struct({ devices: Schema.Array(Device) })

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
  pause: sendCommand(HttpClientRequest.put(`${playerUrl}/pause`)),
  skipToNext: sendCommand(HttpClientRequest.post(`${playerUrl}/next`)),
  skipToPrevious: sendCommand(HttpClientRequest.post(`${playerUrl}/previous`)),
  setShuffle: (isOn: boolean) =>
    sendCommand(HttpClientRequest.put(`${playerUrl}/shuffle?state=${isOn}`)),
  setRepeat: (mode: RepeatMode) =>
    sendCommand(HttpClientRequest.put(`${playerUrl}/repeat?state=${mode}`)),
})
