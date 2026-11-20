import { Link, useNavigate } from "@tanstack/react-router"
import { Effect } from "effect"
import { use, useState } from "react"
import type { LogInError } from "../../../shared/spotify-auth-replies"
import { DesktopBridge, type DesktopBridgeError } from "../../lib/desktop-bridge"
import { RendererRuntimeContext } from "../../lib/renderer-runtime"
import { LoginButtons } from "./login-buttons"
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
        <LoginButtons
          isWaiting={status._tag === "WaitingForBrowser"}
          onLogIn={logIn}
          onCancel={() => runtime.runFork(cancelLogIn)}
        />
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
