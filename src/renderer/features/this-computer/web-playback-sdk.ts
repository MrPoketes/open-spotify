import {
  Context,
  Duration,
  Effect,
  Layer,
  Queue,
  Schema,
  SubscriptionRef,
  type Scope,
  type Stream,
} from "effect"
import { SpotifyAccessToken } from "../spotify/spotify-access-token"

const sdkScriptUrl = "https://sdk.scdn.co/spotify-player.js"

// Other Spotify apps list this computer under this name. Open Spotify's own
// device picker calls it "This computer" instead.
const connectDeviceName = "Open Spotify"

// The SDK's connect() can stay pending for good without reporting an error
// (https://community.spotify.com/t5/Spotify-for-Developers/Web-Playback-SDK-player-connect-never-resolves-in-Development/td-p/7392190),
// so a player that has not connected by then counts as one that did not start.
const connectTimeout = Duration.seconds(30)

// The parts of the SDK's Spotify.Player that Open Spotify uses, from
// https://developer.spotify.com/documentation/web-playback-sdk/reference
interface SdkPlayer {
  connect(): Promise<boolean>
  disconnect(): void
  // From 0 to 1.
  setVolume(volume: number): Promise<void>
  addListener(event: string, listener: (payload: unknown) => void): boolean
}

interface SdkPlayerOptions {
  readonly name: string
  readonly getOAuthToken: (provideToken: (accessToken: string) => void) => void
}

type SdkPlayerConstructor = new (options: SdkPlayerOptions) => SdkPlayer

declare global {
  interface Window {
    onSpotifyWebPlaybackSDKReady?: () => void
    Spotify?: { readonly Player: SdkPlayerConstructor }
  }
}

export class WebPlaybackSdkError extends Schema.TaggedError<WebPlaybackSdkError>()(
  "WebPlaybackSdkError",
  {
    reason: Schema.String,
    cause: Schema.optional(Schema.Defect()),
  },
) {}

const ReadyEvent = Schema.Struct({ device_id: Schema.String })

const ErrorEvent = Schema.Struct({ message: Schema.String })

const sdkErrorEvents = [
  "initialization_error",
  "authentication_error",
  "account_error",
  "playback_error",
] as const

export type SdkErrorEvent = (typeof sdkErrorEvents)[number]

const sdkEventNames = ["ready", "not_ready", ...sdkErrorEvents] as const

interface SdkEvent {
  readonly name: (typeof sdkEventNames)[number]
  readonly payload: unknown
}

// The SDK's events, and the end of a connect() that did not connect. Both go
// through one queue, so the player follows them in the order they happened.
type PlayerEvent = SdkEvent | { readonly name: "not_connected" }

// The SDK script calls window.onSpotifyWebPlaybackSDKReady once it has
// loaded, and Spotify.Player exists only from then on. A script that failed
// to load is removed, so the next connect, after the next login, tries again.
const loadSdk = Effect.callback<SdkPlayerConstructor, WebPlaybackSdkError>((resume) => {
  const script = document.createElement("script")
  window.onSpotifyWebPlaybackSDKReady = () => {
    const spotify = window.Spotify
    resume(
      spotify === undefined
        ? Effect.fail(new WebPlaybackSdkError({ reason: "The SDK loaded without Spotify.Player" }))
        : Effect.succeed(spotify.Player),
    )
  }
  script.addEventListener("error", () => {
    script.remove()
    resume(Effect.fail(new WebPlaybackSdkError({ reason: "The SDK script did not load" })))
  })
  script.src = sdkScriptUrl
  document.head.append(script)
})

const loadedSdk = Effect.suspend(() =>
  window.Spotify === undefined ? loadSdk : Effect.succeed(window.Spotify.Player),
)

// The SDK asks for a token whenever it needs one, so each request gets a fresh
// token from the main process, which refreshes it when it has expired.
const answerTokenRequests = (
  tokenRequests: Queue.Dequeue<(accessToken: string) => void>,
  accessToken: SpotifyAccessToken["Service"],
) =>
  Queue.take(tokenRequests).pipe(
    Effect.flatMap((provideToken) =>
      accessToken.get.pipe(
        Effect.flatMap((token) => Effect.sync(() => provideToken(token))),
        Effect.catch((error) =>
          Effect.logError("This computer could not get an access token", error),
        ),
      ),
    ),
    Effect.forever,
  )

interface PlayerState {
  readonly deviceId: SubscriptionRef.SubscriptionRef<string | null>
  readonly failure: SubscriptionRef.SubscriptionRef<SdkErrorEvent | null>
}

// The SDK may report why it did not connect before or after connect()
// settles, so its own reason replaces the generic one and is never replaced
// by it. A player that is ready did start, whatever connect() says.
const followNotConnected = Effect.fn("followNotConnected")(function* ({
  deviceId,
  failure,
}: PlayerState) {
  const isReady = (yield* SubscriptionRef.get(deviceId)) !== null
  if (isReady || (yield* SubscriptionRef.get(failure)) !== null) {
    return
  }
  yield* SubscriptionRef.set(failure, "initialization_error")
})

