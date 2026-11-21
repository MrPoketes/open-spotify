import { screen, waitFor } from "@testing-library/react"
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
import { lastingMs, pausedPlaybackRecordingSeeks } from "./paused-playback-fake"
import { seekBar, showsPosition } from "./seek-bar-queries"

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
        <input type="radio" aria-label="Dark" defaultChecked />
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

  // Shift+Space scrolls up in a list, so it must not also pause the music.
  it("leaves Shift+Space to the page", async () => {
    await renderNowPlayingBar()

    await userEvent.keyboard("{Shift>} {/Shift}{Control>}l{/Control}")

    expect(await control("Repeat")).toHaveAttribute("aria-pressed", "true")
    expect(await control("Pause")).toBeInTheDocument()
  })

  // A held key repeats, and each repeat would send Spotify another command.
  it("toggles once while Space is held down", async () => {
    await renderNowPlayingBar()

    await userEvent.keyboard("[Space>4/]")

    expect(await control("Play")).toBeInTheDocument()
  })

  // Space does nothing to a link but scroll, and every library entry in the
  // sidebar is one.
  it("pauses with Space while a link has focus", async () => {
    await renderNowPlayingBar()

    screen.getByRole("link", { name: "Late Night Drive" }).focus()
    await userEvent.keyboard(" ")

    expect(await control("Play")).toBeInTheDocument()
  })

  // A focused radio button is always the checked one, so Space has nothing
  // to press. The theme editor's color scheme is one.
  it("pauses with Space while a radio button has focus", async () => {
    await renderNowPlayingBar()

    screen.getByRole("radio", { name: "Dark" }).focus()
    await userEvent.keyboard(" ")

    expect(await control("Play")).toBeInTheDocument()
  })

  // The seek bar is an input, but it takes only unmodified arrow, page, Home
  // and End keys. Space and Ctrl+arrow do nothing to it.
  it("pauses with Space and skips with Ctrl+→ while the seek bar has focus", async () => {
    await renderNowPlayingBar()

    screen.getByRole("slider", { name: "Playback position" }).focus()
    await userEvent.keyboard("{Control>}{ArrowRight}{/Control}")
    expect(await screen.findByText(fakeTrack(1).name)).toBeInTheDocument()
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

  it("seeks forward 5 seconds with Ctrl+Shift+→ and back with Ctrl+Shift+←", async () => {
    const { seekPositions, spotifyApi } = pausedPlaybackRecordingSeeks()
    await renderNowPlayingBar({ spotifyApi })
    await showsPosition(await seekBar(), "0:42 of 2:30")

    await userEvent.keyboard("{Control>}{Shift>}{ArrowRight}{/Shift}{/Control}")
    await waitFor(() => expect(seekPositions).toEqual([47_000]))
    await userEvent.keyboard("{Control>}{Shift>}{ArrowLeft}{/Shift}{/Control}")

    await waitFor(() => expect(seekPositions).toEqual([47_000, 42_000]))
  })

  // Spotify reports the new position only on the next poll, two seconds
  // later, and each press must start from where the last one went.
  it("adds up quick seek presses before Spotify reports the new position", async () => {
    const { seekPositions, spotifyApi } = pausedPlaybackRecordingSeeks()
    await renderNowPlayingBar({ spotifyApi })
    await showsPosition(await seekBar(), "0:42 of 2:30")

    await userEvent.keyboard(
      "{Control>}{Shift>}{ArrowRight}{ArrowRight}{ArrowRight}{/Shift}{/Control}",
    )

    await waitFor(() => expect(seekPositions).toEqual([47_000, 52_000, 57_000]))
  })

  it("seeks no further back than the start or forward than the end, and not again there", async () => {
    const { seekPositions, spotifyApi } = pausedPlaybackRecordingSeeks((playback) => ({
      ...lastingMs(7_000)(playback),
      progressMs: 3_000,
    }))
    await renderNowPlayingBar({ spotifyApi })
    await showsPosition(await seekBar(), "0:03 of 0:07")

    await userEvent.keyboard(
      "{Control>}{Shift>}{ArrowLeft}{ArrowLeft}{ArrowRight}{ArrowRight}{ArrowRight}{/Shift}{/Control}",
    )

    await waitFor(() => expect(seekPositions).toEqual([0, 5_000, 7_000]))
  })

  it("says why and sends nothing when Spotify does not allow seeking", async () => {
    const { seekPositions, spotifyApi } = pausedPlaybackRecordingSeeks((playback) => ({
      ...playback,
      actions: { disallows: { seeking: true } },
    }))
    await renderNowPlayingBar({ spotifyApi })
    await showsPosition(await seekBar(), "0:42 of 2:30")

    await userEvent.keyboard("{Control>}{Shift>}{ArrowRight}{/Shift}{/Control}")

    expect(await screen.findByRole("status")).toHaveTextContent(
      "Spotify doesn't allow this right now.",
    )
    expect(seekPositions).toEqual([])
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
