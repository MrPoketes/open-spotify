import { screen, waitFor, within } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { Option } from "effect"
import { describe, expect, it } from "vitest"
import { ipcChannels } from "../../../shared/ipc-channels"
import { readSavedSetting } from "../../lib/desktop-bridge-fakes"
import { fakeMainProcess } from "../../lib/fake-main-process"
import { mainProcessFailingOn } from "../../lib/main-process-failing-on"
import { renderScreen } from "../../lib/render-screen"
import { OnboardingScreen } from "./onboarding-screen"

describe("OnboardingScreen", () => {
  it("saves the pasted Client ID and continues", async () => {
    const mainProcess = fakeMainProcess()
    const router = await renderScreen(<OnboardingScreen initialClientId="" />, mainProcess)

    await userEvent.type(await screen.findByLabelText("Client ID"), "  my-client-id ")
    await userEvent.click(screen.getByRole("button", { name: "Save and continue" }))

    await waitFor(() => expect(router.state.location.pathname).toBe("/"))
    const savedClientId = await readSavedSetting(mainProcess, "spotifyClientId")
    expect(savedClientId).toStrictEqual(Option.some("my-client-id"))
  })

  it("asks for a Client ID instead of saving an empty one", async () => {
    const mainProcess = fakeMainProcess()
    await renderScreen(<OnboardingScreen initialClientId="" />, mainProcess)

    await userEvent.click(await screen.findByRole("button", { name: "Save and continue" }))

    expect(await screen.findByRole("alert")).toHaveTextContent("Paste the Client ID")
    const savedClientId = await readSavedSetting(mainProcess, "spotifyClientId")
    expect(savedClientId).toStrictEqual(Option.none())
  })

  // A screen reader reads the problem when the field is focused, not only once when it appears.
  it("describes an invalid Client ID field with its problem", async () => {
    await renderScreen(<OnboardingScreen initialClientId="" />, fakeMainProcess())

    await userEvent.click(await screen.findByRole("button", { name: "Save and continue" }))

    const clientIdInput = screen.getByLabelText("Client ID")
    expect(clientIdInput).toBeInvalid()
    expect(clientIdInput).toHaveAccessibleDescription("Paste the Client ID from your Spotify app.")
  })

  // A Client ID is not a word: autocorrect or a remembered entry would change what the user pasted.
  it("turns off spell check and autocomplete on the Client ID field", async () => {
    await renderScreen(<OnboardingScreen initialClientId="" />, fakeMainProcess())

    const clientIdInput = await screen.findByLabelText("Client ID")
    expect(clientIdInput).toHaveAttribute("spellcheck", "false")
    expect(clientIdInput).toHaveAttribute("autocomplete", "off")
  })

  it("reports a failed save without marking the Client ID invalid", async () => {
    await renderScreen(
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
    await renderScreen(
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

  // The steps are followed in order; a step that lost its number once made five steps read as four.
  it("numbers every step of creating the Spotify app", async () => {
    await renderScreen(<OnboardingScreen initialClientId="" />, fakeMainProcess())

    const steps = within(await screen.findByRole("list")).getAllByRole("listitem")

    expect(steps.map((step) => step.textContent.match(/^\d+/)?.[0])).toStrictEqual([
      "1",
      "2",
      "3",
      "4",
      "5",
    ])
  })

  // A new user must not mistake Open Spotify for the official app, before they set anything up.
  it("says Open Spotify is an unofficial client", async () => {
    await renderScreen(<OnboardingScreen initialClientId="" />, fakeMainProcess())

    expect(
      await screen.findByText(
        "Open Spotify is an unofficial client. It is not affiliated with, endorsed by, or sponsored by Spotify.",
      ),
    ).toBeInTheDocument()
  })
})
