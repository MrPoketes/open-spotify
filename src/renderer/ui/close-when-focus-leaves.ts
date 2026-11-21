import type { FocusEvent } from "react"

export const closeWhenFocusLeaves = (close: () => void) => (event: FocusEvent) => {
  if (!event.currentTarget.contains(event.relatedTarget)) {
    close()
  }
}
