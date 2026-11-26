import { screen, within } from "@testing-library/react"
import { Effect, Option, type Layer } from "effect"
import { Profiler } from "react"
import { describe, expect, it, vi } from "vitest"
import type { TrackListDensity } from "../../../shared/track-list-density"
import { fakeMainProcess } from "../../lib/fake-main-process"
import { resizeObservedElements } from "../../lib/fake-resize-observer"
import { renderScreen } from "../../lib/render-screen"
import { usePlayerState } from "../playback/use-player-state"
import type { SpotifyApi } from "../spotify/spotify-api"
import { spotifyApiFakeWith } from "../spotify/spotify-api-fake"
import { FakeMainView } from "./fake-main-view"
import { scrollMainView } from "./fake-main-view-layout"
import { TrackList } from "./track-list"
import { TrackListDensityProvider } from "./track-list-density-provider"
import type { TrackListEntry, TrackListLayout } from "./track-row"

const trackWithArtwork = (index: number): TrackListEntry => ({
  trackId: `fake-track-${index}`,
  title: `Track ${index + 1}`,
  artists: [{ id: null, name: "Mira Kaelin" }],
  album: { id: "fake-album-0", name: "Glass Harbour" },
  artwork: [{ url: `https://i.scdn.co/image/track-${index}`, width: 64 }],
  addedAt: null,
  durationMs: 200_000,
})

interface TrackListOptions {
  readonly layout: TrackListLayout
  readonly trackCount: number
  readonly spotifyApi?: Layer.Layer<SpotifyApi>
  readonly onRender?: () => void
}

const renderTrackList = async (
  density: TrackListDensity,
  { layout, trackCount, spotifyApi, onRender = () => {} }: TrackListOptions,
) => {
  await renderScreen(
    <TrackListDensityProvider savedDensity={density}>
      <PolledProgress />
      <FakeMainView>
        <Profiler id="track list" onRender={onRender}>
          <TrackList
            label="Tracks"
            layout={layout}
            trackCount={trackCount}
            trackAt={trackWithArtwork}
            playbackStartAt={(index) => ({ uris: [], offset: { position: index } })}
          />
        </Profiler>
      </FakeMainView>
    </TrackListDensityProvider>,
    fakeMainProcess(),
    spotifyApi,
  )
  return screen.findByRole("table", { name: "Tracks" })
}

// Shows when a poll's state has reached the screen, beside the list rather
// than inside it.
function PolledProgress() {
  const playerState = usePlayerState()
  if (playerState.status !== "active") {
    return null
  }
  return <p>Polled at {playerState.playback.progressMs} ms</p>
}

// Each poll reports one second further into the fake's first track, which
// stays the one playing.
const sameTrackOnEveryPoll = () => {
  let pollCount = 0
  return spotifyApiFakeWith((spotify) => ({
    getPlaybackState: Effect.sync(() => (pollCount += 1)).pipe(
      Effect.flatMap((poll) =>
        spotify.getPlaybackState.pipe(
          Effect.map(Option.map((playback) => ({ ...playback, progressMs: poll * 1000 }))),
        ),
      ),
    ),
  }))
}

// jsdom does no layout, so a test says where the rows start.
const placeRowsAt = (top: number) =>
  vi.spyOn(HTMLTableSectionElement.prototype, "getBoundingClientRect").mockReturnValue({
    x: 0,
    y: top,
    top,
    left: 0,
    right: 0,
    bottom: top,
    width: 0,
    height: 0,
    toJSON: () => ({}),
  })

describe("TrackList", () => {
  // Rows are positioned absolutely, so a row height that differs from the
  // virtualiser's makes rows overlap or leaves gaps between them.
  it.each([
    { density: "comfortable", rowHeight: 48, artwork: "with artwork", artworkCount: 1 },
    { density: "dense", rowHeight: 32, artwork: "without artwork", artworkCount: 0 },
  ] as const)(
    "draws $density rows $rowHeight px tall and apart, $artwork",
    async ({ density, rowHeight, artworkCount }) => {
      const tracks = await renderTrackList(density, { layout: "playlist", trackCount: 50 })

      const secondRow = await screen.findByRole("row", { name: "Track 2 by Mira Kaelin" })
      expect(secondRow).toHaveStyle({
        height: `${rowHeight}px`,
        transform: `translateY(${rowHeight}px)`,
      })
      expect(within(tracks).getAllByRole("rowgroup")[1]).toHaveStyle({
        height: `${50 * rowHeight}px`,
      })
      expect(within(secondRow).queryAllByRole("presentation")).toHaveLength(artworkCount)
    },
  )

  // Search results and the home page's tracks were never added to a list.
  it("shows artwork and the album but no date added in a list of undated tracks", async () => {
    const tracks = await renderTrackList("comfortable", { layout: "undated", trackCount: 5 })

    expect(within(tracks).getByRole("columnheader", { name: "Album" })).toBeInTheDocument()
    expect(within(tracks).queryByRole("columnheader", { name: "Date added" })).toBeNull()
    const firstRow = screen.getByRole("row", { name: "Track 1 by Mira Kaelin" })
    expect(within(firstRow).getAllByRole("presentation")).toHaveLength(1)
    expect(within(firstRow).getByRole("link", { name: "Glass Harbour" })).toBeInTheDocument()
  })

  // Sections above a list, such as the home page's card grids, can finish
  // loading after it and push its rows down. A list that kept the old offset
  // would render the rows for the wrong part of the page.
  it("renders the rows on screen after content above the list grows", async () => {
    placeRowsAt(0)
    await renderTrackList("comfortable", { layout: "playlist", trackCount: 200 })

    placeRowsAt(2000)
    resizeObservedElements()
    scrollMainView(screen.getByRole("main"), 2000)

    expect(await screen.findByRole("row", { name: "Track 1 by Mira Kaelin" })).toBeInTheDocument()
  })

  // The player polls every two seconds and each poll is a new state, even
  // when the same track plays. A list that re-rendered on each one would
  // re-render every row it shows.
  it("does not re-render when a poll finds the same track playing", async () => {
    let listRenders = 0
    await renderTrackList("comfortable", {
      layout: "playlist",
      trackCount: 20,
      spotifyApi: sameTrackOnEveryPoll(),
      onRender: () => (listRenders += 1),
    })
    const firstRow = await screen.findByRole("row", { name: "Track 1 by Mira Kaelin" })
    await screen.findByText("Polled at 1000 ms")
    expect(firstRow).toHaveAccessibleDescription("Playing")
    listRenders = 0

    await screen.findByText("Polled at 2000 ms", {}, { timeout: 3000 })

    expect(listRenders).toBe(0)
  })
})
