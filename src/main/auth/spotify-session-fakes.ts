import { createHash } from "node:crypto"
import path from "node:path"
import * as NodeFileSystem from "@effect/platform-node/NodeFileSystem"
import { Deferred, Effect, FileSystem, Layer } from "effect"
import { HttpClient, type HttpClientRequest, HttpClientResponse } from "effect/http"
import { spotifyRedirectUri } from "../../shared/spotify-redirect-uri"
import { databaseLayer } from "../database"
import { Settings } from "../settings"
import { SpotifySession } from "./spotify-session"
import { SpotifyTokenEndpoint } from "./spotify-token-endpoint"
import { SystemBrowser } from "./system-browser"
import { type TokenEncryption, TokenStore, makeStoredSession } from "./token-store"

const fakeClientId = "fake-client-id"

const fakeTokenLifetimeSeconds = 3600

// Reversible like safeStorage, and like safeStorage it leaves no plain text
// in the file.
export const fakeEncryption: TokenEncryption = {
  encryptString: (plainText) => Buffer.from(Buffer.from(plainText).map((byte) => byte ^ 0xff)),
  decryptString: (encrypted) => Buffer.from(encrypted.map((byte) => byte ^ 0xff)).toString(),
}

const jsonResponse = (
  request: HttpClientRequest.HttpClientRequest,
  status: number,
  body: unknown,
) =>
  HttpClientResponse.fromWeb(
    request,
    new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } }),
  )

const formOf = (request: HttpClientRequest.HttpClientRequest) =>
  new URLSearchParams(
    request.body._tag === "Uint8Array" ? new TextDecoder().decode(request.body.body) : "",
  )

const codeChallengeFor = (codeVerifier: string) =>
  createHash("sha256").update(codeVerifier).digest("base64url")

// A stand-in for accounts.spotify.com. Like Spotify, it exchanges a code only
// for the verifier that matches the challenge sent with the authorize URL,
// and it rotates the refresh token on every refresh unless told not to.
export const makeFakeSpotifyAccounts = () => {
  const challengeByCode = new Map<string, string>()
  const liveRefreshTokens = new Set<string>()
  const behaviour = { rotatesRefreshTokens: true, isRateLimiting: false, isStalled: false }
  let tokensIssued = 0
  const requestStalled = Deferred.makeUnsafe<void>()

  const issueTokens = () => {
    tokensIssued += 1
    const refreshToken = `refresh-token-${tokensIssued}`
    liveRefreshTokens.add(refreshToken)
    return {
      access_token: `access-token-${tokensIssued}`,
      token_type: "Bearer",
      expires_in: fakeTokenLifetimeSeconds,
      refresh_token: refreshToken,
    }
  }

  const exchangeCode = (form: URLSearchParams) => {
    const code = form.get("code") ?? ""
    const challenge = challengeByCode.get(code)
    challengeByCode.delete(code)
    const isValid =
      challenge === codeChallengeFor(form.get("code_verifier") ?? "") &&
      form.get("client_id") === fakeClientId &&
      form.get("redirect_uri") === spotifyRedirectUri
    return isValid ? ([200, issueTokens()] as const) : ([400, { error: "invalid_grant" }] as const)
  }

  const refresh = (form: URLSearchParams) => {
    const refreshToken = form.get("refresh_token") ?? ""
    if (!liveRefreshTokens.has(refreshToken)) {
      return [400, { error: "invalid_grant" }] as const
    }
    const { refresh_token: rotatedRefreshToken, ...tokens } = issueTokens()
    if (!behaviour.rotatesRefreshTokens) {
      liveRefreshTokens.delete(rotatedRefreshToken)
      return [200, tokens] as const
    }
    liveRefreshTokens.delete(refreshToken)
    return [200, { ...tokens, refresh_token: rotatedRefreshToken }] as const
  }

  const httpClient = Layer.succeed(
    HttpClient.HttpClient,
    HttpClient.make((request) => {
      if (behaviour.isStalled) {
        return Deferred.succeed(requestStalled, undefined).pipe(Effect.andThen(Effect.never))
      }
      if (behaviour.isRateLimiting) {
        return Effect.succeed(jsonResponse(request, 429, { error: "rate_limited" }))
      }
      const form = formOf(request)
      const [status, body] =
        form.get("grant_type") === "refresh_token" ? refresh(form) : exchangeCode(form)
      return Effect.succeed(jsonResponse(request, status, body))
    }),
  )

  // What happens when the user approves the login on Spotify's page.
  const approve = (authorizeUrl: URL) => {
    const code = `code-${challengeByCode.size + 1}`
    challengeByCode.set(code, authorizeUrl.searchParams.get("code_challenge") ?? "")
    return code
  }

  return {
    behaviour,
    httpClient,
    approve,
    issueTokens,
    requestStalled: Deferred.await(requestStalled),
    revokeRefreshTokens: () => liveRefreshTokens.clear(),
  }
}

export type FakeSpotifyAccounts = ReturnType<typeof makeFakeSpotifyAccounts>

// Sends the browser to the loopback server the way Spotify redirects it, and
// returns the text of the page the browser shows.
export const callBack = (query: Record<string, string>) =>
  Effect.promise(async () => {
    const response = await fetch(`${spotifyRedirectUri}?${new URLSearchParams(query).toString()}`)
    return response.text()
  })

export const fakeBrowser = (onOpen: (authorizeUrl: URL) => Effect.Effect<unknown>) =>
  Layer.succeed(SystemBrowser, {
    open: (url) => Effect.asVoid(onOpen(new URL(url))),
  })

export const approvingBrowser = (spotifyAccounts: FakeSpotifyAccounts) =>
  fakeBrowser((authorizeUrl) =>
    callBack({
      code: spotifyAccounts.approve(authorizeUrl),
      state: authorizeUrl.searchParams.get("state") ?? "",
    }),
  )

const temporaryTokenStore = Layer.unwrap(
  Effect.gen(function* () {
    const fileSystem = yield* FileSystem.FileSystem
    const directory = yield* fileSystem.makeTempDirectoryScoped()
    return TokenStore.layer(fakeEncryption, path.join(directory, "spotify-session.bin"))
  }),
).pipe(Layer.provide(NodeFileSystem.layer))

// The real session with fakes at its edges. Settings stays accessible so a
// test can store the Client ID first.
export const fakeSpotifySession = (
  spotifyAccounts: FakeSpotifyAccounts,
  browser: Layer.Layer<SystemBrowser>,
) =>
  SpotifySession.layer.pipe(
    Layer.provideMerge(
      Layer.mergeAll(
        Settings.layer.pipe(Layer.provide(databaseLayer(":memory:"))),
        SpotifyTokenEndpoint.layerWithoutHttpClient.pipe(Layer.provide(spotifyAccounts.httpClient)),
        temporaryTokenStore,
        browser,
      ),
    ),
  )

// A session saved by an earlier launch of the app.
export const restoreFakeSession = Effect.fn("restoreFakeSession")(function* (
  spotifyAccounts: FakeSpotifyAccounts,
) {
  const tokenStore = yield* TokenStore
  const issuedTokens = spotifyAccounts.issueTokens()
  const session = yield* makeStoredSession({
    clientId: fakeClientId,
    refreshToken: issuedTokens.refresh_token,
    accessToken: issuedTokens.access_token,
    expiresInSeconds: issuedTokens.expires_in,
  })
  yield* tokenStore.save(session)
  return yield* SpotifySession
})

export const saveFakeClientId = Effect.gen(function* () {
  const settings = yield* Settings
  yield* settings.set("spotifyClientId", fakeClientId)
})
