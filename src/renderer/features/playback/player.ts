import { Clock, Context, Effect, Layer, Option, PubSub, Ref, Schema, Stream } from "effect"
import { SpotifyApi, type SpotifyApiError } from "../spotify/spotify-api"
import type { Device } from "../spotify/spotify-device"
import type { PlaybackState, RepeatMode } from "../spotify/spotify-playback-state"
import type { PlaybackStart } from "../spotify/spotify-player-requests"
import { makePendingPlaybackChanges } from "./pending-playback-changes"
import { type QueuedItem, positionInQueue } from "./queued-item"

export type PlayerState =
  | { readonly status: "active"; readonly playback: PlaybackState }
  | { readonly status: "noActiveDevice" }
  | { readonly status: "unreachable" }

type PlayerCommand = Effect.Effect<void, SpotifyApiError>

export class QueuedItemGone extends Schema.TaggedError<QueuedItemGone>()("QueuedItemGone", {}) {}

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

const skipToQueuedItem = Effect.fn("Player.skipToQueuedItem")(function* (
  spotify: SpotifyApi["Service"],
  queuedItem: QueuedItem,
) {
  // The queue on screen can be out of date, so the item is looked up in a
  // fresh copy.
  const { upNext } = yield* spotify.getQueue
  const position = positionInQueue(upNext, queuedItem)
  if (Option.isNone(position)) {
    return yield* new QueuedItemGone()
  }
  // Spotify has no endpoint that plays an item from the queue, so the player
  // skips past every item before it, one request each.
  return yield* spotify.skipToNext.pipe(
    Effect.replicateEffect(position.value + 1, { discard: true }),
  )
})

// Shuffle reorders the queue without changing the playing item. Only the
// polled state counts: the shown state flips as soon as the user presses
// shuffle, before Spotify has reordered the queue.
const isShuffleChange = (previous: Option.Option<PlayerState>, next: PlayerState) =>
  Option.isSome(previous) &&
  previous.value.status === "active" &&
  next.status === "active" &&
  previous.value.playback.shuffle !== next.playback.shuffle

export class Player extends Context.Service<
  Player,
  {
    readonly state: Stream.Stream<PlayerState>
    // Emits after each attempt to play a queued item, after each item added
    // to the queue, and when a poll shows that shuffle changed. None of them
    // has to change the item that is playing, so a queue on screen cannot
    // rely on the playback state alone.
    readonly queueChanges: Stream.Stream<void>
    readonly listDevices: Effect.Effect<ReadonlyArray<Device>, SpotifyApiError>
    readonly transferPlayback: (deviceId: string) => PlayerCommand
    // Resumes what was playing.
    readonly play: PlayerCommand
    readonly startPlayback: (start: PlaybackStart) => PlayerCommand
    readonly pause: PlayerCommand
    readonly skipToNext: PlayerCommand
    readonly skipToPrevious: PlayerCommand
    readonly playQueuedItem: (
      queuedItem: QueuedItem,
    ) => Effect.Effect<void, SpotifyApiError | QueuedItemGone>
    readonly setShuffle: (isOn: boolean) => PlayerCommand
    readonly setRepeat: (mode: RepeatMode) => PlayerCommand
    readonly addToQueue: (uri: string) => PlayerCommand
  }
>()("open-spotify/Player") {
  static readonly layer = Layer.effect(
    Player,
    Effect.gen(function* () {
      const spotify = yield* SpotifyApi
      const refreshRequests = yield* PubSub.unbounded<void>()
      const queueChanges = yield* PubSub.unbounded<void>()
      const pendingChanges = yield* makePendingPlaybackChanges
      const polledState = yield* Ref.make(Option.none<PlayerState>())

      const poll = Effect.gen(function* () {
        const startedAt = yield* Clock.currentTimeMillis
        const polled = yield* readState(spotify)
        const previous = yield* Ref.getAndSet(polledState, Option.some(polled))
        yield* pendingChanges.forgetSettledBefore(startedAt)
        if (isShuffleChange(previous, polled)) {
          yield* PubSub.publish(queueChanges, undefined)
        }
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
      // the user makes shows at once, on top of the latest poll. A command
      // reads the state again even while the window is hidden, because media
      // keys send commands from the background and the operating system's
      // media overlay shows what they changed.
      const state = yield* Stream.merge(
        Stream.merge(
          windowVisibility.pipe(
            Stream.switchMap((isVisible) => (isVisible ? Stream.tick(pollInterval) : Stream.empty)),
          ),
          Stream.fromPubSub(refreshRequests),
        ).pipe(Stream.mapEffect(() => poll)),
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
      // so the state is read again at once. If Spotify still reports the old
      // one, the next poll catches up.
      const sendThenRefresh = (command: PlayerCommand) =>
        send(command).pipe(Effect.andThen(refresh))

      return Player.of({
        state,
        queueChanges: Stream.fromPubSub(queueChanges),
        listDevices: spotify.getAvailableDevices,
        transferPlayback: (deviceId) => sendThenRefresh(spotify.transferPlayback(deviceId)),
        play: pendingChanges.showWhileSending({ isPlaying: true }, send(spotify.play)),
        startPlayback: (start) =>
          pendingChanges.showWhileSending(
            { isPlaying: true },
            sendThenRefresh(spotify.startPlayback(start)),
          ),
        pause: pendingChanges.showWhileSending({ isPlaying: false }, send(spotify.pause)),
        skipToNext: sendThenRefresh(spotify.skipToNext),
        skipToPrevious: sendThenRefresh(spotify.skipToPrevious),
        playQueuedItem: (queuedItem) =>
          skipToQueuedItem(spotify, queuedItem).pipe(
            Effect.ensuring(refresh),
            Effect.ensuring(PubSub.publish(queueChanges, undefined)),
          ),
        setShuffle: (isOn) =>
          pendingChanges.showWhileSending({ shuffle: isOn }, send(spotify.setShuffle(isOn))),
        setRepeat: (mode) =>
          pendingChanges.showWhileSending({ repeat: mode }, send(spotify.setRepeat(mode))),
        addToQueue: (uri) =>
          send(spotify.addToQueue(uri)).pipe(
            Effect.andThen(PubSub.publish(queueChanges, undefined)),
          ),
      })
    }),
  )
}
