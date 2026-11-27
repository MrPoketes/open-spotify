import { cleanup, screen, waitFor, within } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { describe, expect, it } from "vitest"
import type { DesktopApi } from "../../../preload/desktop-api"
import { fakeMainProcess } from "../../lib/fake-main-process"
import { fakeRendererRuntime } from "../../lib/fake-renderer-runtime"
import { loadSavedSetting } from "../../lib/saved-setting"
import { deviceButton, openPicker } from "../playback/device-picker-queries"
import { appShellRuntimeWith, renderAppShell } from "../shell/render-app-shell"
import { defaultPlayOnThisComputer } from "./play-on-this-computer-context"
import { PlayOnThisComputerSetting } from "./play-on-this-computer-setting"
import { readyWebPlaybackSdk, webPlaybackSdkReporting } from "./web-playback-sdk-fake"

const loadSavedPlayOnThisComputer = (mainProcess: DesktopApi) =>
  fakeRendererRuntime({ mainProcess }).runPromise(
    loadSavedSetting("playOnThisComputer", defaultPlayOnThisComputer),
  )

// The app loads the saved choice at launch and hands it to the app shell.
const launchApp = async (mainProcess: DesktopApi) => {
  const sdk = readyWebPlaybackSdk()
  await renderAppShell({
    runtime: appShellRuntimeWith({ mainProcess, webPlaybackSdk: sdk.layer }),
    savedPlayOnThisComputer: await loadSavedPlayOnThisComputer(mainProcess),
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
    const sdk = await launchApp(fakeMainProcess())
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

  // With this computer turned off, why it could not play no longer matters.
  it("takes a failed this computer out of the device picker when turned off", async () => {
    await renderAppShell({
      runtime: appShellRuntimeWith({ webPlaybackSdk: webPlaybackSdkReporting("account_error") }),
      albumPageContent: <PlayOnThisComputerSetting />,
    })
    expect(await deviceButton(await openPicker(), /^This computer/)).toBeInTheDocument()
    await closePicker()

    await userEvent.click(playOnThisComputerSwitch())

    const picker = await openLoadedPicker()
    expect(within(picker).queryByRole("button", { name: /^This computer/ })).not.toBeInTheDocument()
  })

  it("keeps this computer off after a restart once turned off", async () => {
    const mainProcess = fakeMainProcess()
    await launchApp(mainProcess)
    await userEvent.click(playOnThisComputerSwitch())
    await waitFor(async () => expect(await loadSavedPlayOnThisComputer(mainProcess)).toBe(false))
    cleanup()

    const sdk = await launchApp(mainProcess)

    expect(playOnThisComputerSwitch()).not.toBeChecked()
    const picker = await openLoadedPicker()
    expect(within(picker).queryByRole("button", { name: /^This computer/ })).not.toBeInTheDocument()
    expect(sdk.sdkPlayer.isConnected).toBe(false)
  })
})
