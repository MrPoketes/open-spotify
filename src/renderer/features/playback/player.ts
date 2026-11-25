import { Clock, Context, Effect, Layer, Option, PubSub, Ref, Schema, Stream } from "effect"
import { clamp } from "../../lib/clamp"
import { SpotifyApi, type SpotifyApiError } from "../spotify/spotify-api"
import type { Device } from "../spotify/spotify-device"
import type { RepeatMode } from "../spotify/spotify-playback-state"
import type { PlaybackStart } from "../spotify/spotify-player-requests"
import { makePendingPlaybackChanges } from "./pending-playback-changes"
import { type PlaybackProgress, type TimedPlayback, progressAt } from "./playback-progress"
import { type QueuedItem, positionInQueue } from "./queued-item"

export type PlayerState =
  | ({ readonly status: "active" } & TimedPlayback)
  | { readonly status: "noActiveDevice" }
  | { readonly status: "unreachable" }

type PlayerCommand = Effect.Effect<void, SpotifyApiError>

export class QueuedItemGone extends Schema.TaggedError<QueuedItemGone>()("QueuedItemGone", {}) {}

// Spotify rate-limits each Client ID over a rolling 30-second window, and all
// users of a development-mode Client ID share it.
const pollInterval = "2 seconds"

// Often enough for the seek bar to move smoothly between polls.
const progressInterval = "250 millis"

const isWindowVisible = () => document.visibilityState === "visible"

// Electron reports the window as hidden while it is minimized.
const windowVisibility = Stream.concat(
  Stream.sync(isWindowVisible),
  Stream.suspend(() => Stream.fromEventListener(document, "visibilitychange")).pipe(
    Stream.map(isWindowVisible),
  ),
).pipe(Stream.changes)

// While the window is hidden, polls only keep the operating system's media
// overlay current, so a new track may show there a little late in exchange
// for far fewer requests against the shared rate limit.
const hiddenPollInterval = "15 seconds"

const mayHaveActiveDevice = (polled: Option.Option<PlayerState>) =>
  Option.isNone(polled) || polled.value.status !== "noActiveDevice"

// The window polled until it was hidden, so the first hidden poll waits a
// full interval. Nothing plays without an active device, so polling stops
// until a command or showing the window reads the state again.
const hiddenPollRequests = (polledState: Ref.Ref<Option.Option<PlayerState>>) =>
  Stream.tick(hiddenPollInterval).pipe(
    Stream.drop(1),
    Stream.filterEffect(() => Ref.get(polledState).pipe(Effect.map(mayHaveActiveDevice))),
  )

const pollRequests = (
  refreshRequests: PubSub.PubSub<void>,
  polledState: Ref.Ref<Option.Option<PlayerState>>,
) =>
  Stream.merge(
    windowVisibility.pipe(
      Stream.switchMap((isVisible) =>
        isVisible ? Stream.tick(pollInterval) : hiddenPollRequests(polledState),
      ),
    ),
    Stream.fromPubSub(refreshRequests),
  )

