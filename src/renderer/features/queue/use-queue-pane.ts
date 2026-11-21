import { useCallback, useEffect, useRef, useState } from "react"
import { useKeyboardShortcut } from "../shortcuts/use-keyboard-shortcut"

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

  useKeyboardShortcut("toggleQueue", toggleQueue)

  return { isQueueOpen, toggleQueue, closeQueue, queueButtonRef, queuePaneRef }
}
