import { createHash } from "node:crypto"
import path from "node:path"
import * as NodeFileSystem from "@effect/platform-node/NodeFileSystem"
import { Deferred, Effect, FileSystem, Layer, Schema } from "effect"
import { HttpClient, HttpClientResponse, type HttpClientRequest } from "effect/http"
import { Settings } from "../settings"
import { freshSettings } from "../settings-fakes"
import { requestedScopes } from "./authorization-request"
import { LoginRedirectPort } from "./callback-server"
import { SpotifySession } from "./spotify-session"
import { SpotifyTokenEndpoint } from "./spotify-token-endpoint"
import { SystemBrowser } from "./system-browser"
import { makeStoredSession, TokenStore, type TokenEncryption } from "./token-store"

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
// for the verifier that matches the challenge sent with the authorize URL and
// for the same redirect URI, and it rotates the refresh token on every
// refresh unless told not to.
export const makeFakeSpotifyAccounts = () => {
  const authorizeUrlByCode = new Map<string, URL>()
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
    const authorizeQuery = authorizeUrlByCode.get(code)?.searchParams
    authorizeUrlByCode.delete(code)
    const isValid =
      authorizeQuery !== undefined &&
      authorizeQuery.get("code_challenge") === codeChallengeFor(form.get("code_verifier") ?? "") &&
      authorizeQuery.get("redirect_uri") === form.get("redirect_uri") &&
      form.get("client_id") === fakeClientId
    if (!isValid) {
      return [400, { error: "invalid_grant" }] as const
    }
    return [200, { ...issueTokens(), scope: authorizeQuery.get("scope") }] as const
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
    const code = `code-${authorizeUrlByCode.size + 1}`
    authorizeUrlByCode.set(code, authorizeUrl)
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

class FakeCallbackError extends Schema.TaggedError<FakeCallbackError>()("FakeCallbackError", {
  cause: Schema.Defect(),
}) {}

// Sends the browser to the redirect URI in the authorize URL the way Spotify
// redirects it, and returns the text of the page the browser shows.
export const callBack = (authorizeUrl: URL, query: Record<string, string>) =>
  Effect.tryPromise({
    try: async () => {
      const callbackUrl = new URL(authorizeUrl.searchParams.get("redirect_uri") ?? "")
      callbackUrl.search = new URLSearchParams(query).toString()
      // Node's fetch would reuse its connection to an earlier login's server,
      // which has closed it by now. A browser retries such a connection.
      const response = await fetch(callbackUrl, { headers: { connection: "close" } })
      return response.text()
    },
    catch: (cause) => new FakeCallbackError({ cause }),
  })

export const fakeBrowser = <E>(onOpen: (authorizeUrl: URL) => Effect.Effect<unknown, E>) =>
  Layer.succeed(SystemBrowser, {
    open: (url) => onOpen(new URL(url)).pipe(Effect.asVoid, Effect.orDie),
  })

// Like Spotify, sends back the state the login put in the authorize URL.
export const callBackFrom = (authorizeUrl: URL, query: Record<string, string>) =>
  callBack(authorizeUrl, { ...query, state: authorizeUrl.searchParams.get("state") ?? "" })

// What the browser does when the user approves the login on Spotify's page.
export const approveLogin = (spotifyAccounts: FakeSpotifyAccounts, authorizeUrl: URL) =>
  callBackFrom(authorizeUrl, { code: spotifyAccounts.approve(authorizeUrl) })

export const approvingBrowser = (spotifyAccounts: FakeSpotifyAccounts) =>
  fakeBrowser((authorizeUrl) => approveLogin(spotifyAccounts, authorizeUrl))

const temporaryTokenStore = Layer.unwrap(
  Effect.gen(function* () {
    const fileSystem = yield* FileSystem.FileSystem
    const directory = yield* fileSystem.makeTempDirectoryScoped()
    return TokenStore.layer(fakeEncryption, path.join(directory, "spotify-session.bin"))
  }),
).pipe(Layer.provide(NodeFileSystem.layer))

// The real session with fakes at its edges. Settings stays accessible so a
// test can store the Client ID first. Login listens on port 0, which lets the
// OS pick a free port, unless a test needs a particular one.
export const fakeSpotifySession = (
  spotifyAccounts: FakeSpotifyAccounts,
  browser: Layer.Layer<SystemBrowser>,
  loginRedirectPort = 0,
) =>
  SpotifySession.layer.pipe(
    Layer.provideMerge(
      Layer.mergeAll(
        freshSettings(),
        SpotifyTokenEndpoint.layerWithoutHttpClient.pipe(Layer.provide(spotifyAccounts.httpClient)),
        temporaryTokenStore,
        browser,
        Layer.succeed(LoginRedirectPort, loginRedirectPort),
      ),
    ),
  )

// A session saved by an earlier launch of the app.
export const restoreFakeSession = Effect.fn("restoreFakeSession")(function* (
  spotifyAccounts: FakeSpotifyAccounts,
  grantedScopes: ReadonlyArray<string> = requestedScopes,
) {
  const tokenStore = yield* TokenStore
  const issuedTokens = spotifyAccounts.issueTokens()
  const session = yield* makeStoredSession({
    clientId: fakeClientId,
    refreshToken: issuedTokens.refresh_token,
    accessToken: issuedTokens.access_token,
    expiresInSeconds: issuedTokens.expires_in,
    grantedScopes,
  })
  yield* tokenStore.save(session)
  return yield* SpotifySession
})

export const saveFakeClientId = Effect.gen(function* () {
  const settings = yield* Settings
  yield* settings.set("spotifyClientId", fakeClientId)
})
