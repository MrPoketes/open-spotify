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

// A poll that started after Spotify accepted a change already shows it, so
// the change can go. A poll that started earlier may still show the old
// state, and dropping the change then would flip the control back.
const withoutChangesShownBy =
  (pollStartedAt: number) =>
  (changes: ReadonlyArray<PendingChange>): ReadonlyArray<PendingChange> =>
    changes.filter(({ acceptedAt }) => acceptedAt === null || acceptedAt > pollStartedAt)

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

  const track = <E>(settings: Partial<PlaybackSettings>, request: Effect.Effect<void, E>) =>
    Effect.gen(function* () {
      const change: PendingChange = { settings, acceptedAt: null }
      yield* update((changes) => [...changes, change])
      yield* request.pipe(Effect.tapError(() => update(withoutChange(change))))
      const acceptedAt = yield* Clock.currentTimeMillis
      yield* update(withChangeAccepted(change, acceptedAt))
    })

  return {
    updates: Stream.fromPubSub(updates),
    applyTo: (playback: PlaybackState) =>
      Ref.get(pendingChanges).pipe(Effect.map((changes) => applyChanges(playback, changes))),
    forgetShownBy: (pollStartedAt: number) =>
      Ref.update(pendingChanges, withoutChangesShownBy(pollStartedAt)),
    track,
  }
})
