import { Effect, Stream } from "effect"
import { Player, type PlayerState } from "../playback/player"
import { SpotifyApi } from "../spotify/spotify-api"
import type { PlayerQueue } from "../spotify/spotify-player-queue"

export type QueueContents =
  | { readonly status: "loading" }
  | { readonly status: "loaded"; readonly queue: PlayerQueue }
  | { readonly status: "failed" }
  | { readonly status: "noActiveDevice" }
  | { readonly status: "unreachable" }

// Spotify offers no way to watch the queue. It moves on when the playing item
// changes, so it is read again whenever the playing item or the player's
// status changes.
const playingItemKey = (state: PlayerState) =>
  state.status === "active" ? `active ${state.playback.item?.uri ?? "nothing"}` : state.status

const readQueue = (spotify: SpotifyApi["Service"]) =>
  spotify.getQueue.pipe(
    Effect.map((queue): QueueContents => ({ status: "loaded", queue })),
    Effect.catchTag("NoActiveDevice", () =>
      Effect.succeed<QueueContents>({ status: "noActiveDevice" }),
    ),
    Effect.tapError((error) => Effect.logError("The queue failed to load", error)),
    Effect.orElseSucceed((): QueueContents => ({ status: "failed" })),
  )

// A new stream each time, so a component can start over after a failure.
export const makeQueueContents = (): Stream.Stream<QueueContents, never, Player | SpotifyApi> =>
  Stream.unwrap(
    Effect.gen(function* () {
      const player = yield* Player
      const spotify = yield* SpotifyApi
      return player.state.pipe(
        Stream.changesWith((previous, next) => playingItemKey(previous) === playingItemKey(next)),
        // A queue read for an item that is no longer playing would be out of date.
        Stream.switchMap((state) =>
          state.status === "active"
            ? Stream.fromEffect(readQueue(spotify))
            : Stream.succeed<QueueContents>({ status: state.status }),
        ),
      )
    }),
  )
