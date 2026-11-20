import type { LucideIcon } from "lucide-react"

interface IconButtonProps {
  readonly label: string
  readonly icon: LucideIcon
  readonly onClick: () => void
}

export function IconButton({ label, icon: Icon, onClick }: IconButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className="flex size-8 shrink-0 items-center justify-center rounded-full text-muted transition-colors duration-120 ease-out hover:bg-surface-raised hover:text-foreground"
    >
      <Icon aria-hidden size={20} />
    </button>
  )
}
