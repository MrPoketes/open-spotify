import { createServer } from "node:net"
import { assert, describe, it } from "@effect/vitest"
import { Deferred, Effect, Fiber, Layer, Schema } from "effect"
import { TestClock } from "effect/testing"
import {
  type FakeSpotifyAccounts,
  approveLogin,
  approvingBrowser,
  callBack,
  callBackFrom,
  fakeBrowser,
  fakeSpotifySession,
  makeFakeSpotifyAccounts,
  restoreFakeSession,
  saveFakeClientId,
} from "./spotify-session-fakes"
import { SpotifySession } from "./spotify-session"
import type { SystemBrowser } from "./system-browser"

const ListeningAddress = Schema.Struct({ port: Schema.Number })

// Another program listening on a port the OS picked. Returns that port.
const occupyFreePort = Effect.acquireRelease(
  Effect.callback<ReturnType<typeof createServer>>((resume) => {
    const server = createServer()
    server.listen(0, "127.0.0.1", () => resume(Effect.succeed(server)))
  }),
  (server) =>
    Effect.callback<void>((resume) => {
      server.close(() => resume(Effect.void))
    }),
).pipe(
  Effect.flatMap((server) => Schema.decodeUnknownEffect(ListeningAddress)(server.address())),
  Effect.map((address) => address.port),
)

// Every login in the test listens on this one port, as every login in the app
// listens on 43821. A login that keeps the port then makes the next one fail
// with LoginPortInUse.
const fakeSessionOnOnePort = (
  spotifyAccounts: FakeSpotifyAccounts,
  browser: Layer.Layer<SystemBrowser>,
) =>
  Layer.unwrap(
    Effect.scoped(occupyFreePort).pipe(
      Effect.map((freePort) => fakeSpotifySession(spotifyAccounts, browser, freePort)),
    ),
  )

