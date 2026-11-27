import { Effect, Layer, Stream } from "effect"
import { WebPlaybackSdk } from "./web-playback-sdk"

// Like an SDK that is still loading: this computer never becomes a device.
export const webPlaybackSdkNeverReady = Layer.succeed(
  WebPlaybackSdk,
  WebPlaybackSdk.of({ connect: Effect.never }),
)

export const fakeThisComputerDeviceId = "fake-device-this-computer"

// An SDK that is ready at once. It records whether its player is connected
// and each volume the player is given.
export const readyWebPlaybackSdk = () => {
  const sdkPlayer = { isConnected: false, volumes: new Array<number>() }
  const layer = Layer.succeed(
    WebPlaybackSdk,
    WebPlaybackSdk.of({
      connect: Effect.acquireRelease(
        Effect.sync(() => {
          sdkPlayer.isConnected = true
        }),
        () =>
          Effect.sync(() => {
            sdkPlayer.isConnected = false
          }),
      ).pipe(
        Effect.as({
          deviceId: Stream.concat(Stream.succeed(fakeThisComputerDeviceId), Stream.never),
          setVolume: (volumePercent: number) =>
            Effect.sync(() => {
              sdkPlayer.volumes.push(volumePercent)
            }),
        }),
      ),
    }),
  )
  return { sdkPlayer, layer }
}
