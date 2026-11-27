import { Fiber } from "effect"
import { use, useEffect, useState, type ReactNode } from "react"
import { RendererRuntimeContext } from "../../lib/renderer-runtime"
import { addThisComputerDevice } from "./add-this-computer-device"
import { ThisComputerDeviceIdContext } from "./this-computer-device-id-context"

// Lives in the app shell, which unmounts on log out, so the player disconnects
// before the next account logs in.
export function ThisComputerProvider({ children }: { readonly children: ReactNode }) {
  const runtime = use(RendererRuntimeContext)
  const [deviceId, setDeviceId] = useState<string | null>(null)

  useEffect(() => {
    const connection = runtime.runFork(addThisComputerDevice(setDeviceId))
    return () => {
      runtime.runFork(Fiber.interrupt(connection))
    }
  }, [runtime])

  return <ThisComputerDeviceIdContext value={deviceId}>{children}</ThisComputerDeviceIdContext>
}
