import { Option, Schema } from "effect"
import type { HttpClientRequest } from "effect/http"
import { fakeDevices, fakePlaybackState } from "./spotify-fixtures"

const TransferPlaybackBody = Schema.fromJsonString(
  Schema.Struct({ device_ids: Schema.Tuple([Schema.String]) }),
)

const transferTarget = (request: HttpClientRequest.HttpClientRequest) => {
  if (request.body._tag !== "Uint8Array") {
    return Option.none()
  }
  return Schema.decodeUnknownOption(TransferPlaybackBody)(
    new TextDecoder().decode(request.body.body),
  ).pipe(Option.flatMap(({ device_ids: [deviceId] }) => findDevice(deviceId)))
}

const findDevice = (deviceId: string) =>
  Option.fromNullishOr(fakeDevices.find(({ id }) => id === deviceId))

// Serves Spotify's player endpoints from state that lives as long as one fake
// server, so a transfer shows up in the playback state and device list that
// follow it.
export const fakePlayer = () => {
  let activeDevice: (typeof fakeDevices)[number] = fakeDevices[0]

  const transferPlayback = (
    request: HttpClientRequest.HttpClientRequest,
  ): readonly [number, unknown] => {
    const target = transferTarget(request)
    if (Option.isNone(target)) {
      return [404, { error: { status: 404, message: "Device not found" } }]
    }
    activeDevice = target.value
    return [204, undefined]
  }

  return (
    request: HttpClientRequest.HttpClientRequest,
    url: URL,
  ): readonly [number, unknown] | undefined => {
    if (url.pathname === "/v1/me/player/devices") {
      const devices = fakeDevices.map((device) => ({
        ...device,
        is_active: device.id === activeDevice.id,
      }))
      return [200, { devices }]
    }
    if (url.pathname !== "/v1/me/player") {
      return undefined
    }
    if (request.method === "PUT") {
      return transferPlayback(request)
    }
    return [200, fakePlaybackState(activeDevice)]
  }
}
