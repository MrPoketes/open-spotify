import type { MenuItem } from "./menu-items"

export interface ContextMenuContent {
  readonly label: string
  readonly items: ReadonlyArray<MenuItem>
}

// An element with no menu, or with no items in it, opens nothing
// (docs/design.md, Menus). Returns the menu the element opens, or null.
export const openedContextMenu = (menu: ContextMenuContent | null) =>
  menu !== null && menu.items.length > 0 ? menu : null
