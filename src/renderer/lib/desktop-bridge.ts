import { Context, Effect, Layer, type Option, Schema } from "effect"
import { AppInfo } from "../../shared/app-info"
import {
  type AddFolderItemRequest,
  type CreateFolderRequest,
  type DeleteFolderRequest,
  FolderId,
  FolderTree,
  type MoveFolderItemRequest,
  type MoveFolderRequest,
  type RemoveFolderItemRequest,
  type RenameFolderRequest,
} from "../../shared/folders"
import { type IpcChannel, ipcChannels } from "../../shared/ipc-channels"
import {
  type SettingKey,
  type SettingValue,
  SettingReply,
  settingSchemas,
} from "../../shared/settings"
import {
  type AccessTokenError,
  AccessTokenReply,
  type LogInError,
  LogInReply,
} from "../../shared/spotify-auth-replies"
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
    readonly getSetting: <K extends SettingKey>(
      key: K,
    ) => Effect.Effect<Option.Option<SettingValue<K>>, DesktopBridgeError>
    readonly setSetting: <K extends SettingKey>(
      key: K,
      value: SettingValue<K>,
    ) => Effect.Effect<void, DesktopBridgeError>
    readonly getEnvironmentClientId: Effect.Effect<Option.Option<string>, DesktopBridgeError>
    readonly logIn: Effect.Effect<void, LogInError | DesktopBridgeError>
    readonly cancelLogIn: Effect.Effect<void, DesktopBridgeError>
    readonly getAccessToken: Effect.Effect<string, AccessTokenError | DesktopBridgeError>
    readonly logOut: Effect.Effect<void, DesktopBridgeError>
    readonly getFolderTree: Effect.Effect<FolderTree, DesktopBridgeError>
    readonly createFolder: (
      request: CreateFolderRequest,
    ) => Effect.Effect<string, DesktopBridgeError>
    readonly renameFolder: (request: RenameFolderRequest) => Effect.Effect<void, DesktopBridgeError>
    readonly deleteFolder: (request: DeleteFolderRequest) => Effect.Effect<void, DesktopBridgeError>
    readonly addFolderItem: (
      request: AddFolderItemRequest,
    ) => Effect.Effect<void, DesktopBridgeError>
    readonly removeFolderItem: (
      request: RemoveFolderItemRequest,
    ) => Effect.Effect<void, DesktopBridgeError>
    readonly moveFolder: (request: MoveFolderRequest) => Effect.Effect<void, DesktopBridgeError>
    readonly moveFolderItem: (
      request: MoveFolderItemRequest,
    ) => Effect.Effect<void, DesktopBridgeError>
  }
>()("open-spotify/DesktopBridge") {
  static readonly make = (desktopApi: DesktopApi) => {
    const send = <A>(channel: IpcChannel, reply: Schema.Decoder<A>, request?: unknown) =>
      Effect.tryPromise(() => desktopApi.invoke(channel, request)).pipe(
        Effect.flatMap(Schema.decodeUnknownEffect(reply)),
        Effect.mapError((cause) => new DesktopBridgeError({ channel, cause })),
      )

    const setSetting = Effect.fn("DesktopBridge.setSetting")(function* <K extends SettingKey>(
      key: K,
      value: SettingValue<K>,
    ) {
      const encodedValue = yield* Schema.encodeEffect(settingSchemas[key])(value).pipe(
        Effect.mapError(
          (cause) => new DesktopBridgeError({ channel: ipcChannels.setSetting, cause }),
        ),
      )
      yield* send(ipcChannels.setSetting, Schema.Undefined, { key, value: encodedValue })
    })

    return DesktopBridge.of({
      getAppInfo: send(ipcChannels.getAppInfo, AppInfo),
      getSetting: (key) => send(ipcChannels.getSetting, SettingReply(key), { key }),
      setSetting,
      getEnvironmentClientId: send(
        ipcChannels.getEnvironmentClientId,
        SettingReply("spotifyClientId"),
      ),
      logIn: send(ipcChannels.logIn, LogInReply).pipe(
        Effect.flatMap((reply) => (reply._tag === "LoggedIn" ? Effect.void : Effect.fail(reply))),
      ),
      cancelLogIn: send(ipcChannels.cancelLogIn, Schema.Undefined),
      getAccessToken: send(ipcChannels.getAccessToken, AccessTokenReply).pipe(
        Effect.flatMap((reply) =>
          reply._tag === "AccessToken" ? Effect.succeed(reply.accessToken) : Effect.fail(reply),
        ),
      ),
      logOut: send(ipcChannels.logOut, Schema.Undefined),
      getFolderTree: send(ipcChannels.getFolderTree, FolderTree),
      createFolder: (request) => send(ipcChannels.createFolder, FolderId, request),
      renameFolder: (request) => send(ipcChannels.renameFolder, Schema.Undefined, request),
      deleteFolder: (request) => send(ipcChannels.deleteFolder, Schema.Undefined, request),
      addFolderItem: (request) => send(ipcChannels.addFolderItem, Schema.Undefined, request),
      removeFolderItem: (request) => send(ipcChannels.removeFolderItem, Schema.Undefined, request),
      moveFolder: (request) => send(ipcChannels.moveFolder, Schema.Undefined, request),
      moveFolderItem: (request) => send(ipcChannels.moveFolderItem, Schema.Undefined, request),
    })
  }

  static readonly layer = Layer.sync(DesktopBridge, () => DesktopBridge.make(window.desktop))
}
