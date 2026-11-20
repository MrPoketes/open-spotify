import { Effect, Fiber } from "effect"
import { use, useEffect, useState } from "react"
import { RendererRuntimeContext } from "../../lib/renderer-runtime"
import { type LibraryEntry, loadLibraryEntries } from "./library-entries"

type LibraryState =
  | { readonly status: "loading" }
  | { readonly status: "loaded"; readonly entries: ReadonlyArray<LibraryEntry> }
  | { readonly status: "failed" }

export function useLibraryEntries(): LibraryState {
  const runtime = use(RendererRuntimeContext)
  const [state, setState] = useState<LibraryState>({ status: "loading" })

  useEffect(() => {
    const loading = runtime.runFork(
      loadLibraryEntries.pipe(
        Effect.tapError((error) => Effect.logError("The library failed to load", error)),
        Effect.match({
          onFailure: (): LibraryState => ({ status: "failed" }),
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
