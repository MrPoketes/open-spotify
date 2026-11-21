import { createHash, randomBytes } from "node:crypto"
import { Effect } from "effect"

const spotifyAuthorizeUrl = "https://accounts.spotify.com/authorize"

// Everything the roadmap needs is requested at the first login, so a later
// feature never has to send the user through login again for one more scope.
const scopes = [
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
      scope: scopes.join(" "),
      state,
      code_challenge_method: "S256",
      code_challenge: codeChallenge,
    }).toString()
    return { url: url.href, state, codeVerifier }
  })
