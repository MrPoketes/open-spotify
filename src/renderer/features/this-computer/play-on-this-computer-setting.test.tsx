import { cleanup, screen, waitFor, within } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { describe, expect, it } from "vitest"
import { fakeRendererRuntime } from "../../lib/fake-renderer-runtime"
import { loadSavedSetting } from "../../lib/saved-setting"
import { deviceButton, openPicker } from "../playback/device-picker-queries"
import { appShellRuntimeWith, renderAppShell } from "../shell/render-app-shell"
import { defaultPlayOnThisComputer } from "./play-on-this-computer-context"
import { PlayOnThisComputerSetting } from "./play-on-this-computer-setting"
import { readyWebPlaybackSdk } from "./web-playback-sdk-fake"

const loadSavedPlayOnThisComputer = () =>
  fakeRendererRuntime({ mainProcess: window.desktop }).runPromise(
    loadSavedSetting("playOnThisComputer", defaultPlayOnThisComputer),
  )

const launchApp = async (savedPlayOnThisComputer: boolean) => {
  const sdk = readyWebPlaybackSdk()
  await renderAppShell({
    runtime: appShellRuntimeWith({ webPlaybackSdk: sdk.layer }),
    savedPlayOnThisComputer,
    albumPageContent: <PlayOnThisComputerSetting />,
  })
  return sdk
}

const playOnThisComputerSwitch = () => screen.getByRole("switch", { name: "Play on this computer" })

// The picker lists Spotify's devices after it opens, so a device missing
// before they load proves nothing.
const openLoadedPicker = async () => {
  const picker = await openPicker()
  await deviceButton(picker, /^Mira's Phone/)
  return picker
}

const closePicker = async () => {
  await userEvent.keyboard("{Escape}")
  await waitFor(() =>
    expect(screen.queryByRole("dialog", { name: "Connect to a device" })).not.toBeInTheDocument(),
  )
}

describe("PlayOnThisComputerSetting", () => {
  it("disconnects this computer when turned off and connects it again when turned on", async () => {
    const sdk = await launchApp(true)
    await waitFor(() => expect(sdk.sdkPlayer.isConnected).toBe(true))

    await userEvent.click(playOnThisComputerSwitch())

    expect(playOnThisComputerSwitch()).not.toBeChecked()
    await waitFor(() => expect(sdk.sdkPlayer.isConnected).toBe(false))
    const pickerWhileOff = await openLoadedPicker()
    expect(
      within(pickerWhileOff).queryByRole("button", { name: /^This computer/ }),
    ).not.toBeInTheDocument()
    await closePicker()

    await userEvent.click(playOnThisComputerSwitch())

    expect(playOnThisComputerSwitch()).toBeChecked()
    await waitFor(() => expect(sdk.sdkPlayer.isConnected).toBe(true))
    expect(await deviceButton(await openPicker(), /^This computer/)).toBeInTheDocument()
  })

  it("keeps this computer off after a restart once turned off", async () => {
    await launchApp(await loadSavedPlayOnThisComputer())
    await userEvent.click(playOnThisComputerSwitch())
    await waitFor(async () => expect(await loadSavedPlayOnThisComputer()).toBe(false))
    cleanup()

    const sdk = await launchApp(await loadSavedPlayOnThisComputer())

    expect(playOnThisComputerSwitch()).not.toBeChecked()
    const picker = await openLoadedPicker()
    expect(within(picker).queryByRole("button", { name: /^This computer/ })).not.toBeInTheDocument()
    expect(sdk.sdkPlayer.isConnected).toBe(false)
  })
})
