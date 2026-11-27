import type { LucideIcon } from "lucide-react"
import type { Ref } from "react"
import { buttonVariants } from "../../ui/button-variants"
import { cn } from "../../ui/class-names"

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

// Play or pause is the bar's one primary action, so it alone is an accent
// disc.
const appearance = (isOn: boolean | undefined, isPrimary: boolean | undefined) => {
  if (isPrimary === true) {
    return "size-10 shadow-raised [&_svg]:fill-current"
  }
  if (isOn === true) {
    return "text-accent not-disabled:not-aria-disabled:hover:text-accent"
  }
  return ""
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
      className={cn(
        buttonVariants({ variant: isPrimary === true ? "default" : "ghost", size: "icon" }),
        "relative",
        appearance(isOn, isPrimary),
      )}
    >
      <Icon aria-hidden size={isPrimary === true ? 18 : 20} />
      {isOn === true && (
        <span aria-hidden className="absolute bottom-0.5 size-1 rounded-full bg-accent" />
      )}
    </button>
  )
}
