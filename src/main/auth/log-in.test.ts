import { createServer } from "node:net"
import { assert, describe, it } from "@effect/vitest"
import { Deferred, Effect, Fiber } from "effect"
import { TestClock } from "effect/testing"
import { spotifyRedirectPort } from "../../shared/spotify-redirect-uri"
import {
  approvingBrowser,
  callBack,
  fakeBrowser,
  fakeSpotifySession,
  makeFakeSpotifyAccounts,
  saveFakeClientId,
} from "./spotify-session-fakes"
import { SpotifySession } from "./spotify-session"

const occupyRedirectPort = Effect.acquireRelease(
  Effect.callback<ReturnType<typeof createServer>>((resume) => {
    const server = createServer()
    server.listen(spotifyRedirectPort, "127.0.0.1", () => resume(Effect.succeed(server)))
  }),
  (server) =>
    Effect.callback<void>((resume) => {
      server.close(() => resume(Effect.void))
    }),
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
      callBack({
        code: spotifyAccounts.approve(authorizeUrl),
        state: authorizeUrl.searchParams.get("state") ?? "",
      }).pipe(Effect.tap((page) => Effect.sync(() => (pageShown = page)))),
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
    return Effect.gen(function* () {
      const session = yield* SpotifySession
      yield* saveFakeClientId
      yield* occupyRedirectPort

      const error = yield* Effect.flip(session.logIn)

      assert.strictEqual(error._tag, "LoginPortInUse")
    }).pipe(
      Effect.scoped,
      Effect.provide(fakeSpotifySession(spotifyAccounts, approvingBrowser(spotifyAccounts))),
    )
  })

  it.effect("fails with LoginDenied when the user denies access on Spotify's page", () => {
    const spotifyAccounts = makeFakeSpotifyAccounts()
    const denyingBrowser = fakeBrowser((authorizeUrl) =>
      callBack({ error: "access_denied", state: authorizeUrl.searchParams.get("state") ?? "" }),
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
      callBack({ code: spotifyAccounts.approve(authorizeUrl), state: "forged-state" }),
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
      callBack({ code: "unknown-code", state: authorizeUrl.searchParams.get("state") ?? "" }),
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
      return callBack({
        code: spotifyAccounts.approve(authorizeUrl),
        state: authorizeUrl.searchParams.get("state") ?? "",
      })
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
    }).pipe(Effect.provide(fakeSpotifySession(spotifyAccounts, browserIgnoringFirstLogin)))
  })
})
