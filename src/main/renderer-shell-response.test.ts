import path from "node:path"
import * as NodeFileSystem from "@effect/platform-node/NodeFileSystem"
import { assert, layer } from "@effect/vitest"
import { Effect, FileSystem } from "effect"
import { scriptNoncePlaceholder } from "../shared/content-security-policy"
import { respondWithRendererShell } from "./renderer-shell-response"

// The inline bootstrap scripts the build writes into `_shell.html`.
const builtShell = `<html><body><script nonce="${scriptNoncePlaceholder}">boot()</script><script nonce="${scriptNoncePlaceholder}">hydrate()</script></body></html>`

const writeShell = Effect.gen(function* () {
  const fileSystem = yield* FileSystem.FileSystem
  const shellPath = path.join(yield* fileSystem.makeTempDirectoryScoped(), "_shell.html")
  yield* fileSystem.writeFileString(shellPath, builtShell)
  return shellPath
})

const readNonces = (response: Response) =>
  Effect.gen(function* () {
    const policy = response.headers.get("Content-Security-Policy") ?? ""
    const html = yield* Effect.promise(() => response.text())
    return {
      policyNonce: /'nonce-([^']+)'/.exec(policy)?.[1],
      scriptNonces: [...html.matchAll(/nonce="([^"]*)"/g)].map((match) => match[1]),
    }
  })

layer(NodeFileSystem.layer)("respondWithRendererShell", (it) => {
  // If the nonces disagree, the policy blocks the bootstrap scripts and the
  // packaged app opens to a blank window.
  it.effect("allows the shell's inline scripts with the nonce in its policy", () =>
    Effect.gen(function* () {
      const shellPath = yield* writeShell

      const { policyNonce, scriptNonces } = yield* readNonces(
        yield* respondWithRendererShell(shellPath),
      )

      assert.notStrictEqual(policyNonce, scriptNoncePlaceholder)
      assert.deepStrictEqual(scriptNonces, [policyNonce, policyNonce])
    }),
  )

  // A nonce that repeats could be copied into injected markup.
  it.effect("uses a different nonce on every load", () =>
    Effect.gen(function* () {
      const shellPath = yield* writeShell

      const first = yield* readNonces(yield* respondWithRendererShell(shellPath))
      const second = yield* readNonces(yield* respondWithRendererShell(shellPath))

      assert.notStrictEqual(first.policyNonce, second.policyNonce)
    }),
  )
})
