import { render, screen, waitFor } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { Settings } from "lucide-react"
import { describe, expect, it, onTestFinished } from "vitest"
import { MenuButton } from "./menu-button"

const actions = [
  { label: "First", onSelect: () => {} },
  { label: "Second", onSelect: () => {} },
  { label: "Third", onSelect: () => {} },
]

// Opened with the pointer, the menu itself takes focus, a moment after it
// opens, and the arrow keys move from there.
const openWithClick = async () => {
  await userEvent.click(screen.getByRole("button", { name: "Options" }))
  const menu = await screen.findByRole("menu", { name: "Options" })
  await waitFor(() => expect(menu).toHaveFocus())
}

describe("MenuButton", () => {
  // Keyboard users must be able to leave a menu without choosing anything and
  // continue from where they were.
  it("closes on Escape and returns focus to its button", async () => {
    render(<MenuButton label="Options" icon={Settings} items={actions} />)
    const menuButton = screen.getByRole("button", { name: "Options" })

    await openWithClick()
    await userEvent.keyboard("{Escape}")

    expect(screen.queryByRole("menu")).not.toBeInTheDocument()
    expect(menuButton).toHaveFocus()
    expect(menuButton).toHaveAttribute("aria-expanded", "false")
  })

  it("wraps arrow key focus around the ends of the menu", async () => {
    render(<MenuButton label="Options" icon={Settings} items={actions} />)
    screen.getByRole("button", { name: "Options" }).focus()

    await userEvent.keyboard("{ArrowUp}")
    await waitFor(() => expect(screen.getByRole("menuitem", { name: "Third" })).toHaveFocus())

    await userEvent.keyboard("{ArrowDown}")
    await waitFor(() => expect(screen.getByRole("menuitem", { name: "First" })).toHaveFocus())
  })

  it("moves focus to the first item on Home and the last item on End", async () => {
    render(<MenuButton label="Options" icon={Settings} items={actions} />)

    await openWithClick()
    await userEvent.keyboard("{End}")
    await waitFor(() => expect(screen.getByRole("menuitem", { name: "Third" })).toHaveFocus())

    await userEvent.keyboard("{Home}")
    await waitFor(() => expect(screen.getByRole("menuitem", { name: "First" })).toHaveFocus())
  })

  // App-wide shortcuts, such as Alt+Left to go back, listen on the window and
  // must still work while a menu has focus.
  it("leaves arrow keys, Home and End held with Ctrl, Alt or Cmd to app-wide shortcuts", async () => {
    render(<MenuButton label="Options" icon={Settings} items={actions} />)
    await openWithClick()
    await userEvent.keyboard("{ArrowDown}")
    await waitFor(() => expect(screen.getByRole("menuitem", { name: "First" })).toHaveFocus())
    const keysHeardByWindow: Array<string> = []
    const hearKey = (event: KeyboardEvent) => keysHeardByWindow.push(event.key)
    window.addEventListener("keydown", hearKey)
    onTestFinished(() => window.removeEventListener("keydown", hearKey))

    await userEvent.keyboard(
      "{Control>}{ArrowDown}{/Control}{Alt>}{Home}{/Alt}{Meta>}{End}{/Meta}{Alt>}{ArrowLeft}{/Alt}",
    )

    expect(screen.getByRole("menuitem", { name: "First" })).toHaveFocus()
    expect(keysHeardByWindow).toEqual(
      expect.arrayContaining(["ArrowDown", "Home", "End", "ArrowLeft"]),
    )
  })

  // Ctrl+↓ turns the volume down from anywhere in the window.
  it("stays closed when an arrow key is pressed with Ctrl, Alt or Cmd", async () => {
    render(<MenuButton label="Options" icon={Settings} items={actions} />)
    screen.getByRole("button", { name: "Options" }).focus()

    await userEvent.keyboard(
      "{Control>}{ArrowDown}{/Control}{Alt>}{ArrowDown}{/Alt}{Meta>}{ArrowUp}{/Meta}",
    )

    expect(screen.queryByRole("menu")).not.toBeInTheDocument()
  })

  // A menu button is one stop in the page's tab order, so Tab carries on to
  // the next control instead of landing back on the button.
  it("closes on Tab and moves focus on to the next control", async () => {
    render(
      <>
        <MenuButton label="Options" icon={Settings} items={actions} />
        <button type="button">Next</button>
      </>,
    )

    await openWithClick()
    await userEvent.tab()

    expect(screen.queryByRole("menu")).not.toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Next" })).toHaveFocus()
  })

  // The button comes just before its menu in the tab order, so Shift+Tab
  // lands on it, and a menu left open there would no longer hear Escape.
  it("closes on Shift+Tab and returns focus to its button", async () => {
    render(<MenuButton label="Options" icon={Settings} items={actions} />)
    const menuButton = screen.getByRole("button", { name: "Options" })

    await openWithClick()
    await userEvent.tab({ shift: true })

    expect(screen.queryByRole("menu")).not.toBeInTheDocument()
    expect(menuButton).toHaveFocus()
    expect(menuButton).toHaveAttribute("aria-expanded", "false")
  })

  it("closes when a click lands outside it", async () => {
    render(
      <>
        <MenuButton label="Options" icon={Settings} items={actions} />
        <p>Elsewhere</p>
      </>,
    )

    await openWithClick()
    await userEvent.click(screen.getByText("Elsewhere"))

    expect(screen.queryByRole("menu")).not.toBeInTheDocument()
  })
})
