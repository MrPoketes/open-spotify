import { Clock, Context, Effect, Layer, Option, PubSub, Ref, Stream } from "effect"
import { SpotifyApi, type SpotifyApiError } from "../spotify/spotify-api"
import type { Device } from "../spotify/spotify-device"
import type { PlaybackState, RepeatMode } from "../spotify/spotify-playback-state"
import { makePendingPlaybackChanges } from "./pending-playback-changes"

export type PlayerState =
  | { readonly status: "active"; readonly playback: PlaybackState }
  | { readonly status: "noActiveDevice" }
  | { readonly status: "unreachable" }

type PlayerCommand = Effect.Effect<void, SpotifyApiError>

// Spotify rate-limits each Client ID over a rolling 30-second window, and all
// users of a development-mode Client ID share it.
const pollInterval = "2 seconds"

const isWindowVisible = () => document.visibilityState === "visible"

// Electron reports the window as hidden while it is minimized.
const windowVisibility = Stream.concat(
  Stream.sync(isWindowVisible),
  Stream.suspend(() => Stream.fromEventListener(document, "visibilitychange")).pipe(
    Stream.map(isWindowVisible),
  ),
).pipe(Stream.changes)

const readState = (spotify: SpotifyApi["Service"]) =>
  spotify.getPlaybackState.pipe(
    Effect.map(
      Option.match({
        onNone: (): PlayerState => ({ status: "noActiveDevice" }),
        onSome: (playback): PlayerState => ({ status: "active", playback }),
      }),
    ),
    Effect.catch((error) =>
      Effect.logWarning("The playback state failed to load", error).pipe(
        Effect.as<PlayerState>({ status: "unreachable" }),
      ),
    ),
  )

export class Player extends Context.Service<
  Player,
  {
    readonly state: Stream.Stream<PlayerState>
    readonly listDevices: Effect.Effect<ReadonlyArray<Device>, SpotifyApiError>
    readonly transferPlayback: (deviceId: string) => PlayerCommand
    readonly play: PlayerCommand
    readonly pause: PlayerCommand
    readonly skipToNext: PlayerCommand
    readonly skipToPrevious: PlayerCommand
    readonly setShuffle: (isOn: boolean) => PlayerCommand
    readonly setRepeat: (mode: RepeatMode) => PlayerCommand
  }
>()("open-spotify/Player") {
  static readonly layer = Layer.effect(
    Player,
    Effect.gen(function* () {
      const spotify = yield* SpotifyApi
      const refreshRequests = yield* PubSub.unbounded<void>()
      const pendingChanges = yield* makePendingPlaybackChanges
      const polledState = yield* Ref.make(Option.none<PlayerState>())

      const poll = Effect.gen(function* () {
        const startedAt = yield* Clock.currentTimeMillis
        yield* Ref.set(polledState, Option.some(yield* readState(spotify)))
        yield* pendingChanges.forgetShownBy(startedAt)
      })

      const latestState = Effect.gen(function* () {
        const latest = yield* Ref.get(polledState)
        if (Option.isNone(latest) || latest.value.status !== "active") {
          return latest
        }
        const playback = yield* pendingChanges.applyTo(latest.value.playback)
        return Option.some<PlayerState>({ status: "active", playback })
      })

      // Every subscriber shares one poll, which runs only while someone is
      // subscribed and the window is visible. A new subscriber gets the
      // latest state at once instead of waiting for the next poll. A change
      // the user makes shows at once, on top of the latest poll.
      const state = yield* Stream.merge(
        windowVisibility.pipe(
          Stream.switchMap((isVisible) =>
            isVisible
              ? Stream.merge(Stream.tick(pollInterval), Stream.fromPubSub(refreshRequests))
              : Stream.empty,
          ),
          Stream.mapEffect(() => poll),
        ),
        pendingChanges.updates,
      ).pipe(
        Stream.mapEffect(() => latestState),
        Stream.filter(Option.isSome),
        Stream.map((latest) => latest.value),
        Stream.share({ capacity: 1, strategy: "sliding", replay: 1 }),
      )

      const refresh = PubSub.publish(refreshRequests, undefined)

      // A command that finds no active device means the shown state is out
      // of date, so the bar should switch to the no-active-device state.
      const send = (command: PlayerCommand) =>
        command.pipe(Effect.tapErrorTag("NoActiveDevice", () => refresh))

      // The new track or device cannot be shown before Spotify reports it,
      // so the state is read again at once instead of at the next poll.
      const sendThenRefresh = (command: PlayerCommand) =>
        send(command).pipe(Effect.andThen(refresh))

      return Player.of({
        state,
        listDevices: spotify.getAvailableDevices,
        transferPlayback: (deviceId) => sendThenRefresh(spotify.transferPlayback(deviceId)),
        play: pendingChanges.track({ isPlaying: true }, send(spotify.play)),
        pause: pendingChanges.track({ isPlaying: false }, send(spotify.pause)),
        skipToNext: sendThenRefresh(spotify.skipToNext),
        skipToPrevious: sendThenRefresh(spotify.skipToPrevious),
        setShuffle: (isOn) =>
          pendingChanges.track({ shuffle: isOn }, send(spotify.setShuffle(isOn))),
        setRepeat: (mode) => pendingChanges.track({ repeat: mode }, send(spotify.setRepeat(mode))),
      })
    }),
  )
}
