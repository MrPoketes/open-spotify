import { fireEvent, screen, waitFor } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { Effect, Option } from "effect"
import { describe, expect, it } from "vitest"
import { NoActiveDevice, type SpotifyApi, SpotifyResponseError } from "../spotify/spotify-api"
import { spotifyApiFakeWith, spotifyApiFakeWithPlayback } from "../spotify/spotify-api-fake"
import { fakeTrack } from "../spotify/spotify-fixtures"
import type { PlaybackState } from "../spotify/spotify-playback-state"
import { renderNowPlayingBarAlone } from "./now-playing-bar-alone"

const control = (name: string) => screen.findByRole("button", { name })

const controlNames = ["Shuffle", "Previous", "Play", "Next", "Repeat"]

describe("NowPlayingBar controls", () => {
  it("pauses playback and resumes it from the keyboard", async () => {
    renderNowPlayingBarAlone()
    // A role query computes styles and accessible names on every retry, and
    // retrying it through the file's first render slowed that render's
    // playback load past the timeout.
    await screen.findByText(fakeTrack(0).name)

    await userEvent.click(await control("Pause"))
    const playButton = await control("Play")
    playButton.focus()
    await userEvent.keyboard("{Enter}")

    expect(await control("Pause")).toBeInTheDocument()
  })

  it("turns shuffle on and moves repeat from off to the context to the track", async () => {
    renderNowPlayingBarAlone()
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
    renderNowPlayingBarAlone()
    await screen.findByText(fakeTrack(0).name)

    await userEvent.click(await control("Next"))
    expect(await screen.findByText(fakeTrack(1).name)).toBeInTheDocument()
    await userEvent.click(await control("Previous"))

    expect(await screen.findByText(fakeTrack(0).name)).toBeInTheDocument()
  })

  it("puts the control back and says so when Spotify rejects the change", async () => {
    renderNowPlayingBarAlone(
      spotifyApiFakeWith(() => ({
        pause: Effect.fail(new SpotifyResponseError({ status: 403, message: "Restricted" })),
      })),
    )
    await screen.findByText(fakeTrack(0).name)

    await userEvent.click(await control("Pause"))

    expect(await screen.findByRole("alert")).toHaveTextContent("Couldn't pause playback.")
    expect(await control("Pause")).toBeInTheDocument()
  })

  it("asks for a device when a command finds that none is active", async () => {
    renderNowPlayingBarAlone(
      spotifyApiFakeWith(() => ({ skipToNext: Effect.fail(new NoActiveDevice()) })),
    )
    await screen.findByText(fakeTrack(0).name)

    await userEvent.click(await control("Next"))

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "No device is playing. Choose a device, then try again.",
    )
  })

  it("disables every control and says why when no device is active", async () => {
    renderNowPlayingBarAlone(spotifyApiFakeWith(() => ({ getPlaybackState: Effect.succeedNone })))
    await screen.findByText("No device is playing")

    for (const name of controlNames) {
      const button = await control(name)
      expect(button).toHaveAttribute("aria-disabled", "true")
      expect(button).toHaveAccessibleDescription("Choose a device to control playback.")
    }
  })

  it("disables every control on a device that other apps cannot control", async () => {
    renderNowPlayingBarAlone(
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
    renderNowPlayingBarAlone(
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
})

// Paused playback keeps the position still, so the times a test reads do not
// move on while it runs.
type PlaybackChange = (playback: PlaybackState) => PlaybackState

const unchanged: PlaybackChange = (playback) => playback

const pausedPlaybackWithSeek = (
  seek: (spotify: SpotifyApi["Service"]) => SpotifyApi["Service"]["seek"],
  change: PlaybackChange = unchanged,
) =>
  spotifyApiFakeWith((spotify) => ({
    getPlaybackState: spotify.getPlaybackState.pipe(
      Effect.map(Option.map((playback) => ({ ...change(playback), isPlaying: false }))),
    ),
    seek: seek(spotify),
  }))

const pausedPlayback = pausedPlaybackWithSeek((spotify) => spotify.seek)

const pausedPlaybackRecordingSeeks = (change: PlaybackChange = unchanged) => {
  const seekPositions: Array<number> = []
  const spotifyApi = pausedPlaybackWithSeek(
    (spotify) => (positionMs) => {
      seekPositions.push(positionMs)
      return spotify.seek(positionMs)
    },
    change,
  )
  return { seekPositions, spotifyApi }
}

// The fake's tracks last 2:30, which a page step divides evenly.
const lastingMs =
  (durationMs: number): PlaybackChange =>
  (playback) =>
    playback.item === null ? playback : { ...playback, item: { ...playback.item, durationMs } }

const seekBar = () => screen.findByRole("slider", { name: "Playback position" })

const showsPosition = (slider: HTMLElement, position: string) =>
  waitFor(() => expect(slider).toHaveAttribute("aria-valuetext", position))

describe("NowPlayingBar seek bar", () => {
  it("steps with the arrow and page keys and jumps to the start and end with Home and End", async () => {
    renderNowPlayingBarAlone(pausedPlayback)
    const slider = await seekBar()
    await showsPosition(slider, "0:42 of 2:30")

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
    renderNowPlayingBarAlone(spotifyApi)
    const slider = await seekBar()
    await showsPosition(slider, "0:42 of 2:30")

    slider.focus()
    await userEvent.keyboard("{ArrowRight>3/}")

    await showsPosition(slider, "0:57 of 2:30")
    expect(seekPositions).toEqual([57_000])
  })

  // A page step is a tenth of the item, and Spotify rejects a position that is
  // not a whole number of milliseconds.
  it("seeks to a whole millisecond when a page step is not one", async () => {
    const { seekPositions, spotifyApi } = pausedPlaybackRecordingSeeks(lastingMs(213_457))
    renderNowPlayingBarAlone(spotifyApi)
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
    renderNowPlayingBarAlone(spotifyApi)
    const slider = await seekBar()
    await showsPosition(slider, "0:42 of 2:30")

    slider.focus()
    await userEvent.keyboard("{Alt>}{ArrowLeft}{/Alt}")
    // jsdom does not step a range input, so this checks that Chromium's own
    // step is held back too.
    const isStepAllowed = fireEvent.keyDown(slider, { key: "ArrowLeft", altKey: true })

    expect(isStepAllowed).toBe(false)
    expect(slider).toHaveAttribute("aria-valuetext", "0:42 of 2:30")
    expect(seekPositions).toEqual([])
  })

  // jsdom cannot drag a range input, so the test sends the events a drag
  // makes: input on every step, then change once the thumb is let go.
  it("seeks once, to where the thumb is let go, when it is dragged", async () => {
    const { seekPositions, spotifyApi } = pausedPlaybackRecordingSeeks()
    renderNowPlayingBarAlone(spotifyApi)
    const slider = await seekBar()
    await showsPosition(slider, "0:42 of 2:30")

    fireEvent.input(slider, { target: { value: "60000" } })
    fireEvent.input(slider, { target: { value: "70000" } })
    expect(seekPositions).toEqual([])
    fireEvent.change(slider, { target: { value: "70000" } })

    await showsPosition(slider, "1:10 of 2:30")
    expect(seekPositions).toEqual([70_000])
  })

  it("puts the position back and says so when Spotify rejects a seek", async () => {
    renderNowPlayingBarAlone(
      pausedPlaybackWithSeek(
        () => () => Effect.fail(new SpotifyResponseError({ status: 403, message: "Restricted" })),
      ),
    )
    const slider = await seekBar()
    await showsPosition(slider, "0:42 of 2:30")

    slider.focus()
    await userEvent.keyboard("{ArrowRight}")

    expect(await screen.findByRole("alert")).toHaveTextContent("Couldn't move to that position.")
    await showsPosition(slider, "0:42 of 2:30")
  })

  it("disables the seek bar and says why when no device is active", async () => {
    renderNowPlayingBarAlone(spotifyApiFakeWith(() => ({ getPlaybackState: Effect.succeedNone })))
    await screen.findByText("No device is playing")

    const slider = await seekBar()
    expect(slider).toHaveAttribute("aria-disabled", "true")
    expect(slider).toHaveAccessibleDescription("Choose a device to control playback.")
  })

  // Spotify reports no item while an ad plays, and there is nothing to seek in.
  it("disables the seek bar while nothing is playing", async () => {
    renderNowPlayingBarAlone(
      spotifyApiFakeWithPlayback((playback) => ({ ...playback, item: null })),
    )
    await screen.findByText("Nothing is playing")

    const slider = await seekBar()
    expect(slider).toHaveAttribute("aria-disabled", "true")
    expect(slider).toHaveAccessibleDescription("Nothing is playing.")
  })
})
