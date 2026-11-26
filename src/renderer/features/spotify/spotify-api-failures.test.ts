import { assert, describe, it } from "@effect/vitest"
import { Effect, Layer, Logger, Stream } from "effect"
import { FetchHttpClient } from "effect/http"
import { ipcChannels } from "../../../shared/ipc-channels"
import { AccessTokenUnavailable } from "../../../shared/spotify-auth-replies"
import type { SpotifyFailureLog } from "../../../shared/spotify-failure-log"
import { desktopBridgeOver } from "../../lib/desktop-bridge-fakes"
import {
  offlineSpotifyClient,
  scriptedSpotify,
  spotifyApiUsing,
  spotifyApiWithTokenFailure,
} from "./scripted-spotify-api"
import { SpotifyAccessToken } from "./spotify-access-token"
import { SpotifyApi } from "./spotify-api"
import { SpotifyFailureLogForwarder } from "./spotify-failure-logging"
import { spotifyErrorBody } from "./spotify-fake-error-body"
import { fakeAccessToken } from "./spotify-fake-server"
import { fakeCurrentUser } from "./spotify-fixtures"

const captureWarnings = () => {
  const consoleWarnings: Array<unknown> = []
  const forwardedFailures: Array<SpotifyFailureLog> = []
  const loggerLayer = Logger.layer([
    Logger.make((entry) => {
      if (entry.logLevel === "Warn") {
        consoleWarnings.push(entry.message)
      }
    }),
  ])
  const forwarderLayer = Layer.succeed(SpotifyFailureLogForwarder, (failure) =>
    Effect.sync(() => {
      forwardedFailures.push(failure)
    }),
  )
  return { consoleWarnings, forwardedFailures, loggerLayer, forwarderLayer }
}

const notFoundFetch: typeof globalThis.fetch = () =>
  Promise.resolve(new Response(JSON.stringify(spotifyErrorBody(404, "Not found")), { status: 404 }))

describe("SpotifyApi request headers", () => {
  // Spotify's CORS preflight rejects Effect's default b3 and traceparent
  // headers from both localhost and app://renderer.
  it.effect("sends Authorization and Accept without trace-propagation headers", () => {
    const sentHeaders: Array<Record<string, string>> = []
    const recordingFetch: typeof globalThis.fetch = (_input, init) => {
      sentHeaders.push(Object.fromEntries(new Headers(init?.headers).entries()))
      return Promise.resolve(Response.json(fakeCurrentUser))
    }
    const apiLayer = SpotifyApi.layerWithoutHttpClient.pipe(
      Layer.provide([
        FetchHttpClient.layer.pipe(
          Layer.provide(Layer.succeed(FetchHttpClient.Fetch, recordingFetch)),
        ),
        Layer.succeed(SpotifyAccessToken, { get: Effect.succeed(fakeAccessToken) }),
      ]),
    )
    return Effect.gen(function* () {
      const api = yield* SpotifyApi

      yield* api.getCurrentUser

      assert.strictEqual(sentHeaders.length, 1)
      assert.strictEqual(sentHeaders[0]?.["authorization"], `Bearer ${fakeAccessToken}`)
      assert.strictEqual(sentHeaders[0]?.["accept"], "application/json")
      assert.isUndefined(sentHeaders[0]?.["b3"])
      assert.isUndefined(sentHeaders[0]?.["traceparent"])
    }).pipe(Effect.provide(apiLayer))
  })
})

