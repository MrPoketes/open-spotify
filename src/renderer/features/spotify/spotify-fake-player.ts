import { Option, Schema } from "effect"
import type { HttpClientRequest } from "effect/http"
import { fakeDevices, fakePlaybackState, fakeTrack } from "./spotify-fixtures"
import { RepeatMode } from "./spotify-playback-state"

interface FakePlayerState {
  activeDevice: (typeof fakeDevices)[number]
  isPlaying: boolean
  shuffle: boolean
  repeat: RepeatMode
  trackIndex: number
}

type FakeResponse = readonly [number, unknown]

const TransferPlaybackBody = Schema.fromJsonString(
  Schema.Struct({ device_ids: Schema.Tuple([Schema.String]) }),
)

const ShuffleState = Schema.Literals(["true", "false"])

const accepted: FakeResponse = [204, undefined]

const invalidState: FakeResponse = [400, { error: { status: 400, message: "Invalid state" } }]

const findDevice = (deviceId: string) =>
  Option.fromNullishOr(fakeDevices.find(({ id }) => id === deviceId))

const transferTarget = (request: HttpClientRequest.HttpClientRequest) => {
  if (request.body._tag !== "Uint8Array") {
    return Option.none()
  }
  return Schema.decodeUnknownOption(TransferPlaybackBody)(
    new TextDecoder().decode(request.body.body),
  ).pipe(Option.flatMap(({ device_ids: [deviceId] }) => findDevice(deviceId)))
}

const transferPlayback = (
  player: FakePlayerState,
  request: HttpClientRequest.HttpClientRequest,
): FakeResponse => {
  const target = transferTarget(request)
  if (Option.isNone(target)) {
    return [404, { error: { status: 404, message: "Device not found" } }]
  }
  player.activeDevice = target.value
  return accepted
}

// Applies a command that Spotify accepts only with a valid `state` parameter.
const withState =
  <A>(stateSchema: Schema.Decoder<A>, apply: (player: FakePlayerState, state: A) => void) =>
  (player: FakePlayerState, url: URL): FakeResponse => {
    const state = Schema.decodeUnknownOption(stateSchema)(url.searchParams.get("state"))
    if (Option.isNone(state)) {
      return invalidState
    }
    apply(player, state.value)
    return accepted
  }

const playerCommands: Record<string, (player: FakePlayerState, url: URL) => FakeResponse> = {
  "PUT /v1/me/player/play": (player) => {
    player.isPlaying = true
    return accepted
  },
  "PUT /v1/me/player/pause": (player) => {
    player.isPlaying = false
    return accepted
  },
  "POST /v1/me/player/next": (player) => {
    player.trackIndex += 1
    return accepted
  },
  "POST /v1/me/player/previous": (player) => {
    player.trackIndex = Math.max(0, player.trackIndex - 1)
    return accepted
  },
  "PUT /v1/me/player/shuffle": withState(ShuffleState, (player, state) => {
    player.shuffle = state === "true"
  }),
  "PUT /v1/me/player/repeat": withState(RepeatMode, (player, state) => {
    player.repeat = state
  }),
}

const playbackState = (player: FakePlayerState) => ({
  ...fakePlaybackState(player.activeDevice),
  is_playing: player.isPlaying,
  shuffle_state: player.shuffle,
  repeat_state: player.repeat,
  item: fakeTrack(player.trackIndex),
})

const availableDevices = (player: FakePlayerState) => ({
  devices: fakeDevices.map((device) => ({
    ...device,
    is_active: device.id === player.activeDevice.id,
  })),
})

// Serves Spotify's player endpoints from state that lives as long as one fake
// server, so a command shows up in the playback state and device list that
// follow it.
export const fakePlayer = () => {
  const player: FakePlayerState = {
    activeDevice: fakeDevices[0],
    isPlaying: true,
    shuffle: false,
    repeat: "off",
    trackIndex: 0,
  }

  return (request: HttpClientRequest.HttpClientRequest, url: URL): FakeResponse | undefined => {
    const command = playerCommands[`${request.method} ${url.pathname}`]
    if (command) {
      return command(player, url)
    }
    if (url.pathname === "/v1/me/player/devices") {
      return [200, availableDevices(player)]
    }
    if (url.pathname !== "/v1/me/player") {
      return undefined
    }
    if (request.method === "PUT") {
      return transferPlayback(player, request)
    }
    return [200, playbackState(player)]
  }
}
