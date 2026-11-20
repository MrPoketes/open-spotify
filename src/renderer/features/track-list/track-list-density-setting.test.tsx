import { cleanup, screen, waitFor } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { describe, expect, it } from "vitest"
import type { DesktopApi } from "../../../preload/desktop-api"
import { defaultTrackListDensity } from "../../../shared/track-list-density"
import { fakeMainProcess } from "../../lib/fake-main-process"
import { fakeRendererRuntime } from "../../lib/fake-renderer-runtime"
import { renderScreen } from "../../lib/render-screen"
import { loadSavedSetting } from "../../lib/saved-setting"
import { FakeMainView } from "./fake-main-view"
import { TrackList } from "./track-list"
import { TrackListDensityProvider } from "./track-list-density-provider"
import { TrackListDensitySetting } from "./track-list-density-setting"

const loadSavedDensity = (mainProcess: DesktopApi) =>
  fakeRendererRuntime({ mainProcess }).runPromise(
    loadSavedSetting("trackListDensity", defaultTrackListDensity),
  )

// The app loads the saved density at launch and hands it to the provider.
const launchApp = async (mainProcess: DesktopApi) => {
  renderScreen(
    <TrackListDensityProvider savedDensity={await loadSavedDensity(mainProcess)}>
      <TrackListDensitySetting />
      <FakeMainView>
        <TrackList
          label="Tracks"
          layout="playlist"
          trackCount={20}
          trackAt={(index) => ({
            trackId: null,
            title: `Track ${index + 1}`,
            artists: [],
            album: null,
            artwork: [],
            addedAt: null,
            durationMs: null,
          })}
        />
      </FakeMainView>
    </TrackListDensityProvider>,
    mainProcess,
  )
  return screen.findByRole("row", { name: "Track 1" })
}

describe("TrackListDensitySetting", () => {
  // Whatever changes the density, a list already on screen must place its rows
  // by the new height too, or they would overlap.
  it("makes track rows dense when Dense is chosen with the keyboard", async () => {
    await launchApp(fakeMainProcess())
    const user = userEvent.setup()

    await user.tab()
    await user.tab()
    expect(screen.getByRole("button", { name: "Dense" })).toHaveFocus()
    await user.keyboard("{Enter}")

    expect(screen.getByRole("button", { name: "Dense" })).toHaveAttribute("aria-pressed", "true")
    expect(screen.getByRole("row", { name: "Track 2" })).toHaveStyle({
      height: "32px",
      transform: "translateY(32px)",
    })
  })

  it("keeps the chosen density after a restart", async () => {
    const mainProcess = fakeMainProcess()
    await launchApp(mainProcess)
    await userEvent.click(screen.getByRole("button", { name: "Dense" }))
    await waitFor(async () => expect(await loadSavedDensity(mainProcess)).toBe("dense"))
    cleanup()

    const firstRow = await launchApp(mainProcess)

    expect(screen.getByRole("button", { name: "Dense" })).toHaveAttribute("aria-pressed", "true")
    expect(firstRow).toHaveStyle({ height: "32px" })
  })
})
