import { Context, Effect, Layer, Option, Schema } from "effect"
import type { DesktopApi } from "../../preload/desktop-api"
import { AppInfo } from "../../shared/app-info"
import {
  type AddFolderItemRequest,
  type CreateFolderRequest,
  type DeleteFolderRequest,
  FolderChangeError,
  FolderId,
  FolderTree,
  type MoveFolderItemRequest,
  type MoveFolderRequest,
  type RemoveFolderItemRequest,
  type RenameFolderRequest,
} from "../../shared/folders"
import {
  ExportFoldersReply,
  type FoldersImportOutcome,
  type ImportFoldersError,
  ImportFoldersReply,
} from "../../shared/folders-file-replies"
import { type IpcChannel, ipcChannels } from "../../shared/ipc-channels"
import { IpcReply } from "../../shared/ipc-reply"
import { MalformedIpcRequest } from "../../shared/malformed-ipc-request"
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
import type { SpotifyFailureLog } from "../../shared/spotify-failure-log"
import { Theme } from "../../shared/theme"
import {
  ExportThemeReply,
  ImportThemeReply,
  type ThemeImportFailed,
} from "../../shared/theme-file-replies"
import { LibraryTheme, type ThemeId } from "../../shared/theme-library"

export class DesktopBridgeError extends Schema.TaggedError<DesktopBridgeError>()(
  "DesktopBridgeError",
  { channel: Schema.String, cause: Schema.Defect() },
) {}

const importedThemeFromReply = (reply: ImportThemeReply) => {
  if (reply._tag === "ThemeImportFailed") {
    return Effect.fail(reply)
  }
  if (reply._tag === "ThemeImportCanceled") {
    return Effect.succeed(Option.none())
  }
  return Effect.succeed(Option.some(reply.importedTheme))
}

const ipcSender = (desktopApi: DesktopApi) => {
  const send = <A>(channel: IpcChannel, reply: Schema.Decoder<A>, request?: unknown) =>
    Effect.tryPromise(() => desktopApi.invoke(channel, request)).pipe(
      Effect.flatMap(Schema.decodeUnknownEffect(reply)),
      Effect.mapError((cause) => new DesktopBridgeError({ channel, cause })),
    )

  const sendWithTaggedFailures = <Value, Failure>(
    channel: IpcChannel,
    schemas: { readonly value: Schema.Decoder<Value>; readonly failure: Schema.Decoder<Failure> },
    request?: unknown,
  ) =>
    send(channel, IpcReply(schemas.value, schemas.failure), request).pipe(
      Effect.flatMap((reply) =>
        reply._tag === "IpcSucceeded" ? Effect.succeed(reply.value) : Effect.fail(reply.error),
      ),
    )

  return { send, sendWithTaggedFailures }
}

const folderChangeReply = { value: Schema.Undefined, failure: FolderChangeError }

const folderChanges = ({ sendWithTaggedFailures }: ReturnType<typeof ipcSender>) => ({
  createFolder: (request: CreateFolderRequest) =>
    sendWithTaggedFailures(
      ipcChannels.createFolder,
      { value: FolderId, failure: FolderChangeError },
      request,
    ),
  renameFolder: (request: RenameFolderRequest) =>
    sendWithTaggedFailures(ipcChannels.renameFolder, folderChangeReply, request),
  deleteFolder: (request: DeleteFolderRequest) =>
    sendWithTaggedFailures(ipcChannels.deleteFolder, folderChangeReply, request),
  addFolderItem: (request: AddFolderItemRequest) =>
    sendWithTaggedFailures(ipcChannels.addFolderItem, folderChangeReply, request),
  removeFolderItem: (request: RemoveFolderItemRequest) =>
    sendWithTaggedFailures(ipcChannels.removeFolderItem, folderChangeReply, request),
  moveFolder: (request: MoveFolderRequest) =>
    sendWithTaggedFailures(ipcChannels.moveFolder, folderChangeReply, request),
  moveFolderItem: (request: MoveFolderItemRequest) =>
    sendWithTaggedFailures(ipcChannels.moveFolderItem, folderChangeReply, request),
})

