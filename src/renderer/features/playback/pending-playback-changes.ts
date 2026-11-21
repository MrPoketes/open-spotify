import { Clock, Effect, PubSub, Ref, Stream } from "effect"
import type { PlaybackState } from "../spotify/spotify-playback-state"
import type { TimedPlayback } from "./playback-progress"

type PlaybackSettings = Pick<PlaybackState, "isPlaying" | "shuffle" | "repeat">

// Where to show playback in an item, as of the moment the change was made.
interface PendingPosition {
  readonly itemUri: string
  readonly progressMs: number
}

// A change the user made that the polled playback state may not show yet.
interface PendingChange {
  readonly settings: Partial<PlaybackSettings>
  readonly position: PendingPosition | null
  readonly madeAt: number
  // When Spotify accepted the change, or null while the request is in flight.
  readonly acceptedAt: number | null
}

// A position shows only while its item plays. Once another item plays, such
// as after a seek past the end, that item starts from Spotify's position.
const applyChanges = (timedPlayback: TimedPlayback, changes: ReadonlyArray<PendingChange>) => {
  let { playback, progressReadAt } = timedPlayback
  for (const { settings, position, madeAt } of changes) {
    playback = { ...playback, ...settings }
    if (position !== null && position.itemUri === playback.item?.uri) {
      playback = { ...playback, progressMs: position.progressMs }
      progressReadAt = madeAt
    }
  }
  return { playback, progressReadAt }
}

// Spotify applies a player command after accepting it, and the playback
// state can still show the old value for a moment. Dropping the change on the
// first poll after it was accepted would flip the control back until the
// poll after that.
const settleTimeMs = 1000

// A poll that started once the change had time to settle shows Spotify's
// state, which then wins, including changes made in another app.
const withoutChangesSettledBefore =
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

// Keeps the changes the user made on top of the polled state while they are
// sent and until they have had time to settle, so a control updates at once
// instead of waiting for Spotify.
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
    position: PendingPosition | null = null,
  ) {
    const madeAt = yield* Clock.currentTimeMillis
    const change: PendingChange = { settings, position, madeAt, acceptedAt: null }
    yield* update((changes) => [...changes, change])
    yield* request.pipe(Effect.onError(() => update(withoutChange(change))))
    const acceptedAt = yield* Clock.currentTimeMillis
    yield* update(withChangeAccepted(change, acceptedAt))
  })

  return {
    updates: Stream.fromPubSub(updates),
    applyTo: (timedPlayback: TimedPlayback) =>
      Ref.get(pendingChanges).pipe(Effect.map((changes) => applyChanges(timedPlayback, changes))),
    forgetSettledBefore: (pollStartedAt: number) =>
      Ref.update(pendingChanges, withoutChangesSettledBefore(pollStartedAt)),
    showWhileSending,
  }
})
