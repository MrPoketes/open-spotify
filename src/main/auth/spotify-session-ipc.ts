import { Effect, Schema } from "effect"
import { AccessTokenReply, LogInReply } from "../../shared/spotify-auth-replies"
import { SpotifySession } from "./spotify-session"

export const logInFromIpc = Effect.gen(function* () {
  const session = yield* SpotifySession
  const reply = yield* session.logIn.pipe(
    Effect.as({ _tag: "LoggedIn" } as const),
    Effect.catch(Effect.succeed),
  )
  return yield* Schema.encodeEffect(LogInReply)(reply)
})

export const getAccessTokenFromIpc = Effect.gen(function* () {
  const session = yield* SpotifySession
  const reply = yield* session.getAccessToken.pipe(
    Effect.map((accessToken) => ({ _tag: "AccessToken", accessToken }) as const),
    Effect.catch(Effect.succeed),
  )
  return yield* Schema.encodeEffect(AccessTokenReply)(reply)
})

export const logOutFromIpc = Effect.gen(function* () {
  const session = yield* SpotifySession
  yield* session.logOut
})
