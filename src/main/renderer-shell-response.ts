import { randomBytes } from "node:crypto"
import { Effect, FileSystem } from "effect"
import { contentSecurityPolicy, scriptNoncePlaceholder } from "../shared/content-security-policy"

export function createScriptNonce(): string {
  return randomBytes(16).toString("base64")
}

// Every load gets its own nonce, written both into the shell's inline scripts
// and into the policy that allows them.
export const respondWithRendererShell = Effect.fn("respondWithRendererShell")(function* (
  shellPath: string,
) {
  const fileSystem = yield* FileSystem.FileSystem
  const shellHtml = yield* fileSystem.readFileString(shellPath)
  const scriptNonce = createScriptNonce()
  return new Response(shellHtml.replaceAll(scriptNoncePlaceholder, scriptNonce), {
    headers: {
      "Content-Security-Policy": contentSecurityPolicy(scriptNonce),
      "Content-Type": "text/html; charset=utf-8",
    },
  })
})
