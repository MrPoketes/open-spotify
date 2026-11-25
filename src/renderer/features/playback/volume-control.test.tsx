// oxlint-disable-next-line no-restricted-imports -- user-event cannot drag or step a native range input in jsdom
import { fireEvent, screen, waitFor } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { Effect, Option } from "effect"
import { describe, expect, it } from "vitest"
import { fakeMainProcess } from "../../lib/fake-main-process"
import { renderScreen } from "../../lib/render-screen"
import { type StatusMessage, StatusMessageContext } from "../../ui/status-message-context"
import { spotifyApiFakeWith } from "../spotify/spotify-api-fake"
import { rejectedCommand } from "../spotify/spotify-fake-rejected-command"
import type { Device } from "../spotify/spotify-device"
import { fakeTrack } from "../spotify/spotify-fixtures"
import { nowPlayingBarAlone, renderNowPlayingBarAlone } from "./now-playing-bar-alone"
import { recordDocumentKeyDowns } from "./record-document-key-downs"

// The fake devices play at 60 %.
const fakeVolume = "60"

const volumeSlider = () => screen.findByRole("slider", { name: "Volume" })

const muteButton = (name: "Mute" | "Unmute") => screen.findByRole("button", { name })

// Records each volume the bar sends, then lets the fake apply it. The active
// device can be changed to one the fixtures do not have.
const recordingVolumes = (changeDevice: (device: Device) => Device = (device) => device) => {
  const sentVolumes: Array<number> = []
  const layer = spotifyApiFakeWith((spotify) => ({
    getPlaybackState: spotify.getPlaybackState.pipe(
      Effect.map(
        Option.map((playback) => ({ ...playback, device: changeDevice(playback.device) })),
      ),
    ),
    setVolume: (volumePercent) =>
      Effect.suspend(() => {
        sentVolumes.push(volumePercent)
        return spotify.setVolume(volumePercent)
      }),
  }))
  return { sentVolumes, layer }
}

