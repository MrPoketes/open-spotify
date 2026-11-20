import { createFileRoute, getRouteApi } from "@tanstack/react-router"
import { LogOutButton } from "../../features/login/log-out-button"
import { AppearanceSettings } from "../../features/themes/appearance-settings"
import { loadSavedThemeLibrary } from "../../features/themes/saved-theme"
import { TrackListDensitySetting } from "../../features/track-list/track-list-density-setting"
import { rendererRuntime } from "../../lib/renderer-runtime"

export const Route = createFileRoute("/_app/settings")({
  loader: () => rendererRuntime.runPromise(loadSavedThemeLibrary),
  // The picker reads the saved theme once, when it mounts. Cached data from an
  // earlier visit would show the theme saved back then.
  gcTime: 0,
  component: SettingsPage,
})

const appShellRoute = getRouteApi("/_app")

function SettingsPage() {
  const library = Route.useLoaderData()
  const { appInfo } = appShellRoute.useLoaderData()

  return (
    <div className="flex max-w-xl flex-col gap-8">
      <h1 className="font-display text-3xl font-bold">Settings</h1>
      <section aria-labelledby="appearance-heading" className="flex flex-col gap-4">
        <h2 id="appearance-heading" className="font-display text-xl font-bold">
          Appearance
        </h2>
        <AppearanceSettings library={library} />
        <TrackListDensitySetting />
      </section>
      <section aria-labelledby="account-heading" className="flex flex-col items-start gap-4">
        <h2 id="account-heading" className="font-display text-xl font-bold">
          Account
        </h2>
        <LogOutButton />
        <p className="text-xs text-muted">
          Open Spotify {appInfo.version} on {appInfo.platform}
        </p>
      </section>
    </div>
  )
}
