import { screen, within } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import type { TrackListDensity } from "../../../shared/track-list-density"
import { fakeMainProcess } from "../../lib/fake-main-process"
import { resizeObservedElements } from "../../lib/fake-resize-observer"
import { renderScreen } from "../../lib/render-screen"
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

const renderTrackList = async (
  density: TrackListDensity,
  { layout, trackCount }: { readonly layout: TrackListLayout; readonly trackCount: number },
) => {
  renderScreen(
    <TrackListDensityProvider savedDensity={density}>
      <FakeMainView>
        <div>
          <TrackList
            label="Tracks"
            layout={layout}
            trackCount={trackCount}
            trackAt={trackWithArtwork}
            playbackStartAt={(index) => ({ uris: [], offset: { position: index } })}
          />
        </div>
      </FakeMainView>
    </TrackListDensityProvider>,
    fakeMainProcess(),
  )
  return screen.findByRole("table", { name: "Tracks" })
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

afterEach(() => {
  vi.restoreAllMocks()
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
})
