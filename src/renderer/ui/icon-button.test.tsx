import { render, screen, waitFor } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { ChevronLeft } from "lucide-react"
import { describe, expect, it } from "vitest"
import { IconButton } from "./icon-button"

describe("IconButton", () => {
  // The icon alone does not say what the button does.
  it("shows its label in a tooltip on hover and on keyboard focus", async () => {
    render(<IconButton label="Go back" icon={ChevronLeft} onClick={() => {}} />)
    const button = screen.getByRole("button", { name: "Go back" })

    await userEvent.hover(button)
    expect(await screen.findByRole("tooltip")).toHaveTextContent("Go back")
    await userEvent.unhover(button)
    await waitFor(() => expect(screen.queryByRole("tooltip")).not.toBeInTheDocument())

    await userEvent.tab()
    expect(button).toHaveFocus()
    expect(await screen.findByRole("tooltip")).toHaveTextContent("Go back")
  })
})
