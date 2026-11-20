import { useCallback, useEffect, useRef, useState } from "react"

// Matched by physical key, because macOS turns Option+Shift+Q into a symbol
// in event.key.
const isQueueShortcut = (event: KeyboardEvent) =>
  event.altKey && event.shiftKey && !event.ctrlKey && !event.metaKey && event.code === "KeyQ"

export function useQueuePane() {
  const [isQueueOpen, setQueueOpen] = useState(false)
  const queueButtonRef = useRef<HTMLButtonElement>(null)
  const queuePaneRef = useRef<HTMLElement>(null)

  // Closing the pane removes whatever had focus inside it, which would drop
  // keyboard users back at the start of the page.
  const closeQueue = useCallback(() => {
    if (queuePaneRef.current?.contains(document.activeElement) === true) {
      queueButtonRef.current?.focus()
    }
    setQueueOpen(false)
  }, [])

  const toggleQueue = useCallback(() => {
    if (isQueueOpen) {
      closeQueue()
      return
    }
    setQueueOpen(true)
  }, [isQueueOpen, closeQueue])

  useEffect(() => {
    if (isQueueOpen) {
      queuePaneRef.current?.focus()
    }
  }, [isQueueOpen])

  useEffect(() => {
    const toggleOnShortcut = (event: KeyboardEvent) => {
      if (isQueueShortcut(event)) {
        event.preventDefault()
        toggleQueue()
      }
    }
    window.addEventListener("keydown", toggleOnShortcut)
    return () => window.removeEventListener("keydown", toggleOnShortcut)
  }, [toggleQueue])

  return { isQueueOpen, toggleQueue, closeQueue, queueButtonRef, queuePaneRef }
}
