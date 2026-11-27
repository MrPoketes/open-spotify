import { CircleAlert } from "lucide-react"
import { Button } from "../../ui/button"
import { Tooltip } from "../../ui/tooltip"
import type { SidebarRail } from "./sidebar-rail-context"

interface RailFailureProps {
  readonly message: string
  readonly rail: SidebarRail
}

const expandHint = "Expand the sidebar to see why."

// The rail has no room for a failure's message and its Retry, so an alert
// icon names the failure and expands the sidebar, where both show.
export function RailFailure({ message, rail }: RailFailureProps) {
  return (
    <div role="alert" className="flex justify-center py-1">
      <Tooltip label={message} details={expandHint} disabled={false}>
        <Button
          variant="ghost"
          size="icon"
          aria-label={`${message} ${expandHint}`}
          onClick={rail.expand}
        >
          <CircleAlert aria-hidden size={20} />
        </Button>
      </Tooltip>
    </div>
  )
}
