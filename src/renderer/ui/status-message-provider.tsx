import { type ReactNode, useCallback, useEffect, useRef, useState } from "react"
import { type StatusMessage, StatusMessageContext } from "./status-message-context"

// Long enough to read a short sentence twice.
const messageDurationMs = 5000

// Says what an action did in a small message above the now-playing bar. The
// status region stays mounted, because screen readers only announce changes
// to a live region that was already on the page.
export function StatusMessageProvider({ children }: { readonly children: ReactNode }) {
  const [message, setMessage] = useState<StatusMessage | null>(null)
  // Keys the message, so a repeated one replaces the one on screen. The text
  // alone would not change, and screen readers would not announce it again.
  const [messageCount, setMessageCount] = useState(0)

  const hideTimer = useRef<ReturnType<typeof setTimeout>>(undefined)

  // A new message gets the full time on screen, even when it replaces one.
  const showMessage = useCallback((nextMessage: StatusMessage) => {
    clearTimeout(hideTimer.current)
    setMessage(nextMessage)
    setMessageCount((count) => count + 1)
    hideTimer.current = setTimeout(() => setMessage(null), messageDurationMs)
  }, [])

  useEffect(() => () => clearTimeout(hideTimer.current), [])

  return (
    <StatusMessageContext value={showMessage}>
      {children}
      <output className="pointer-events-none fixed inset-x-0 bottom-24 z-30 flex justify-center">
        {message === null ? null : (
          <p
            key={messageCount}
            className={`rounded-large bg-surface-overlay px-3 py-2 text-sm shadow-overlay transition-[opacity,translate] duration-200 ease-out starting:translate-y-2 starting:opacity-0 ${message.isFailure ? "text-danger" : ""}`}
          >
            {message.text}
          </p>
        )}
      </output>
    </StatusMessageContext>
  )
}