describe("NowPlayingBar volume", () => {
  // Each request counts against the rate limit that every user of the Client
  // ID shares, so a drag must not send one per step.
  it("sends the volume once the slider settles instead of on every step", async () => {
    const spotify = recordingVolumes()
    await renderNowPlayingBarAlone(spotify.layer)
    const slider = await volumeSlider()
    await waitFor(() => expect(slider).toHaveValue(fakeVolume))

    for (const volume of ["50", "40", "30"]) {
      fireEvent.change(slider, { target: { value: volume } })
    }

    expect(slider).toHaveValue("30")
    await waitFor(() => expect(spotify.sentVolumes).toEqual([30]))
    expect(slider).toHaveValue("30")
  })

  it("mutes and restores the volume from before the mute when unmuted", async () => {
    const spotify = recordingVolumes()
    await renderNowPlayingBarAlone(spotify.layer)
    const slider = await volumeSlider()
    await waitFor(() => expect(slider).toHaveValue(fakeVolume))

    await userEvent.click(await muteButton("Mute"))
    expect(slider).toHaveValue("0")
    const unmute = await muteButton("Unmute")
    unmute.focus()
    await userEvent.keyboard("{Enter}")

    await waitFor(() => expect(slider).toHaveValue(fakeVolume))
    expect(spotify.sentVolumes).toEqual([0, 60])
  })

  // Mute must win over a slider change that has not been sent yet, or the
  // slider would keep showing the dragged volume over the muted one.
  it("mutes at once while the slider is still settling and drops the slider's change", async () => {
    const spotify = recordingVolumes()
    await renderNowPlayingBarAlone(spotify.layer)
    const slider = await volumeSlider()
    await waitFor(() => expect(slider).toHaveValue(fakeVolume))

    fireEvent.change(slider, { target: { value: "30" } })
    await userEvent.click(await muteButton("Mute"))

    await waitFor(() => expect(spotify.sentVolumes).toEqual([0]))
    expect(slider).toHaveValue("0")
    expect(await muteButton("Unmute")).toBeInTheDocument()
  })

  // Alt+Left goes back in history and Ctrl+Right skips to the next track, and
  // the slider must not take them. jsdom does not step a range input, so the
  // test checks which key presses Chromium's own step is held back for.
  it("steps with the arrow keys but leaves them alone when a shortcut modifier is held", async () => {
    await renderNowPlayingBarAlone()
    const slider = await volumeSlider()
    slider.focus()
    const keyDowns = recordDocumentKeyDowns()

    await userEvent.keyboard("{ArrowRight}{Control>}{ArrowRight}{/Control}{Alt>}{ArrowLeft}{/Alt}")

    expect(keyDowns).toEqual([
      ["ArrowRight", false],
      ["Control", false],
      ["ArrowRight", true],
      ["Alt", false],
      ["ArrowLeft", true],
    ])
  })

  it("turns the volume up 10 with Ctrl+↑ and down 10 with Ctrl+↓", async () => {
    const spotify = recordingVolumes()
    await renderNowPlayingBarAlone(spotify.layer)
    const slider = await volumeSlider()
    await waitFor(() => expect(slider).toHaveValue(fakeVolume))

    await userEvent.keyboard("{Control>}{ArrowUp}{/Control}")
    await waitFor(() => expect(spotify.sentVolumes).toEqual([70]))
    await userEvent.keyboard("{Control>}{ArrowDown}{/Control}")

    await waitFor(() => expect(spotify.sentVolumes).toEqual([70, 60]))
  })

  // Like a slider drag, quick presses send one request, for the volume they
  // add up to.
  it("adds up quick volume presses into one request", async () => {
    const spotify = recordingVolumes()
    await renderNowPlayingBarAlone(spotify.layer)
    const slider = await volumeSlider()
    await waitFor(() => expect(slider).toHaveValue(fakeVolume))

    await userEvent.keyboard("{Control>}{ArrowUp}{ArrowUp}{ArrowUp}{/Control}")

    expect(slider).toHaveValue("90")
    await waitFor(() => expect(spotify.sentVolumes).toEqual([90]))
  })

  it("keeps changing the volume while Ctrl+↑ is held down", async () => {
    const spotify = recordingVolumes()
    await renderNowPlayingBarAlone(spotify.layer)
    const slider = await volumeSlider()
    await waitFor(() => expect(slider).toHaveValue(fakeVolume))

    await userEvent.keyboard("{Control>}{ArrowUp>3/}{/Control}")

    await waitFor(() => expect(spotify.sentVolumes).toEqual([90]))
  })

  it("keeps the volume from the shortcuts between 0 and 100", async () => {
    const spotify = recordingVolumes()
    await renderNowPlayingBarAlone(spotify.layer)
    const slider = await volumeSlider()
    await waitFor(() => expect(slider).toHaveValue(fakeVolume))

    await userEvent.keyboard(`{Control>}${"{ArrowUp}".repeat(5)}{/Control}`)
    await waitFor(() => expect(spotify.sentVolumes).toEqual([100]))
    await userEvent.keyboard(`{Control>}${"{ArrowDown}".repeat(11)}{/Control}`)

    await waitFor(() => expect(spotify.sentVolumes).toEqual([100, 0]))
  })

  it("unmutes to half volume when Spotify has reported no volume above zero", async () => {
    const spotify = recordingVolumes((device) => ({ ...device, volumePercent: 0 }))
    await renderNowPlayingBarAlone(spotify.layer)

    await userEvent.click(await muteButton("Unmute"))

    await waitFor(() => expect(spotify.sentVolumes).toEqual([50]))
  })

  it("puts the volume back and says so when Spotify rejects it", async () => {
    await renderNowPlayingBarAlone(
      spotifyApiFakeWith(() => ({
        setVolume: () => rejectedCommand,
      })),
    )
    const slider = await volumeSlider()
    await waitFor(() => expect(slider).toHaveValue(fakeVolume))

    fireEvent.change(slider, { target: { value: "20" } })

    expect(await screen.findByRole("alert")).toHaveTextContent("Couldn't change the volume.")
    // The message comes from the failed command, and the volume from the
    // Player's next state, which can reach the bar a moment later.
    await waitFor(() => expect(slider).toHaveValue(fakeVolume))
  })

  it("disables the volume and says why on a device that does not support it", async () => {
    const spotify = recordingVolumes((device) => ({ ...device, supportsVolume: false }))
    await renderNowPlayingBarAlone(spotify.layer)
    await screen.findByText(fakeTrack(0).name)
    const slider = await volumeSlider()
    const mute = await muteButton("Mute")

    fireEvent.change(slider, { target: { value: "20" } })
    await userEvent.click(mute)

    for (const control of [slider, mute]) {
      expect(control).toHaveAttribute("aria-disabled", "true")
      expect(control).toHaveAccessibleDescription(
        "This device doesn't let Spotify change its volume.",
      )
    }
    expect(slider).toHaveValue(fakeVolume)
    expect(spotify.sentVolumes).toEqual([])
  })

  // A held key repeats about 30 times a second, and each new message would
  // restart its animation and could be read out again.
  it("says once why the volume cannot change while Ctrl+↓ is held down", async () => {
    const spotify = recordingVolumes((device) => ({ ...device, supportsVolume: false }))
    const statusMessages: Array<StatusMessage> = []
    await renderScreen(
      <StatusMessageContext value={(message) => statusMessages.push(message)}>
        {nowPlayingBarAlone}
      </StatusMessageContext>,
      fakeMainProcess(),
      spotify.layer,
    )
    await screen.findByText(fakeTrack(0).name)

    await userEvent.keyboard("{Control>}{ArrowDown>3/}{/Control}")

    expect(statusMessages).toEqual([
      { text: "This device doesn't let Spotify change its volume.", isFailure: true },
    ])
    expect(await volumeSlider()).toHaveValue(fakeVolume)
  })

  it("disables the volume and says why when no device is active", async () => {
    await renderNowPlayingBarAlone(
      spotifyApiFakeWith(() => ({ getPlaybackState: Effect.succeedNone })),
    )
    await screen.findByText("No device is playing")

    for (const control of [await volumeSlider(), await muteButton("Mute")]) {
      expect(control).toHaveAttribute("aria-disabled", "true")
      expect(control).toHaveAccessibleDescription("Choose a device to control playback.")
    }
  })
})
