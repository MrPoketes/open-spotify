import { screen, within } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { Effect, type Layer, Option, Schema } from "effect"
import { useState } from "react"
import { describe, expect, it } from "vitest"
import { fakeMainProcess } from "../../lib/fake-main-process"
import { renderScreen } from "../../lib/render-screen"
import { failingFirstTime } from "../spotify/failing-first-time"
import { type SpotifyApi, SpotifyResponseError } from "../spotify/spotify-api"
import { spotifyApiFakeWith } from "../spotify/spotify-api-fake"
import { fakeTracks } from "../spotify/spotify-fake-tracks"
import { fakeEpisode, fakeLocalTrack, fakePlayingTrack } from "../spotify/spotify-fixtures"
import { PlayableItem } from "../spotify/spotify-playable-item"
import { NowPlayingBar } from "./now-playing-bar"

const noActiveDevice = { getPlaybackState: Effect.succeedNone }

// The app shell holds whether the device picker is open.
function NowPlayingBarWithPicker() {
  const [isDevicePickerOpen, setDevicePickerOpen] = useState(false)
  return (
    <NowPlayingBar
      isQueueOpen={false}
      onQueueToggle={() => undefined}
      queueButtonRef={{ current: null }}
      isDevicePickerOpen={isDevicePickerOpen}
      onDevicePickerOpenChange={setDevicePickerOpen}
    />
  )
}

const renderNowPlayingBar = (spotifyApi?: Layer.Layer<SpotifyApi>) =>
  renderScreen(<NowPlayingBarWithPicker />, fakeMainProcess(), spotifyApi)

// The fake's playback with the given fixture playing in place of its own
// first track.
const playing = (fixture: unknown) =>
  spotifyApiFakeWith((spotify) => ({
    getPlaybackState: spotify.getPlaybackState.pipe(
      Effect.map(
        Option.map((playback) => ({
          ...playback,
          item: Schema.decodeUnknownSync(PlayableItem)(fixture),
        })),
      ),
    ),
  }))

const nowPlaying = () => screen.findByRole("region", { name: "Now playing" })

const pickerButton = (deviceLabel: string) =>
  screen.findByRole("button", { name: `Choose a device. ${deviceLabel}` })

const openPicker = async (deviceLabel = "Playing on Mira's Laptop") => {
  await userEvent.click(await pickerButton(deviceLabel))
  return screen.getByRole("dialog", { name: "Connect to a device" })
}

const deviceButton = async (picker: HTMLElement, name: RegExp) =>
  within(picker).findByRole("button", { name })

