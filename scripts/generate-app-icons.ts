import path from "node:path"
import { fileURLToPath } from "node:url"
import * as NodeFileSystem from "@effect/platform-node/NodeFileSystem"
import * as NodeRuntime from "@effect/platform-node/NodeRuntime"
import { initWasm, Resvg } from "@resvg/resvg-wasm"
import { Effect, FileSystem, Schema } from "effect"
import { encodeIcnsFile } from "./icns-file.ts"
import { encodeIcoFile } from "./ico-file.ts"

// Run with `pnpm icons` after editing build/icon.svg, and commit the output,
// so packaging needs no image tooling.
const buildDirectory = path.join(import.meta.dirname, "../build")
const linuxIconsDirectory = path.join(buildDirectory, "icons")
const linuxIconSizes = [16, 32, 48, 64, 128, 256, 512]

class IconRenderError extends Schema.TaggedError<IconRenderError>()("IconRenderError", {
  cause: Schema.Defect(),
}) {}

const loadRenderer = Effect.fn("loadRenderer")(function* (fileSystem: FileSystem.FileSystem) {
  const wasm = yield* fileSystem.readFile(
    fileURLToPath(import.meta.resolve("@resvg/resvg-wasm/index_bg.wasm")),
  )
  yield* Effect.tryPromise({
    try: () => initWasm(wasm),
    catch: (cause) => new IconRenderError({ cause }),
  })
  const svg = yield* fileSystem.readFileString(path.join(buildDirectory, "icon.svg"))
  // Parsing is the only step that can fail, so once the SVG parses here,
  // rendering it at each size below cannot fail.
  yield* Effect.try({
    try: () => new Resvg(svg),
    catch: (cause) => new IconRenderError({ cause }),
  })
  return (size: number) =>
    new Resvg(svg, { fitTo: { mode: "width", value: size } }).render().asPng()
})

const generateAppIcons = Effect.gen(function* () {
  const fileSystem = yield* FileSystem.FileSystem
  const renderPng = yield* loadRenderer(fileSystem)

  yield* fileSystem.writeFile(path.join(buildDirectory, "icon.ico"), encodeIcoFile(renderPng))
  yield* fileSystem.writeFile(path.join(buildDirectory, "icon.icns"), encodeIcnsFile(renderPng))
  yield* fileSystem.makeDirectory(linuxIconsDirectory, { recursive: true })
  for (const size of linuxIconSizes) {
    yield* fileSystem.writeFile(
      path.join(linuxIconsDirectory, `${size}x${size}.png`),
      renderPng(size),
    )
  }
})

NodeRuntime.runMain(generateAppIcons.pipe(Effect.provide(NodeFileSystem.layer)))
