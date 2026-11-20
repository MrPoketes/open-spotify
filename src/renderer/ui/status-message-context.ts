import { createContext, use } from "react"

export interface StatusMessage {
  readonly text: string
  readonly isFailure: boolean
}

// The app shell provides the message area. A component rendered without it,
// as in a test of a single page, shows nothing.
export const StatusMessageContext = createContext<(message: StatusMessage) => void>(() => undefined)

export const useShowStatusMessage = () => use(StatusMessageContext)
