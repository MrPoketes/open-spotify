import { Check } from "lucide-react"

interface FilterChipProps {
  readonly label: string
  readonly pressed: boolean
  readonly onPress: () => void
}

// The check mark and heavier weight show the pressed state to people who
// cannot tell the accent color apart from the resting surface.
export function FilterChip({ label, pressed, onPress }: FilterChipProps) {
  const pressedStyle = pressed
    ? "bg-accent font-semibold text-on-accent"
    : "bg-surface-raised text-foreground"
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onPress}
      className={`flex items-center gap-1 rounded-full px-3 py-1 text-sm transition-opacity duration-120 ease-out hover:opacity-90 active:opacity-75 ${pressedStyle}`}
    >
      {pressed && <Check aria-hidden size={16} />}
      {label}
    </button>
  )
}
