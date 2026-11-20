import { screen, waitFor } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { Effect, Option } from "effect"
import { describe, expect, it } from "vitest"
import { DesktopBridge } from "../../lib/desktop-bridge"
import { fakeMainProcess } from "../../lib/fake-main-process"
import { renderScreen } from "../../lib/render-screen"
import { OnboardingScreen } from "./onboarding-screen"

describe("OnboardingScreen", () => {
  it("saves the pasted Client ID and continues", async () => {
    const mainProcess = fakeMainProcess()
    const router = renderScreen(<OnboardingScreen initialClientId="" />, mainProcess)

    await userEvent.type(await screen.findByLabelText("Client ID"), "  my-client-id ")
    await userEvent.click(screen.getByRole("button", { name: "Save and continue" }))

    await waitFor(() => expect(router.state.location.pathname).toBe("/"))
    const savedClientId = await Effect.runPromise(
      DesktopBridge.make(mainProcess).getSetting("spotifyClientId"),
    )
    expect(savedClientId).toStrictEqual(Option.some("my-client-id"))
  })

  it("asks for a Client ID instead of saving an empty one", async () => {
    const mainProcess = fakeMainProcess()
    renderScreen(<OnboardingScreen initialClientId="" />, mainProcess)

    await userEvent.click(await screen.findByRole("button", { name: "Save and continue" }))

    expect(await screen.findByRole("alert")).toHaveTextContent("Paste the Client ID")
    const savedClientId = await Effect.runPromise(
      DesktopBridge.make(mainProcess).getSetting("spotifyClientId"),
    )
    expect(savedClientId).toStrictEqual(Option.none())
  })

  // A new user must not mistake Open Spotify for the official app, before they set anything up.
  it("says Open Spotify is an unofficial client", async () => {
    renderScreen(<OnboardingScreen initialClientId="" />, fakeMainProcess())

    expect(
      await screen.findByText(
        "Open Spotify is an unofficial client. It is not affiliated with, endorsed by, or sponsored by Spotify.",
      ),
    ).toBeInTheDocument()
  })
})
