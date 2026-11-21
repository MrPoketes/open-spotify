import { Effect } from "effect"
import { use } from "react"
import { RendererRuntimeContext, type RendererServices } from "../lib/renderer-runtime"
import { useShowStatusMessage } from "./status-message-context"

export interface AnnouncedOutcome<E> {
  readonly success: string
  readonly failure: (error: E) => string
  readonly failureLog: string
}

// Runs an action from a menu and says in the status message whether it
// worked.
export function useRunAnnounced() {
  const runtime = use(RendererRuntimeContext)
  const showStatusMessage = useShowStatusMessage()

  return <E>(action: Effect.Effect<unknown, E, RendererServices>, outcome: AnnouncedOutcome<E>) => {
    runtime.runFork(
      action.pipe(
        Effect.andThen(
          Effect.sync(() => showStatusMessage({ text: outcome.success, isFailure: false })),
        ),
        Effect.catch((error) =>
          Effect.logWarning(outcome.failureLog, error).pipe(
            Effect.andThen(
              Effect.sync(() =>
                showStatusMessage({ text: outcome.failure(error), isFailure: true }),
              ),
            ),
          ),
        ),
      ),
    )
  }
}
