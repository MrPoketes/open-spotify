import { assert, describe, it } from "@effect/vitest"
import { Effect, Fiber } from "effect"
import { TestClock } from "effect/testing"
import {
  type FakeSpotifyAccounts,
  fakeBrowser,
  fakeSpotifySession,
  makeFakeSpotifyAccounts,
  restoreFakeSession,
} from "./spotify-session-fakes"
import { SpotifySession } from "./spotify-session"

// Login has its own tests. These start from a session saved by an earlier
// launch, so they never open the loopback server.
const sessionWithoutLogin = (spotifyAccounts: FakeSpotifyAccounts) =>
  fakeSpotifySession(
    spotifyAccounts,
    fakeBrowser(() => Effect.void),
  )

describe("SpotifySession.getAccessToken", () => {
  it.effect("fails with NotLoggedIn before the first login", () => {
    const spotifyAccounts = makeFakeSpotifyAccounts()
    return Effect.gen(function* () {
      const session = yield* SpotifySession

      const error = yield* Effect.flip(session.getAccessToken)

      assert.strictEqual(error._tag, "NotLoggedIn")
    }).pipe(Effect.provide(sessionWithoutLogin(spotifyAccounts)))
  })

  // Tokens last an hour. Refreshing a minute early means the renderer never
  // sends a request with a token that expires on the way.
  it.effect("refreshes the access token one minute before it expires", () => {
    const spotifyAccounts = makeFakeSpotifyAccounts()
    return Effect.gen(function* () {
      const session = yield* restoreFakeSession(spotifyAccounts)

      yield* TestClock.adjust("3539 seconds")
      const tokenBeforeRefreshWindow = yield* session.getAccessToken
      yield* TestClock.adjust("1 second")
      const tokenInRefreshWindow = yield* session.getAccessToken

      assert.strictEqual(tokenBeforeRefreshWindow, "access-token-1")
      assert.strictEqual(tokenInRefreshWindow, "access-token-2")
    }).pipe(Effect.provide(sessionWithoutLogin(spotifyAccounts)))
  })

  // Spotify rotates refresh tokens: a second refresh with the old one would
  // be refused and end the session.
  it.effect("refreshes only once when several requests need a new token at once", () => {
    const spotifyAccounts = makeFakeSpotifyAccounts()
    return Effect.gen(function* () {
      const session = yield* restoreFakeSession(spotifyAccounts)
      yield* TestClock.adjust("1 hour")

      const tokens = yield* Effect.all(
        [session.getAccessToken, session.getAccessToken, session.getAccessToken],
        { concurrency: "unbounded" },
      )

      assert.deepStrictEqual(tokens, ["access-token-2", "access-token-2", "access-token-2"])
    }).pipe(Effect.provide(sessionWithoutLogin(spotifyAccounts)))
  })

  it.effect("keeps the stored refresh token when Spotify does not send a new one", () => {
    const spotifyAccounts = makeFakeSpotifyAccounts()
    spotifyAccounts.behaviour.rotatesRefreshTokens = false
    return Effect.gen(function* () {
      const session = yield* restoreFakeSession(spotifyAccounts)

      yield* TestClock.adjust("1 hour")
      yield* session.getAccessToken
      yield* TestClock.adjust("1 hour")
      const tokenAfterSecondRefresh = yield* session.getAccessToken

      assert.strictEqual(tokenAfterSecondRefresh, "access-token-3")
    }).pipe(Effect.provide(sessionWithoutLogin(spotifyAccounts)))
  })

  it.effect("ends the session with SessionExpired when Spotify refuses the refresh token", () => {
    const spotifyAccounts = makeFakeSpotifyAccounts()
    return Effect.gen(function* () {
      const session = yield* restoreFakeSession(spotifyAccounts)
      spotifyAccounts.revokeRefreshTokens()
      yield* TestClock.adjust("1 hour")

      const refreshError = yield* Effect.flip(session.getAccessToken)
      const errorAfterwards = yield* Effect.flip(session.getAccessToken)

      assert.strictEqual(refreshError._tag, "SessionExpired")
      assert.strictEqual(errorAfterwards._tag, "NotLoggedIn")
    }).pipe(Effect.provide(sessionWithoutLogin(spotifyAccounts)))
  })

  // A refresh that fails for a reason unrelated to the token, such as a rate
  // limit, must not log the user out.
  it.effect("keeps the session when Spotify rate-limits a refresh", () => {
    const spotifyAccounts = makeFakeSpotifyAccounts()
    return Effect.gen(function* () {
      const session = yield* restoreFakeSession(spotifyAccounts)
      yield* TestClock.adjust("1 hour")

      spotifyAccounts.behaviour.isRateLimiting = true
      const rateLimitedError = yield* Effect.flip(session.getAccessToken)
      spotifyAccounts.behaviour.isRateLimiting = false
      const tokenAfterRateLimit = yield* session.getAccessToken

      assert.strictEqual(rateLimitedError._tag, "AccessTokenUnavailable")
      assert.strictEqual(tokenAfterRateLimit, "access-token-2")
    }).pipe(Effect.provide(sessionWithoutLogin(spotifyAccounts)))
  })

  it.effect("gives up on a refresh after Spotify stalls for 15 seconds", () => {
    const spotifyAccounts = makeFakeSpotifyAccounts()
    return Effect.gen(function* () {
      const session = yield* restoreFakeSession(spotifyAccounts)
      yield* TestClock.adjust("1 hour")
      spotifyAccounts.behaviour.isStalled = true

      const refresh = yield* Effect.forkChild(Effect.flip(session.getAccessToken))
      yield* spotifyAccounts.requestStalled
      yield* TestClock.adjust("15 seconds")
      const error = yield* Fiber.join(refresh)

      assert.strictEqual(error._tag, "AccessTokenUnavailable")
    }).pipe(Effect.provide(sessionWithoutLogin(spotifyAccounts)))
  })
})

describe("SpotifySession.logOut", () => {
  it.effect("forgets the session, so the next access token request fails", () => {
    const spotifyAccounts = makeFakeSpotifyAccounts()
    return Effect.gen(function* () {
      const session = yield* restoreFakeSession(spotifyAccounts)

      yield* session.logOut
      const error = yield* Effect.flip(session.getAccessToken)

      assert.strictEqual(error._tag, "NotLoggedIn")
    }).pipe(Effect.provide(sessionWithoutLogin(spotifyAccounts)))
  })
})
