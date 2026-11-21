import { Outlet, createFileRoute } from "@tanstack/react-router"
import { Effect } from "effect"
import { defaultRightPaneWidth } from "../../shared/right-pane-width"
import { defaultSidebarWidth } from "../../shared/sidebar-width"
import { defaultTrackListDensity } from "../../shared/track-list-density"
import { redirectUnlessLoggedIn } from "../features/login/require-login"
import { AppShell } from "../features/shell/app-shell"
import { DesktopBridge } from "../lib/desktop-bridge"
import { rendererRuntime } from "../lib/renderer-runtime"
import { loadSavedSetting } from "../lib/saved-setting"

// A pathless layout route rather than the root route: the root route is
// prerendered into the SPA shell at build time, where there is no main
// process to load the saved settings from.
export const Route = createFileRoute("/_app")({
  beforeLoad: redirectUnlessLoggedIn(rendererRuntime),
  loader: () => rendererRuntime.runPromise(loadAppShell),
  component: AppLayout,
})

const loadAppShell = Effect.gen(function* () {
  const bridge = yield* DesktopBridge
  return yield* Effect.all({
    appInfo: bridge.getAppInfo,
    savedSidebarWidth: loadSavedSetting("sidebarWidth", defaultSidebarWidth),
    savedRightPaneWidth: loadSavedSetting("rightPaneWidth", defaultRightPaneWidth),
    savedTrackListDensity: loadSavedSetting("trackListDensity", defaultTrackListDensity),
  })
})

function AppLayout() {
  const { appInfo, savedSidebarWidth, savedRightPaneWidth, savedTrackListDensity } =
    Route.useLoaderData()

  return (
    <AppShell
      savedSidebarWidth={savedSidebarWidth}
      savedRightPaneWidth={savedRightPaneWidth}
      savedTrackListDensity={savedTrackListDensity}
      platform={appInfo.platform}
    >
      <Outlet />
    </AppShell>
  )
}
