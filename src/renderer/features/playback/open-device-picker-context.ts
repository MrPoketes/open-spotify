import { createContext } from "react"

// The app shell owns the device picker in the now-playing bar. A component
// rendered without it, as in a test of a single page, opens nothing.
export const OpenDevicePickerContext = createContext<() => void>(() => undefined)
