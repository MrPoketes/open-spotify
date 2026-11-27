import { Menu as MenuPrimitive } from "@base-ui/react/menu"
import type { BaseUIEvent } from "@base-ui/react/types"
import { useNavigate } from "@tanstack/react-router"
import { useRef, type KeyboardEvent } from "react"
import type { Folder, FolderTree } from "../../../shared/folders"
import { SummaryArtworkTile } from "../../ui/artwork-summary"
import { DropdownMenuContent } from "../../ui/dropdown-menu"
import { leaveShortcutsToTheWindow } from "../../ui/leave-shortcuts-to-the-window"
import { MenuItems } from "../../ui/menu-items"
import { RovingList } from "../../ui/roving-list"
import { sidebarRowClassNames } from "../../ui/sidebar-row-class-names"
import { Tooltip } from "../../ui/tooltip"
import { useActionAfterMenuCloses } from "../../ui/use-action-after-menu-closes"
import type { RovingRowProps } from "../../ui/use-roving-focus"
import { describeFolderEntry } from "./folder-entry-description"
import { folderFlyoutItems } from "./folder-flyout-items"

// The icon rail has no room for the tree's levels, so each top-level folder
// is a button that opens its contents in a menu beside the rail.
export function SidebarFolderRail({ tree }: { readonly tree: FolderTree }) {
  return (
    <RovingList
      label="Folders"
      rows={tree}
      rowKey={(folder) => folder.id}
      className="flex flex-col"
      renderRow={(folder, rovingProps) => (
        <FolderRailButton folder={folder} rovingProps={rovingProps} />
      )}
    />
  )
}

// Up and down move between the rail's buttons, as in every list, instead of
// opening the menu; Enter or Space opens it.
const leaveArrowsToTheRail = (event: BaseUIEvent<KeyboardEvent>) => {
  leaveShortcutsToTheWindow(event)
  if (event.key === "ArrowDown" || event.key === "ArrowUp") {
    event.preventBaseUIHandler()
  }
}

interface FolderRailButtonProps {
  readonly folder: Folder
  readonly rovingProps: RovingRowProps
}

function FolderRailButton({ folder, rovingProps }: FolderRailButtonProps) {
  const navigate = useNavigate()
  const buttonRef = useRef<HTMLButtonElement | null>(null)
  const { choose, runChosenAction } = useActionAfterMenuCloses(buttonRef)
  const { name, details, icon } = describeFolderEntry(folder)
  return (
    // Not modal, like the sidebar's other menus: the page keeps scrolling.
    <MenuPrimitive.Root modal={false}>
      <Tooltip label={name} details={details} disabled={false}>
        <MenuPrimitive.Trigger
          {...rovingProps}
          ref={(button: HTMLButtonElement | null) => {
            buttonRef.current = button
            rovingProps.ref(button)
          }}
          aria-label={`${name}, ${details}`}
          onKeyDown={leaveArrowsToTheRail}
          className={`${sidebarRowClassNames.link} ${sidebarRowClassNames.surface} data-popup-open:bg-surface-raised`}
        >
          <SummaryArtworkTile artwork={{ sources: [], placeholderIcon: icon, round: false }} />
        </MenuPrimitive.Trigger>
      </Tooltip>
      <DropdownMenuContent
        aria-label={name}
        side="right"
        align="start"
        className="ml-1"
        finalFocus={runChosenAction}
      >
        <MenuItems
          items={folderFlyoutItems(folder, (page) => void navigate(page))}
          onChoose={choose}
        />
      </DropdownMenuContent>
    </MenuPrimitive.Root>
  )
}
