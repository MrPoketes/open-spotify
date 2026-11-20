import type { BrowserContext, ElectronApplication, Route } from "@playwright/test"
import { Effect } from "effect"
import { HttpBody, HttpClient, HttpClientRequest, HttpMethod } from "effect/http"
import {
  fakeAccessToken,
  spotifyFakeServer,
} from "../src/renderer/features/spotify/spotify-fake-server"

const answerFromFakeServer = Effect.fn("answerFromFakeServer")(function* (
  fakeServer: HttpClient.HttpClient,
  route: Route,
) {
  const request = route.request()
  const method = request.method()
  if (!HttpMethod.isHttpMethod(method)) {
    return yield* Effect.die(new Error(`Chromium sent an unknown HTTP method: ${method}`))
  }
  const requestBody = request.postDataBuffer()
  const response = yield* fakeServer.execute(
    HttpClientRequest.make(method)(request.url(), {
      headers: request.headers(),
      body: requestBody === null ? HttpBody.empty : HttpBody.uint8Array(requestBody),
    }),
  )
  const body = yield* response.text
  return yield* Effect.promise(() =>
    route.fulfill({ status: response.status, headers: response.headers, body }),
  )
})

// Serves api.spotify.com from the same fixtures the renderer's unit tests
// use, by intercepting the window's requests before they leave Chromium.
export async function serveFakeWebApi(context: BrowserContext): Promise<void> {
  const fakeServer = await Effect.runPromise(
    Effect.gen(function* () {
      return yield* HttpClient.HttpClient
    }).pipe(Effect.provide(spotifyFakeServer)),
  )
  await context.route("https://api.spotify.com/**", (route) =>
    Effect.runPromise(answerFromFakeServer(fakeServer, route)),
  )
}

// Login runs in the main process, out of Playwright's network interception,
// so its two ways out are replaced inside the running app: the system browser
// approves the login at once, and fetch answers only Spotify's token endpoint
// and fails everything else, so nothing reaches the network.
export async function fakeSpotifyAccounts(electronApp: ElectronApplication): Promise<void> {
  await electronApp.evaluate(({ safeStorage, shell }, accessToken) => {
    // CI's Linux machines run no keyring, and without one safeStorage refuses
    // to encrypt unless it may fall back to its built-in key.
    safeStorage.setUsePlainTextEncryption(true)

    const networkFetch = globalThis.fetch
    shell.openExternal = async (authorizeUrl) => {
      const state = new URL(authorizeUrl).searchParams.get("state") ?? ""
      const callbackUrl = new URL("http://127.0.0.1:43821/callback")
      callbackUrl.search = new URLSearchParams({ code: "fake-code", state }).toString()
      await networkFetch(callbackUrl)
    }
    globalThis.fetch = (input) => {
      const url = input instanceof Request ? input.url : String(input)
      if (url !== "https://accounts.spotify.com/api/token") {
        return Promise.reject(new Error(`The end-to-end test blocks ${url}`))
      }
      const tokens = {
        access_token: accessToken,
        refresh_token: "fake-refresh-token",
        expires_in: 3600,
      }
      return Promise.resolve(Response.json(tokens))
    }
  }, fakeAccessToken)
}
