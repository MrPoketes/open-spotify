import { Effect, Schema } from "effect"

class NavigationError extends Schema.TaggedError<NavigationError>()("NavigationError", {
  cause: Schema.Defect(),
}) {}

export const attemptNavigation = (navigate: () => Promise<void>) =>
  Effect.tryPromise({
    try: navigate,
    catch: (cause) => new NavigationError({ cause }),
  }).pipe(Effect.catch((error) => Effect.logError("Navigation failed", error)))