// The SDK reports no recovery from an error, so an error holds until the
// player is ready again.
const followEvent = (event: PlayerEvent, playerState: PlayerState) => {
  const { deviceId, failure } = playerState
  if (event.name === "not_connected") {
    return followNotConnected(playerState)
  }
  if (event.name === "ready") {
    return Schema.decodeUnknownEffect(ReadyEvent)(event.payload).pipe(
      Effect.flatMap((ready) => SubscriptionRef.set(deviceId, ready.device_id)),
      Effect.andThen(SubscriptionRef.set(failure, null)),
      Effect.catch((error) => Effect.logError("The SDK reported an unreadable device", error)),
    )
  }
  if (event.name === "not_ready") {
    return SubscriptionRef.set(deviceId, null)
  }
  return SubscriptionRef.set(failure, event.name).pipe(
    Effect.andThen(Schema.decodeUnknownEffect(ErrorEvent)(event.payload)),
    Effect.flatMap(({ message }) => Effect.logError(`The SDK reported ${event.name}`, message)),
    Effect.catch((error) => Effect.logError(`The SDK reported an unreadable ${event.name}`, error)),
  )
}

const listenTo = (player: SdkPlayer, events: Queue.Enqueue<PlayerEvent>) => {
  for (const name of sdkEventNames) {
    player.addListener(name, (payload) => Queue.offerUnsafe(events, { name, payload }))
  }
}

const setVolumeOf = (player: SdkPlayer) => (volumePercent: number) =>
  Effect.tryPromise({
    try: () => player.setVolume(volumePercent / 100),
    catch: (cause) =>
      new WebPlaybackSdkError({ reason: "The player's volume did not change", cause }),
  })

export interface ThisComputerPlayer {
  // The Spotify Connect device id while the SDK is ready to play, and null
  // while it is not.
  readonly deviceId: Stream.Stream<string | null>
  // Why the player cannot play: the SDK's latest error, or
  // initialization_error when connect() failed without one. Null while
  // neither has happened since the player was last ready.
  readonly failure: Stream.Stream<SdkErrorEvent | null>
  // From 0 to 100, like the Web API.
  readonly setVolume: (volumePercent: number) => Effect.Effect<void, WebPlaybackSdkError>
}

const acquirePlayer = (
  SpotifyPlayer: SdkPlayerConstructor,
  tokenRequests: Queue.Enqueue<(accessToken: string) => void>,
) =>
  Effect.acquireRelease(
    Effect.sync(
      () =>
        new SpotifyPlayer({
          name: connectDeviceName,
          getOAuthToken: (provideToken) => Queue.offerUnsafe(tokenRequests, provideToken),
        }),
    ),
    (player) => Effect.sync(() => player.disconnect()),
  )

const connectPlayer = (player: SdkPlayer, events: Queue.Enqueue<PlayerEvent>) =>
  Effect.tryPromise({
    try: () => player.connect(),
    catch: (cause) => new WebPlaybackSdkError({ reason: "The player failed to connect", cause }),
  }).pipe(
    Effect.filterOrFail(
      (isConnected) => isConnected,
      () => new WebPlaybackSdkError({ reason: "The player did not connect" }),
    ),
    Effect.timeoutOrElse({
      duration: connectTimeout,
      orElse: () =>
        Effect.fail(new WebPlaybackSdkError({ reason: "The player did not connect in time" })),
    }),
    Effect.catch((error) =>
      Effect.logError("This computer's player did not connect", error).pipe(
        Effect.andThen(Queue.offer(events, { name: "not_connected" })),
      ),
    ),
  )

const connectThisComputer = Effect.fn("WebPlaybackSdk.connect")(function* (
  accessToken: SpotifyAccessToken["Service"],
) {
  const SpotifyPlayer = yield* loadedSdk
  const tokenRequests = yield* Queue.unbounded<(accessToken: string) => void>()
  const events = yield* Queue.unbounded<PlayerEvent>()
  const playerState: PlayerState = {
    deviceId: yield* SubscriptionRef.make<string | null>(null),
    failure: yield* SubscriptionRef.make<SdkErrorEvent | null>(null),
  }
  const player = yield* acquirePlayer(SpotifyPlayer, tokenRequests)
  listenTo(player, events)
  yield* Effect.forkScoped(answerTokenRequests(tokenRequests, accessToken))
  yield* Effect.forkScoped(
    Queue.take(events).pipe(
      Effect.flatMap((event) => followEvent(event, playerState)),
      Effect.forever,
    ),
  )
  // The SDK can report errors before connect() settles, and connect() may
  // never settle, so the player's state is returned without waiting for it.
  yield* Effect.forkScoped(connectPlayer(player, events), { startImmediately: true })
  return {
    deviceId: SubscriptionRef.changes(playerState.deviceId),
    failure: SubscriptionRef.changes(playerState.failure),
    setVolume: setVolumeOf(player),
  }
})

// Spotify's Web Playback SDK, which makes this computer a Spotify Connect
// device. It can only add a device: remote control keeps working when it
// fails (decision 0007).
export class WebPlaybackSdk extends Context.Service<
  WebPlaybackSdk,
  {
    // This computer stays a device until the scope closes, so no later
    // account can play through the player of the account before it.
    readonly connect: Effect.Effect<ThisComputerPlayer, WebPlaybackSdkError, Scope.Scope>
  }
>()("open-spotify/WebPlaybackSdk") {
  static readonly layer = Layer.effect(
    WebPlaybackSdk,
    Effect.gen(function* () {
      const accessToken = yield* SpotifyAccessToken

      return WebPlaybackSdk.of({ connect: connectThisComputer(accessToken) })
    }),
  )
}
