// oxlint-disable-next-line no-restricted-imports -- user-event cannot drag or step a native range input in jsdom
import { fireEvent, screen, waitFor } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { Effect, Option } from "effect"
import { describe, expect, it } from "vitest"
import { appShellRuntimeWith, renderAppShell } from "../shell/render-app-shell"
import { fakeThisComputerDeviceId, readyWebPlaybackSdk } from "./web-playback-sdk-fake"

const openDevicePicker = async () => {
  await userEvent.click(await screen.findByRole("button", { name: /^Choose a device/ }))
  return screen.findByRole("dialog", { name: "Connect to a device" })
}

describe("This computer", () => {
  it("lists this computer in the device picker once the Web Playback SDK is ready", async () => {
    const sdk = readyWebPlaybackSdk()
    await renderAppShell({ runtime: appShellRuntimeWith({ webPlaybackSdk: sdk.layer }) })

    await openDevicePicker()

    expect(await screen.findByRole("button", { name: /^This computer/ })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /^Mira's Phone/ })).toBeInTheDocument()
  })

  it("moves playback to this computer when it is picked", async () => {
    const transferredTo: Array<string> = []
    const sdk = readyWebPlaybackSdk()
    await renderAppShell({
      runtime: appShellRuntimeWith({
        spotify: () => ({
          transferPlayback: (deviceId) => Effect.sync(() => transferredTo.push(deviceId)),
        }),
        webPlaybackSdk: sdk.layer,
      }),
    })
    const picker = await openDevicePicker()

    await userEvent.click(await screen.findByRole("button", { name: /^This computer/ }))

    await waitFor(() => expect(picker).not.toBeInTheDocument())
    expect(transferredTo).toEqual([fakeThisComputerDeviceId])
  })

  // The SDK's player keeps a volume of its own, which decides how loud this
  // computer plays.
  it("sends the volume set in the app to the Web Playback SDK's player", async () => {
    const sdk = readyWebPlaybackSdk()
    await renderAppShell({
      runtime: appShellRuntimeWith({
        spotify: (spotify) => ({
          getPlaybackState: spotify.getPlaybackState.pipe(
            Effect.map(
              Option.map((playback) => ({
                ...playback,
                device: { ...playback.device, id: fakeThisComputerDeviceId },
              })),
            ),
          ),
        }),
        webPlaybackSdk: sdk.layer,
      }),
    })
    const slider = await screen.findByRole("slider", { name: "Volume" })
    await waitFor(() => expect(slider).toHaveValue("60"))
    expect(
      screen.getByRole("button", { name: "Choose a device. Playing on This computer" }),
    ).toBeInTheDocument()

    fireEvent.change(slider, { target: { value: "30" } })

    await waitFor(() => expect(sdk.sdkPlayer.volumes).toEqual([60, 30]))
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
})
