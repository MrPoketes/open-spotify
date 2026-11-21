import { screen, waitFor } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { describe, expect, it } from "vitest"
import { fakeMainProcess } from "../../lib/fake-main-process"
import { renderScreen } from "../../lib/render-screen"
import { failingFirstTime } from "../spotify/failing-first-time"
import { spotifyApiFakeWith } from "../spotify/spotify-api-fake"
import { TrackPage } from "./track-page"

const renderTrackPage = (trackId: string, spotifyApi?: Parameters<typeof renderScreen>[2]) =>
  renderScreen(<TrackPage trackId={trackId} />, fakeMainProcess(), spotifyApi)

describe("TrackPage", () => {
  it("opens the track's album page with the track highlighted", async () => {
    const router = renderTrackPage("fake-album-4-track-2-25")

    await waitFor(() => expect(router.state.location.pathname).toBe("/album/fake-album-4"))
    expect(router.state.location.search).toEqual({ track: "fake-album-4-track-2-25" })
  })

  // Going back from the album must not land on this page, which would open
  // the album again at once.
  it("replaces itself in the history with the album page", async () => {
    const router = renderTrackPage("fake-album-4-track-2-25")

    await waitFor(() => expect(router.state.location.pathname).toBe("/album/fake-album-4"))
    expect(router.history.length).toBe(1)
  })

  it("says so when Spotify has no such track", async () => {
    renderTrackPage("missing-track")

    expect(await screen.findByRole("heading", { name: "Track not found" })).toBeInTheDocument()
  })

  it("shows an error when the track cannot load, and loads it on retry", async () => {
    const router = renderTrackPage(
      "fake-album-4-track-2-25",
      spotifyApiFakeWith((spotify) => {
        const failFirst = failingFirstTime()
        return { getTrack: (trackId) => failFirst(spotify.getTrack(trackId)) }
      }),
    )

    expect(await screen.findByRole("alert")).toHaveTextContent("This track didn't load.")
    await userEvent.click(screen.getByRole("button", { name: "Retry" }))

    await waitFor(() => expect(router.state.location.pathname).toBe("/album/fake-album-4"))
  })
})
