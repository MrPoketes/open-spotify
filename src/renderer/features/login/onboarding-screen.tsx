import { useNavigate } from "@tanstack/react-router"
import { Effect, Option, Schema } from "effect"
import { use, useState, type FormEvent } from "react"
import { settingSchemas } from "../../../shared/settings"
import { attemptNavigation } from "../../lib/attempt-navigation"
import { DesktopBridge } from "../../lib/desktop-bridge"
import { RendererRuntimeContext } from "../../lib/renderer-runtime"
import { Button } from "../../ui/button"
import { TextField } from "../../ui/text-field"
import { BeforeLoginSheet } from "./before-login-sheet"
import { SpotifyAppSteps } from "./spotify-app-steps"

const saveClientId = Effect.fn("saveClientId")(function* (clientId: string) {
  const bridge = yield* DesktopBridge
  yield* bridge.setSetting("spotifyClientId", clientId)
})

const decodeClientId = Schema.decodeUnknownOption(settingSchemas.spotifyClientId)

export function OnboardingScreen({ initialClientId }: { readonly initialClientId: string }) {
  const runtime = use(RendererRuntimeContext)
  const navigate = useNavigate()
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
          onSuccess: () => attemptNavigation(() => navigate({ to: "/" })),
          onFailure: () => Effect.sync(() => setSaveFailed(true)),
        }),
      ),
    )
  }

  return (
    <BeforeLoginSheet
      width="wide"
      title="Connect Open Spotify"
      description={
        <p className="text-pretty text-muted">
          Open Spotify talks to Spotify through an app you create in your own Spotify account. It
          takes about five minutes, once.
        </p>
      }
    >
      <SpotifyAppSteps />
      <form onSubmit={save} noValidate className="flex flex-col gap-4">
        <TextField
          label="Client ID"
          value={clientId}
          onChange={setClientId}
          autoComplete="off"
          spellCheck={false}
          errorMessage={
            isClientIdInvalid ? "Paste the Client ID from your Spotify app." : undefined
          }
        />
        <Button type="submit" className="self-start">
          Save and continue
        </Button>
        {saveFailed && (
          <p role="alert" className="text-sm text-danger">
            Could not save the Client ID. Try again.
          </p>
        )}
      </form>
    </BeforeLoginSheet>
  )
}
