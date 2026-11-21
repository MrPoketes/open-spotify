import { useRouter } from "@tanstack/react-router"
import { useEffect } from "react"
import { useKeyboardShortcut } from "../shortcuts/use-keyboard-shortcut"

// Chromium reports a mouse's side buttons as buttons 3 and 4.
const backButton = 3
const forwardButton = 4

export function useHistoryShortcuts() {
  const router = useRouter()
  useKeyboardShortcut("goBack", () => router.history.back())
  useKeyboardShortcut("goForward", () => router.history.forward())

  useEffect(() => {
    const goWithMouse = (event: MouseEvent) => {
      if (event.button === backButton) {
        router.history.back()
      }
      if (event.button === forwardButton) {
        router.history.forward()
      }
    }
    window.addEventListener("mouseup", goWithMouse)
    return () => window.removeEventListener("mouseup", goWithMouse)
  }, [router])
}
