import type { LucideIcon } from "lucide-react"
import { iconControlClassName } from "./icon-control-class-name"

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
      className={iconControlClassName}
    >
      <Icon aria-hidden size={20} />
    </button>
  )
}