describe("NowPlayingBar", () => {
  it("shows what is playing and on which device", async () => {
    renderNowPlayingBar()

    expect(await screen.findByText(fakePlayingTrack.name)).toBeInTheDocument()
    expect(screen.getByText("Northbound Static")).toBeInTheDocument()
    expect(await pickerButton("Playing on Mira's Laptop")).toBeInTheDocument()
  })

  it("links the track title to its album and each artist to their page", async () => {
    const trackWithTwoArtists = fakeTracks.find(({ artists }) => artists.length > 1)
    renderNowPlayingBar(playing(trackWithTwoArtists))
    const bar = await nowPlaying()

    const title = await within(bar).findByRole("link", { name: "Glass Harbour, part 1.3" })
    expect(title).toHaveAttribute("href", "/album/fake-album-0")
    expect(within(bar).getByRole("link", { name: "Northbound Static" })).toHaveAttribute(
      "href",
      "/artist/fake-artist-0",
    )
    expect(within(bar).getByRole("link", { name: "Lena Varga" })).toHaveAttribute(
      "href",
      "/artist/fake-artist-1",
    )
  })

  it("links a playing episode's title to its show", async () => {
    renderNowPlayingBar(playing(fakeEpisode))
    const bar = await nowPlaying()

    expect(await within(bar).findByRole("link", { name: fakeEpisode.name })).toHaveAttribute(
      "href",
      "/show/fake-show-slow-science",
    )
  })

  // A local file has no Spotify id, so there is no album or artist page to
  // open.
  it("shows a local file's title and artists as plain text", async () => {
    renderNowPlayingBar(playing(fakeLocalTrack))
    const bar = await nowPlaying()

    expect(await within(bar).findByText(fakeLocalTrack.name)).toBeInTheDocument()
    expect(within(bar).getByText("Mira Kaelin")).toBeInTheDocument()
    expect(within(bar).queryByRole("link")).not.toBeInTheDocument()
  })

  // Playback is remote control, so without an active device pressing play
  // would do nothing. The bar has to say why and offer the fix.
  it("explains where audio plays when no device is active and opens the picker", async () => {
    renderNowPlayingBar(spotifyApiFakeWith(() => noActiveDevice))

    expect(
      await screen.findByText("Audio plays in the Spotify app or on another device."),
    ).toBeInTheDocument()
    expect(await pickerButton("No active device")).toBeInTheDocument()
    await userEvent.click(screen.getByRole("button", { name: "Choose a device" }))

    const picker = screen.getByRole("dialog", { name: "Connect to a device" })
    expect(await deviceButton(picker, /Kitchen Speaker/)).toBeInTheDocument()
  })

  it("says Spotify cannot be reached when the playback state fails to load", async () => {
    renderNowPlayingBar(
      spotifyApiFakeWith(() => ({
        getPlaybackState: Effect.fail(
          new SpotifyResponseError({ status: 503, message: "Service unavailable" }),
        ),
      })),
    )

    expect(await screen.findByText("Can't reach Spotify right now.")).toBeInTheDocument()
    expect(await pickerButton("Devices")).toBeInTheDocument()
  })

  it("lists the available devices with their type and marks the active one", async () => {
    renderNowPlayingBar()

    const picker = await openPicker()

    const laptop = await deviceButton(picker, /Mira's Laptop/)
    expect(laptop).toHaveAttribute("aria-current", "true")
    expect(laptop).toHaveTextContent("Computer · Playing here")
    const phone = await deviceButton(picker, /Mira's Phone/)
    expect(phone).toHaveAttribute("aria-current", "false")
    expect(phone).toHaveTextContent("Phone")
    expect(await deviceButton(picker, /Kitchen Speaker/)).toHaveTextContent("Speaker")
  })

  it("transfers playback to the chosen device", async () => {
    renderNowPlayingBar()
    const picker = await openPicker()

    await userEvent.click(await deviceButton(picker, /Kitchen Speaker/))

    expect(await pickerButton("Playing on Kitchen Speaker")).toBeInTheDocument()
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
  })

  it("says so and stays open when playback could not be transferred", async () => {
    renderNowPlayingBar(
      spotifyApiFakeWith(() => ({
        transferPlayback: () =>
          Effect.fail(new SpotifyResponseError({ status: 404, message: "Device not found" })),
      })),
    )
    const picker = await openPicker()

    await userEvent.click(await deviceButton(picker, /Kitchen Speaker/))

    expect(await within(picker).findByRole("alert")).toHaveTextContent(
      "Couldn't switch to Kitchen Speaker.",
    )
    expect(screen.getByRole("dialog")).toBeInTheDocument()
  })

  it("lists the devices again when Retry is pressed after they failed to load", async () => {
    renderNowPlayingBar(
      spotifyApiFakeWith(() => ({ getAvailableDevices: failingFirstTime()(Effect.succeed([])) })),
    )
    const picker = await openPicker()

    const failure = await within(picker).findByRole("alert")
    expect(failure).toHaveTextContent("Your devices didn't load.")
    await userEvent.click(within(failure).getByRole("button", { name: "Retry" }))

    expect(await within(picker).findByText("No devices found.")).toBeInTheDocument()
  })

  it("explains how to start the Spotify app when there are no devices", async () => {
    renderNowPlayingBar(
      spotifyApiFakeWith(() => ({
        ...noActiveDevice,
        getAvailableDevices: Effect.succeed([]),
      })),
    )

    const picker = await openPicker("No active device")

    expect(await within(picker).findByText("No devices found.")).toBeInTheDocument()
    expect(
      within(picker).getByText(
        "Open the Spotify app on this computer, your phone, or a speaker, then look again.",
      ),
    ).toBeInTheDocument()
  })

  it("chooses a device with the keyboard and returns focus to the picker button", async () => {
    renderNowPlayingBar()
    const button = await pickerButton("Playing on Mira's Laptop")
    button.focus()

    await userEvent.keyboard("{Enter}")
    const picker = screen.getByRole("dialog", { name: "Connect to a device" })
    await deviceButton(picker, /Mira's Laptop/)
    await userEvent.tab()
    expect(await deviceButton(picker, /Mira's Laptop/)).toHaveFocus()
    await userEvent.keyboard("{ArrowDown}{ArrowDown}")
    expect(await deviceButton(picker, /Kitchen Speaker/)).toHaveFocus()
    await userEvent.keyboard("{Enter}")

    expect(await pickerButton("Playing on Kitchen Speaker")).toHaveFocus()
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
  })

  // Spotify does not guarantee a device id, and playback cannot be moved to a
  // device without one. It must not take the keyboard's way through the list.
  it("lists a device without an id as unavailable and moves past it with the keyboard", async () => {
    const noIdDevice = {
      id: null,
      name: "Old Receiver",
      type: "AVR",
      isActive: false,
      isRestricted: false,
    }
    renderNowPlayingBar(
      spotifyApiFakeWith((spotify) => ({
        getPlaybackState: Effect.succeedNone,
        getAvailableDevices: spotify.getAvailableDevices.pipe(
          Effect.map((devices) => [
            noIdDevice,
            ...devices.map((device) => ({ ...device, isActive: false })),
          ]),
        ),
      })),
    )
    const picker = await openPicker("No active device")

    const receiver = await deviceButton(picker, /Old Receiver/)
    expect(receiver).toHaveAttribute("aria-disabled", "true")
    await userEvent.tab()
    expect(receiver).toHaveFocus()
    await userEvent.keyboard("{Enter}")
    expect(screen.getByRole("dialog")).toBeInTheDocument()
    await userEvent.keyboard("{ArrowDown}")

    expect(await deviceButton(picker, /Mira's Laptop/)).toHaveFocus()
  })

  it("closes on Escape and returns focus to the picker button", async () => {
    renderNowPlayingBar()
    await openPicker()

    await userEvent.keyboard("{Escape}")

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    expect(await pickerButton("Playing on Mira's Laptop")).toHaveFocus()
  })
})