const readState = Effect.fn("Player.readState")(
  function* (spotify: SpotifyApi["Service"]) {
    const polledPlayback = yield* spotify.getPlaybackState
    const progressReadAt = yield* Clock.currentTimeMillis
    return Option.match(polledPlayback, {
      onNone: (): PlayerState => ({ status: "noActiveDevice" }),
      onSome: (playback): PlayerState => ({ status: "active", playback, progressReadAt }),
    })
  },
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

type PendingPlaybackChanges = Effect.Success<typeof makePendingPlaybackChanges>

const shownStateOf = Effect.fn("Player.shownStateOf")(function* (
  polledState: Ref.Ref<Option.Option<PlayerState>>,
  pendingChanges: PendingPlaybackChanges,
) {
  const latest = yield* Ref.get(polledState)
  if (Option.isNone(latest) || latest.value.status !== "active") {
    return latest
  }
  const timedPlayback = yield* pendingChanges.applyTo(latest.value)
  return Option.some<PlayerState>({ status: "active", ...timedPlayback })
})

const positionShownBy = Effect.fn("Player.positionShownBy")(function* (
  shownState: Effect.Effect<Option.Option<PlayerState>>,
) {
  const shown = yield* shownState
  const now = yield* Clock.currentTimeMillis
  if (Option.isNone(shown) || shown.value.status !== "active") {
    return null
  }
  const { item } = shown.value.playback
  const progress = progressAt(shown.value, now)
  if (item === null || progress === null) {
    return null
  }
  return { itemUri: item.uri, ...progress }
})

// A seek shows at once at the position it goes to, which Spotify reports only
// on the next poll.
const seekCommands = (
  sendSeek: (positionMs: number) => PlayerCommand,
  pendingChanges: PendingPlaybackChanges,
  shownPosition: ReturnType<typeof positionShownBy>,
) => {
  const seekInItem = (itemUri: string | null, positionMs: number) =>
    pendingChanges.showWhileSending(
      {},
      sendSeek(positionMs),
      itemUri === null ? null : { itemUri, positionMs },
    )
  return {
    seek: (positionMs: number) =>
      shownPosition.pipe(Effect.flatMap((shown) => seekInItem(shown?.itemUri ?? null, positionMs))),
    seekBy: Effect.fn("Player.seekBy")(function* (offsetMs: number) {
      const shown = yield* shownPosition
      if (shown === null) {
        return
      }
      const targetMs = clamp(shown.positionMs + offsetMs, 0, shown.durationMs)
      if (targetMs !== shown.positionMs) {
        yield* seekInItem(shown.itemUri, targetMs)
      }
    }),
  }
}

const progressOf = (playerState: PlayerState): Stream.Stream<PlaybackProgress | null> => {
  if (playerState.status !== "active") {
    return Stream.succeed(null)
  }
  const updates = playerState.playback.isPlaying
    ? Stream.tick(progressInterval)
    : Stream.succeed(undefined)
  return updates.pipe(
    Stream.mapEffect(() => Clock.currentTimeMillis),
    Stream.map((now) => progressAt(playerState, now)),
  )
}

export class Player extends Context.Service<
  Player,
  {
    readonly state: Stream.Stream<PlayerState>
    // Emits after each attempt to play a queued item, after each item added
    // to the queue, and when a poll shows that shuffle changed. None of them
    // has to change the item that is playing, so a queue on screen cannot
    // rely on the playback state alone.
    readonly queueChanges: Stream.Stream<void>
    // Null while there is no active device, no item is playing, or Spotify
    // does not say how far into the item playback is.
    readonly progress: Stream.Stream<PlaybackProgress | null>
    // Where playback is now, counting the seeks Spotify has not reported
    // yet, which the latest progress may not show. Null whenever progress is.
    readonly position: Effect.Effect<PlaybackProgress | null>
    readonly listDevices: Effect.Effect<ReadonlyArray<Device>, SpotifyApiError>
    readonly transferPlayback: (deviceId: string) => PlayerCommand
    // Resumes what was playing.
    readonly play: PlayerCommand
    readonly startPlayback: (start: PlaybackStart) => PlayerCommand
    readonly pause: PlayerCommand
    readonly skipToNext: PlayerCommand
    readonly skipToPrevious: PlayerCommand
    readonly seek: (positionMs: number) => PlayerCommand
    // Steps from the position shown now, which counts the seeks Spotify has
    // not reported yet, so quick steps add up. A step stops at the start or
    // the end of the item, and sends nothing when it is already there.
    readonly seekBy: (offsetMs: number) => PlayerCommand
    readonly playQueuedItem: (
      queuedItem: QueuedItem,
    ) => Effect.Effect<void, SpotifyApiError | QueuedItemGone>
    readonly setShuffle: (isOn: boolean) => PlayerCommand
    readonly setRepeat: (mode: RepeatMode) => PlayerCommand
    // From 0 to 100.
    readonly setVolume: (volumePercent: number) => PlayerCommand
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

      const latestState = shownStateOf(polledState, pendingChanges)

      // Every subscriber shares one poll, which runs only while someone is
      // subscribed, and slows down while the window is hidden. A new
      // subscriber gets the latest state at once instead of waiting for the
      // next poll. A change the user makes shows at once, on top of the
      // latest poll. A command reads the state again at once even while the
      // window is hidden, because media keys send commands from the
      // background and the operating system's media overlay shows what they
      // changed.
      const state = yield* Stream.merge(
        pollRequests(refreshRequests, polledState).pipe(Stream.mapEffect(() => poll)),
        pendingChanges.updates,
      ).pipe(
        Stream.mapEffect(() => latestState),
        Stream.filter(Option.isSome),
        Stream.map((latest) => latest.value),
        Stream.share({ capacity: 1, strategy: "sliding", replay: 1 }),
      )

      const refresh = PubSub.publish(refreshRequests, undefined)

      const shownPosition = positionShownBy(latestState)

      // Pausing stops the position where it is when pressed, not where the
      // last poll had it, and resuming moves it on from there.
      const showPlayingWhileSending = (isPlaying: boolean, command: PlayerCommand) =>
        shownPosition.pipe(
          Effect.flatMap((position) =>
            pendingChanges.showWhileSending({ isPlaying }, command, position),
          ),
        )

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
        progress: Stream.switchMap(state, progressOf),
        position: shownPosition,
        listDevices: spotify.getAvailableDevices,
        transferPlayback: (deviceId) => sendThenRefresh(spotify.transferPlayback(deviceId)),
        play: showPlayingWhileSending(true, send(spotify.play)),
        startPlayback: (start) =>
          pendingChanges.showWhileSending(
            { isPlaying: true },
            sendThenRefresh(spotify.startPlayback(start)),
          ),
        pause: showPlayingWhileSending(false, send(spotify.pause)),
        skipToNext: sendThenRefresh(spotify.skipToNext),
        skipToPrevious: sendThenRefresh(spotify.skipToPrevious),
        ...seekCommands(
          (positionMs) => send(spotify.seek(positionMs)),
          pendingChanges,
          shownPosition,
        ),
        playQueuedItem: (queuedItem) =>
          skipToQueuedItem(spotify, queuedItem).pipe(
            Effect.ensuring(refresh),
            Effect.ensuring(PubSub.publish(queueChanges, undefined)),
          ),
        setShuffle: (isOn) =>
          pendingChanges.showWhileSending({ shuffle: isOn }, send(spotify.setShuffle(isOn))),
        setRepeat: (mode) =>
          pendingChanges.showWhileSending({ repeat: mode }, send(spotify.setRepeat(mode))),
        setVolume: (volumePercent) =>
          pendingChanges.showWhileSending(
            { volumePercent },
            send(spotify.setVolume(volumePercent)),
          ),
        addToQueue: (uri) =>
          send(spotify.addToQueue(uri)).pipe(
            Effect.andThen(PubSub.publish(queueChanges, undefined)),
          ),
      })
    }),
  )
}
