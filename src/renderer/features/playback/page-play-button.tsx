import type { LucideIcon } from "lucide-react"
import { Button } from "../../ui/button"

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
    <Button size="play" aria-label={label} aria-describedby={describedBy} onClick={onClick}>
      <Icon aria-hidden size={24} fill="currentColor" />
    </Button>
  )
}
