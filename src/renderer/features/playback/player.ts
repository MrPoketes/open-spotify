import { Context, Effect, Layer, Option, PubSub, Stream } from "effect"
import { SpotifyApi, type SpotifyApiError } from "../spotify/spotify-api"
import type { Device } from "../spotify/spotify-device"
import type { PlaybackState } from "../spotify/spotify-playback-state"

export type PlayerState =
  | { readonly status: "active"; readonly playback: PlaybackState }
  | { readonly status: "noActiveDevice" }
  | { readonly status: "unreachable" }

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

export class Player extends Context.Service<
  Player,
  {
    readonly state: Stream.Stream<PlayerState>
    readonly listDevices: Effect.Effect<ReadonlyArray<Device>, SpotifyApiError>
    readonly transferPlayback: (deviceId: string) => Effect.Effect<void, SpotifyApiError>
  }
>()("open-spotify/Player") {
  static readonly layer = Layer.effect(
    Player,
    Effect.gen(function* () {
      const spotify = yield* SpotifyApi
      const refreshRequests = yield* PubSub.unbounded<void>()

      const readState = spotify.getPlaybackState.pipe(
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

      // Every subscriber shares one poll, which runs only while someone is
      // subscribed and the window is visible. A new subscriber gets the
      // latest state at once instead of waiting for the next poll.
      const state = yield* windowVisibility.pipe(
        Stream.switchMap((isVisible) =>
          isVisible
            ? Stream.merge(Stream.tick(pollInterval), Stream.fromPubSub(refreshRequests))
            : Stream.empty,
        ),
        Stream.mapEffect(() => readState),
        Stream.share({ capacity: 1, strategy: "sliding", replay: 1 }),
      )

      return Player.of({
        state,
        listDevices: spotify.getAvailableDevices,
        transferPlayback: (deviceId) =>
          spotify
            .transferPlayback(deviceId)
            .pipe(Effect.andThen(PubSub.publish(refreshRequests, undefined))),
      })
    }),
  )
}
