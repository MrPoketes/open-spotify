import { screen, within } from "@testing-library/react"
import type { UserEvent } from "@testing-library/user-event"

type Clicker = Pick<UserEvent, "click">

// Opens the Add to folder submenu of the menu that is open.
export const openAddToFolder = async (user: Clicker) => {
  await user.click(await screen.findByRole("menuitem", { name: "Add to folder", expanded: false }))
  return screen.findByRole("menu", { name: "Add to folder" })
}

// Opens the submenu of a folder that holds other folders.
export const openFolderInMenu = async (user: Clicker, menu: HTMLElement, folderName: string) => {
  await user.click(within(menu).getByRole("menuitem", { name: folderName }))
  return screen.findByRole("menu", { name: folderName })
}