// Typed access to the main process. Replies are decoded with a Schema, so the
// rest of the renderer only ever sees values of the declared type.
export class DesktopBridge extends Context.Service<
  DesktopBridge,
  {
    readonly getAppInfo: Effect.Effect<AppInfo, DesktopBridgeError>
    readonly getSetting: <K extends SettingKey>(
      key: K,
    ) => Effect.Effect<Option.Option<SettingValue<K>>, MalformedIpcRequest | DesktopBridgeError>
    readonly setSetting: <K extends SettingKey>(
      key: K,
      value: SettingValue<K>,
    ) => Effect.Effect<void, MalformedIpcRequest | DesktopBridgeError>
    readonly getEnvironmentClientId: Effect.Effect<Option.Option<string>, DesktopBridgeError>
    readonly logIn: Effect.Effect<void, LogInError | DesktopBridgeError>
    readonly cancelLogIn: Effect.Effect<void, DesktopBridgeError>
    readonly getAccessToken: Effect.Effect<string, AccessTokenError | DesktopBridgeError>
    readonly logOut: Effect.Effect<void, DesktopBridgeError>
    readonly getFolderTree: Effect.Effect<FolderTree, DesktopBridgeError>
    readonly createFolder: (
      request: CreateFolderRequest,
    ) => Effect.Effect<string, FolderChangeError | DesktopBridgeError>
    readonly renameFolder: (
      request: RenameFolderRequest,
    ) => Effect.Effect<void, FolderChangeError | DesktopBridgeError>
    readonly deleteFolder: (
      request: DeleteFolderRequest,
    ) => Effect.Effect<void, FolderChangeError | DesktopBridgeError>
    readonly addFolderItem: (
      request: AddFolderItemRequest,
    ) => Effect.Effect<void, FolderChangeError | DesktopBridgeError>
    readonly removeFolderItem: (
      request: RemoveFolderItemRequest,
    ) => Effect.Effect<void, FolderChangeError | DesktopBridgeError>
    readonly moveFolder: (
      request: MoveFolderRequest,
    ) => Effect.Effect<void, FolderChangeError | DesktopBridgeError>
    readonly moveFolderItem: (
      request: MoveFolderItemRequest,
    ) => Effect.Effect<void, FolderChangeError | DesktopBridgeError>
    readonly listImportedThemes: Effect.Effect<ReadonlyArray<LibraryTheme>, DesktopBridgeError>
    // None when the user cancels.
    readonly importThemeFile: Effect.Effect<
      Option.Option<LibraryTheme>,
      ThemeImportFailed | DesktopBridgeError
    >
    // None when the user declines to replace a theme with the same name and author.
    readonly saveEditedTheme: (
      theme: Theme,
    ) => Effect.Effect<Option.Option<LibraryTheme>, ThemeImportFailed | DesktopBridgeError>
    readonly deleteImportedTheme: (themeId: ThemeId) => Effect.Effect<void, DesktopBridgeError>
    // The file written, or none when the user cancels.
    readonly exportCurrentTheme: Effect.Effect<Option.Option<string>, DesktopBridgeError>
    readonly exportFolders: Effect.Effect<ExportFoldersReply, DesktopBridgeError>
    readonly importFolders: Effect.Effect<
      FoldersImportOutcome,
      ImportFoldersError | DesktopBridgeError
    >
    readonly logSpotifyFailure: (
      failure: SpotifyFailureLog,
    ) => Effect.Effect<void, DesktopBridgeError>
  }
>()("open-spotify/DesktopBridge") {
  static readonly make = (desktopApi: DesktopApi) => {
    const sender = ipcSender(desktopApi)
    const { send, sendWithTaggedFailures } = sender

    const setSetting = Effect.fn("DesktopBridge.setSetting")(function* <K extends SettingKey>(
      key: K,
      value: SettingValue<K>,
    ) {
      const encodedValue = yield* Schema.encodeEffect(settingSchemas[key])(value).pipe(
        Effect.mapError(
          (cause) => new DesktopBridgeError({ channel: ipcChannels.setSetting, cause }),
        ),
      )
      yield* sendWithTaggedFailures(
        ipcChannels.setSetting,
        { value: Schema.Undefined, failure: MalformedIpcRequest },
        { key, value: encodedValue },
      )
    })

    return DesktopBridge.of({
      getAppInfo: send(ipcChannels.getAppInfo, AppInfo),
      getSetting: (key) =>
        sendWithTaggedFailures(
          ipcChannels.getSetting,
          { value: SettingReply(key), failure: MalformedIpcRequest },
          { key },
        ),
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
      ...folderChanges(sender),
      listImportedThemes: send(ipcChannels.listImportedThemes, Schema.Array(LibraryTheme)),
      importThemeFile: send(ipcChannels.importThemeFile, ImportThemeReply).pipe(
        Effect.flatMap(importedThemeFromReply),
      ),
      saveEditedTheme: Effect.fn("DesktopBridge.saveEditedTheme")(function* (theme: Theme) {
        const encodedTheme = yield* Schema.encodeEffect(Theme)(theme).pipe(
          Effect.mapError(
            (cause) => new DesktopBridgeError({ channel: ipcChannels.saveEditedTheme, cause }),
          ),
        )
        const reply = yield* send(ipcChannels.saveEditedTheme, ImportThemeReply, encodedTheme)
        return yield* importedThemeFromReply(reply)
      }),
      deleteImportedTheme: (themeId) =>
        send(ipcChannels.deleteImportedTheme, Schema.Undefined, themeId),
      exportCurrentTheme: send(ipcChannels.exportCurrentTheme, ExportThemeReply),
      exportFolders: send(ipcChannels.exportFolders, ExportFoldersReply),
      importFolders: send(ipcChannels.importFolders, ImportFoldersReply).pipe(
        Effect.flatMap((reply) =>
          reply._tag === "FoldersImported" || reply._tag === "FileDialogCanceled"
            ? Effect.succeed(reply)
            : Effect.fail(reply),
        ),
      ),
      logSpotifyFailure: (failure) =>
        send(ipcChannels.logSpotifyFailure, Schema.Undefined, failure),
    })
  }

  static readonly layer = Layer.sync(DesktopBridge, () => DesktopBridge.make(window.desktop))
}
