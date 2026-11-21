import { useEffect, useRef } from "react"
import { AccentButton, SecondaryButton } from "../../ui/pill-button"

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
      <AccentButton
        ref={logInButton}
        label="Log in with Spotify"
        disabled={isWaiting}
        onClick={onLogIn}
      />
      {isWaiting && <SecondaryButton ref={cancelButton} label="Cancel" onClick={onCancel} />}
    </div>
  )
}
