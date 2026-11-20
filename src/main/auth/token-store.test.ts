import path from "node:path"
import * as NodeFileSystem from "@effect/platform-node/NodeFileSystem"
import { assert, layer } from "@effect/vitest"
import { Effect, FileSystem, Option } from "effect"
import { fakeEncryption } from "./spotify-session-fakes"
import { TokenStore } from "./token-store"

const storedSession = {
  clientId: "my-client-id",
  accessToken: "my-access-token",
  refreshToken: "my-refresh-token",
  accessTokenExpiresAt: 1_800_000_000_000,
}

layer(NodeFileSystem.layer)("TokenStore", (it) => {
  // The refresh token grants access to the user's Spotify account until it is
  // revoked, so it must never sit on disk where another program can read it.
  it.effect("loads the saved session back and keeps no token readable in the file", () =>
    Effect.gen(function* () {
      const fileSystem = yield* FileSystem.FileSystem
      const sessionFile = path.join(yield* fileSystem.makeTempDirectoryScoped(), "session.bin")

      const loadedSession = yield* Effect.gen(function* () {
        const tokenStore = yield* TokenStore
        yield* tokenStore.save(storedSession)
        return yield* tokenStore.load
      }).pipe(Effect.provide(TokenStore.layer(fakeEncryption, sessionFile)))
      const fileContents = new TextDecoder().decode(yield* fileSystem.readFile(sessionFile))

      assert.deepStrictEqual(loadedSession, Option.some(storedSession))
      assert.notInclude(fileContents, "my-refresh-token")
      assert.notInclude(fileContents, "my-access-token")
    }),
  )

  // safeStorage cannot decrypt a file written under another OS account or
  // keychain. That must be a typed error, not a crash.
  it.effect("fails with TokenStorageError when the saved session cannot be decrypted", () =>
    Effect.gen(function* () {
      const fileSystem = yield* FileSystem.FileSystem
      const sessionFile = path.join(yield* fileSystem.makeTempDirectoryScoped(), "session.bin")
      yield* fileSystem.writeFileString(sessionFile, "not an encrypted session")

      const error = yield* Effect.gen(function* () {
        const tokenStore = yield* TokenStore
        return yield* Effect.flip(tokenStore.load)
      }).pipe(Effect.provide(TokenStore.layer(fakeEncryption, sessionFile)))

      assert.strictEqual(error._tag, "TokenStorageError")
    }),
  )
})
