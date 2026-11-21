import { render, screen, within } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { describe, expect, it } from "vitest"
import { useShowStatusMessage } from "./status-message-context"
import { StatusMessageProvider } from "./status-message-provider"

function CopyLinkButton() {
  const showStatusMessage = useShowStatusMessage()
  return (
    <button
      type="button"
      onClick={() => showStatusMessage({ text: "Link copied", isFailure: false })}
    >
      Copy link
    </button>
  )
}

describe("StatusMessageProvider", () => {
  // Screen readers announce a live region only when its content changes, so
  // a message that repeats must replace the one on screen, or pressing Copy
  // link a second time would go unannounced.
  it("replaces the message in the status region when the same message repeats", async () => {
    render(
      <StatusMessageProvider>
        <CopyLinkButton />
      </StatusMessageProvider>,
    )
    const copyLink = screen.getByRole("button", { name: "Copy link" })
    const statusRegion = screen.getByRole("status")

    await userEvent.click(copyLink)
    const firstMessage = within(statusRegion).getByText("Link copied")
    await userEvent.click(copyLink)

    expect(within(statusRegion).getByText("Link copied")).not.toBe(firstMessage)
  })
})
