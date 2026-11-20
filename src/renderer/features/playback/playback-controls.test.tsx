import { render, screen } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { Effect, type Layer, Option } from "effect"
import { describe, expect, it } from "vitest"
import { fakeRendererRuntime } from "../../lib/fake-renderer-runtime"
import { RendererRuntimeContext } from "../../lib/renderer-runtime"
import { NoActiveDevice, SpotifyApi, SpotifyResponseError } from "../spotify/spotify-api"
import { fakeTrack } from "../spotify/spotify-fixtures"
import type { PlaybackState } from "../spotify/spotify-playback-state"
import { NowPlayingBar } from "./now-playing-bar"

const renderNowPlayingBar = (spotifyApi: Layer.Layer<SpotifyApi> = SpotifyApi.layerFake) => {
  render(
    <RendererRuntimeContext value={fakeRendererRuntime({ spotifyApi })}>
      <NowPlayingBar />
    </RendererRuntimeContext>,
  )
}

const withPlayback = (change: (playback: PlaybackState) => PlaybackState) =>
  SpotifyApi.layerFakeWith((spotify) => ({
    getPlaybackState: spotify.getPlaybackState.pipe(Effect.map(Option.map(change))),
  }))

const control = (name: string) => screen.findByRole("button", { name })

const controlNames = ["Shuffle", "Previous", "Play", "Next", "Repeat"]

describe("NowPlayingBar controls", () => {
  it("pauses playback and resumes it from the keyboard", async () => {
    renderNowPlayingBar()

    await userEvent.click(await control("Pause"))
    const playButton = await control("Play")
    playButton.focus()
    await userEvent.keyboard("{Enter}")

    expect(await control("Pause")).toBeInTheDocument()
  })

  it("turns shuffle on and moves repeat from off to the context to the track", async () => {
    renderNowPlayingBar()
    await screen.findByText(fakeTrack(0).name)
    const shuffle = await control("Shuffle")
    expect(shuffle).toHaveAttribute("aria-pressed", "false")
    expect(await control("Repeat")).toHaveAttribute("aria-pressed", "false")

    await userEvent.click(shuffle)
    await userEvent.click(await control("Repeat"))
    expect(await control("Repeat")).toHaveAttribute("aria-pressed", "true")
    await userEvent.click(await control("Repeat"))

    expect(shuffle).toHaveAttribute("aria-pressed", "true")
    expect(await control("Repeat one track")).toHaveAttribute("aria-pressed", "true")
  })

  it("shows the next track and the previous one after skipping", async () => {
    renderNowPlayingBar()
    await screen.findByText(fakeTrack(0).name)

    await userEvent.click(await control("Next"))
    expect(await screen.findByText(fakeTrack(1).name)).toBeInTheDocument()
    await userEvent.click(await control("Previous"))

    expect(await screen.findByText(fakeTrack(0).name)).toBeInTheDocument()
  })

  it("puts the control back and says so when Spotify rejects the change", async () => {
    renderNowPlayingBar(
      SpotifyApi.layerFakeWith(() => ({
        pause: Effect.fail(new SpotifyResponseError({ status: 403, message: "Restricted" })),
      })),
    )

    await userEvent.click(await control("Pause"))

    expect(await screen.findByRole("alert")).toHaveTextContent("Couldn't pause playback.")
    expect(await control("Pause")).toBeInTheDocument()
  })

  it("asks for a device when a command finds that none is active", async () => {
    renderNowPlayingBar(
      SpotifyApi.layerFakeWith(() => ({ skipToNext: Effect.fail(new NoActiveDevice()) })),
    )
    await screen.findByText(fakeTrack(0).name)

    await userEvent.click(await control("Next"))

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "No device is playing. Choose a device, then try again.",
    )
  })

  it("disables every control and says why when no device is active", async () => {
    renderNowPlayingBar(SpotifyApi.layerFakeWith(() => ({ getPlaybackState: Effect.succeedNone })))
    await screen.findByText("No device is playing")

    for (const name of controlNames) {
      const button = await control(name)
      expect(button).toHaveAttribute("aria-disabled", "true")
      expect(button).toHaveAccessibleDescription("Choose a device to control playback.")
    }
  })

  it("disables every control on a device that other apps cannot control", async () => {
    renderNowPlayingBar(
      withPlayback((playback) => ({
        ...playback,
        device: { ...playback.device, isRestricted: true },
      })),
    )
    await screen.findByText(fakeTrack(0).name)

    for (const name of ["Shuffle", "Previous", "Pause", "Next", "Repeat"]) {
      expect(await control(name)).toHaveAccessibleDescription(
        "Spotify doesn't allow controlling this device from other apps.",
      )
    }
  })

  // Spotify disallows some actions in some contexts, such as skipping back
  // at the start of a playlist, and the command would only fail.
  it("disables only the controls Spotify disallows right now", async () => {
    renderNowPlayingBar(
      withPlayback((playback) => ({ ...playback, actions: { disallows: { skippingPrev: true } } })),
    )
    await screen.findByText(fakeTrack(0).name)

    const previous = await control("Previous")
    expect(previous).toHaveAttribute("aria-disabled", "true")
    expect(previous).toHaveAccessibleDescription("Spotify doesn't allow this right now.")
    expect(await control("Next")).toHaveAttribute("aria-disabled", "false")
  })
})
