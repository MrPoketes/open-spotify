import type { LucideIcon } from "lucide-react"

interface PagePlayButtonProps {
  readonly label: string
  readonly icon: LucideIcon
  readonly onClick: () => void
  // The id of a line that says what the button plays, when its name cannot.
  readonly describedBy?: string | undefined
}

// The round play button between a page's header and its contents.
export function PagePlayButton({ label, icon: Icon, onClick, describedBy }: PagePlayButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-describedby={describedBy}
      onClick={onClick}
      className="flex size-14 shrink-0 items-center justify-center self-start rounded-full bg-accent text-on-accent transition-opacity duration-120 ease-out hover:opacity-90 active:opacity-75"
    >
      <Icon aria-hidden size={24} fill="currentColor" />
    </button>
  )
}
