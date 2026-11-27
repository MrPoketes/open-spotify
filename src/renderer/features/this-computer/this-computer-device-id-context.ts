import { createContext } from "react"

// The Spotify Connect device id of this computer while the Web Playback SDK
// is ready to play on it, and null while it is not.
export const ThisComputerDeviceIdContext = createContext<string | null>(null)
