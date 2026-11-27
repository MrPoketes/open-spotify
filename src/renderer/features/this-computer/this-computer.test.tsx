// oxlint-disable-next-line no-restricted-imports -- user-event cannot drag or step a native range input in jsdom
import { fireEvent, screen, waitFor, within } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { Effect } from "effect"
import { describe, expect, it } from "vitest"
import { fakeMainProcess } from "../../lib/fake-main-process"
import { deviceButton, openPicker, pickerButton } from "../playback/device-picker-queries"
import { appShellRuntimeWith, renderAppShell } from "../shell/render-app-shell"
import { playbackStateChangedBy } from "../spotify/spotify-api-fake"
import { fakeDevices } from "../spotify/spotify-fixtures"
import {
  fakeThisComputerDeviceId,
  readyWebPlaybackSdk,
  webPlaybackSdkFailingToConnect,
  webPlaybackSdkReporting,
} from "./web-playback-sdk-fake"

// Spotify reports the active device at 60 %. It is this computer.
const playingOnThisComputer = playbackStateChangedBy((playback) => ({
  ...playback,
  device: { ...playback.device, id: fakeThisComputerDeviceId },
}))

const recordingTransfers = (transferredTo: Array<string>) => () => ({
  transferPlayback: (deviceId: string) => Effect.sync(() => transferredTo.push(deviceId)),
})

