// oxlint-disable-next-line no-restricted-imports -- user-event cannot drag a slider in jsdom, which has no layout, and flushes React between key presses
import { act, fireEvent, screen, waitFor } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { Effect } from "effect"
import { describe, expect, it, vi } from "vitest"
import { NoActiveDevice } from "../spotify/spotify-api"
import { spotifyApiFakeWith, spotifyApiFakeWithPlayback } from "../spotify/spotify-api-fake"
import { rejectedCommand } from "../spotify/spotify-fake-rejected-command"
import { fakeTrack } from "../spotify/spotify-fixtures"
import { renderNowPlayingBarAlone } from "./now-playing-bar-alone"
import {
  lastingMs,
  pausedPlayback,
  pausedPlaybackRecordingSeeks,
  pausedPlaybackWithSeek,
} from "./paused-playback-fake"
import { recordDocumentKeyDowns } from "./record-document-key-downs"
import { seekBar, showsPosition } from "./seek-bar-queries"

const control = (name: string) => screen.findByRole("button", { name })

const controlNames = ["Shuffle", "Previous", "Play", "Next", "Repeat"]

describe("NowPlayingBar controls", () => {
  it("pauses playback and resumes it from the keyboard", async () => {
    await renderNowPlayingBarAlone()
    // A role query computes styles and accessible names on every retry, and
    // retrying it through the file's first playback load slowed that load past
    // the timeout.
    await screen.findByText(fakeTrack(0).name)

    await userEvent.click(await control("Pause"))
    const playButton = await control("Play")
    playButton.focus()
    await userEvent.keyboard("{Enter}")

    expect(await control("Pause")).toBeInTheDocument()
  })

  it("turns shuffle on and moves repeat from off to the context to the track", async () => {
    await renderNowPlayingBarAlone()
    await screen.findByText(fakeTrack(0).name)
    const shuffle = await control("Shuffle")
    expect(shuffle).toHaveAttribute("aria-pressed", "false")
    expect(await control("Repeat")).toHaveAttribute("aria-pressed", "false")

    await userEvent.click(shuffle)
    await userEvent.click(await control("Repeat"))
    expect(await control("Repeat")).toHaveAttribute("aria-pressed", "true")
    await userEvent.click(await control("Repeat"))

    expect(shuffle).toHaveAttribute("aria-pressed", "true")
    expect(await control("Repeat one track")).toHaveAttribute("aria-pressed", "true")
  })

  it("shows the next track and the previous one after skipping", async () => {
    await renderNowPlayingBarAlone()
    await screen.findByText(fakeTrack(0).name)

    await userEvent.click(await control("Next"))
    expect(await screen.findByText(fakeTrack(1).name)).toBeInTheDocument()
    await userEvent.click(await control("Previous"))

    expect(await screen.findByText(fakeTrack(0).name)).toBeInTheDocument()
  })

  it("puts the control back and says so when Spotify rejects the change", async () => {
    await renderNowPlayingBarAlone(
      spotifyApiFakeWith(() => ({
        pause: rejectedCommand,
      })),
    )
    await screen.findByText(fakeTrack(0).name)

    await userEvent.click(await control("Pause"))

    expect(await screen.findByRole("alert")).toHaveTextContent("Couldn't pause playback.")
    expect(await control("Pause")).toBeInTheDocument()
  })

  it("asks for a device when a command finds that none is active", async () => {
    await renderNowPlayingBarAlone(
      spotifyApiFakeWith(() => ({ skipToNext: Effect.fail(new NoActiveDevice()) })),
    )
    await screen.findByText(fakeTrack(0).name)

    await userEvent.click(await control("Next"))

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "No device is playing. Choose a device, then try again.",
    )
  })

  it("disables every control and says why when no device is active", async () => {
    await renderNowPlayingBarAlone(
      spotifyApiFakeWith(() => ({ getPlaybackState: Effect.succeedNone })),
    )
    await screen.findByText("No device is playing")

    for (const name of controlNames) {
      const button = await control(name)
      expect(button).toHaveAttribute("aria-disabled", "true")
      expect(button).toHaveAccessibleDescription("Choose a device to control playback.")
    }
  })

  it("disables every control on a device that other apps cannot control", async () => {
    await renderNowPlayingBarAlone(
      spotifyApiFakeWithPlayback((playback) => ({
        ...playback,
        device: { ...playback.device, isRestricted: true },
      })),
    )
    await screen.findByText(fakeTrack(0).name)

    for (const name of ["Shuffle", "Previous", "Pause", "Next", "Repeat"]) {
      expect(await control(name)).toHaveAccessibleDescription(
        "Spotify doesn't allow controlling this device from other apps.",
      )
    }
  })

  // Spotify disallows some actions in some contexts, such as skipping back
  // at the start of a playlist, and the command would only fail.
  it("disables only the controls Spotify disallows right now", async () => {
    await renderNowPlayingBarAlone(
      spotifyApiFakeWithPlayback((playback) => ({
        ...playback,
        actions: { disallows: { skippingPrev: true, seeking: true } },
      })),
    )
    await screen.findByText(fakeTrack(0).name)

    const previous = await control("Previous")
    expect(previous).toHaveAttribute("aria-disabled", "true")
    expect(previous).toHaveAccessibleDescription("Spotify doesn't allow this right now.")
    expect(await control("Next")).toHaveAttribute("aria-disabled", "false")
    expect(await seekBar()).toHaveAttribute("aria-disabled", "true")
  })

  // A pointer user has no screen reader to read the description, so the
  // tooltip is where they learn why the control does nothing.
  it("shows why a control is off in its tooltip on hover", async () => {
    await renderNowPlayingBarAlone(
      spotifyApiFakeWithPlayback((playback) => ({
        ...playback,
        actions: { disallows: { skippingPrev: true } },
      })),
    )
    await screen.findByText(fakeTrack(0).name)

    await userEvent.hover(await control("Previous"))

    expect(await screen.findByRole("tooltip")).toHaveTextContent(
      "PreviousSpotify doesn't allow this right now.",
    )
  })
})

