import { createContext } from "react"
import type { ThisComputerFailure } from "./this-computer-failure"

// Why this computer cannot play, and null while nothing has gone wrong.
export const ThisComputerFailureContext = createContext<ThisComputerFailure | null>(null)
