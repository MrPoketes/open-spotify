import { render, screen, within } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { Effect, type Layer } from "effect"
import { describe, expect, it } from "vitest"
import { fakeRendererRuntime } from "../../lib/fake-renderer-runtime"
import { RendererRuntimeContext } from "../../lib/renderer-runtime"
import { Player } from "../playback/player"
import { failingFirstTime } from "../spotify/failing-first-time"
import { SpotifyApi, SpotifyResponseError } from "../spotify/spotify-api"
import { fakeEpisode, fakePlayOrder, fakeTrack } from "../spotify/spotify-fixtures"
import { QueuePane } from "./queue-pane"

const renderQueuePane = (spotifyApi: Layer.Layer<SpotifyApi> = SpotifyApi.layerFake) => {
  const runtime = fakeRendererRuntime({ spotifyApi })
  render(
    <RendererRuntimeContext value={runtime}>
      <QueuePane ref={{ current: null }} onClose={() => undefined} />
    </RendererRuntimeContext>,
  )
  return runtime
}

const section = (name: string) => screen.findByRole("region", { name })

const upNextRows = async () => within(await section("Next up")).getAllByRole("button")

const upNextRow = async (itemName: string) =>
  within(await section("Next up")).getByRole("button", { name: new RegExp(itemName) })

describe("QueuePane", () => {
  it("shows the playing item and the upcoming tracks and episodes with their artists", async () => {
    renderQueuePane()

    expect(await section("Now playing")).toHaveTextContent(`${fakeTrack(0).name}Northbound Static`)
    const [firstRow, episodeRow, thirdRow] = await upNextRows()
    expect(firstRow).toHaveTextContent(`${fakeTrack(1).name}Lena Varga`)
    expect(episodeRow).toHaveTextContent(`${fakeEpisode.name}Podcast episode`)
    expect(thirdRow).toHaveTextContent(`${fakeTrack(2).name}The Paper Moons`)
  })

  it("plays an upcoming item by skipping ahead to it", async () => {
    renderQueuePane()

    await userEvent.click(await upNextRow(fakePlayOrder(3).name))

    expect(
      await within(await section("Now playing")).findByText(fakePlayOrder(3).name),
    ).toBeInTheDocument()
    const [nextRow] = await upNextRows()
    expect(nextRow).toHaveTextContent(fakePlayOrder(4).name)
  })

  it("shows what plays next again when the playing track changes", async () => {
    const runtime = renderQueuePane()
    await section("Now playing")

    await runtime.runPromise(
      Effect.gen(function* () {
        const player = yield* Player
        yield* player.skipToNext
      }),
    )

    expect(
      await within(await section("Now playing")).findByText(fakeTrack(1).name),
    ).toBeInTheDocument()
  })

  it("says so when an item could not be played", async () => {
    renderQueuePane(
      SpotifyApi.layerFakeWith(() => ({
        skipToNext: Effect.fail(new SpotifyResponseError({ status: 403, message: "Restricted" })),
      })),
    )

    await userEvent.click(await upNextRow(fakeTrack(1).name))

    expect(await screen.findByRole("alert")).toHaveTextContent(
      `Couldn't play ${fakeTrack(1).name}.`,
    )
  })

  it("explains that the queue is empty when nothing is playing or queued", async () => {
    renderQueuePane(
      SpotifyApi.layerFakeWith(() => ({
        getQueue: Effect.succeed({ currentlyPlaying: null, upNext: [] }),
      })),
    )

    expect(await screen.findByText("Your queue is empty")).toBeInTheDocument()
  })

  it("asks for a device when no device is active", async () => {
    renderQueuePane(SpotifyApi.layerFakeWith(() => ({ getPlaybackState: Effect.succeedNone })))

    expect(await screen.findByText("No device is playing")).toBeInTheDocument()
    expect(
      screen.getByText("Choose a device in the now-playing bar to see what plays next."),
    ).toBeInTheDocument()
  })

  it("loads the queue again when Retry is pressed after it failed to load", async () => {
    const failFirst = failingFirstTime()
    renderQueuePane(
      SpotifyApi.layerFakeWith((spotify) => ({ getQueue: failFirst(spotify.getQueue) })),
    )

    const failure = await screen.findByRole("alert")
    expect(failure).toHaveTextContent("The queue didn't load.")
    await userEvent.click(within(failure).getByRole("button", { name: "Retry" }))

    expect(await section("Now playing")).toHaveTextContent(fakeTrack(0).name)
  })
})
