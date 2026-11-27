import { Effect, Layer, Stream } from "effect"
import { WebPlaybackSdk, WebPlaybackSdkError, type SdkErrorEvent } from "./web-playback-sdk"

// Like an SDK that is still loading: this computer never becomes a device.
export const webPlaybackSdkNeverReady = Layer.succeed(
  WebPlaybackSdk,
  WebPlaybackSdk.of({ connect: Effect.never }),
)

export const fakeThisComputerDeviceId = "fake-device-this-computer"

const holding = <A>(value: A) => Stream.concat(Stream.succeed(value), Stream.never)

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
          deviceId: holding(fakeThisComputerDeviceId),
          failure: holding(null),
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

// An SDK whose player connects and then reports the error, either before it
// was ever ready (no device id) or while it is ready on the given device.
export const webPlaybackSdkReporting = (failure: SdkErrorEvent, deviceId: string | null = null) =>
  Layer.succeed(
    WebPlaybackSdk,
    WebPlaybackSdk.of({
      connect: Effect.succeed({
        deviceId: holding(deviceId),
        failure: holding(failure),
        setVolume: () => Effect.void,
      }),
    }),
  )

export const webPlaybackSdkFailingToConnect = Layer.succeed(
  WebPlaybackSdk,
  WebPlaybackSdk.of({
    connect: Effect.fail(new WebPlaybackSdkError({ reason: "The SDK script did not load" })),
  }),
)
