import { screen, waitFor } from "@testing-library/react"
import { Effect, Option } from "effect"
import { describe, expect, it } from "vitest"
import { mediaPlayerStates } from "../../lib/fake-media-elements"
import { fakeMediaSession } from "../../lib/fake-media-session"
import { spotifyApiFakeWith } from "../spotify/spotify-api-fake"
import { fakeTrack } from "../spotify/spotify-fixtures"
import { renderNowPlayingBarAlone } from "./now-playing-bar-alone"

// The overlay is updated by effects that run after the bar renders, so each
// check waits for it instead of reading it as soon as the bar changes. The
// operating system only shows the app, and only sends it media keys, while
// the page has a media player, so the tests check for one as well.

describe("media keys and the operating system's media overlay", () => {
  it("shows the playing track's title, artists, album, and artwork", async () => {
    renderNowPlayingBarAlone()

    const { album } = fakeTrack(0)
    await waitFor(() =>
      expect(fakeMediaSession).toMatchObject({
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
      }),
    )
  })

  it("pauses, plays, and skips when the media keys are pressed", async () => {
    renderNowPlayingBarAlone()
    await waitFor(() =>
      expect(fakeMediaSession).toMatchObject({
        playbackState: "playing",
        metadata: { title: fakeTrack(0).name },
      }),
    )

    await waitFor(() => expect(mediaPlayerStates()).toEqual(["playing"]))

    fakeMediaSession.press("pause")
    await waitFor(() => expect(fakeMediaSession).toMatchObject({ playbackState: "paused" }))
    await waitFor(() => expect(mediaPlayerStates()).toEqual(["paused"]))
    fakeMediaSession.press("play")
    await waitFor(() => expect(fakeMediaSession).toMatchObject({ playbackState: "playing" }))
    await waitFor(() => expect(mediaPlayerStates()).toEqual(["playing"]))
    fakeMediaSession.press("nexttrack")
    await waitFor(() =>
      expect(fakeMediaSession).toMatchObject({ metadata: { title: fakeTrack(1).name } }),
    )
    fakeMediaSession.press("previoustrack")

    await waitFor(() =>
      expect(fakeMediaSession).toMatchObject({ metadata: { title: fakeTrack(0).name } }),
    )
  })

  it("leaves the overlay when the device stops being active", async () => {
    let device: "active" | "gone" = "active"
    renderNowPlayingBarAlone(
      spotifyApiFakeWith((spotify) => {
        const playbackStates = { active: spotify.getPlaybackState, gone: Effect.succeedNone }
        return { getPlaybackState: Effect.suspend(() => playbackStates[device]) }
      }),
    )
    await waitFor(() =>
      expect(fakeMediaSession).toMatchObject({
        playbackState: "playing",
        metadata: { title: fakeTrack(0).name },
      }),
    )

    device = "gone"
    // A skip reads the playback state again at once.
    fakeMediaSession.press("nexttrack")
    await screen.findByText("No device is playing")

    await waitFor(() =>
      expect(fakeMediaSession).toMatchObject({ playbackState: "none", metadata: null }),
    )
    await waitFor(() => expect(mediaPlayerStates()).toEqual([]))
  })

  // A player that never played does not count, so without one the play key
  // would do nothing until the user started Spotify some other way.
  it("keeps a paused media player when Spotify starts out paused", async () => {
    renderNowPlayingBarAlone(
      spotifyApiFakeWith((spotify) => ({
        getPlaybackState: spotify.getPlaybackState.pipe(
          Effect.map(Option.map((playbackState) => ({ ...playbackState, isPlaying: false }))),
        ),
      })),
    )

    await waitFor(() => expect(fakeMediaSession).toMatchObject({ playbackState: "paused" }))
    await waitFor(() => expect(mediaPlayerStates()).toEqual(["paused"]))
  })
})