describe("SpotifyApi 403 development-mode errors", () => {
  it.effect(
    "classifies a JSON 403 for an unregistered dashboard user as SpotifyAccessDenied",
    () => {
      const message = "User not registered in the Developer Dashboard"
      const spotify = scriptedSpotify([
        { status: 403, body: JSON.stringify(spotifyErrorBody(403, message)) },
      ])
      return Effect.gen(function* () {
        const error = yield* Effect.flip((yield* SpotifyApi).getCurrentUser)

        assert.strictEqual(error._tag, "SpotifyAccessDenied")
        assert.include(error, { denial: "userNotRegistered", message })
      }).pipe(Effect.provide(spotify.layer))
    },
  )

  it.effect("classifies a plain-text 403 for an unregistered user as SpotifyAccessDenied", () => {
    const message =
      "Check settings on developer.spotify.com/dashboard, the user may not be registered."
    const spotify = scriptedSpotify([{ status: 403, body: message }])
    return Effect.gen(function* () {
      const error = yield* Effect.flip((yield* SpotifyApi).getCurrentUser)

      assert.strictEqual(error._tag, "SpotifyAccessDenied")
      assert.include(error, { denial: "userNotRegistered", message })
    }).pipe(Effect.provide(spotify.layer))
  })

  it.effect(
    "classifies a 403 with PREMIUM_REQUIRED or Premium message as SpotifyAccessDenied",
    () => {
      const ownerMessage = "Active premium subscription required for the owner of the app."
      const spotify = scriptedSpotify([
        {
          status: 403,
          body: JSON.stringify({
            error: {
              status: 403,
              message: "Player command failed: Premium required",
              reason: "PREMIUM_REQUIRED",
            },
          }),
        },
        { status: 403, body: JSON.stringify(spotifyErrorBody(403, ownerMessage)) },
      ])
      return Effect.gen(function* () {
        const api = yield* SpotifyApi

        const playerError = yield* Effect.flip(api.play)
        const ownerError = yield* Effect.flip(api.getCurrentUser)

        assert.strictEqual(playerError._tag, "SpotifyAccessDenied")
        assert.include(playerError, { denial: "premiumRequired" })
        assert.strictEqual(ownerError._tag, "SpotifyAccessDenied")
        assert.include(ownerError, { denial: "premiumRequired", message: ownerMessage })
      }).pipe(Effect.provide(spotify.layer))
    },
  )
})

