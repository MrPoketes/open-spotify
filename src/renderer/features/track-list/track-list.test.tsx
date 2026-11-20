import { screen, within } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import type { TrackListDensity } from "../../../shared/track-list-density"
import { fakeMainProcess } from "../../lib/fake-main-process"
import { renderScreen } from "../../lib/render-screen"
import { FakeMainView } from "./fake-main-view"
import { TrackList } from "./track-list"
import { TrackListDensityProvider } from "./track-list-density-provider"
import type { TrackListEntry } from "./track-row"

const trackWithArtwork = (index: number): TrackListEntry => ({
  title: `Track ${index + 1}`,
  artists: [{ id: null, name: "Mira Kaelin" }],
  album: { id: "fake-album-0", name: "Glass Harbour" },
  artwork: [{ url: `https://i.scdn.co/image/track-${index}`, width: 64 }],
  addedAt: null,
  durationMs: 200_000,
})

const renderTrackList = async (density: TrackListDensity) => {
  renderScreen(
    <TrackListDensityProvider savedDensity={density}>
      <FakeMainView>
        <TrackList label="Tracks" layout="playlist" trackCount={50} trackAt={trackWithArtwork} />
      </FakeMainView>
    </TrackListDensityProvider>,
    fakeMainProcess(),
  )
  return screen.findByRole("table", { name: "Tracks" })
}

describe("TrackList", () => {
  // Rows are positioned absolutely, so a row height that differs from the
  // virtualiser's makes rows overlap or leaves gaps between them.
  it.each([
    { density: "comfortable", rowHeight: 48, artwork: "with artwork", artworkCount: 1 },
    { density: "dense", rowHeight: 32, artwork: "without artwork", artworkCount: 0 },
  ] as const)(
    "draws $density rows $rowHeight px tall and apart, $artwork",
    async ({ density, rowHeight, artworkCount }) => {
      const tracks = await renderTrackList(density)

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
})
