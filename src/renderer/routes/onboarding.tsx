import { createFileRoute } from "@tanstack/react-router"
import { Effect, Option } from "effect"
import { OnboardingScreen } from "../features/login/onboarding-screen"
import { DesktopBridge } from "../lib/desktop-bridge"
import { rendererRuntime } from "../lib/renderer-runtime"

export const Route = createFileRoute("/onboarding")({
  loader: () => rendererRuntime.runPromise(loadInitialClientId),
  component: OnboardingPage,
})

// A user who comes back to change the Client ID starts from the saved one.
const loadInitialClientId = Effect.gen(function* () {
  const bridge = yield* DesktopBridge
  const savedClientId = yield* bridge.getSetting("spotifyClientId")
  const initialClientId = Option.isSome(savedClientId)
    ? savedClientId
    : yield* bridge.getEnvironmentClientId
  return Option.getOrElse(initialClientId, () => "")
})

function OnboardingPage() {
  const initialClientId = Route.useLoaderData()
  return <OnboardingScreen initialClientId={initialClientId} />
}
