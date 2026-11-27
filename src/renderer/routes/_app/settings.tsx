import { createFileRoute, getRouteApi } from "@tanstack/react-router"
import { LogOutButton } from "../../features/login/log-out-button"
import { AppearanceSettings } from "../../features/themes/appearance-settings"
import { loadSavedThemeLibrary } from "../../features/themes/saved-theme"
import { PlayOnThisComputerSetting } from "../../features/this-computer/play-on-this-computer-setting"
import { TrackListDensitySetting } from "../../features/track-list/track-list-density-setting"
import { rendererRuntime } from "../../lib/renderer-runtime"
import { PageSection } from "../../ui/page-section"
import { pageTitleClassName } from "../../ui/page-title-class-name"
import { SettingRow } from "../../ui/setting-row"

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
    <div className="flex max-w-2xl flex-col gap-12">
      <h1 className={`${pageTitleClassName} pt-6`}>Settings</h1>
      <PageSection title="Appearance">
        <AppearanceSettings library={library} />
        <div className="mt-2 border-t border-border pt-6">
          <TrackListDensitySetting />
        </div>
      </PageSection>
      <PageSection title="Playback">
        <PlayOnThisComputerSetting />
      </PageSection>
      <PageSection title="Account">
        <SettingRow
          label="Log out of Spotify"
          description="Forgets your Spotify login on this computer. Your Client ID stays saved for the next login."
        >
          {() => <LogOutButton />}
        </SettingRow>
      </PageSection>
      <p className="text-xs text-muted">
        Open Spotify {appInfo.version} on {appInfo.platform}
      </p>
    </div>
  )
}
