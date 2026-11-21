import { screen } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { Effect, type Layer } from "effect"
import { describe, expect, it } from "vitest"
import { fakeMainProcess } from "../../lib/fake-main-process"
import { renderScreen } from "../../lib/render-screen"
import { StatusMessageProvider } from "../../ui/status-message-provider"
import { IsMacContext } from "../shortcuts/is-mac-context"
import type { SpotifyApi } from "../spotify/spotify-api"
import { spotifyApiFakeWith } from "../spotify/spotify-api-fake"
import { fakeTrack } from "../spotify/spotify-fixtures"
import { nowPlayingBarAlone } from "./now-playing-bar-alone"

interface RenderOptions {
  readonly isMac?: boolean
  readonly spotifyApi?: Layer.Layer<SpotifyApi>
}

// With a text field beside the bar, and the status message the app shell
// shows above it.
const renderNowPlayingBar = async ({ isMac = false, spotifyApi }: RenderOptions = {}) => {
  renderScreen(
    <IsMacContext value={isMac}>
      <StatusMessageProvider>
        <input aria-label="Notes" />
        <a href="#playlist">Late Night Drive</a>
        {nowPlayingBarAlone}
      </StatusMessageProvider>
    </IsMacContext>,
    fakeMainProcess(),
    spotifyApi,
  )
  await screen.findByText(fakeTrack(0).name)
}

const control = (name: string) => screen.findByRole("button", { name })

describe("playback shortcuts", () => {
  it("pauses with Space and plays again", async () => {
    await renderNowPlayingBar()

    await userEvent.keyboard(" ")
    expect(await control("Play")).toBeInTheDocument()
    await userEvent.keyboard(" ")

    expect(await control("Pause")).toBeInTheDocument()
  })

  it("skips to the next track with Ctrl+→ and back with Ctrl+←", async () => {
    await renderNowPlayingBar()

    await userEvent.keyboard("{Control>}{ArrowRight}{/Control}")
    expect(await screen.findByText(fakeTrack(1).name)).toBeInTheDocument()
    await userEvent.keyboard("{Control>}{ArrowLeft}{/Control}")

    expect(await screen.findByText(fakeTrack(0).name)).toBeInTheDocument()
  })

  it("turns shuffle on with Ctrl+S and repeat on with Ctrl+L", async () => {
    await renderNowPlayingBar()

    await userEvent.keyboard("{Control>}s{/Control}")
    await userEvent.keyboard("{Control>}l{/Control}")

    expect(await control("Shuffle")).toHaveAttribute("aria-pressed", "true")
    expect(await control("Repeat")).toHaveAttribute("aria-pressed", "true")
  })

  it("takes Cmd instead of Ctrl on macOS", async () => {
    await renderNowPlayingBar({ isMac: true })

    await userEvent.keyboard("{Meta>}{ArrowRight}{/Meta}")
    expect(await screen.findByText(fakeTrack(1).name)).toBeInTheDocument()
    await userEvent.keyboard("{Control>}s{/Control}")
    await userEvent.keyboard("{Meta>}l{/Meta}")

    expect(await control("Repeat")).toHaveAttribute("aria-pressed", "true")
    expect(await control("Shuffle")).toHaveAttribute("aria-pressed", "false")
  })

  it("leaves the keys to a text field the user types in", async () => {
    await renderNowPlayingBar()

    await userEvent.click(screen.getByRole("textbox", { name: "Notes" }))
    await userEvent.keyboard(" {Control>}s{/Control}")
    await userEvent.click(document.body)
    await userEvent.keyboard("{Control>}l{/Control}")

    expect(await control("Repeat")).toHaveAttribute("aria-pressed", "true")
    expect(await control("Shuffle")).toHaveAttribute("aria-pressed", "false")
    expect(await control("Pause")).toBeInTheDocument()
    expect(screen.getByRole("textbox", { name: "Notes" })).toHaveValue(" ")
  })

  // Space does nothing to a link but scroll, and every library entry in the
  // sidebar is one.
  it("pauses with Space while a link has focus", async () => {
    await renderNowPlayingBar()

    screen.getByRole("link", { name: "Late Night Drive" }).focus()
    await userEvent.keyboard(" ")

    expect(await control("Play")).toBeInTheDocument()
  })

  it("presses the focused button with Space instead of pausing", async () => {
    await renderNowPlayingBar()

    const shuffle = await control("Shuffle")
    shuffle.focus()
    await userEvent.keyboard(" ")

    expect(shuffle).toHaveAttribute("aria-pressed", "true")
    expect(await control("Pause")).toBeInTheDocument()
  })

  // The reason is in the control's tooltip, which a keyboard user may never
  // have seen.
  it("says why a shortcut does nothing when no device is active", async () => {
    renderScreen(
      <StatusMessageProvider>{nowPlayingBarAlone}</StatusMessageProvider>,
      fakeMainProcess(),
      spotifyApiFakeWith(() => ({ getPlaybackState: Effect.succeedNone })),
    )
    await screen.findByText("No device is playing")

    await userEvent.keyboard(" ")

    expect(await screen.findByRole("status")).toHaveTextContent(
      "Choose a device to control playback.",
    )
  })
})
