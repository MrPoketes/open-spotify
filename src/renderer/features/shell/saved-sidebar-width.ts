import { Effect, Option } from "effect"
import { defaultSidebarWidth } from "../../../shared/sidebar-width"
import { DesktopBridge } from "../../lib/desktop-bridge"

export const loadSavedSidebarWidth = Effect.gen(function* () {
  const bridge = yield* DesktopBridge
  const savedWidth = yield* bridge.getSetting("sidebarWidth")
  return Option.getOrElse(savedWidth, () => defaultSidebarWidth)
}).pipe(
  Effect.catchTag("DesktopBridgeError", (error) =>
    Effect.logWarning("Could not read the saved sidebar width", error).pipe(
      Effect.as(defaultSidebarWidth),
    ),
  ),
)

// A width that fails to save only costs the user their layout on the next
// launch, so it must not interrupt them now.
export const saveSidebarWidth = Effect.fn("saveSidebarWidth")(function* (width: number) {
  const bridge = yield* DesktopBridge
  yield* bridge
    .setSetting("sidebarWidth", width)
    .pipe(
      Effect.catchTag("DesktopBridgeError", (error) =>
        Effect.logWarning("Could not save the sidebar width", error),
      ),
    )
})