describe("SpotifySession.logIn", () => {
  it.effect("logs in through the browser and then provides an access token", () => {
    const spotifyAccounts = makeFakeSpotifyAccounts()
    return Effect.gen(function* () {
      const session = yield* SpotifySession
      yield* saveFakeClientId

      yield* session.logIn

      assert.strictEqual(yield* session.getAccessToken, "access-token-1")
    }).pipe(Effect.provide(fakeSpotifySession(spotifyAccounts, approvingBrowser(spotifyAccounts))))
  })

  it.effect("tells the user in the browser that they can close the tab", () => {
    const spotifyAccounts = makeFakeSpotifyAccounts()
    let pageShown = ""
    const browser = fakeBrowser((authorizeUrl) =>
      approveLogin(spotifyAccounts, authorizeUrl).pipe(
        Effect.tap((page) => Effect.sync(() => (pageShown = page))),
      ),
    )
    return Effect.gen(function* () {
      const session = yield* SpotifySession
      yield* saveFakeClientId

      yield* session.logIn

      assert.include(pageShown, "You can close this tab")
    }).pipe(Effect.provide(fakeSpotifySession(spotifyAccounts, browser)))
  })

  it.effect("fails with ClientIdMissing before the user has saved a Client ID", () => {
    const spotifyAccounts = makeFakeSpotifyAccounts()
    return Effect.gen(function* () {
      const session = yield* SpotifySession

      const error = yield* Effect.flip(session.logIn)

      assert.strictEqual(error._tag, "ClientIdMissing")
    }).pipe(Effect.provide(fakeSpotifySession(spotifyAccounts, approvingBrowser(spotifyAccounts))))
  })

  it.effect("fails with LoginPortInUse when another program holds the redirect port", () => {
    const spotifyAccounts = makeFakeSpotifyAccounts()
    const logIn = Effect.gen(function* () {
      const session = yield* SpotifySession
      yield* saveFakeClientId
      return yield* session.logIn
    })
    return Effect.gen(function* () {
      const occupiedPort = yield* occupyFreePort

      const error = yield* Effect.flip(logIn).pipe(
        Effect.provide(
          fakeSpotifySession(spotifyAccounts, approvingBrowser(spotifyAccounts), occupiedPort),
        ),
      )

      assert.strictEqual(error._tag, "LoginPortInUse")
    }).pipe(Effect.scoped)
  })

  it.effect("fails with LoginDenied when the user denies access on Spotify's page", () => {
    const spotifyAccounts = makeFakeSpotifyAccounts()
    const denyingBrowser = fakeBrowser((authorizeUrl) =>
      callBackFrom(authorizeUrl, { error: "access_denied" }),
    )
    return Effect.gen(function* () {
      const session = yield* SpotifySession
      yield* saveFakeClientId

      const error = yield* Effect.flip(session.logIn)

      assert.strictEqual(error._tag, "LoginDenied")
    }).pipe(Effect.provide(fakeSpotifySession(spotifyAccounts, denyingBrowser)))
  })

  // A page in the user's browser could send a request to the loopback server
  // with its own code, to log the app in to the attacker's account.
  it.effect("rejects a callback whose state does not match the login and stores nothing", () => {
    const spotifyAccounts = makeFakeSpotifyAccounts()
    const forgingBrowser = fakeBrowser((authorizeUrl) =>
      callBack(authorizeUrl, {
        code: spotifyAccounts.approve(authorizeUrl),
        state: "forged-state",
      }),
    )
    return Effect.gen(function* () {
      const session = yield* SpotifySession
      yield* saveFakeClientId

      const loginError = yield* Effect.flip(session.logIn)
      const accessTokenError = yield* Effect.flip(session.getAccessToken)

      assert.strictEqual(loginError._tag, "LoginStateMismatch")
      assert.strictEqual(accessTokenError._tag, "NotLoggedIn")
    }).pipe(Effect.provide(fakeSpotifySession(spotifyAccounts, forgingBrowser)))
  })

  // A wrong redirect URI in the user's Spotify app looks exactly like this:
  // Spotify shows its own error page and never calls back.
  it.effect("fails with LoginTimedOut when Spotify does not call back within five minutes", () => {
    const spotifyAccounts = makeFakeSpotifyAccounts()
    const browserOpened = Deferred.makeUnsafe<void>()
    const silentBrowser = fakeBrowser(() => Deferred.succeed(browserOpened, undefined))
    return Effect.gen(function* () {
      const session = yield* SpotifySession
      yield* saveFakeClientId

      const login = yield* Effect.forkChild(Effect.flip(session.logIn))
      yield* Deferred.await(browserOpened)
      yield* TestClock.adjust("5 minutes")
      const error = yield* Fiber.join(login)

      assert.strictEqual(error._tag, "LoginTimedOut")
    }).pipe(Effect.provide(fakeSpotifySession(spotifyAccounts, silentBrowser)))
  })

  it.effect("fails with LoginFailed when Spotify refuses to exchange the code", () => {
    const spotifyAccounts = makeFakeSpotifyAccounts()
    const browserWithUnknownCode = fakeBrowser((authorizeUrl) =>
      callBackFrom(authorizeUrl, { code: "unknown-code" }),
    )
    return Effect.gen(function* () {
      const session = yield* SpotifySession
      yield* saveFakeClientId

      const error = yield* Effect.flip(session.logIn)

      assert.strictEqual(error._tag, "LoginFailed")
    }).pipe(Effect.provide(fakeSpotifySession(spotifyAccounts, browserWithUnknownCode)))
  })

  it.effect("ends a login that waits for the browser with LoginCancelled when cancelled", () => {
    const spotifyAccounts = makeFakeSpotifyAccounts()
    const browserOpened = Deferred.makeUnsafe<void>()
    const silentBrowser = fakeBrowser(() => Deferred.succeed(browserOpened, undefined))
    return Effect.gen(function* () {
      const session = yield* SpotifySession
      yield* saveFakeClientId

      const login = yield* Effect.forkChild(Effect.flip(session.logIn))
      yield* Deferred.await(browserOpened)
      yield* session.cancelLogIn
      const error = yield* Fiber.join(login)

      assert.strictEqual(error._tag, "LoginCancelled")
    }).pipe(Effect.provide(fakeSpotifySession(spotifyAccounts, silentBrowser)))
  })

  // The first login holds the redirect port for up to five minutes. Without
  // replacing it, clicking "Log in" again would fail with LoginPortInUse.
  it.effect("replaces a login that waits for the browser when the user logs in again", () => {
    const spotifyAccounts = makeFakeSpotifyAccounts()
    const firstBrowserOpened = Deferred.makeUnsafe<void>()
    let browserOpenings = 0
    const browserIgnoringFirstLogin = fakeBrowser((authorizeUrl) => {
      browserOpenings += 1
      if (browserOpenings === 1) {
        return Deferred.succeed(firstBrowserOpened, undefined)
      }
      return approveLogin(spotifyAccounts, authorizeUrl)
    })
    return Effect.gen(function* () {
      const session = yield* SpotifySession
      yield* saveFakeClientId

      const firstLogin = yield* Effect.forkChild(Effect.flip(session.logIn))
      yield* Deferred.await(firstBrowserOpened)
      yield* session.logIn
      const firstLoginError = yield* Fiber.join(firstLogin)

      assert.strictEqual(firstLoginError._tag, "LoginCancelled")
      assert.strictEqual(yield* session.getAccessToken, "access-token-1")
    }).pipe(Effect.provide(fakeSessionOnOnePort(spotifyAccounts, browserIgnoringFirstLogin)))
  })

  // The user logs in again after logging out or after the session expires.
  it.effect("frees the redirect port when a login finishes, so the next login can use it", () => {
    const spotifyAccounts = makeFakeSpotifyAccounts()
    return Effect.gen(function* () {
      const session = yield* SpotifySession
      yield* saveFakeClientId

      yield* session.logIn
      yield* session.logIn

      assert.strictEqual(yield* session.getAccessToken, "access-token-2")
    }).pipe(
      Effect.provide(fakeSessionOnOnePort(spotifyAccounts, approvingBrowser(spotifyAccounts))),
    )
  })

  it.effect("provides access tokens again after logging in over an expired session", () => {
    const spotifyAccounts = makeFakeSpotifyAccounts()
    return Effect.gen(function* () {
      const session = yield* restoreFakeSession(spotifyAccounts)
      yield* saveFakeClientId
      spotifyAccounts.revokeRefreshTokens()
      yield* TestClock.adjust("1 hour")
      yield* Effect.flip(session.getAccessToken)

      yield* session.logIn

      assert.strictEqual(yield* session.getAccessToken, "access-token-2")
    }).pipe(Effect.provide(fakeSpotifySession(spotifyAccounts, approvingBrowser(spotifyAccounts))))
  })
})
