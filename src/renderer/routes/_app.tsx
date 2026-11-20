import { Outlet, createFileRoute, redirect } from "@tanstack/react-router"
import { Effect } from "effect"
import { findLoginState } from "../features/login/login-state"
import { AppShell } from "../features/shell/app-shell"
import { loadSavedSidebarWidth } from "../features/shell/saved-sidebar-width"
import { DesktopBridge } from "../lib/desktop-bridge"
import { rendererRuntime } from "../lib/renderer-runtime"

// beforeLoad runs on every visit to an app route, so a session that expired
// since the last visit is caught. TanStack Router changes route only when a
// redirect is thrown from it.
const redirectUnlessLoggedIn = async () => {
  const loginState = await rendererRuntime.runPromise(findLoginState)
  switch (loginState) {
    case "no-client-id":
      throw redirect({ to: "/onboarding" })
    case "logged-out":
      throw redirect({ to: "/login" })
    case "session-expired":
      throw redirect({ to: "/login", search: { sessionExpired: true } })
    case "logged-in":
      return
  }
}

// A pathless layout route rather than the root route: the root route is
// prerendered into the SPA shell at build time, where there is no main
// process to load the saved sidebar width from.
export const Route = createFileRoute("/_app")({
  beforeLoad: redirectUnlessLoggedIn,
  loader: () => rendererRuntime.runPromise(loadAppShell),
  component: AppLayout,
})

const loadAppShell = Effect.gen(function* () {
  const bridge = yield* DesktopBridge
  return yield* Effect.all({ appInfo: bridge.getAppInfo, savedSidebarWidth: loadSavedSidebarWidth })
})

function AppLayout() {
  const { appInfo, savedSidebarWidth } = Route.useLoaderData()

  return (
    <AppShell savedSidebarWidth={savedSidebarWidth} platform={appInfo.platform}>
      <Outlet />
    </AppShell>
  )
}
