import { render, screen, waitFor, within } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { describe, expect, it } from "vitest"
import { IsMacContext } from "./is-mac-context"
import { rowShortcuts, windowShortcuts } from "./keyboard-shortcuts"
import { ShortcutsDialog } from "./shortcuts-dialog"

const openShortcutsDialog = async (isMac: boolean) => {
  render(
    <IsMacContext value={isMac}>
      <ShortcutsDialog />
    </IsMacContext>,
  )
  await userEvent.keyboard("?")
  return screen.getByRole("dialog", { name: "Keyboard shortcuts" })
}

// The keys listed beside a shortcut's description.
const keysFor = (dialog: HTMLElement, description: string) =>
  within(dialog).getByRole("definition", { name: description })

describe("ShortcutsDialog", () => {
  it("lists every shortcut when ? is pressed", async () => {
    const dialog = await openShortcutsDialog(false)

    for (const { description } of [
      ...Object.values(windowShortcuts),
      ...Object.values(rowShortcuts),
    ]) {
      expect(within(dialog).getByText(description)).toBeInTheDocument()
    }
    expect(keysFor(dialog, "Play or pause")).toHaveTextContent("Space")
    expect(keysFor(dialog, "Next track")).toHaveTextContent("Ctrl→")
    expect(keysFor(dialog, "Seek forward")).toHaveTextContent("CtrlShift→")
    expect(keysFor(dialog, "Turn the volume down")).toHaveTextContent("Ctrl↓")
    expect(keysFor(dialog, "Go back")).toHaveTextContent("Alt←")
    expect(keysFor(dialog, "Show or hide the queue")).toHaveTextContent("AltShiftQ")
    expect(keysFor(dialog, "Pin or unpin a library entry")).toHaveTextContent(/^P$/)
    expect(keysFor(dialog, "Delete an imported theme")).toHaveTextContent(/^Delete$/)
  })

  it("lists the macOS keys on macOS", async () => {
    const dialog = await openShortcutsDialog(true)

    expect(keysFor(dialog, "Next track")).toHaveTextContent("Cmd→")
    expect(keysFor(dialog, "Go back")).toHaveTextContent("Cmd[")
    expect(keysFor(dialog, "Show or hide the queue")).toHaveTextContent("OptionShiftQ")
    // Mac keyboards label Backspace "delete".
    expect(keysFor(dialog, "Delete an imported theme")).toHaveTextContent(/^Delete$/)
  })

  it("closes with the Close button", async () => {
    const dialog = await openShortcutsDialog(false)

    await userEvent.click(within(dialog).getByRole("button", { name: "Close" }))

    expect(screen.queryByRole("dialog", { name: "Keyboard shortcuts" })).not.toBeInTheDocument()
  })

  it("closes with Escape and gives focus back to where it was", async () => {
    render(<button type="button">Play</button>)
    render(<ShortcutsDialog />)
    screen.getByRole("button", { name: "Play" }).focus()

    await userEvent.keyboard("?")
    const dialog = screen.getByRole("dialog", { name: "Keyboard shortcuts" })
    await waitFor(() => expect(within(dialog).getByRole("button", { name: "Close" })).toHaveFocus())
    await userEvent.keyboard("{Escape}")

    await waitFor(() =>
      expect(screen.queryByRole("dialog", { name: "Keyboard shortcuts" })).not.toBeInTheDocument(),
    )
    expect(screen.getByRole("button", { name: "Play" })).toHaveFocus()
  })

  it("closes when the backdrop around it is clicked", async () => {
    await openShortcutsDialog(false)

    await userEvent.click(screen.getByRole("presentation"))

    await waitFor(() =>
      expect(screen.queryByRole("dialog", { name: "Keyboard shortcuts" })).not.toBeInTheDocument(),
    )
  })

  it("stays closed when ? is typed in a text field", async () => {
    render(<ShortcutsDialog />)
    render(<input aria-label="Notes" />)

    await userEvent.type(screen.getByRole("textbox", { name: "Notes" }), "?")

    expect(screen.queryByRole("dialog", { name: "Keyboard shortcuts" })).not.toBeInTheDocument()
  })
})
