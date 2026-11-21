import type { LucideIcon } from "lucide-react"
import type { Ref } from "react"

interface PlayerControlButtonProps {
  readonly label: string
  readonly icon: LucideIcon
  // Why the control cannot be used right now, or null when it can.
  readonly unavailableReason: string | null
  readonly onPress: () => void
  // Set only on toggles, such as shuffle.
  readonly isOn?: boolean
  readonly isPrimary?: boolean
  readonly ref?: Ref<HTMLButtonElement>
}

const appearance = (isOn: boolean | undefined, isPrimary: boolean | undefined) => {
  if (isPrimary === true) {
    return "bg-accent text-on-accent not-aria-disabled:hover:opacity-90"
  }
  if (isOn === true) {
    return "text-accent not-aria-disabled:hover:bg-surface-overlay"
  }
  return "text-muted not-aria-disabled:hover:bg-surface-overlay not-aria-disabled:hover:text-foreground"
}

// aria-disabled instead of disabled keeps an unavailable control focusable,
// so keyboard and screen reader users can still find out why it is off. The
// title carries the reason, which also makes it the accessible description.
export function PlayerControlButton({
  label,
  icon: Icon,
  unavailableReason,
  onPress,
  isOn,
  isPrimary,
  ref,
}: PlayerControlButtonProps) {
  const isUnavailable = unavailableReason !== null
  return (
    <button
      ref={ref}
      type="button"
      aria-label={label}
      title={unavailableReason ?? label}
      aria-pressed={isOn}
      aria-disabled={isUnavailable}
      onClick={isUnavailable ? undefined : onPress}
      className={`relative flex size-8 shrink-0 items-center justify-center rounded-full transition-colors duration-120 ease-out aria-disabled:opacity-50 ${appearance(isOn, isPrimary)}`}
    >
      <Icon aria-hidden size={20} />
      {isOn === true && (
        <span aria-hidden className="absolute bottom-0 size-1 rounded-full bg-accent" />
      )}
    </button>
  )
}
