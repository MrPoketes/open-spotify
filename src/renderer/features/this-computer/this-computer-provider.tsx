import { Navigate } from "@tanstack/react-router"
import { Fiber } from "effect"
import { use, useEffect, useMemo, useState, type ReactNode } from "react"
import { SessionExpired } from "../../../shared/spotify-auth-replies"
import { RendererRuntimeContext } from "../../lib/renderer-runtime"
import { saveSetting } from "../../lib/saved-setting"
import { loginDestinationFor } from "../login/login-destination"
import { addThisComputerDevice } from "./add-this-computer-device"
import { PlayOnThisComputerContext } from "./play-on-this-computer-context"
import { ThisComputerDeviceIdContext } from "./this-computer-device-id-context"
import type { ThisComputerFailure } from "./this-computer-failure"
import { ThisComputerFailureContext } from "./this-computer-failure-context"

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
  const [failure, setFailure] = useState<ThisComputerFailure | null>(null)

  useEffect(() => {
    if (!playOnThisComputer) {
      return undefined
    }
    const connection = runtime.runFork(addThisComputerDevice(setDeviceId, setFailure))
    return () => {
      runtime.runFork(Fiber.interrupt(connection))
      setDeviceId(null)
      setFailure(null)
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

  // The SDK rejected the access token, so the session can no longer play.
  const loginDestination =
    failure === "authentication_error" ? loginDestinationFor(new SessionExpired()) : null

  return (
    <PlayOnThisComputerContext value={playOnThisComputerChoice}>
      <ThisComputerDeviceIdContext value={deviceId}>
        <ThisComputerFailureContext value={failure}>
          {loginDestination !== null && <Navigate {...loginDestination} />}
          {children}
        </ThisComputerFailureContext>
      </ThisComputerDeviceIdContext>
    </PlayOnThisComputerContext>
  )
}
