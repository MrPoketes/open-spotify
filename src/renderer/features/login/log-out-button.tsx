import { useNavigate } from "@tanstack/react-router"
import { Effect } from "effect"
import { use, useState } from "react"
import { attemptNavigation } from "../../lib/attempt-navigation"
import { DesktopBridge } from "../../lib/desktop-bridge"
import { RendererRuntimeContext } from "../../lib/renderer-runtime"
import { Button } from "../../ui/button"

const logOut = Effect.gen(function* () {
  const bridge = yield* DesktopBridge
  yield* bridge.logOut
})

export function LogOutButton() {
  const runtime = use(RendererRuntimeContext)
  const navigate = useNavigate()
  const [logOutFailed, setLogOutFailed] = useState(false)

  const logOutAndLeave = () => {
    setLogOutFailed(false)
    runtime.runFork(
      logOut.pipe(
        Effect.matchEffect({
          onSuccess: () => attemptNavigation(() => navigate({ to: "/login" })),
          onFailure: () => Effect.sync(() => setLogOutFailed(true)),
        }),
      ),
    )
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <Button variant="outline" onClick={logOutAndLeave}>
        Log out
      </Button>
      {logOutFailed && (
        <p role="alert" className="text-sm text-danger">
          Could not log out. Try again.
        </p>
      )}
    </div>
  )
}
