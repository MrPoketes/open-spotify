import { Option, Schema } from "effect"
import type { HttpClientRequest } from "effect/http"
import { spotifyErrorBody } from "./spotify-fake-error-body"
import { fakePlaybackStart } from "./spotify-fake-playback-start"
import { fakeDevices, fakeEpisode, fakePlaybackState, fakeTrack } from "./spotify-fixtures"
import { RepeatMode } from "./spotify-playback-state"

const fakePlayOrderStart = [fakeTrack(0), fakeTrack(1), fakeEpisode, fakeTrack(2), fakeTrack(1)]

// What the fake player plays, in order: a podcast episode third and the
// second track again fifth, so the queue holds both kinds and one item twice.
export const fakePlayOrder = (position: number) =>
  fakePlayOrderStart[position] ?? fakeTrack(position - 2)

interface FakePlayerState {
  activeDevice: (typeof fakeDevices)[number]
  isPlaying: boolean
  // The play position where shuffle was turned on, or null while it is off.
  shuffledAfter: number | null
  repeat: RepeatMode
  // The fake plays its own order until a client starts something else.
  context: { readonly uri: string } | null
  playOrder: (position: number) => unknown
  playPosition: number
}

type FakeResponse = readonly [number, unknown]

const TransferPlaybackBody = Schema.fromJsonString(
  Schema.Struct({ device_ids: Schema.Tuple([Schema.String]) }),
)

const ShuffleState = Schema.Literals(["true", "false"])

const QueuedUri = Schema.TemplateLiteral(["spotify:track:", Schema.String])

// Like Spotify, shuffling keeps the playing item and reorders the items after
// it. The fake swaps each pair of them, so the shuffled order is predictable
// and turning shuffle off can find the playing item in the original order.
const shuffledPosition = (shuffledAfter: number, position: number) => {
  if (position <= shuffledAfter) {
    return position
  }
  return (position - shuffledAfter) % 2 === 1 ? position + 1 : position - 1
}

const itemAt = (player: FakePlayerState, position: number) =>
  player.playOrder(
    player.shuffledAfter === null ? position : shuffledPosition(player.shuffledAfter, position),
  )

const setShuffle = (player: FakePlayerState, isOn: boolean) => {
  if (isOn && player.shuffledAfter === null) {
    player.shuffledAfter = player.playPosition
  }
  if (!isOn && player.shuffledAfter !== null) {
    player.playPosition = shuffledPosition(player.shuffledAfter, player.playPosition)
    player.shuffledAfter = null
  }
}

const accepted: FakeResponse = [204, undefined]

const invalidState: FakeResponse = [400, spotifyErrorBody(400, "Invalid state")]

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
    return [404, spotifyErrorBody(404, "Device not found")]
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

// Without a body, Spotify resumes what was playing.
const startPlayback = (
  player: FakePlayerState,
  request: HttpClientRequest.HttpClientRequest,
): FakeResponse => {
  if (request.body._tag === "Empty") {
    player.isPlaying = true
    return accepted
  }
  const start = fakePlaybackStart(request)
  if (Option.isNone(start)) {
    return [400, spotifyErrorBody(400, "Invalid request")]
  }
  const { context, items, position } = start.value
  player.context = context
  player.playOrder = (playPosition) => items[playPosition]
  player.playPosition = position
  player.isPlaying = true
  return accepted
}

const playerCommands: Record<string, (player: FakePlayerState, url: URL) => FakeResponse> = {
  "PUT /v1/me/player/pause": (player) => {
    player.isPlaying = false
    return accepted
  },
  "POST /v1/me/player/next": (player) => {
    player.playPosition += 1
    return accepted
  },
  "POST /v1/me/player/previous": (player) => {
    player.playPosition = Math.max(0, player.playPosition - 1)
    return accepted
  },
  "PUT /v1/me/player/shuffle": withState(ShuffleState, (player, state) => {
    setShuffle(player, state === "true")
  }),
  "PUT /v1/me/player/repeat": withState(RepeatMode, (player, state) => {
    player.repeat = state
  }),
  // Like Spotify, refuses a uri that is not a playable item's. The fake plays
  // its tracks in order, so a queued track is accepted but never plays.
  "POST /v1/me/player/queue": (_player, url) =>
    Schema.is(QueuedUri)(url.searchParams.get("uri"))
      ? accepted
      : [400, spotifyErrorBody(400, "Invalid uri")],
}

const playbackState = (player: FakePlayerState) => ({
  ...fakePlaybackState(player.activeDevice),
  is_playing: player.isPlaying,
  shuffle_state: player.shuffledAfter !== null,
  repeat_state: player.repeat,
  context: player.context,
  item: itemAt(player, player.playPosition) ?? null,
})

const upNextCount = 10

const queue = (player: FakePlayerState) => ({
  currently_playing: itemAt(player, player.playPosition) ?? null,
  queue: Array.from({ length: upNextCount }, (_, offset) =>
    itemAt(player, player.playPosition + 1 + offset),
  ).filter((item) => item !== undefined),
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
    shuffledAfter: null,
    repeat: "off",
    context: null,
    playOrder: fakePlayOrder,
    playPosition: 0,
  }

  return (request: HttpClientRequest.HttpClientRequest, url: URL): FakeResponse | undefined => {
    const command = playerCommands[`${request.method} ${url.pathname}`]
    if (command) {
      return command(player, url)
    }
    if (request.method === "PUT" && url.pathname === "/v1/me/player/play") {
      return startPlayback(player, request)
    }
    if (url.pathname === "/v1/me/player/devices") {
      return [200, availableDevices(player)]
    }
    if (url.pathname === "/v1/me/player/queue") {
      return [200, queue(player)]
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
