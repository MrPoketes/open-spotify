import { createContext } from "react"

// Whether shortcuts take Cmd, as on macOS, or Ctrl. The app shell provides it;
// screens rendered on their own in tests get Ctrl.
export const IsMacContext = createContext(false)
