import path from "node:path"
import * as NodeFileSystem from "@effect/platform-node/NodeFileSystem"
import { assert, layer } from "@effect/vitest"
import { Effect, FileSystem } from "effect"
import { rendererShellFile, resolveRendererFile } from "./renderer-files"

// Builds a renderer directory that looks like a real `vite build` output.
const makeRendererDir = Effect.gen(function* () {
  const fileSystem = yield* FileSystem.FileSystem
  const rendererDir = yield* fileSystem.makeTempDirectoryScoped()
  yield* fileSystem.makeDirectory(path.join(rendererDir, "assets"))
  yield* fileSystem.writeFileString(path.join(rendererDir, rendererShellFile), "<html></html>")
  yield* fileSystem.writeFileString(path.join(rendererDir, "assets", "app.js"), "")
  return rendererDir
})

layer(NodeFileSystem.layer)("resolveRendererFile", (it) => {
  it.effect("serves a built asset when the requested file exists", () =>
    Effect.gen(function* () {
      const rendererDir = yield* makeRendererDir

      const filePath = yield* resolveRendererFile(rendererDir, "app://renderer/assets/app.js")

      assert.strictEqual(filePath, path.join(rendererDir, "assets", "app.js"))
    }),
  )

  // Reloading the window on /library must keep the user on /library, which
  // only works if unknown paths load the SPA shell instead of a 404.
  it.effect("serves the app shell for client-side routes", () =>
    Effect.gen(function* () {
      const rendererDir = yield* makeRendererDir

      const filePath = yield* resolveRendererFile(rendererDir, "app://renderer/library/playlists")

      assert.strictEqual(filePath, path.join(rendererDir, rendererShellFile))
    }),
  )

  it.effect("never serves files outside the renderer directory", () =>
    Effect.gen(function* () {
      const rendererDir = yield* makeRendererDir

      const filePath = yield* resolveRendererFile(rendererDir, "app://renderer/%2e%2e/secret.txt")

      assert.strictEqual(filePath, path.join(rendererDir, rendererShellFile))
    }),
  )
})
