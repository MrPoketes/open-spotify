import { createHash, randomBytes } from "node:crypto"
import { Effect } from "effect"

const spotifyAuthorizeUrl = "https://accounts.spotify.com/authorize"

// A saved session that lacks one of these scopes, because it was granted
// before the app asked for it, is sent through login again (freshAccessToken).
export const requestedScopes = [
  "user-library-read",
  "user-library-modify",
  "playlist-read-private",
  "playlist-read-collaborative",
  "playlist-modify-private",
  "playlist-modify-public",
  "user-read-playback-state",
  "user-modify-playback-state",
  "user-read-currently-playing",
  "user-read-recently-played",
  "user-top-read",
  "user-follow-read",
  "user-follow-modify",
  "user-read-private",
  "user-read-email",
  // Lets the Web Playback SDK play audio on this computer.
  "streaming",
]

interface AuthorizationRequest {
  readonly url: string
  readonly state: string
  readonly codeVerifier: string
}

const randomUrlSafeString = (byteCount: number) => randomBytes(byteCount).toString("base64url")

export const makeAuthorizationRequest = (clientId: string, redirectUri: string) =>
  Effect.sync((): AuthorizationRequest => {
    const state = randomUrlSafeString(16)
    // 64 bytes encode to 86 characters, inside the 43 to 128 that PKCE allows.
    const codeVerifier = randomUrlSafeString(64)
    const codeChallenge = createHash("sha256").update(codeVerifier).digest("base64url")
    const url = new URL(spotifyAuthorizeUrl)
    url.search = new URLSearchParams({
      client_id: clientId,
      response_type: "code",
      redirect_uri: redirectUri,
      scope: requestedScopes.join(" "),
      state,
      code_challenge_method: "S256",
      code_challenge: codeChallenge,
    }).toString()
    return { url: url.href, state, codeVerifier }
  })
