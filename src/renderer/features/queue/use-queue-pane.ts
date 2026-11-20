import { useCallback, useEffect, useRef, useState } from "react"

// Matched by physical key, because macOS turns Option+Shift+Q into a symbol
// in event.key.
const isQueueShortcut = (event: KeyboardEvent) =>
  event.altKey && event.shiftKey && !event.ctrlKey && !event.metaKey && event.code === "KeyQ"

// Opens and closes the queue pane from its button in the now-playing bar or
// from Alt+Shift+Q. Opening moves focus into the pane, and closing it while
// focus is inside returns focus to the button, so focus is never lost.
export function useQueuePane() {
  const [isOpen, setOpen] = useState(false)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const paneRef = useRef<HTMLElement>(null)

  const close = useCallback(() => {
    if (paneRef.current?.contains(document.activeElement) === true) {
      buttonRef.current?.focus()
    }
    setOpen(false)
  }, [])

  const toggle = useCallback(() => {
    if (isOpen) {
      close()
      return
    }
    setOpen(true)
  }, [isOpen, close])

  useEffect(() => {
    if (isOpen) {
      paneRef.current?.focus()
    }
  }, [isOpen])

  useEffect(() => {
    const toggleOnShortcut = (event: KeyboardEvent) => {
      if (isQueueShortcut(event)) {
        event.preventDefault()
        toggle()
      }
    }
    window.addEventListener("keydown", toggleOnShortcut)
    return () => window.removeEventListener("keydown", toggleOnShortcut)
  }, [toggle])

  return { isOpen, toggle, close, buttonRef, paneRef }
}
