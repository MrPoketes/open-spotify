import path from "node:path"
import { Effect, FileSystem, Option } from "effect"

// The entry page TanStack Start emits in SPA mode. Any path that is not a
// real file falls back to it, so a client-side route survives a reload.
export const rendererShellFile = "_shell.html"

export const resolveRendererFile = Effect.fn("resolveRendererFile")(function* (
  rendererDir: string,
  requestUrl: string,
) {
  const fileSystem = yield* FileSystem.FileSystem
  // Normalised so the containment check below compares like with like.
  const rootDir = path.resolve(rendererDir)
  const shellPath = path.join(rootDir, rendererShellFile)
  const requestedPath = path.join(rootDir, decodeURIComponent(new URL(requestUrl).pathname))

  if (!requestedPath.startsWith(rootDir + path.sep)) {
    return shellPath
  }

  const fileInfo = yield* Effect.option(fileSystem.stat(requestedPath))
  const isFile = Option.isSome(fileInfo) && fileInfo.value.type === "File"
  return isFile ? requestedPath : shellPath
})
