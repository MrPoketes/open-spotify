import { createHash } from "node:crypto"
import { assert, describe, it } from "@effect/vitest"
import { Effect } from "effect"
import { spotifyRedirectUri } from "../../shared/spotify-redirect-uri"
import { makeAuthorizationRequest } from "./authorization-request"

describe("makeAuthorizationRequest", () => {
  // Spotify exchanges the code only if SHA-256 of the verifier, base64url
  // encoded, equals the challenge sent here (RFC 7636, S256).
  it.effect("sends an S256 challenge derived from a verifier PKCE accepts", () =>
    Effect.gen(function* () {
      const request = yield* makeAuthorizationRequest("my-client-id", spotifyRedirectUri)
      const query = new URL(request.url).searchParams

      assert.match(request.codeVerifier, /^[A-Za-z0-9\-._~]{43,128}$/)
      assert.strictEqual(query.get("code_challenge_method"), "S256")
      assert.strictEqual(
        query.get("code_challenge"),
        createHash("sha256").update(request.codeVerifier).digest("base64url"),
      )
    }),
  )

  // A reused state or verifier would let an attacker who saw one login
  // replay it.
  it.effect("uses a new state and verifier for every login", () =>
    Effect.gen(function* () {
      const first = yield* makeAuthorizationRequest("my-client-id", spotifyRedirectUri)
      const second = yield* makeAuthorizationRequest("my-client-id", spotifyRedirectUri)

      assert.notStrictEqual(first.state, second.state)
      assert.notStrictEqual(first.codeVerifier, second.codeVerifier)
    }),
  )
})
