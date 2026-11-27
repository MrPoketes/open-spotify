import { render, screen, waitFor } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { describe, expect, it } from "vitest"
import { ContextMenu } from "./context-menu"
import type { MenuItem } from "./menu-items"
import { RovingList } from "./roving-list"

function MenuTarget({ items }: { readonly items: ReadonlyArray<MenuItem> }) {
  return (
    <ContextMenu menu={{ label: "Target actions", items }}>
      <button type="button">Target</button>
    </ContextMenu>
  )
}

const action = (label: string, selected: Array<string> = []) => ({
  label,
  onSelect: () => selected.push(label),
})

const renderMenuTarget = () => {
  const selected: Array<string> = []
  render(
    <main>
      <MenuTarget
        items={[
          action("First", selected),
          {
            label: "More",
            items: [action("Inner first", selected), action("Inner second", selected)],
          },
          action("Last", selected),
        ]}
      />
    </main>,
  )
  const target = screen.getByRole("button", { name: "Target" })
  target.focus()
  return { target, selected }
}

const menuItem = (name: string) => screen.getByRole("menuitem", { name })

// Base UI moves focus into the menu a moment after it opens.
const openWithKeys = async (keys: string) => {
  await userEvent.keyboard(keys)
  await waitFor(() => expect(menuItem("First")).toHaveFocus())
}

describe("ContextMenu", () => {
  // Keyboard users must be able to open the menu without a mouse, leave it
  // without choosing anything, and continue from where they were.
  it.each([
    { keys: "{Shift>}{F10}{/Shift}", name: "Shift+F10" },
    { keys: "{ContextMenu}", name: "the context-menu key" },
  ])("opens with $name and returns focus to its target on Escape", async ({ keys }) => {
    const { target } = renderMenuTarget()

    await openWithKeys(keys)
    expect(screen.getByRole("menu", { name: "Target actions" })).toBeInTheDocument()
    await userEvent.keyboard("{Escape}")

    expect(screen.queryByRole("menu")).not.toBeInTheDocument()
    expect(target).toHaveFocus()
  })

  // The menu is portalled to the end of the page, so letting Tab go on from
  // it would skip everything after the element it opened from.
  it("closes on Tab and returns focus to its target", async () => {
    const { target } = renderMenuTarget()
    await openWithKeys("{ContextMenu}")

    await userEvent.tab()

    expect(screen.queryByRole("menu")).not.toBeInTheDocument()
    expect(target).toHaveFocus()
  })

  it("closes when the pointer clicks outside it", async () => {
    renderMenuTarget()
    await openWithKeys("{ContextMenu}")

    // The open menu is modal, so the rest of the page is hidden from the
    // accessibility tree until it closes.
    await userEvent.click(screen.getByRole("main", { hidden: true }))

    expect(screen.queryByRole("menu")).not.toBeInTheDocument()
  })

  it("opens on right-click with focus on the menu, and the down arrow moves to the first item", async () => {
    const { target } = renderMenuTarget()

    await userEvent.pointer({ keys: "[MouseRight]", target })
    const menu = screen.getByRole("menu", { name: "Target actions" })
    await waitFor(() => expect(menu).toHaveFocus())
    await userEvent.keyboard("{ArrowDown}")

    await waitFor(() => expect(menuItem("First")).toHaveFocus())
  })

  it("moves through the items with the arrow keys, wrapping around the ends", async () => {
    renderMenuTarget()
    await openWithKeys("{ContextMenu}")

    await userEvent.keyboard("{ArrowUp}")
    await waitFor(() => expect(menuItem("Last")).toHaveFocus())
    await userEvent.keyboard("{ArrowDown}{ArrowDown}")
    expect(menuItem("More")).toHaveFocus()
  })

  it("runs the item Enter activates, then closes and returns focus to its target", async () => {
    const { target, selected } = renderMenuTarget()
    await openWithKeys("{ContextMenu}")

    await userEvent.keyboard("{End}{Enter}")

    expect(selected).toEqual(["Last"])
    expect(screen.queryByRole("menu")).not.toBeInTheDocument()
    expect(target).toHaveFocus()
  })

  it("opens a submenu with the right arrow and goes back to its item with the left arrow", async () => {
    const { selected } = renderMenuTarget()
    await openWithKeys("{ContextMenu}")
    await userEvent.keyboard("{ArrowDown}")

    await userEvent.keyboard("{ArrowRight}")
    expect(menuItem("More")).toHaveAttribute("aria-expanded", "true")
    expect(screen.getByRole("menu", { name: "More" })).toBeInTheDocument()
    await waitFor(() => expect(menuItem("Inner first")).toHaveFocus())
    await userEvent.keyboard("{ArrowLeft}")

    expect(screen.queryByRole("menu", { name: "More" })).not.toBeInTheDocument()
    expect(menuItem("More")).toHaveFocus()
    await userEvent.keyboard("{ArrowRight}")
    await waitFor(() => expect(menuItem("Inner first")).toHaveFocus())
    await userEvent.keyboard("{ArrowDown}{Enter}")
    expect(selected).toEqual(["Inner second"])
  })

  // The menu is portalled out of the list, but React passes its key presses
  // up through the list it was opened from, which must not move focus to
  // another row.
  it("keeps its arrow keys from moving focus in the list it was opened from", async () => {
    render(
      <RovingList
        rows={["Row one", "Row two"]}
        rowKey={(row) => row}
        className=""
        renderRow={(row, rovingProps) => (
          <ContextMenu
            menu={{ label: `Actions for ${row}`, items: [action("First"), action("Second")] }}
          >
            <button type="button" {...rovingProps}>
              {row}
            </button>
          </ContextMenu>
        )}
      />,
    )
    screen.getByRole("button", { name: "Row one" }).focus()

    await openWithKeys("{ContextMenu}")
    await userEvent.keyboard("j{End}")

    expect(menuItem("Second")).toHaveFocus()
  })
})
