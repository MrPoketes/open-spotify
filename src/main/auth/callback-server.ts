import { createServer } from "node:http"
import * as NodeHttpServer from "@effect/platform-node/NodeHttpServer"
import { Deferred, Effect, Exit, Schema } from "effect"
import { HttpServerRequest, HttpServerResponse } from "effect/http"
import {
  LoginDenied,
  LoginFailed,
  LoginPortInUse,
  LoginStateMismatch,
} from "../../shared/spotify-auth-replies"
import { spotifyRedirectPort, spotifyRedirectUri } from "../../shared/spotify-redirect-uri"

const CallbackQuery = Schema.Union([
  Schema.Struct({ state: Schema.String, code: Schema.String }),
  Schema.Struct({ state: Schema.String, error: Schema.String }),
])

const callbackPath = new URL(spotifyRedirectUri).pathname

const AddressInUse = Schema.Struct({ code: Schema.Literal("EADDRINUSE") })

const browserPage = (message: string) =>
  HttpServerResponse.html(
    `<!doctype html><meta charset="utf-8"><title>Open Spotify</title><p>${message}</p>`,
  )

const loggedInPage = browserPage("You are logged in to Open Spotify. You can close this tab.")

const failedPage = browserPage(
  "Login did not finish. Open Spotify shows what went wrong. You can close this tab.",
)

const readAuthorizationCode = Effect.fn("readAuthorizationCode")(function* (
  callbackUrl: URL,
  expectedState: string,
) {
  const callback = yield* Schema.decodeUnknownEffect(CallbackQuery)(
    Object.fromEntries(callbackUrl.searchParams),
  ).pipe(
    Effect.mapError(
      () => new LoginFailed({ message: "Spotify called back without an authorization code." }),
    ),
  )
  if (callback.state !== expectedState) {
    return yield* new LoginStateMismatch()
  }
  if ("code" in callback) {
    return callback.code
  }
  if (callback.error === "access_denied") {
    return yield* new LoginDenied()
  }
  return yield* new LoginFailed({ message: `Spotify refused the login: ${callback.error}.` })
})

const listenOnRedirectPort = NodeHttpServer.make(() => createServer(), {
  host: "127.0.0.1",
  port: spotifyRedirectPort,
  // The browser may keep its connection open; login should not wait for it.
  gracefulShutdownTimeout: "1 second",
}).pipe(
  Effect.mapError((error) =>
    Schema.is(AddressInUse)(error.cause)
      ? new LoginPortInUse()
      : new LoginFailed({ message: `Could not listen for the login: ${String(error.cause)}` }),
  ),
)

// Binds the redirect port and returns an effect that waits for Spotify's
// callback. Binding first means a busy port fails before the browser opens.
// The server closes with the surrounding scope.
export const listenForAuthorizationCode = Effect.fn("listenForAuthorizationCode")(function* (
  expectedState: string,
) {
  const authorizationCode = yield* Deferred.make<
    string,
    LoginStateMismatch | LoginDenied | LoginFailed
  >()
  const server = yield* listenOnRedirectPort
  yield* server.serve(
    Effect.gen(function* () {
      const request = yield* HttpServerRequest.HttpServerRequest
      const requestUrl = new URL(request.url, spotifyRedirectUri)
      if (requestUrl.pathname !== callbackPath) {
        return HttpServerResponse.empty({ status: 404 })
      }
      const outcome = yield* Effect.exit(readAuthorizationCode(requestUrl, expectedState))
      yield* Deferred.done(authorizationCode, outcome)
      return Exit.isSuccess(outcome) ? loggedInPage : failedPage
    }),
  )
  return Deferred.await(authorizationCode)
})
