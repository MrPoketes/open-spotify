import { createFileRoute, getRouteApi } from "@tanstack/react-router"
import { LogOutButton } from "../../features/login/log-out-button"

export const Route = createFileRoute("/_app/")({
  component: HomePage,
})

const appShellRoute = getRouteApi("/_app")

function HomePage() {
  const { appInfo } = appShellRoute.useLoaderData()

  return (
    <section className="flex flex-col items-start gap-2">
      <h1 className="font-display text-3xl font-bold">Open Spotify</h1>
      <p className="text-muted">
        Version {appInfo.version} on {appInfo.platform}
      </p>
      <LogOutButton />
    </section>
  )
}
