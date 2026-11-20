import { createFileRoute } from "@tanstack/react-router"
import { loadSavedThemeId } from "../../features/themes/saved-theme"
import { ThemePicker } from "../../features/themes/theme-picker"
import { rendererRuntime } from "../../lib/renderer-runtime"

export const Route = createFileRoute("/_app/settings")({
  loader: () => rendererRuntime.runPromise(loadSavedThemeId),
  // The picker reads the saved theme once, when it mounts. Cached data from an
  // earlier visit would show the theme saved back then.
  gcTime: 0,
  component: SettingsPage,
})

function SettingsPage() {
  const savedThemeId = Route.useLoaderData()

  return (
    <div className="flex max-w-xl flex-col gap-8">
      <h1 className="font-display text-3xl font-bold">Settings</h1>
      <section aria-labelledby="appearance-heading" className="flex flex-col gap-4">
        <h2 id="appearance-heading" className="font-display text-xl font-bold">
          Appearance
        </h2>
        <ThemePicker savedThemeId={savedThemeId} />
      </section>
    </div>
  )
}
