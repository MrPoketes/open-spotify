import type { LucideIcon } from "lucide-react"
import type { Ref } from "react"
import { iconControlClassName } from "./icon-control-class-name"

interface IconButtonProps {
  readonly label: string
  readonly icon: LucideIcon
  readonly onClick: () => void
  readonly ref?: Ref<HTMLButtonElement>
}

export function IconButton({ label, icon: Icon, onClick, ref }: IconButtonProps) {
  return (
    <button
      ref={ref}
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
