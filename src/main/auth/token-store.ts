import { Clock, Context, Effect, FileSystem, Layer, Option, Schema } from "effect"

const StoredSession = Schema.Struct({
  clientId: Schema.String,
  accessToken: Schema.String,
  refreshToken: Schema.String,
  // Epoch milliseconds, so the value survives JSON.
  accessTokenExpiresAt: Schema.Number,
})

type StoredSession = typeof StoredSession.Type

export class TokenStorageError extends Schema.TaggedError<TokenStorageError>()(
  "TokenStorageError",
  { cause: Schema.Defect() },
) {}

// The part of Electron's safeStorage the store uses. Taking it as a parameter
// keeps Electron out of this module, so tests can run it in plain Node.
export interface TokenEncryption {
  readonly encryptString: (plainText: string) => Buffer
  readonly decryptString: (encrypted: Buffer) => string
}

const storedSessionJson = Schema.fromJsonString(StoredSession)

const storageError = (cause: unknown) => new TokenStorageError({ cause })

export class TokenStore extends Context.Service<
  TokenStore,
  {
    readonly load: Effect.Effect<Option.Option<StoredSession>, TokenStorageError>
    readonly save: (session: StoredSession) => Effect.Effect<void, TokenStorageError>
    readonly clear: Effect.Effect<void, TokenStorageError>
  }
>()("open-spotify/TokenStore") {
  static readonly layer = (encryption: TokenEncryption, sessionFile: string) =>
    Layer.effect(
      TokenStore,
      Effect.gen(function* () {
        const fileSystem = yield* FileSystem.FileSystem

        const load = Effect.gen(function* () {
          if (!(yield* fileSystem.exists(sessionFile))) {
            return Option.none()
          }
          const encrypted = yield* fileSystem.readFile(sessionFile)
          const json = yield* Effect.try(() => encryption.decryptString(Buffer.from(encrypted)))
          return Option.some(yield* Schema.decodeEffect(storedSessionJson)(json))
        }).pipe(Effect.mapError(storageError))

        const save = Effect.fn("TokenStore.save")(function* (session: StoredSession) {
          const json = yield* Schema.encodeEffect(storedSessionJson)(session)
          const encrypted = yield* Effect.try(() => encryption.encryptString(json))
          // Readable by the current user only, as a second line of defence.
          yield* fileSystem.writeFile(sessionFile, encrypted, { mode: 0o600 })
        }, Effect.mapError(storageError))

        const clear = fileSystem
          .remove(sessionFile, { force: true })
          .pipe(Effect.mapError(storageError))

        return TokenStore.of({ load, save, clear })
      }),
    )
}

export const makeStoredSession = Effect.fn("makeStoredSession")(function* (session: {
  readonly clientId: string
  readonly refreshToken: string
  readonly accessToken: string
  readonly expiresInSeconds: number
}) {
  const now = yield* Clock.currentTimeMillis
  return {
    clientId: session.clientId,
    refreshToken: session.refreshToken,
    accessToken: session.accessToken,
    accessTokenExpiresAt: now + session.expiresInSeconds * 1000,
  } satisfies StoredSession
})
