import { Fiber } from "effect"
import { use, useEffect, useMemo, useState, type ReactNode } from "react"
import { RendererRuntimeContext } from "../../lib/renderer-runtime"
import { saveSetting } from "../../lib/saved-setting"
import { addThisComputerDevice } from "./add-this-computer-device"
import { PlayOnThisComputerContext } from "./play-on-this-computer-context"
import { ThisComputerDeviceIdContext } from "./this-computer-device-id-context"

interface ThisComputerProviderProps {
  readonly savedPlayOnThisComputer: boolean
  readonly children: ReactNode
}

// Lives in the app shell, which unmounts on log out, so the player disconnects
// before the next account logs in.
export function ThisComputerProvider({
  savedPlayOnThisComputer,
  children,
}: ThisComputerProviderProps) {
  const runtime = use(RendererRuntimeContext)
  const [playOnThisComputer, setPlayOnThisComputer] = useState(savedPlayOnThisComputer)
  const [deviceId, setDeviceId] = useState<string | null>(null)

  useEffect(() => {
    if (!playOnThisComputer) {
      return undefined
    }
    const connection = runtime.runFork(addThisComputerDevice(setDeviceId))
    return () => {
      runtime.runFork(Fiber.interrupt(connection))
      setDeviceId(null)
    }
  }, [runtime, playOnThisComputer])

  const playOnThisComputerChoice = useMemo(
    () => ({
      playOnThisComputer,
      choosePlayOnThisComputer: (nextPlayOnThisComputer: boolean) => {
        setPlayOnThisComputer(nextPlayOnThisComputer)
        runtime.runFork(saveSetting("playOnThisComputer", nextPlayOnThisComputer))
      },
    }),
    [playOnThisComputer, runtime],
  )

  return (
    <PlayOnThisComputerContext value={playOnThisComputerChoice}>
      <ThisComputerDeviceIdContext value={deviceId}>{children}</ThisComputerDeviceIdContext>
    </PlayOnThisComputerContext>
  )
}
