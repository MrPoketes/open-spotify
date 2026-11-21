import { useNavigate } from "@tanstack/react-router"
import { Effect, Option, Schema } from "effect"
import { type FormEvent, use, useId, useState } from "react"
import { settingSchemas } from "../../../shared/settings"
import { DesktopBridge } from "../../lib/desktop-bridge"
import { RendererRuntimeContext } from "../../lib/renderer-runtime"
import { SpotifyAppSteps } from "./spotify-app-steps"

const saveClientId = Effect.fn("saveClientId")(function* (clientId: string) {
  const bridge = yield* DesktopBridge
  yield* bridge.setSetting("spotifyClientId", clientId)
})

const decodeClientId = Schema.decodeUnknownOption(settingSchemas.spotifyClientId)

export function OnboardingScreen({ initialClientId }: { readonly initialClientId: string }) {
  const runtime = use(RendererRuntimeContext)
  const navigate = useNavigate()
  const clientIdInputId = useId()
  const clientIdProblemId = useId()
  const [clientId, setClientId] = useState(initialClientId)
  const [isClientIdInvalid, setClientIdInvalid] = useState(false)
  const [saveFailed, setSaveFailed] = useState(false)

  const save = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSaveFailed(false)
    const decodedClientId = decodeClientId(clientId.trim())
    setClientIdInvalid(Option.isNone(decodedClientId))
    if (Option.isNone(decodedClientId)) {
      return
    }
    runtime.runFork(
      saveClientId(decodedClientId.value).pipe(
        Effect.matchEffect({
          onSuccess: () => Effect.promise(() => navigate({ to: "/" })),
          onFailure: () => Effect.sync(() => setSaveFailed(true)),
        }),
      ),
    )
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <section className="flex w-full max-w-xl flex-col gap-6 rounded-large bg-surface p-8">
        <div className="flex flex-col gap-2">
          <h1 className="font-display text-3xl font-bold">Connect Open Spotify</h1>
          <p className="text-muted">
            Open Spotify talks to Spotify through an app you create in your own Spotify account. It
            takes about five minutes, once.
          </p>
        </div>
        <SpotifyAppSteps />
        <form onSubmit={save} noValidate className="flex flex-col gap-2">
          <label htmlFor={clientIdInputId} className="text-sm font-semibold">
            Client ID
          </label>
          <input
            id={clientIdInputId}
            value={clientId}
            onChange={(event) => setClientId(event.target.value)}
            autoComplete="off"
            spellCheck={false}
            aria-invalid={isClientIdInvalid}
            aria-describedby={isClientIdInvalid ? clientIdProblemId : undefined}
            className="rounded-small bg-surface-raised px-3 py-2"
          />
          {isClientIdInvalid && (
            <p id={clientIdProblemId} role="alert" className="text-sm text-danger">
              Paste the Client ID from your Spotify app.
            </p>
          )}
          <button
            type="submit"
            className="mt-2 self-start rounded-full bg-accent px-6 py-3 text-sm font-semibold text-on-accent"
          >
            Save and continue
          </button>
          {saveFailed && (
            <p role="alert" className="text-sm text-danger">
              Could not save the Client ID. Try again.
            </p>
          )}
        </form>
        <p className="text-xs text-muted">
          Open Spotify is an unofficial client. It is not affiliated with, endorsed by, or sponsored
          by Spotify.
        </p>
      </section>
    </main>
  )
}
