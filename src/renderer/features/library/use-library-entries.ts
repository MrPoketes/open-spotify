import { Effect, Fiber } from "effect"
import { use, useEffect, useState } from "react"
import { RendererRuntimeContext } from "../../lib/renderer-runtime"
import type { SpotifyApiError } from "../spotify/spotify-api"
import { type LibraryEntry, loadLibraryEntries } from "./library-entries"

type LibraryState =
  | { readonly status: "loading" }
  | { readonly status: "loaded"; readonly entries: ReadonlyArray<LibraryEntry> }
  | { readonly status: "logged-out" }
  | { readonly status: "session-expired" }
  | { readonly status: "failed" }

const failedState = (error: SpotifyApiError): LibraryState => {
  if (error._tag === "NotLoggedIn") {
    return { status: "logged-out" }
  }
  if (error._tag === "SessionExpired") {
    return { status: "session-expired" }
  }
  return { status: "failed" }
}

export function useLibraryEntries(): LibraryState {
  const runtime = use(RendererRuntimeContext)
  const [state, setState] = useState<LibraryState>({ status: "loading" })

  useEffect(() => {
    const loading = runtime.runFork(
      loadLibraryEntries.pipe(
        Effect.tapError((error) => Effect.logError("The library failed to load", error)),
        Effect.match({
          onFailure: failedState,
          onSuccess: (entries): LibraryState => ({ status: "loaded", entries }),
        }),
        Effect.flatMap((loadedState) => Effect.sync(() => setState(loadedState))),
      ),
    )
    return () => {
      runtime.runFork(Fiber.interrupt(loading))
    }
  }, [runtime])

  return state
}
