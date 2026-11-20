import { useEffect, useRef } from "react"

interface LoginButtonsProps {
  readonly isWaiting: boolean
  readonly onLogIn: () => void
  readonly onCancel: () => void
}

// Log in stays where it is and is disabled while waiting, so the second click
// of a double-click lands on nothing instead of cancelling the login.
export function LoginButtons({ isWaiting, onLogIn, onCancel }: LoginButtonsProps) {
  const logInButton = useRef<HTMLButtonElement>(null)
  const cancelButton = useRef<HTMLButtonElement>(null)
  const wasWaiting = useRef(false)

  // A disabled or removed button drops keyboard focus, so focus moves to
  // Cancel when the login starts and back to Log in when it ends.
  useEffect(() => {
    if (isWaiting) {
      cancelButton.current?.focus()
    } else if (wasWaiting.current) {
      logInButton.current?.focus()
    }
    wasWaiting.current = isWaiting
  }, [isWaiting])

  return (
    <div className="flex gap-2">
      <button
        ref={logInButton}
        type="button"
        disabled={isWaiting}
        onClick={onLogIn}
        className="rounded-full bg-accent px-6 py-3 text-sm font-semibold text-on-accent disabled:opacity-50"
      >
        Log in with Spotify
      </button>
      {isWaiting && (
        <button
          ref={cancelButton}
          type="button"
          onClick={onCancel}
          className="rounded-full bg-surface-raised px-6 py-3 text-sm font-semibold"
        >
          Cancel
        </button>
      )}
    </div>
  )
}
