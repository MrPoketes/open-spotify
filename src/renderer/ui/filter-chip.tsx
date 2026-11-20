import { Check } from "lucide-react"

interface FilterChipProps {
  readonly label: string
  readonly pressed: boolean
  readonly onClick: () => void
}

// The check mark and heavier weight show the pressed state to people who
// cannot tell the accent color apart from the resting surface.
export function FilterChip({ label, pressed, onClick }: FilterChipProps) {
  const stateStyle = pressed
    ? "bg-accent font-semibold text-on-accent"
    : "bg-surface-raised text-foreground"
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      className={`flex items-center gap-1 rounded-full px-3 py-1 text-sm transition-opacity duration-120 ease-out hover:opacity-90 active:opacity-75 ${stateStyle}`}
    >
      {pressed && <Check aria-hidden size={16} />}
      {label}
    </button>
  )
}
