import { screen, waitFor } from "@testing-library/react"
import { Effect } from "effect"
import { describe, expect, it } from "vitest"
import { fakeMediaSession } from "../../lib/fake-media-session"
import { spotifyApiFakeWith } from "../spotify/spotify-api-fake"
import { fakeTrack } from "../spotify/spotify-fixtures"
import { renderNowPlayingBarAlone } from "./now-playing-bar-alone"

// The overlay is updated by effects that run after the bar renders, so each
// check waits for it instead of reading it as soon as the bar changes.
const overlayShows = (expected: object) =>
  waitFor(() => expect(fakeMediaSession).toMatchObject(expected))

describe("media keys and the operating system's media overlay", () => {
  it("shows the playing track's title, artists, album, and artwork", async () => {
    renderNowPlayingBarAlone()

    const { album } = fakeTrack(0)
    await overlayShows({
      playbackState: "playing",
      metadata: {
        title: fakeTrack(0).name,
        artist: "Northbound Static",
        album: album.name,
        artwork: album.images.map(({ url, width, height }) => ({
          src: url,
          sizes: `${width}x${height}`,
        })),
      },
    })
  })

  it("pauses, plays, and skips when the media keys are pressed", async () => {
    renderNowPlayingBarAlone()
    await overlayShows({ playbackState: "playing", metadata: { title: fakeTrack(0).name } })

    fakeMediaSession.press("pause")
    await overlayShows({ playbackState: "paused" })
    fakeMediaSession.press("play")
    await overlayShows({ playbackState: "playing" })
    fakeMediaSession.press("nexttrack")
    await overlayShows({ metadata: { title: fakeTrack(1).name } })
    fakeMediaSession.press("previoustrack")

    await overlayShows({ metadata: { title: fakeTrack(0).name } })
  })

  it("leaves the overlay when the device stops being active", async () => {
    let isDeviceActive = true
    renderNowPlayingBarAlone(
      spotifyApiFakeWith((spotify) => ({
        getPlaybackState: Effect.suspend(() =>
          isDeviceActive ? spotify.getPlaybackState : Effect.succeedNone,
        ),
      })),
    )
    await overlayShows({ playbackState: "playing", metadata: { title: fakeTrack(0).name } })

    isDeviceActive = false
    // A skip reads the playback state again at once.
    fakeMediaSession.press("nexttrack")
    await screen.findByText("No device is playing")

    await overlayShows({ playbackState: "none", metadata: null })
  })
})
