import { Context, Duration, Effect, Layer, Schema } from "effect"
import { FetchHttpClient, HttpClient, HttpClientRequest, type UrlParams } from "effect/http"
import { spotifyRedirectUri } from "../../shared/spotify-redirect-uri"

class TokenRequestRejected extends Schema.TaggedError<TokenRequestRejected>()(
  "TokenRequestRejected",
  { error: Schema.String },
) {}

class TokenRequestFailed extends Schema.TaggedError<TokenRequestFailed>()("TokenRequestFailed", {
  cause: Schema.Defect(),
}) {}

type TokenRequestError = TokenRequestRejected | TokenRequestFailed

const spotifyTokenUrl = "https://accounts.spotify.com/api/token"

// A refresh holds the session lock, so a stalled request would block every
// other access token request behind it.
const tokenRequestTimeout = Duration.seconds(15)

const IssuedTokens = Schema.Struct({
  access_token: Schema.String,
  expires_in: Schema.Number,
  refresh_token: Schema.String,
})

// Spotify may or may not rotate the refresh token when it refreshes.
const RefreshedTokens = Schema.Struct({
  access_token: Schema.String,
  expires_in: Schema.Number,
  refresh_token: Schema.optional(Schema.String),
})

const TokenErrorBody = Schema.Struct({ error: Schema.String })

export class SpotifyTokenEndpoint extends Context.Service<
  SpotifyTokenEndpoint,
  {
    readonly exchangeCode: (request: {
      readonly clientId: string
      readonly code: string
      readonly codeVerifier: string
    }) => Effect.Effect<typeof IssuedTokens.Type, TokenRequestError>
    readonly refresh: (request: {
      readonly clientId: string
      readonly refreshToken: string
    }) => Effect.Effect<typeof RefreshedTokens.Type, TokenRequestError>
  }
>()("open-spotify/SpotifyTokenEndpoint") {
  static readonly layerWithoutHttpClient = Layer.effect(
    SpotifyTokenEndpoint,
    Effect.gen(function* () {
      const client = yield* HttpClient.HttpClient

      const requestTokens = Effect.fn("SpotifyTokenEndpoint.requestTokens")(
        function* <A>(
          form: UrlParams.Input,
          responseSchema: Schema.Decoder<A>,
        ): Effect.fn.Return<A, TokenRequestError> {
          const request = HttpClientRequest.post(spotifyTokenUrl).pipe(
            HttpClientRequest.bodyUrlParams(form),
            HttpClientRequest.acceptJson,
          )
          const response = yield* client
            .execute(request)
            .pipe(Effect.mapError((cause) => new TokenRequestFailed({ cause })))
          const decodeBody = <B>(schema: Schema.Decoder<B>) =>
            response.json.pipe(
              Effect.flatMap(Schema.decodeUnknownEffect(schema)),
              Effect.mapError((cause) => new TokenRequestFailed({ cause })),
            )
          // Spotify answers a code or refresh token it will not accept with
          // 400 or 401. Other statuses, such as 429, say nothing about the token.
          if (response.status === 400 || response.status === 401) {
            const { error } = yield* decodeBody(TokenErrorBody)
            return yield* new TokenRequestRejected({ error })
          }
          if (response.status !== 200) {
            return yield* new TokenRequestFailed({
              cause: `Spotify responded with HTTP ${response.status}`,
            })
          }
          return yield* decodeBody(responseSchema)
        },
        Effect.timeoutOrElse({
          duration: tokenRequestTimeout,
          orElse: () => Effect.fail(new TokenRequestFailed({ cause: "Spotify did not answer" })),
        }),
      )

      return SpotifyTokenEndpoint.of({
        exchangeCode: ({ clientId, code, codeVerifier }) =>
          requestTokens(
            {
              grant_type: "authorization_code",
              code,
              redirect_uri: spotifyRedirectUri,
              client_id: clientId,
              code_verifier: codeVerifier,
            },
            IssuedTokens,
          ),
        refresh: ({ clientId, refreshToken }) =>
          requestTokens(
            { grant_type: "refresh_token", refresh_token: refreshToken, client_id: clientId },
            RefreshedTokens,
          ),
      })
    }),
  )

  static readonly layer = SpotifyTokenEndpoint.layerWithoutHttpClient.pipe(
    Layer.provide(FetchHttpClient.layer),
  )
}
