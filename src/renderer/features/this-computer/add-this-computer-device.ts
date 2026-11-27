import { Effect, Ref, Stream } from "effect"
import { Player, type VolumeChange } from "../playback/player"
import { WebPlaybackSdk, type ThisComputerPlayer } from "./web-playback-sdk"

// Each volume the user sets while this computer plays also goes straight to
// the SDK's player, which keeps a volume of its own.
const passOnVolumeChange = Effect.fn("passOnVolumeChange")(function* (
  thisComputer: ThisComputerPlayer,
  thisComputerDeviceId: Ref.Ref<string | null>,
  { deviceId, volumePercent }: VolumeChange,
) {
  if (deviceId === null || deviceId !== (yield* Ref.get(thisComputerDeviceId))) {
    return
  }
  yield* thisComputer
    .setVolume(volumePercent)
    .pipe(Effect.catch((error) => Effect.logError("This computer's volume did not change", error)))
})

// Makes this computer a Spotify Connect device until interrupted, and reports
// its device id each time it changes. A failure is logged and leaves every
// other device usable.
export const addThisComputerDevice = Effect.fn("addThisComputerDevice")(
  function* (onDeviceIdChange: (deviceId: string | null) => void) {
    const sdk = yield* WebPlaybackSdk
    const player = yield* Player
    const thisComputer = yield* sdk.connect
    const thisComputerDeviceId = yield* Ref.make<string | null>(null)
    yield* Effect.all(
      [
        Stream.runForEach(thisComputer.deviceId, (deviceId) =>
          Ref.set(thisComputerDeviceId, deviceId).pipe(
            Effect.andThen(Effect.sync(() => onDeviceIdChange(deviceId))),
          ),
        ),
        Stream.runForEach(player.volumeChanges, (volumeChange) =>
          passOnVolumeChange(thisComputer, thisComputerDeviceId, volumeChange),
        ),
      ],
      { concurrency: "unbounded", discard: true },
    )
  },
  Effect.scoped,
  Effect.catch((error) => Effect.logError("This computer is not a Spotify Connect device", error)),
)
