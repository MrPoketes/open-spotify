import { Outlet, createFileRoute } from "@tanstack/react-router"
import { Effect } from "effect"
import { redirectUnlessLoggedIn } from "../features/login/require-login"
import { AppShell } from "../features/shell/app-shell"
import { DesktopBridge } from "../lib/desktop-bridge"
import { rendererRuntime } from "../lib/renderer-runtime"
import { loadSavedSetting } from "../lib/saved-setting"
import { defaultSidebarWidth } from "../../shared/sidebar-width"

// A pathless layout route rather than the root route: the root route is
// prerendered into the SPA shell at build time, where there is no main
// process to load the saved sidebar width from.
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
  })
})

function AppLayout() {
  const { appInfo, savedSidebarWidth } = Route.useLoaderData()

  return (
    <AppShell savedSidebarWidth={savedSidebarWidth} platform={appInfo.platform}>
      <Outlet />
    </AppShell>
  )
}
