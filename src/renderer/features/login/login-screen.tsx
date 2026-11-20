import { Link, useNavigate } from "@tanstack/react-router"
import { Effect } from "effect"
import { use, useState } from "react"
import type { LogInError } from "../../../shared/spotify-auth-replies"
import { DesktopBridge, type DesktopBridgeError } from "../../lib/desktop-bridge"
import { RendererRuntimeContext } from "../../lib/renderer-runtime"
import { loginErrorText } from "./login-error-text"

type LoginStatus =
  | { readonly _tag: "Ready" }
  | { readonly _tag: "WaitingForBrowser" }
  | { readonly _tag: "Failed"; readonly explanation: string }

const statusAfterFailure = (error: LogInError | DesktopBridgeError): LoginStatus =>
  error._tag === "LoginCancelled"
    ? { _tag: "Ready" }
    : { _tag: "Failed", explanation: loginErrorText(error) }

const logInThroughBrowser = Effect.gen(function* () {
  const bridge = yield* DesktopBridge
  yield* bridge.logIn
})

const cancelLogIn = Effect.gen(function* () {
  const bridge = yield* DesktopBridge
  yield* bridge.cancelLogIn
})

export function LoginScreen({ sessionExpired }: { readonly sessionExpired: boolean }) {
  const runtime = use(RendererRuntimeContext)
  const navigate = useNavigate()
  const [status, setStatus] = useState<LoginStatus>({ _tag: "Ready" })

  const logIn = () => {
    setStatus({ _tag: "WaitingForBrowser" })
    runtime.runFork(
      logInThroughBrowser.pipe(
        Effect.matchEffect({
          onSuccess: () => Effect.promise(() => navigate({ to: "/" })),
          onFailure: (error) => Effect.sync(() => setStatus(statusAfterFailure(error))),
        }),
      ),
    )
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <section className="flex w-full max-w-md flex-col gap-4 rounded-large bg-surface p-8">
        <h1 className="font-display text-3xl font-bold">Log in to Spotify</h1>
        {sessionExpired && status._tag === "Ready" && (
          <p>Your Spotify session has expired. Log in again to continue.</p>
        )}
        {status._tag === "WaitingForBrowser" && (
          <output>
            Finish logging in in your browser. Open Spotify continues when Spotify sends you back.
          </output>
        )}
        {/* Both branches are a button in the same place, so React keeps the
            element and keyboard focus stays on it when the label changes. */}
        {status._tag === "WaitingForBrowser" ? (
          <button
            type="button"
            onClick={() => runtime.runFork(cancelLogIn)}
            className="self-start rounded-full bg-surface-raised px-6 py-3 text-sm font-semibold"
          >
            Cancel
          </button>
        ) : (
          <button
            type="button"
            onClick={logIn}
            className="self-start rounded-full bg-accent px-6 py-3 text-sm font-semibold text-on-accent"
          >
            Log in with Spotify
          </button>
        )}
        {status._tag === "Failed" && (
          <p role="alert" className="text-danger">
            {status.explanation}
          </p>
        )}
        <Link to="/onboarding" className="self-start text-sm text-muted underline">
          Change Client ID
        </Link>
      </section>
    </main>
  )
}
