import { Effect, Predicate, Stream } from "effect"
import { Player, type PlayerState } from "../playback/player"
import { WebPlaybackSdk, type ThisComputerPlayer } from "./web-playback-sdk"

const volumePlayingOn = (deviceId: string | null, playerState: PlayerState) => {
  if (deviceId === null || playerState.status !== "active") {
    return null
  }
  const { device } = playerState.playback
  return device.id === deviceId ? device.volumePercent : null
}

// The volume the app shows for this computer, including a change it has just
// sent, also goes straight to the SDK's player.
const followVolume = (thisComputer: ThisComputerPlayer, playerState: Stream.Stream<PlayerState>) =>
  Stream.zipLatest(thisComputer.deviceId, playerState).pipe(
    Stream.map(([deviceId, latestState]) => volumePlayingOn(deviceId, latestState)),
    Stream.filter(Predicate.isNotNull),
    Stream.changes,
    Stream.runForEach((volumePercent) =>
      thisComputer
        .setVolume(volumePercent)
        .pipe(
          Effect.catch((error) => Effect.logError("This computer's volume did not change", error)),
        ),
    ),
  )

// Makes this computer a Spotify Connect device until interrupted, and reports
// its device id each time it changes. A failure is logged and leaves every
// other device usable.
export const playOnThisComputer = Effect.fn("playOnThisComputer")(
  function* (onDeviceIdChange: (deviceId: string | null) => void) {
    const sdk = yield* WebPlaybackSdk
    const player = yield* Player
    const thisComputer = yield* sdk.connect
    yield* Effect.all(
      [
        Stream.runForEach(thisComputer.deviceId, (deviceId) =>
          Effect.sync(() => onDeviceIdChange(deviceId)),
        ),
        followVolume(thisComputer, player.state),
      ],
      { concurrency: "unbounded", discard: true },
    )
  },
  Effect.scoped,
  Effect.catch((error) => Effect.logError("This computer is not a Spotify Connect device", error)),
)
