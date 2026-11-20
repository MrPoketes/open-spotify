import { render, screen } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { describe, expect, it } from "vitest"
import { ContextMenu, type ContextMenuItem } from "./context-menu"
import { useContextMenu } from "./use-context-menu"

function MenuTarget({ items }: { readonly items: ReadonlyArray<ContextMenuItem> }) {
  const menu = useContextMenu()
  return (
    <>
      <button type="button" onContextMenu={menu.openAtPointer} onKeyDown={menu.openWithKeyboard}>
        Target
      </button>
      {menu.anchor === null ? null : (
        <ContextMenu
          label="Target actions"
          items={items}
          anchor={menu.anchor}
          onClose={menu.close}
        />
      )}
    </>
  )
}

function ListRowWithMenu({ onKey }: { readonly onKey: (key: string) => void }) {
  const menu = useContextMenu()
  return (
    // oxlint-disable-next-line jsx-a11y/no-static-element-interactions -- Stands in for a list row that listens for its own keys.
    <div
      onKeyDown={(event) => {
        onKey(event.key)
        menu.openWithKeyboard(event)
      }}
    >
      <button type="button">Row</button>
      {menu.anchor === null ? null : (
        <ContextMenu
          label="Row actions"
          items={[{ label: "Only", onSelect: () => {} }]}
          anchor={menu.anchor}
          onClose={menu.close}
        />
      )}
    </div>
  )
}

const renderMenuTarget = () => {
  const selected: Array<string> = []
  const action = (label: string) => ({ label, onSelect: () => selected.push(label) })
  render(
    <MenuTarget
      items={[
        action("First"),
        { label: "More", items: [action("Inner first"), action("Inner second")] },
        action("Last"),
      ]}
    />,
  )
  const target = screen.getByRole("button", { name: "Target" })
  target.focus()
  return { target, selected }
}

const menuItem = (name: string) => screen.getByRole("menuitem", { name })

describe("ContextMenu", () => {
  // Keyboard users must be able to open the menu without a mouse, leave it
  // without choosing anything, and continue from where they were.
  it.each([
    { keys: "{Shift>}{F10}{/Shift}", name: "Shift+F10" },
    { keys: "{ContextMenu}", name: "the context-menu key" },
  ])("opens with $name and returns focus to its target on Escape", async ({ keys }) => {
    const { target } = renderMenuTarget()

    await userEvent.keyboard(keys)
    expect(screen.getByRole("menu", { name: "Target actions" })).toBeInTheDocument()
    expect(menuItem("First")).toHaveFocus()
    await userEvent.keyboard("{Escape}")

    expect(screen.queryByRole("menu")).not.toBeInTheDocument()
    expect(target).toHaveFocus()
  })

  it("opens where the pointer right-clicks, with focus on the first item", async () => {
    const { target } = renderMenuTarget()

    await userEvent.pointer({ keys: "[MouseRight]", target, coords: { clientX: 40, clientY: 60 } })

    expect(screen.getByRole("menu").parentElement).toHaveStyle({ left: "40px", top: "60px" })
    expect(menuItem("First")).toHaveFocus()
  })

  it("moves through the items with the arrow keys, wrapping around the ends", async () => {
    renderMenuTarget()
    await userEvent.keyboard("{ContextMenu}")

    await userEvent.keyboard("{ArrowUp}")
    expect(menuItem("Last")).toHaveFocus()
    await userEvent.keyboard("{ArrowDown}{ArrowDown}")
    expect(menuItem("More")).toHaveFocus()
  })

  it("runs the item Enter activates, then closes and returns focus to its target", async () => {
    const { target, selected } = renderMenuTarget()
    await userEvent.keyboard("{ContextMenu}")

    await userEvent.keyboard("{End}{Enter}")

    expect(selected).toEqual(["Last"])
    expect(screen.queryByRole("menu")).not.toBeInTheDocument()
    expect(target).toHaveFocus()
  })

  it("opens a submenu with the right arrow and goes back to its item with the left arrow", async () => {
    const { selected } = renderMenuTarget()
    await userEvent.keyboard("{ContextMenu}{ArrowDown}")

    await userEvent.keyboard("{ArrowRight}")
    expect(menuItem("More")).toHaveAttribute("aria-expanded", "true")
    expect(screen.getByRole("menu", { name: "More" })).toBeInTheDocument()
    expect(menuItem("Inner first")).toHaveFocus()
    await userEvent.keyboard("{ArrowLeft}")

    expect(screen.queryByRole("menu", { name: "More" })).not.toBeInTheDocument()
    expect(menuItem("More")).toHaveFocus()
    await userEvent.keyboard("{ArrowRight}{ArrowDown}{Enter}")
    expect(selected).toEqual(["Inner second"])
  })

  // Arrow keys inside the menu must not also move whatever list the menu was
  // opened from, even though the menu sits inside it in the React tree.
  it("keeps its keys from reaching the element it was opened from", async () => {
    const keysSeenByRow: Array<string> = []
    render(<ListRowWithMenu onKey={(key) => keysSeenByRow.push(key)} />)
    screen.getByRole("button", { name: "Row" }).focus()

    await userEvent.keyboard("{ContextMenu}{ArrowDown}{Escape}")

    expect(keysSeenByRow).toEqual(["ContextMenu"])
  })
})
