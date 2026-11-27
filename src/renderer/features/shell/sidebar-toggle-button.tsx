import { PanelLeftClose, PanelLeftOpen } from "lucide-react"
import { use } from "react"
import { Button } from "../../ui/button"
import { IsMacContext } from "../shortcuts/is-mac-context"
import { ariaKeyShortcut, keyComboLabels } from "../shortcuts/key-combo"
import { shortcutKeys, windowShortcuts } from "../shortcuts/keyboard-shortcuts"

interface SidebarToggleButtonProps {
  readonly isCollapsed: boolean
  readonly onToggle: () => void
}

// The same button collapses and expands the sidebar, so it keeps focus when
// it is pressed.
export function SidebarToggleButton({ isCollapsed, onToggle }: SidebarToggleButtonProps) {
  const isMac = use(IsMacContext)
  const keys = shortcutKeys(windowShortcuts.toggleSidebar, isMac)
  const label = isCollapsed ? "Expand sidebar" : "Collapse sidebar"
  const Icon = isCollapsed ? PanelLeftOpen : PanelLeftClose
  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label={label}
      title={`${label} (${keyComboLabels(keys, isMac).join("+")})`}
      aria-keyshortcuts={ariaKeyShortcut(keys, isMac)}
      onClick={onToggle}
    >
      <Icon aria-hidden size={20} />
    </Button>
  )
}
