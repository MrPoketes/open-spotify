import { fireEvent, screen, waitFor } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { Effect, Option } from "effect"
import { describe, expect, it } from "vitest"
import { SpotifyResponseError } from "../spotify/spotify-api"
import { spotifyApiFakeWith } from "../spotify/spotify-api-fake"
import type { Device } from "../spotify/spotify-device"
import { fakeTrack } from "../spotify/spotify-fixtures"
import { renderNowPlayingBarAlone } from "./now-playing-bar-alone"

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
    renderNowPlayingBarAlone(spotify.layer)
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
    renderNowPlayingBarAlone(spotify.layer)
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

  it("shows the new volume at once, before Spotify confirms it", async () => {
    renderNowPlayingBarAlone(spotifyApiFakeWith(() => ({ setVolume: () => Effect.never })))
    const slider = await volumeSlider()
    await waitFor(() => expect(slider).toHaveValue(fakeVolume))

    await userEvent.click(await muteButton("Mute"))

    expect(slider).toHaveValue("0")
    expect(await muteButton("Unmute")).toBeInTheDocument()
  })

  it("puts the volume back and says so when Spotify rejects it", async () => {
    renderNowPlayingBarAlone(
      spotifyApiFakeWith(() => ({
        setVolume: () =>
          Effect.fail(new SpotifyResponseError({ status: 403, message: "Restricted" })),
      })),
    )
    const slider = await volumeSlider()
    await waitFor(() => expect(slider).toHaveValue(fakeVolume))

    fireEvent.change(slider, { target: { value: "20" } })

    expect(await screen.findByRole("alert")).toHaveTextContent("Couldn't change the volume.")
    expect(slider).toHaveValue(fakeVolume)
  })

  it("disables the volume and says why on a device that does not support it", async () => {
    const spotify = recordingVolumes((device) => ({ ...device, supportsVolume: false }))
    renderNowPlayingBarAlone(spotify.layer)
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

  it("disables the volume and says why when no device is active", async () => {
    renderNowPlayingBarAlone(spotifyApiFakeWith(() => ({ getPlaybackState: Effect.succeedNone })))
    await screen.findByText("No device is playing")

    for (const control of [await volumeSlider(), await muteButton("Mute")]) {
      expect(control).toHaveAttribute("aria-disabled", "true")
      expect(control).toHaveAccessibleDescription("Choose a device to control playback.")
    }
  })
})
