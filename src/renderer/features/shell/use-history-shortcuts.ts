import { useRouter } from "@tanstack/react-router"
import { useEffect } from "react"

type HistoryDirection = "back" | "forward"

// The shortcuts each platform's browsers use, so they work from muscle memory.
const macShortcuts: Partial<Record<string, HistoryDirection>> = { "[": "back", "]": "forward" }
const otherShortcuts: Partial<Record<string, HistoryDirection>> = {
  ArrowLeft: "back",
  ArrowRight: "forward",
}

// Chromium reports a mouse's side buttons as buttons 3 and 4.
const mouseSideButtons: Partial<Record<number, HistoryDirection>> = { 3: "back", 4: "forward" }

function shortcutDirection(event: KeyboardEvent, platform: string) {
  if (platform === "darwin") {
    return event.metaKey ? macShortcuts[event.key] : undefined
  }
  return event.altKey ? otherShortcuts[event.key] : undefined
}

export function useHistoryShortcuts(platform: string) {
  const router = useRouter()

  useEffect(() => {
    const go = (direction: HistoryDirection | undefined) => {
      if (direction === "back") {
        router.history.back()
      }
      if (direction === "forward") {
        router.history.forward()
      }
    }
    const goWithKeyboard = (event: KeyboardEvent) => go(shortcutDirection(event, platform))
    const goWithMouse = (event: MouseEvent) => go(mouseSideButtons[event.button])

    window.addEventListener("keydown", goWithKeyboard)
    window.addEventListener("mouseup", goWithMouse)
    return () => {
      window.removeEventListener("keydown", goWithKeyboard)
      window.removeEventListener("mouseup", goWithMouse)
    }
  }, [router, platform])
}
