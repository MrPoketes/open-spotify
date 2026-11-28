import { PanelLeftClose, PanelLeftOpen } from "lucide-react"
import { use, type Ref } from "react"
import { Button } from "../../ui/button"
import { Tooltip } from "../../ui/tooltip"
import { IsMacContext } from "../shortcuts/is-mac-context"
import { ariaKeyShortcut, keyComboLabels } from "../shortcuts/key-combo"
import { shortcutKeys, windowShortcuts } from "../shortcuts/keyboard-shortcuts"

interface SidebarToggleButtonProps {
  readonly isCollapsed: boolean
  readonly onToggle: () => void
  readonly ref: Ref<HTMLButtonElement>
}

// The same button collapses and expands the sidebar, so it keeps focus when
// it is pressed.
export function SidebarToggleButton({ isCollapsed, onToggle, ref }: SidebarToggleButtonProps) {
  const isMac = use(IsMacContext)
  const keys = shortcutKeys(windowShortcuts.toggleSidebar, isMac)
  const label = isCollapsed ? "Expand sidebar" : "Collapse sidebar"
  const Icon = isCollapsed ? PanelLeftOpen : PanelLeftClose
  return (
    <Tooltip label={label} shortcut={keyComboLabels(keys, isMac).join("+")}>
      <Button
        ref={ref}
        variant="ghost"
        size="icon"
        aria-label={label}
        aria-keyshortcuts={ariaKeyShortcut(keys, isMac)}
        onClick={onToggle}
      >
        <Icon aria-hidden size={20} />
      </Button>
    </Tooltip>
  )
}