describe("This computer", () => {
  // Spotify's device list can lag behind the SDK's ready event.
  it("lists this computer in the device picker as soon as the Web Playback SDK is ready", async () => {
    const sdk = readyWebPlaybackSdk()
    await renderAppShell({ runtime: appShellRuntimeWith({ webPlaybackSdk: sdk.layer }) })

    const picker = await openPicker()

    expect(await deviceButton(picker, /^This computer/)).toBeInTheDocument()
    expect(within(picker).getByRole("button", { name: /^Mira's Phone/ })).toBeInTheDocument()
  })

  it("shows the device Spotify lists for the Web Playback SDK as this computer", async () => {
    const sdk = readyWebPlaybackSdk()
    await renderAppShell({
      runtime: appShellRuntimeWith({
        spotify: (spotify) => ({
          getAvailableDevices: spotify.getAvailableDevices.pipe(
            Effect.map((devices) => [
              ...devices,
              {
                id: fakeThisComputerDeviceId,
                name: "Open Spotify",
                type: "Computer",
                isActive: false,
                isRestricted: false,
                volumePercent: 100,
                supportsVolume: true,
              },
            ]),
          ),
        }),
        webPlaybackSdk: sdk.layer,
      }),
    })

    const picker = await openPicker()

    expect(await within(picker).findAllByRole("button", { name: /^This computer/ })).toHaveLength(1)
    expect(within(picker).queryByRole("button", { name: /^Open Spotify/ })).not.toBeInTheDocument()
    expect(within(picker).getAllByRole("button")).toHaveLength(fakeDevices.length + 1)
  })

  it("moves playback to this computer when it is picked", async () => {
    const transferredTo: Array<string> = []
    const sdk = readyWebPlaybackSdk()
    await renderAppShell({
      runtime: appShellRuntimeWith({
        spotify: recordingTransfers(transferredTo),
        webPlaybackSdk: sdk.layer,
      }),
    })
    const picker = await openPicker()

    await userEvent.click(await deviceButton(picker, /^This computer/))

    await waitFor(() => expect(picker).not.toBeInTheDocument())
    expect(transferredTo).toEqual([fakeThisComputerDeviceId])
  })

  it("names this computer in the bar while it plays", async () => {
    const sdk = readyWebPlaybackSdk()
    await renderAppShell({
      runtime: appShellRuntimeWith({ spotify: playingOnThisComputer, webPlaybackSdk: sdk.layer }),
    })

    expect(await pickerButton("Playing on This computer")).toBeInTheDocument()
  })

  // Spotify does not guarantee a device id, and this computer has none while
  // the SDK is not ready.
  it("keeps the name of a device without an id while the Web Playback SDK is not ready", async () => {
    await renderAppShell({
      runtime: appShellRuntimeWith({
        spotify: playbackStateChangedBy((playback) => ({
          ...playback,
          device: { ...playback.device, id: null },
        })),
      }),
    })

    expect(await pickerButton("Playing on Mira's Laptop")).toBeInTheDocument()
  })

  // The SDK's player keeps a volume of its own, which decides how loud this
  // computer plays. Spotify can keep reporting the volume from before a
  // change for a while, and passing a polled volume on would undo the change.
  it("sends the SDK's player each volume set in the app and never a polled one", async () => {
    const sdk = readyWebPlaybackSdk()
    await renderAppShell({
      runtime: appShellRuntimeWith({ spotify: playingOnThisComputer, webPlaybackSdk: sdk.layer }),
    })
    await pickerButton("Playing on This computer")
    const slider = await screen.findByRole("slider", { name: "Volume" })
    await waitFor(() => expect(slider).toHaveValue("60"))

    fireEvent.change(slider, { target: { value: "30" } })

    await waitFor(() => expect(sdk.sdkPlayer.volumes).toEqual([30]))
  })

  it("keeps a volume set while another device plays away from the SDK's player", async () => {
    const sentToSpotify: Array<number> = []
    const sdk = readyWebPlaybackSdk()
    await renderAppShell({
      runtime: appShellRuntimeWith({
        spotify: (spotify) => ({
          setVolume: (volumePercent) =>
            Effect.sync(() => sentToSpotify.push(volumePercent)).pipe(
              Effect.andThen(spotify.setVolume(volumePercent)),
            ),
        }),
        webPlaybackSdk: sdk.layer,
      }),
    })
    await pickerButton("Playing on Mira's Laptop")
    const slider = await screen.findByRole("slider", { name: "Volume" })
    await waitFor(() => expect(slider).toHaveValue("60"))

    fireEvent.change(slider, { target: { value: "30" } })

    await waitFor(() => expect(sentToSpotify).toEqual([30]))
    expect(sdk.sdkPlayer.volumes).toEqual([])
  })

  // The app shell unmounts when the user logs out, and the next account must
  // not see the previous account's player.
  it("disconnects the Web Playback SDK's player when the app shell unmounts", async () => {
    const sdk = readyWebPlaybackSdk()
    const view = await renderAppShell({
      runtime: appShellRuntimeWith({ webPlaybackSdk: sdk.layer }),
    })
    await waitFor(() => expect(sdk.sdkPlayer.isConnected).toBe(true))

    view.unmount()

    await waitFor(() => expect(sdk.sdkPlayer.isConnected).toBe(false))
  })

  describe("when it cannot play", () => {
    // Before the SDK was ever ready, there is no device to play on.
    it.each([
      ["initialization_error", "The Spotify player couldn't start on this computer"],
      ["account_error", "Playing on this computer needs Spotify Premium"],
      ["playback_error", "Spotify couldn't play on this computer"],
    ] as const)("lists this computer with the reason for %s", async (sdkError, reason) => {
      await renderAppShell({
        runtime: appShellRuntimeWith({ webPlaybackSdk: webPlaybackSdkReporting(sdkError) }),
      })

      const picker = await openPicker()

      const thisComputer = await deviceButton(picker, /^This computer/)
      expect(thisComputer).toHaveTextContent(reason)
      expect(thisComputer).toHaveAttribute("aria-disabled", "true")
    })

    // A failed play does not take the device away, so the user can try again.
    it("keeps this computer selectable after a failed play while the SDK is ready", async () => {
      const transferredTo: Array<string> = []
      await renderAppShell({
        runtime: appShellRuntimeWith({
          spotify: recordingTransfers(transferredTo),
          webPlaybackSdk: webPlaybackSdkReporting("playback_error", fakeThisComputerDeviceId),
        }),
      })
      const picker = await openPicker()

      await userEvent.click(
        await deviceButton(picker, /^This computer\s*Spotify couldn't play on this computer/),
      )

      await waitFor(() => expect(transferredTo).toEqual([fakeThisComputerDeviceId]))
    })

    it("explains that the player did not start when the SDK fails to connect", async () => {
      await renderAppShell({
        runtime: appShellRuntimeWith({ webPlaybackSdk: webPlaybackSdkFailingToConnect }),
      })

      const picker = await openPicker()

      expect(
        await deviceButton(picker, /^This computer\s*The Spotify player couldn't start/),
      ).toBeInTheDocument()
    })

    // The SDK rejected the access token, which a new login replaces.
    it("goes to the login screen when the SDK reports an authentication error", async () => {
      const { router } = await renderAppShell({
        runtime: appShellRuntimeWith({
          webPlaybackSdk: webPlaybackSdkReporting("authentication_error"),
        }),
      })

      await waitFor(() => expect(router.state.location.pathname).toBe("/login"))
      expect(router.state.location.search).toEqual({ sessionExpired: true })
    })

    // Without Widevine the SDK cannot play protected audio, so it is not
    // loaded at all, and remote control keeps working (decision 0007).
    it("says protected playback is unavailable when Widevine did not install", async () => {
      const transferredTo: Array<string> = []
      const sdk = readyWebPlaybackSdk()
      await renderAppShell({
        runtime: appShellRuntimeWith({
          mainProcess: fakeMainProcess({ isWidevineInstalled: false }),
          spotify: recordingTransfers(transferredTo),
          webPlaybackSdk: sdk.layer,
        }),
      })
      const picker = await openPicker()

      expect(
        await deviceButton(
          picker,
          /^This computer\s*Protected playback isn't available on this computer$/,
        ),
      ).toHaveAttribute("aria-disabled", "true")
      expect(sdk.sdkPlayer.isConnected).toBe(false)
      await userEvent.click(within(picker).getByRole("button", { name: /^Mira's Phone/ }))
      await waitFor(() => expect(transferredTo).toEqual(["fake-device-phone"]))
    })
  })
})
