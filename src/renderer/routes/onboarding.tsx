import { createFileRoute } from "@tanstack/react-router"
import { loadInitialClientId } from "../features/login/initial-client-id"
import { OnboardingScreen } from "../features/login/onboarding-screen"
import { rendererRuntime } from "../lib/renderer-runtime"

export const Route = createFileRoute("/onboarding")({
  loader: () => rendererRuntime.runPromise(loadInitialClientId),
  component: OnboardingPage,
})

function OnboardingPage() {
  const initialClientId = Route.useLoaderData()
  return <OnboardingScreen initialClientId={initialClientId} />
}
