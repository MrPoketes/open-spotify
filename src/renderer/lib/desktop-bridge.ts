import { Context, Effect, Layer, Schema } from "effect"
import { AppInfo } from "../../shared/app-info"
import { type IpcChannel, ipcChannels } from "../../shared/ipc-channels"
import type { DesktopApi } from "../../preload/desktop-api"

export class DesktopBridgeError extends Schema.TaggedError<DesktopBridgeError>()(
  "DesktopBridgeError",
  { channel: Schema.String, cause: Schema.Defect() },
) {}

// Typed access to the main process. Replies are decoded with a Schema, so the
// rest of the renderer only ever sees values of the declared type.
export class DesktopBridge extends Context.Service<
  DesktopBridge,
  {
    readonly getAppInfo: Effect.Effect<AppInfo, DesktopBridgeError>
  }
>()("open-spotify/DesktopBridge") {
  static readonly make = (desktopApi: DesktopApi) => {
    const request = <A>(channel: IpcChannel, reply: Schema.Decoder<A>) =>
      Effect.tryPromise(() => desktopApi.invoke(channel)).pipe(
        Effect.flatMap(Schema.decodeUnknownEffect(reply)),
        Effect.mapError((cause) => new DesktopBridgeError({ channel, cause })),
      )

    return DesktopBridge.of({
      getAppInfo: request(ipcChannels.getAppInfo, AppInfo),
    })
  }

  static readonly layer = Layer.sync(DesktopBridge, () => DesktopBridge.make(window.desktop))
}
