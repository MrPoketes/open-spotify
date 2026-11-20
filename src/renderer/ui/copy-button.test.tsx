import { render, screen } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { describe, expect, it } from "vitest"
import { CopyButton } from "./copy-button"

describe("CopyButton", () => {
  it("puts the text on the clipboard and says so", async () => {
    const user = userEvent.setup()
    render(<CopyButton text="http://127.0.0.1:43821/callback" subject="Redirect URI" />)

    await user.click(screen.getByRole("button", { name: "Copy Redirect URI" }))

    expect(await screen.findByRole("button", { name: "Copied Redirect URI" })).toBeInTheDocument()
    expect(await navigator.clipboard.readText()).toBe("http://127.0.0.1:43821/callback")
  })
})
