import { Clock, Effect, PubSub, Ref, Stream } from "effect"
import type { PlaybackState } from "../spotify/spotify-playback-state"

type PlaybackSettings = Pick<PlaybackState, "isPlaying" | "shuffle" | "repeat">

// A change the user made that the polled playback state may not show yet.
interface PendingChange {
  readonly settings: Partial<PlaybackSettings>
  // When Spotify accepted the change, or null while the request is in flight.
  readonly acceptedAt: number | null
}

const applyChanges = (playback: PlaybackState, changes: ReadonlyArray<PendingChange>) => {
  let changedPlayback = playback
  for (const { settings } of changes) {
    changedPlayback = { ...changedPlayback, ...settings }
  }
  return changedPlayback
}

// Spotify applies a player command after accepting it, and the playback
// state can still show the old value for a moment. Dropping the change on the
// first poll after it was accepted would flip the control back until the
// poll after that.
const settleTimeMs = 1000

// A poll that started once the change had time to settle shows Spotify's
// state, which then wins, including changes made in another app.
const withoutChangesShownBy =
  (pollStartedAt: number) =>
  (changes: ReadonlyArray<PendingChange>): ReadonlyArray<PendingChange> =>
    changes.filter(
      ({ acceptedAt }) => acceptedAt === null || pollStartedAt < acceptedAt + settleTimeMs,
    )

const withoutChange =
  (change: PendingChange) =>
  (changes: ReadonlyArray<PendingChange>): ReadonlyArray<PendingChange> =>
    changes.filter((pending) => pending !== change)

const withChangeAccepted =
  (change: PendingChange, acceptedAt: number) =>
  (changes: ReadonlyArray<PendingChange>): ReadonlyArray<PendingChange> =>
    changes.map((pending) => (pending === change ? { ...pending, acceptedAt } : pending))

// Keeps the changes the user made until a poll shows them, so a control
// updates at once instead of waiting for Spotify.
export const makePendingPlaybackChanges = Effect.gen(function* () {
  const pendingChanges = yield* Ref.make<ReadonlyArray<PendingChange>>([])
  const updates = yield* PubSub.unbounded<void>()

  const update = (
    updateChanges: (changes: ReadonlyArray<PendingChange>) => ReadonlyArray<PendingChange>,
  ) =>
    Ref.update(pendingChanges, updateChanges).pipe(
      Effect.andThen(PubSub.publish(updates, undefined)),
    )

  // An interrupted or crashed request removes the change too, or it would
  // stay on screen over every poll.
  const showWhileSending = Effect.fn("PendingPlaybackChanges.showWhileSending")(function* <E>(
    settings: Partial<PlaybackSettings>,
    request: Effect.Effect<void, E>,
  ) {
    const change: PendingChange = { settings, acceptedAt: null }
    yield* update((changes) => [...changes, change])
    yield* request.pipe(Effect.onError(() => update(withoutChange(change))))
    const acceptedAt = yield* Clock.currentTimeMillis
    yield* update(withChangeAccepted(change, acceptedAt))
  })

  return {
    updates: Stream.fromPubSub(updates),
    applyTo: (playback: PlaybackState) =>
      Ref.get(pendingChanges).pipe(Effect.map((changes) => applyChanges(playback, changes))),
    forgetShownBy: (pollStartedAt: number) =>
      Ref.update(pendingChanges, withoutChangesShownBy(pollStartedAt)),
    showWhileSending,
  }
})
