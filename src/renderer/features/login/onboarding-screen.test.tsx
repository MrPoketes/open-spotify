import { screen, waitFor } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { Effect, Option } from "effect"
import { describe, expect, it } from "vitest"
import { ipcChannels } from "../../../shared/ipc-channels"
import { DesktopBridge } from "../../lib/desktop-bridge"
import { fakeMainProcess } from "../../lib/fake-main-process"
import { mainProcessFailingOn } from "../../lib/main-process-failing-on"
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

  // A screen reader reads the problem when the field is focused, not only once when it appears.
  it("describes an invalid Client ID field with its problem", async () => {
    renderScreen(<OnboardingScreen initialClientId="" />, fakeMainProcess())

    await userEvent.click(await screen.findByRole("button", { name: "Save and continue" }))

    const clientIdInput = screen.getByLabelText("Client ID")
    expect(clientIdInput).toBeInvalid()
    expect(clientIdInput).toHaveAccessibleDescription("Paste the Client ID from your Spotify app.")
  })

  it("reports a failed save without marking the Client ID invalid", async () => {
    renderScreen(
      <OnboardingScreen initialClientId="my-client-id" />,
      mainProcessFailingOn(ipcChannels.setSetting, fakeMainProcess()),
    )

    await userEvent.click(await screen.findByRole("button", { name: "Save and continue" }))

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Could not save the Client ID. Try again.",
    )
    expect(screen.getByLabelText("Client ID")).toBeValid()
  })

  it("drops an earlier save failure when the next attempt has a different problem", async () => {
    renderScreen(
      <OnboardingScreen initialClientId="my-client-id" />,
      mainProcessFailingOn(ipcChannels.setSetting, fakeMainProcess()),
    )
    const saveButton = await screen.findByRole("button", { name: "Save and continue" })
    await userEvent.click(saveButton)
    await screen.findByText("Could not save the Client ID. Try again.")

    await userEvent.clear(screen.getByLabelText("Client ID"))
    await userEvent.click(saveButton)

    expect(screen.getByRole("alert")).toHaveTextContent("Paste the Client ID")
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
