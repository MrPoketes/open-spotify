import { act, cleanup, screen, within } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { Stream } from "effect"
import { describe, expect, it } from "vitest"
import type { DesktopApi } from "../../../preload/desktop-api"
import { ipcChannels } from "../../../shared/ipc-channels"
import { defaultLibrarySections } from "../../../shared/library-layout"
import { fakeMainProcess } from "../../lib/fake-main-process"
import { renderScreen } from "../../lib/render-screen"
import { spotifyApiFakeWith } from "../spotify/spotify-api-fake"
import { Library } from "./library"

// The tests need the Artists section, not its fifty-odd fake artists. Each pin,
// hide, or collapse re-renders every entry, and rendering all of them ran the
// first test past its timeout on a busy machine.
const spotifyWithTwoArtists = spotifyApiFakeWith((spotify) => ({
  followedArtists: spotify.followedArtists.pipe(Stream.take(2)),
}))

const renderLibrary = (mainProcess: DesktopApi = fakeMainProcess()) =>
  renderScreen(<Library />, mainProcess, spotifyWithTwoArtists)

const section = (name: string) => screen.findByRole("region", { name })

const sectionEntryTexts = async (name: string) =>
  within(await section(name))
    .getAllByRole("listitem")
    .map(({ textContent }) => textContent)

const sectionToggle = async (name: string) =>
  within(await section(name)).getByRole("button", { name })

const sectionNames = () =>
  screen.getAllByRole("region").map((region) => region.getAttribute("aria-label"))

const chooseSectionOption = async (sectionName: string, option: string) => {
  await userEvent.click(
    await screen.findByRole("button", { name: `${sectionName} section options` }),
  )
  await userEvent.click(await screen.findByRole("menuitem", { name: option }))
}

describe("Library pins and sections", () => {
  it("moves a pinned entry out of its section to the top of the library", async () => {
    await renderLibrary()

    await userEvent.click(await screen.findByRole("button", { name: "Pin Small Hours to the top" }))

    expect(sectionNames()[0]).toBe("Pinned")
    expect(await sectionEntryTexts("Pinned")).toEqual(["Small HoursAlbum · Lena Varga"])
    expect(await sectionEntryTexts("Albums")).not.toContain("Small HoursAlbum · Lena Varga")
  })

  // The pin button only shows on hover, so the keyboard needs its own way in.
  it("pins and unpins the focused entry with P, keeping focus on it as it moves", async () => {
    await renderLibrary()
    const albumLink = await screen.findByRole("link", { name: /^Small Hours/ })
    act(() => albumLink.focus())

    await userEvent.keyboard("p")
    const pinnedLink = within(await section("Pinned")).getByRole("link", { name: /^Small Hours/ })
    expect(pinnedLink).toHaveFocus()
    await userEvent.keyboard("p")

    expect(screen.queryByRole("region", { name: "Pinned" })).not.toBeInTheDocument()
    expect(
      within(await section("Albums")).getByRole("link", { name: /^Small Hours/ }),
    ).toHaveFocus()
  })

  it("removes a hidden section and brings it back with its Show button", async () => {
    await renderLibrary()

    await chooseSectionOption("Albums", "Hide section")
    expect(screen.queryByRole("region", { name: "Albums" })).not.toBeInTheDocument()
    expect(screen.queryByRole("link", { name: /^Small Hours/ })).not.toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Show Albums" })).toHaveFocus()
    await userEvent.click(screen.getByRole("button", { name: "Show Albums" }))

    expect(await sectionEntryTexts("Albums")).toContain("Small HoursAlbum · Lena Varga")
    expect(await sectionToggle("Albums")).toHaveFocus()
  })

  it("collapses a section to its heading and expands it again", async () => {
    await renderLibrary()
    const albumsToggle = await sectionToggle("Albums")

    await userEvent.click(albumsToggle)
    expect(albumsToggle).toHaveAttribute("aria-expanded", "false")
    expect(within(await section("Albums")).queryByRole("list")).not.toBeInTheDocument()
    await userEvent.click(albumsToggle)

    expect(await sectionEntryTexts("Albums")).toContain("Small HoursAlbum · Lena Varga")
  })

  it("moves a section past its neighbour with Move down and back with Move up", async () => {
    await renderLibrary()

    await chooseSectionOption("Liked Songs", "Move down")
    expect(sectionNames().slice(0, 2)).toEqual(["Playlists", "Liked Songs"])
    expect(await sectionToggle("Liked Songs")).toHaveFocus()
    await chooseSectionOption("Liked Songs", "Move up")

    expect(sectionNames().slice(0, 2)).toEqual(["Liked Songs", "Playlists"])
  })

  it("restores pins and section settings after a restart", async () => {
    const mainProcess = fakeMainProcess()
    await renderLibrary(mainProcess)
    await userEvent.click(
      await screen.findByRole("button", { name: "Pin Slow Science to the top" }),
    )
    await chooseSectionOption("Liked Songs", "Move down")
    await chooseSectionOption("Artists", "Hide section")
    await userEvent.click(await sectionToggle("Albums"))

    cleanup()
    await renderLibrary(mainProcess)

    expect(await sectionEntryTexts("Pinned")).toEqual(["Slow ScienceShow"])
    expect(sectionNames()).toEqual(["Pinned", "Playlists", "Liked Songs", "Albums", "Shows"])
    expect(await sectionToggle("Albums")).toHaveAttribute("aria-expanded", "false")
  })

  it("says so when every section that has entries is hidden", async () => {
    const mainProcess = fakeMainProcess()
    await mainProcess.invoke(ipcChannels.setSetting, {
      key: "librarySections",
      value: defaultLibrarySections.map((librarySection) => ({ ...librarySection, hidden: true })),
    })
    await renderLibrary(mainProcess)

    expect(
      await screen.findByText("Everything in your library is in a hidden section."),
    ).toBeVisible()
  })

  // Saying nothing matches would be wrong: the entry exists, only its section is hidden.
  it("says the matching entries are in a hidden section when the filters only match those", async () => {
    await renderLibrary()

    await chooseSectionOption("Shows", "Hide section")
    await userEvent.type(screen.getByRole("searchbox", { name: "Filter by name" }), "slow")

    expect(screen.getByRole("status")).toHaveTextContent(
      "Everything that matches these filters is in a hidden section.",
    )
  })

  it("moves focus to the section heading when an entry is unpinned into a collapsed section", async () => {
    await renderLibrary()
    await userEvent.click(await screen.findByRole("button", { name: "Pin Small Hours to the top" }))
    await userEvent.click(await sectionToggle("Albums"))
    const pinnedLink = within(await section("Pinned")).getByRole("link", { name: /^Small Hours/ })
    act(() => pinnedLink.focus())

    await userEvent.keyboard("p")

    expect(await sectionToggle("Albums")).toHaveFocus()
  })

  // Every other control a change could focus may be gone, but the filter never is.
  it("moves focus to the name filter when a shown section has no entries to show", async () => {
    await renderLibrary()
    await chooseSectionOption("Albums", "Hide section")
    await userEvent.type(screen.getByRole("searchbox", { name: "Filter by name" }), "slow")

    await userEvent.click(screen.getByRole("button", { name: "Show Albums" }))

    expect(screen.getByRole("searchbox", { name: "Filter by name" })).toHaveFocus()
  })
})