describe("NowPlayingBar seek bar", () => {
  it("steps with the arrow and page keys and jumps to the start and end with Home and End", async () => {
    await renderNowPlayingBarAlone(pausedPlayback)
    const slider = await seekBar()
    await showsPosition(slider, "0:42 of 2:30")
    // The slider starts unavailable while playback loads, and must say it is
    // available once it has loaded.
    expect(slider).toHaveAttribute("aria-disabled", "false")
    expect(slider).not.toHaveAccessibleDescription()

    slider.focus()
    await userEvent.keyboard("{ArrowRight}")
    await showsPosition(slider, "0:47 of 2:30")
    await userEvent.keyboard("{ArrowDown}")
    await showsPosition(slider, "0:42 of 2:30")
    await userEvent.keyboard("{PageUp}")
    await showsPosition(slider, "0:57 of 2:30")
    await userEvent.keyboard("{End}")
    await showsPosition(slider, "2:30 of 2:30")
    await userEvent.keyboard("{Home}{ArrowLeft}")

    await showsPosition(slider, "0:00 of 2:30")
    expect(screen.getByText("0:00")).toBeInTheDocument()
    expect(screen.getByText("2:30")).toBeInTheDocument()
  })

  // Spotify rate-limits each Client ID, and a held key repeats about 30 times
  // a second.
  it("seeks once when an arrow key is held down", async () => {
    const { seekPositions, spotifyApi } = pausedPlaybackRecordingSeeks()
    await renderNowPlayingBarAlone(spotifyApi)
    const slider = await seekBar()
    await showsPosition(slider, "0:42 of 2:30")

    slider.focus()
    await userEvent.keyboard("{ArrowRight>3/}")

    await showsPosition(slider, "0:57 of 2:30")
    expect(seekPositions).toEqual([57_000])
  })

  // A position worked out before a seek can reach the bar after it, so the
  // bar can lag behind the seek for a moment. Here the arrow press comes
  // before the bar renders the shortcut's seek.
  it("steps from where the last seek went before the bar shows it", async () => {
    const { seekPositions, spotifyApi } = pausedPlaybackRecordingSeeks()
    await renderNowPlayingBarAlone(spotifyApi)
    const slider = await seekBar()
    await showsPosition(slider, "0:42 of 2:30")

    act(() => {
      fireEvent.keyDown(document.body, { key: "ArrowRight", ctrlKey: true, shiftKey: true })
      fireEvent.keyDown(slider, { key: "ArrowRight" })
    })
    fireEvent.keyUp(slider, { key: "ArrowRight" })

    await waitFor(() => expect(seekPositions).toEqual([47_000, 52_000]))
  })

  // A page step is a tenth of the item, and Spotify rejects a position that is
  // not a whole number of milliseconds.
  it("seeks to a whole millisecond when a page step is not one", async () => {
    const { seekPositions, spotifyApi } = pausedPlaybackRecordingSeeks(lastingMs(213_457))
    await renderNowPlayingBarAlone(spotifyApi)
    const slider = await seekBar()
    await showsPosition(slider, "0:42 of 3:33")

    slider.focus()
    await userEvent.keyboard("{PageUp}")

    await waitFor(() => expect(seekPositions).toEqual([63_346]))
    expect(screen.queryByRole("alert")).not.toBeInTheDocument()
  })

  // Alt+Left goes back in history, and the seek bar must not take it.
  it("leaves the position alone when a shortcut modifier is held", async () => {
    const { seekPositions, spotifyApi } = pausedPlaybackRecordingSeeks()
    await renderNowPlayingBarAlone(spotifyApi)
    const slider = await seekBar()
    await showsPosition(slider, "0:42 of 2:30")

    slider.focus()
    const keyDowns = recordDocumentKeyDowns()
    // jsdom does not step a range input, so this checks that Chromium's own
    // step is held back too.
    await userEvent.keyboard("{Alt>}{ArrowLeft}{/Alt}")

    expect(keyDowns).toEqual([
      ["Alt", false],
      ["ArrowLeft", true],
    ])
    expect(slider).toHaveAttribute("aria-valuetext", "0:42 of 2:30")
    expect(seekPositions).toEqual([])
  })

  // jsdom has no layout, so every element is given a 150 px box: one pixel
  // is one second of the 2:30 track. The test sends the pointer events a drag
  // makes: down on the thumb's center, a move for each step, then up.
  it("seeks once, to where the thumb is let go, when it is dragged", async () => {
    vi.spyOn(Element.prototype, "getBoundingClientRect").mockReturnValue(
      DOMRect.fromRect({ x: 0, y: 0, width: 150, height: 16 }),
    )
    const { seekPositions, spotifyApi } = pausedPlaybackRecordingSeeks()
    await renderNowPlayingBarAlone(spotifyApi)
    const slider = await seekBar()
    await showsPosition(slider, "0:42 of 2:30")

    fireEvent.pointerDown(slider, { clientX: 75 })
    fireEvent.pointerMove(document, { clientX: 60, buttons: 1 })
    fireEvent.pointerMove(document, { clientX: 70, buttons: 1 })
    await showsPosition(slider, "1:10 of 2:30")
    expect(seekPositions).toEqual([])
    fireEvent.pointerUp(document, { clientX: 70 })

    await showsPosition(slider, "1:10 of 2:30")
    expect(seekPositions).toEqual([70_000])
  })

  it("puts the position back and says so when Spotify rejects a seek", async () => {
    await renderNowPlayingBarAlone(pausedPlaybackWithSeek(() => () => rejectedCommand))
    const slider = await seekBar()
    await showsPosition(slider, "0:42 of 2:30")

    slider.focus()
    await userEvent.keyboard("{ArrowRight}")

    expect(await screen.findByRole("alert")).toHaveTextContent("Couldn't move to that position.")
    await showsPosition(slider, "0:42 of 2:30")
  })

  it("disables the seek bar and says why when no device is active", async () => {
    await renderNowPlayingBarAlone(
      spotifyApiFakeWith(() => ({ getPlaybackState: Effect.succeedNone })),
    )
    await screen.findByText("No device is playing")

    const slider = await seekBar()
    expect(slider).toHaveAttribute("aria-disabled", "true")
    expect(slider).toHaveAccessibleDescription("Choose a device to control playback.")
  })

  // Focus lands on the range input inside the slider, not on the element the
  // tooltip opens from.
  it("shows why the seek bar is off in a tooltip when it has focus", async () => {
    await renderNowPlayingBarAlone(
      spotifyApiFakeWith(() => ({ getPlaybackState: Effect.succeedNone })),
    )
    await screen.findByText("No device is playing")
    const slider = await seekBar()

    slider.focus()

    expect(await screen.findByRole("tooltip")).toHaveTextContent(
      "Playback positionChoose a device to control playback.",
    )
  })

  // The seek bar sits just under the playback buttons, which a tooltip above
  // it would cover.
  it("shows no tooltip while the seek bar can be used", async () => {
    await renderNowPlayingBarAlone(pausedPlayback)
    const slider = await seekBar()
    await showsPosition(slider, "0:42 of 2:30")

    slider.focus()
    await userEvent.keyboard("{ArrowRight}")
    await showsPosition(slider, "0:47 of 2:30")

    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument()
  })

  // Spotify reports no item while an ad plays, and there is nothing to seek in.
  it("disables the seek bar while nothing is playing", async () => {
    await renderNowPlayingBarAlone(
      spotifyApiFakeWithPlayback((playback) => ({ ...playback, item: null })),
    )
    await screen.findByText("Nothing is playing")

    const slider = await seekBar()
    expect(slider).toHaveAttribute("aria-disabled", "true")
    expect(slider).toHaveAccessibleDescription("Nothing is playing.")
  })
})
