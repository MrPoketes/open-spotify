import { createFileRoute } from "@tanstack/react-router"
import { Effect } from "effect"
import { loadSavedThemeId } from "../../features/themes/saved-theme"
import { ThemeToggle } from "../../features/themes/theme-toggle"
import { DesktopBridge } from "../../lib/desktop-bridge"
import { rendererRuntime } from "../../lib/renderer-runtime"

export const Route = createFileRoute("/_app/")({
  loader: () => rendererRuntime.runPromise(loadHomePage),
  component: HomePage,
})

const loadHomePage = Effect.gen(function* () {
  const bridge = yield* DesktopBridge
  return yield* Effect.all({ appInfo: bridge.getAppInfo, savedThemeId: loadSavedThemeId })
})

function HomePage() {
  const { appInfo, savedThemeId } = Route.useLoaderData()

  return (
    <section className="flex flex-col items-start gap-2">
      <h1 className="font-display text-3xl font-bold">Open Spotify</h1>
      <p className="text-muted">
        Version {appInfo.version} on {appInfo.platform}
      </p>
      <ThemeToggle savedThemeId={savedThemeId} />
    </section>
  )
}
