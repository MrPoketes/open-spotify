import { createContext } from "react"

export const defaultPlayOnThisComputer = true

interface PlayOnThisComputerChoice {
  readonly playOnThisComputer: boolean
  readonly choosePlayOnThisComputer: (playOnThisComputer: boolean) => void
}

// The app shell provides the saved choice. A setting rendered without it
// shows the default and changes nothing.
export const PlayOnThisComputerContext = createContext<PlayOnThisComputerChoice>({
  playOnThisComputer: defaultPlayOnThisComputer,
  choosePlayOnThisComputer: () => undefined,
})
