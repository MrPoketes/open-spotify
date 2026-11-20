import { createFileRoute } from "@tanstack/react-router"
import { Effect } from "effect"
import { DesktopBridge } from "../lib/desktop-bridge"
import { rendererRuntime } from "../lib/renderer-runtime"

export const Route = createFileRoute("/")({
  loader: () => rendererRuntime.runPromise(loadAppInfo),
  component: HomePage,
})

const loadAppInfo = Effect.gen(function* () {
  const bridge = yield* DesktopBridge
  return yield* bridge.getAppInfo
})

function HomePage() {
  const appInfo = Route.useLoaderData()

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-2">
      <h1 className="text-3xl font-bold">Open Spotify</h1>
      <p className="opacity-70">
        Version {appInfo.version} on {appInfo.platform}
      </p>
    </main>
  )
}