describe("SpotifyApi failure logging", () => {
  it.effect("logs one warning to console and main process for an HTTP error with reason", () => {
    const { consoleWarnings, forwardedFailures, loggerLayer, forwarderLayer } = captureWarnings()
    const spotify = scriptedSpotify([
      {
        status: 403,
        body: JSON.stringify({
          error: {
            status: 403,
            message: "Player command failed: Premium required",
            reason: "PREMIUM_REQUIRED",
          },
        }),
      },
    ])
    return Effect.gen(function* () {
      yield* Effect.flip((yield* SpotifyApi).play)

      assert.strictEqual(consoleWarnings.length, 1)
      assert.deepStrictEqual(forwardedFailures, [
        {
          url: "https://api.spotify.com/v1/me/player/play",
          status: 403,
          spotifyMessage: "Player command failed: Premium required",
          spotifyReason: "PREMIUM_REQUIRED",
          cause: "SpotifyAccessDenied (premiumRequired)",
        },
      ])
    }).pipe(
      Effect.provide(spotify.layer.pipe(Layer.provide(forwarderLayer))),
      Effect.provide(loggerLayer),
    )
  })

  it.effect("logs one warning to console and main process for network and decode errors", () => {
    const { consoleWarnings, forwardedFailures, loggerLayer, forwarderLayer } = captureWarnings()
    const badJson = scriptedSpotify([
      { status: 200, body: JSON.stringify({ id: 42, images: "none" }) },
    ])
    const getUserFailure = Effect.gen(function* () {
      return yield* Effect.flip((yield* SpotifyApi).getCurrentUser)
    })
    return Effect.gen(function* () {
      yield* getUserFailure.pipe(
        Effect.provide(spotifyApiUsing(offlineSpotifyClient).pipe(Layer.provide(forwarderLayer))),
      )
      const decodeError = yield* getUserFailure.pipe(
        Effect.provide(badJson.layer.pipe(Layer.provide(forwarderLayer))),
      )

      assert.strictEqual(decodeError._tag, "SpotifyDecodeError")
      assert.strictEqual(consoleWarnings.length, 2)
      assert.strictEqual(forwardedFailures.length, 2)
      assert.include(forwardedFailures[0], {
        url: "https://api.spotify.com/v1/me",
        status: null,
        spotifyMessage: null,
        spotifyReason: null,
      })
      assert.include(forwardedFailures[0]?.cause ?? "", "Failed to fetch")
      assert.include(forwardedFailures[1], {
        url: "https://api.spotify.com/v1/me",
        status: 200,
        spotifyMessage: null,
        spotifyReason: null,
      })
      assert.isNotEmpty(forwardedFailures[1]?.cause)
    }).pipe(Effect.provide(loggerLayer))
  })

  it.effect("logs one warning to console and main process for a token refresh error", () => {
    const { consoleWarnings, forwardedFailures, loggerLayer, forwarderLayer } = captureWarnings()
    const tokenFailure = new AccessTokenUnavailable({
      message: "Spotify could not refresh the session right now.",
    })
    const apiLayer = spotifyApiWithTokenFailure(tokenFailure).pipe(Layer.provide(forwarderLayer))
    return Effect.gen(function* () {
      const error = yield* Effect.flip((yield* SpotifyApi).getCurrentUser)

      assert.strictEqual(error._tag, "AccessTokenUnavailable")
      assert.strictEqual(consoleWarnings.length, 1)
      assert.deepStrictEqual(forwardedFailures, [
        {
          url: "https://api.spotify.com/v1/me",
          status: null,
          spotifyMessage: null,
          spotifyReason: null,
          cause: "AccessTokenUnavailable: Spotify could not refresh the session right now.",
        },
      ])
    }).pipe(Effect.provide(apiLayer), Effect.provide(loggerLayer))
  })

  it.effect(
    "forwards failures through DesktopBridge in SpotifyApi.layer without masking errors",
    () => {
      const loggedPayloads: Array<unknown> = []
      const mainProcess = {
        invoke: (channel: string, request?: unknown) => {
          if (channel === ipcChannels.logSpotifyFailure) {
            loggedPayloads.push(request)
            return Promise.reject(new Error("log channel unavailable"))
          }
          return Promise.reject(new Error(`Unexpected channel ${channel}`))
        },
      }
      const productionLayer = SpotifyApi.layer.pipe(
        Layer.provide([
          desktopBridgeOver(mainProcess),
          Layer.succeed(SpotifyAccessToken, { get: Effect.succeed(fakeAccessToken) }),
          Layer.succeed(FetchHttpClient.Fetch, notFoundFetch),
        ]),
      )
      return Effect.gen(function* () {
        const error = yield* Effect.flip((yield* SpotifyApi).getCurrentUser)

        assert.strictEqual(error._tag, "SpotifyResponseError")
        assert.deepStrictEqual(loggedPayloads, [
          {
            url: "https://api.spotify.com/v1/me",
            status: 404,
            spotifyMessage: "Not found",
            spotifyReason: null,
            cause: "HTTP 404",
          },
        ])
      }).pipe(Effect.provide(productionLayer))
    },
  )
})

describe("SpotifyApi development-mode playlist responses", () => {
  // Since February 2026, Spotify omits or nulls `items` on playlists the user
  // does not own or collaborate on.
  it.effect("decodes simplified and full playlists whose items field is omitted or null", () => {
    const metadata = {
      id: "followed-playlist",
      name: "Indie Finds",
      description: "Weekly picks",
      images: [],
      owner: { id: "curator", display_name: "Curator" },
      collaborative: false,
      uri: "spotify:playlist:followed-playlist",
    }
    const spotify = scriptedSpotify([
      {
        status: 200,
        body: JSON.stringify({
          items: [metadata, { ...metadata, id: "null-items", items: null }],
          next: null,
          total: 2,
        }),
      },
      { status: 200, body: JSON.stringify({ ...metadata, items: null }) },
    ])
    return Effect.gen(function* () {
      const api = yield* SpotifyApi

      const playlists = yield* Stream.runCollect(api.currentUserPlaylists)
      const fullPlaylist = yield* api.getPlaylist(metadata.id)

      assert.strictEqual(playlists.length, 2)
      assert.isUndefined(playlists[0]?.items)
      assert.isNull(playlists[1]?.items)
      assert.isNull(fullPlaylist.items)
    }).pipe(Effect.provide(spotify.layer))
  })
})
