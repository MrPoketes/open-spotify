import type { LucideIcon } from "lucide-react"
import type { Ref } from "react"
import { Button } from "./button"
import { Tooltip } from "./tooltip"

interface IconButtonProps {
  readonly label: string
  readonly icon: LucideIcon
  readonly onClick: () => void
  readonly ref?: Ref<HTMLButtonElement>
}

// A ghost Button that shows only an icon. The label names it and is its
// tooltip, since nothing else on screen says what it does.
export function IconButton({ label, icon: Icon, onClick, ref }: IconButtonProps) {
  return (
    <Tooltip label={label}>
      <Button variant="ghost" size="icon" ref={ref} aria-label={label} onClick={onClick}>
        <Icon aria-hidden size={20} />
      </Button>
    </Tooltip>
  )
}
