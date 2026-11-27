import { Menu as MenuPrimitive } from "@base-ui/react/menu"
import {
  DropdownMenuCheckboxItem,
  DropdownMenuItem,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from "./dropdown-menu"

export interface MenuAction {
  // Tells apart actions with the same label, such as two playlists that
  // share a name.
  readonly id?: string
  readonly label: string
  readonly onSelect: () => void
  // Set only for an action that turns something on or off, such as an item's
  // place in a folder.
  readonly checked?: boolean
}

interface MenuSubmenu {
  // Tells apart submenus with the same label, such as two folders that share
  // a name.
  readonly id?: string
  readonly label: string
  readonly items: ReadonlyArray<MenuItem>
}

export type MenuItem = MenuAction | MenuSubmenu

const menuItemKey = (item: MenuItem) => item.id ?? item.label

// The items of a menu button's or a context menu's menu, with a submenu for
// each item that holds items of its own.
export function MenuItems({ items }: { readonly items: ReadonlyArray<MenuItem> }) {
  return items.map((item) => <MenuEntry key={menuItemKey(item)} item={item} />)
}

function MenuEntry({ item }: { readonly item: MenuItem }) {
  if ("items" in item) {
    return (
      <MenuPrimitive.SubmenuRoot>
        {/* A submenu opens on a click or a key, as docs/design.md (Menus) sets,
            so moving the pointer across the menu does not open and close every
            submenu on its way. */}
        <DropdownMenuSubTrigger openOnHover={false}>{item.label}</DropdownMenuSubTrigger>
        <DropdownMenuSubContent aria-label={item.label}>
          <MenuItems items={item.items} />
        </DropdownMenuSubContent>
      </MenuPrimitive.SubmenuRoot>
    )
  }
  if (item.checked === undefined) {
    return <DropdownMenuItem onClick={item.onSelect}>{item.label}</DropdownMenuItem>
  }
  // A checkbox item stays open by default, for ticking several; here each
  // choice is a whole action, like any other item's.
  return (
    <DropdownMenuCheckboxItem checked={item.checked} onCheckedChange={item.onSelect} closeOnClick>
      {item.label}
    </DropdownMenuCheckboxItem>
  )
}
