import { createFileRoute, getRouteApi } from "@tanstack/react-router"
import { LogOutButton } from "../../features/login/log-out-button"
import { loadSavedThemeId } from "../../features/themes/saved-theme"
import { ThemeToggle } from "../../features/themes/theme-toggle"
import { rendererRuntime } from "../../lib/renderer-runtime"

export const Route = createFileRoute("/_app/")({
  loader: () => rendererRuntime.runPromise(loadSavedThemeId),
  component: HomePage,
})

const appShellRoute = getRouteApi("/_app")

function HomePage() {
  const savedThemeId = Route.useLoaderData()
  const { appInfo } = appShellRoute.useLoaderData()

  return (
    <section className="flex flex-col items-start gap-2">
      <h1 className="font-display text-3xl font-bold">Open Spotify</h1>
      <p className="text-muted">
        Version {appInfo.version} on {appInfo.platform}
      </p>
      <div className="flex gap-2">
        <ThemeToggle savedThemeId={savedThemeId} />
        <LogOutButton />
      </div>
    </section>
  )
}
