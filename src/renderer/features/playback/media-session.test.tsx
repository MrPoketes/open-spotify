import { screen } from "@testing-library/react"
import { Effect, type Layer } from "effect"
import { describe, expect, it } from "vitest"
import { fakeMainProcess } from "../../lib/fake-main-process"
import { fakeMediaSession } from "../../lib/fake-media-session"
import { renderScreen } from "../../lib/render-screen"
import type { SpotifyApi } from "../spotify/spotify-api"
import { spotifyApiFakeWith } from "../spotify/spotify-api-fake"
import { fakeTrack } from "../spotify/spotify-fixtures"
import { nowPlayingBarAlone } from "./now-playing-bar-alone"

const renderNowPlayingBar = (spotifyApi?: Layer.Layer<SpotifyApi>) =>
  renderScreen(nowPlayingBarAlone, fakeMainProcess(), spotifyApi)

const control = (name: string) => screen.findByRole("button", { name })

describe("media keys and the operating system's media overlay", () => {
  it("shows the playing track's title, artists, album, and artwork", async () => {
    renderNowPlayingBar()
    await screen.findByText(fakeTrack(0).name)

    const { album } = fakeTrack(0)
    expect(fakeMediaSession.metadata).toMatchObject({
      title: fakeTrack(0).name,
      artist: "Northbound Static",
      album: album.name,
      artwork: album.images.map(({ url, width, height }) => ({
        src: url,
        sizes: `${width}x${height}`,
      })),
    })
    expect(fakeMediaSession.playbackState).toBe("playing")
  })

  it("pauses, plays, and skips when the media keys are pressed", async () => {
    renderNowPlayingBar()
    await screen.findByText(fakeTrack(0).name)

    fakeMediaSession.press("pause")
    expect(await control("Play")).toBeInTheDocument()
    expect(fakeMediaSession.playbackState).toBe("paused")
    fakeMediaSession.press("play")
    expect(await control("Pause")).toBeInTheDocument()
    fakeMediaSession.press("nexttrack")
    expect(await screen.findByText(fakeTrack(1).name)).toBeInTheDocument()
    expect(fakeMediaSession.metadata).toMatchObject({ title: fakeTrack(1).name })
    fakeMediaSession.press("previoustrack")

    expect(await screen.findByText(fakeTrack(0).name)).toBeInTheDocument()
  })

  it("shows nothing in the overlay while no device is active", async () => {
    renderNowPlayingBar(spotifyApiFakeWith(() => ({ getPlaybackState: Effect.succeedNone })))
    await screen.findByText("No device is playing")

    expect(fakeMediaSession.metadata).toBeNull()
    expect(fakeMediaSession.playbackState).toBe("none")
  })
})
