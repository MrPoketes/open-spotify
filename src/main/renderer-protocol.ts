import path from "node:path"
import { pathToFileURL } from "node:url"
import { app, net, protocol } from "electron"
import { Effect, Schema } from "effect"
import { contentSecurityPolicy } from "../shared/content-security-policy"
import { mainRuntime } from "./main-runtime"
import { rendererShellFile, resolveRendererFile } from "./renderer-files"
import { createScriptNonce, respondWithRendererShell } from "./renderer-shell-response"

// Production builds load the UI from `app://renderer/` instead of `file://`.
// A standard, secure scheme gives the page a real origin, so browser history
// routing, `fetch` and the content security policy behave as on the web.
const scheme = "app"

export const rendererEntryUrl = `${scheme}://renderer/`

class RendererFileError extends Schema.TaggedError<RendererFileError>()("RendererFileError", {
  filePath: Schema.String,
  cause: Schema.Defect(),
}) {}

// Privileges can only be granted before the app is ready.
export function registerRendererScheme(): void {
  protocol.registerSchemesAsPrivileged([
    { scheme, privileges: { standard: true, secure: true, supportFetchAPI: true } },
  ])
}

export function serveRendererFiles(): void {
  const rendererDir = path.join(app.getAppPath(), "dist", "client")

  protocol.handle(scheme, (request) =>
    mainRuntime.runPromise(respondWithRendererFile(rendererDir, request.url)),
  )
}

const respondWithRendererFile = Effect.fn("respondWithRendererFile")(function* (
  rendererDir: string,
  requestUrl: string,
) {
  const filePath = yield* resolveRendererFile(rendererDir, requestUrl)
  if (path.basename(filePath) === rendererShellFile) {
    return yield* respondWithRendererShell(filePath)
  }

  const fileResponse = yield* Effect.tryPromise({
    try: () => net.fetch(pathToFileURL(filePath).href),
    catch: (cause) => new RendererFileError({ filePath, cause }),
  })
  // Assets carry the policy too, in case one is ever opened as a document. The
  // nonce is fresh because the placeholder is public: a policy naming it would
  // let injected scripts that copy it run.
  const headers = new Headers(fileResponse.headers)
  headers.set("Content-Security-Policy", contentSecurityPolicy(createScriptNonce()))
  return new Response(fileResponse.body, { status: fileResponse.status, headers })
})
