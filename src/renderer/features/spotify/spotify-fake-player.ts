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
  progressMs: number
}

type FakeResponse = readonly [number, unknown]

const TransferPlaybackBody = Schema.fromJsonString(
  Schema.Struct({ device_ids: Schema.Tuple([Schema.String]) }),
)

const ShuffleState = Schema.Literals(["true", "false"])

const SeekPosition = Schema.NumberFromString.check(Schema.isInt(), Schema.isGreaterThanOrEqualTo(0))

const VolumePercent = Schema.NumberFromString.check(
  Schema.isInt(),
  Schema.isBetween({ minimum: 0, maximum: 100 }),
)

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

// Applies a command that Spotify accepts only with a valid query parameter.
const withParameter =
  <A>(
    name: string,
    parameterSchema: Schema.Decoder<A>,
    apply: (player: FakePlayerState, value: A) => void,
  ) =>
  (player: FakePlayerState, url: URL): FakeResponse => {
    const value = Schema.decodeUnknownOption(parameterSchema)(url.searchParams.get(name))
    if (Option.isNone(value)) {
      return [400, spotifyErrorBody(400, `Invalid ${name}`)]
    }
    apply(player, value.value)
    return accepted
  }

// Like Spotify, a new item starts from its beginning.
const playAt = (player: FakePlayerState, position: number) => {
  player.playPosition = position
  player.progressMs = 0
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
  playAt(player, position)
  if (player.shuffledAfter !== null) {
    player.shuffledAfter = position
  }
  player.isPlaying = true
  return accepted
}

const playerCommands: Record<string, (player: FakePlayerState, url: URL) => FakeResponse> = {
  "PUT /v1/me/player/pause": (player) => {
    player.isPlaying = false
    return accepted
  },
  "POST /v1/me/player/next": (player) => {
    playAt(player, player.playPosition + 1)
    return accepted
  },
  "POST /v1/me/player/previous": (player) => {
    playAt(player, Math.max(0, player.playPosition - 1))
    return accepted
  },
  "PUT /v1/me/player/shuffle": withParameter("state", ShuffleState, (player, state) => {
    setShuffle(player, state === "true")
  }),
  "PUT /v1/me/player/repeat": withParameter("state", RepeatMode, (player, state) => {
    player.repeat = state
  }),
  "PUT /v1/me/player/seek": withParameter("position_ms", SeekPosition, (player, position) => {
    player.progressMs = position
  }),
  "PUT /v1/me/player/volume": withParameter("volume_percent", VolumePercent, (player, volume) => {
    player.activeDevice = { ...player.activeDevice, volume_percent: volume }
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
  progress_ms: player.progressMs,
})

const upNextCount = 10

const queue = (player: FakePlayerState) => ({
  currently_playing: itemAt(player, player.playPosition) ?? null,
  queue: Array.from({ length: upNextCount }, (_, offset) =>
    itemAt(player, player.playPosition + 1 + offset),
  ).filter((item) => item !== undefined),
})

const availableDevices = (player: FakePlayerState) => ({
  devices: fakeDevices.map((device) =>
    device.id === player.activeDevice.id ? { ...player.activeDevice, is_active: true } : device,
  ),
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
    progressMs: fakePlaybackState(fakeDevices[0]).progress_ms,
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
