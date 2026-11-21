import { createServer } from "node:http"
import * as NodeHttpServer from "@effect/platform-node/NodeHttpServer"
import { Context, Deferred, Effect, Exit, Schema } from "effect"
import { HttpServer, HttpServerRequest, HttpServerResponse } from "effect/http"
import {
  LoginDenied,
  LoginFailed,
  LoginPortInUse,
  LoginStateMismatch,
} from "../../shared/spotify-auth-replies"
import { spotifyRedirectPort, spotifyRedirectUri } from "../../shared/spotify-redirect-uri"

// Tests listen on a port the OS picks instead, so test runs on one machine
// never compete for the real one.
export const LoginRedirectPort = Context.Reference<number>("open-spotify/LoginRedirectPort", {
  defaultValue: () => spotifyRedirectPort,
})

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

const listen = (port: number) =>
  NodeHttpServer.make(() => createServer(), {
    host: "127.0.0.1",
    port,
    // The browser may keep its connection open; login should not wait for it.
    gracefulShutdownTimeout: "1 second",
  }).pipe(
    Effect.mapError((error) =>
      Schema.is(AddressInUse)(error.cause)
        ? new LoginPortInUse()
        : new LoginFailed({ message: `Could not listen for the login: ${String(error.cause)}` }),
    ),
  )

// Binds the redirect port, so a busy port fails before the browser opens. The
// redirect URI names the port the server got. The server closes with the
// surrounding scope.
export const listenOnRedirectPort = Effect.gen(function* () {
  const server = yield* listen(yield* LoginRedirectPort)
  const redirectUri = `${HttpServer.formatAddress(server.address)}${callbackPath}`

  const serveAuthorizationCallback = Effect.fn("serveAuthorizationCallback")(function* (
    expectedState: string,
  ) {
    const authorizationCode = yield* Deferred.make<
      string,
      LoginStateMismatch | LoginDenied | LoginFailed
    >()
    yield* server.serve(
      Effect.gen(function* () {
        const request = yield* HttpServerRequest.HttpServerRequest
        const requestUrl = new URL(request.url, redirectUri)
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

  return { redirectUri, serveAuthorizationCallback }
})
