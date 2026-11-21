import { render, screen } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { Settings } from "lucide-react"
import { describe, expect, it } from "vitest"
import { MenuButton } from "./menu-button"

const actions = [
  { label: "First", onSelect: () => {} },
  { label: "Second", onSelect: () => {} },
  { label: "Third", onSelect: () => {} },
]

describe("MenuButton", () => {
  // Keyboard users must be able to leave a menu without choosing anything and
  // continue from where they were.
  it("closes on Escape and returns focus to its button", async () => {
    render(<MenuButton label="Options" icon={Settings} actions={actions} />)
    const menuButton = screen.getByRole("button", { name: "Options" })

    await userEvent.click(menuButton)
    await userEvent.keyboard("{Escape}")

    expect(screen.queryByRole("menu")).not.toBeInTheDocument()
    expect(menuButton).toHaveFocus()
    expect(menuButton).toHaveAttribute("aria-expanded", "false")
  })

  it("wraps arrow key focus around the ends of the menu", async () => {
    render(<MenuButton label="Options" icon={Settings} actions={actions} />)
    screen.getByRole("button", { name: "Options" }).focus()

    await userEvent.keyboard("{ArrowUp}")
    expect(screen.getByRole("menuitem", { name: "Third" })).toHaveFocus()

    await userEvent.keyboard("{ArrowDown}")
    expect(screen.getByRole("menuitem", { name: "First" })).toHaveFocus()
  })

  // A menu button is one stop in the page's tab order, so Tab carries on to
  // the next control instead of landing back on the button.
  it("closes on Tab and moves focus on to the next control", async () => {
    render(
      <>
        <MenuButton label="Options" icon={Settings} actions={actions} />
        <button type="button">Next</button>
      </>,
    )

    await userEvent.click(screen.getByRole("button", { name: "Options" }))
    await userEvent.tab()

    expect(screen.queryByRole("menu")).not.toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Next" })).toHaveFocus()
  })
})
