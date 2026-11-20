import { useNavigate } from "@tanstack/react-router"
import { Effect } from "effect"
import { use } from "react"
import { DesktopBridge } from "../../lib/desktop-bridge"
import { RendererRuntimeContext } from "../../lib/renderer-runtime"

const logOut = Effect.gen(function* () {
  const bridge = yield* DesktopBridge
  yield* bridge.logOut
})

export function LogOutButton() {
  const runtime = use(RendererRuntimeContext)
  const navigate = useNavigate()

  const logOutAndLeave = () => {
    runtime.runFork(
      logOut.pipe(
        Effect.andThen(Effect.promise(() => navigate({ to: "/login" }))),
        Effect.catchTag("DesktopBridgeError", (error) =>
          Effect.logWarning("Could not log out", error),
        ),
      ),
    )
  }

  return (
    <button
      type="button"
      onClick={logOutAndLeave}
      className="rounded-small bg-surface-raised px-3 py-2 text-sm"
    >
      Log out
    </button>
  )
}
