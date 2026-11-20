import { render, screen, within } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { Deferred, Effect, type Layer } from "effect"
import { describe, expect, it } from "vitest"
import { fakeRendererRuntime } from "../../lib/fake-renderer-runtime"
import { RendererRuntimeContext } from "../../lib/renderer-runtime"
import { Player } from "../playback/player"
import { failingFirstTime } from "../spotify/failing-first-time"
import {
  NoActiveDevice,
  SpotifyApi,
  SpotifyRequestError,
  SpotifyResponseError,
} from "../spotify/spotify-api"
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

// Shows the fixture queue once, then an empty one, like a queue that was
// cleared in another app while the pane showed it.
const queueEmptiedAfterFirstRead = () => {
  let queueReads = 0
  return SpotifyApi.layerFakeWith((spotify) => ({
    getQueue: Effect.suspend(() => {
      queueReads += 1
      return queueReads === 1
        ? spotify.getQueue
        : spotify.getQueue.pipe(Effect.map((queue) => ({ ...queue, upNext: [] })))
    }),
  }))
}

// Answers the first queue read, which fills the pane, and holds every later
// one until the test opens the gate.
const gatedQueueReads = () => {
  const gate = Deferred.makeUnsafe<void>()
  let queueReads = 0
  const layer = SpotifyApi.layerFakeWith((spotify) => ({
    getQueue: Effect.suspend(() => {
      queueReads += 1
      return queueReads === 1
        ? spotify.getQueue
        : Deferred.await(gate).pipe(Effect.andThen(spotify.getQueue))
    }),
  }))
  return { layer, open: () => Effect.runSync(Deferred.succeed(gate, undefined)) }
}

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

  // Double-clicking is how the official client plays an item. The second
  // click must not skip again, or report the item that it just played as gone.
  it("plays an item once when its row is double-clicked", async () => {
    renderQueuePane()

    await userEvent.dblClick(await upNextRow(fakePlayOrder(3).name))

    expect(
      await within(await section("Now playing")).findByText(fakePlayOrder(3).name),
    ).toBeInTheDocument()
    const [nextRow] = await upNextRows()
    expect(nextRow).toHaveTextContent(fakePlayOrder(4).name)
    expect(screen.queryByRole("alert")).not.toBeInTheDocument()
  })

  it("ignores a second press while an item is still being played", async () => {
    const spotify = gatedQueueReads()
    renderQueuePane(spotify.layer)

    await userEvent.click(await upNextRow(fakeEpisode.name))
    await userEvent.click(await upNextRow(fakePlayOrder(3).name))
    spotify.open()

    expect(
      await within(await section("Now playing")).findByText(fakeEpisode.name),
    ).toBeInTheDocument()
    const [nextRow] = await upNextRows()
    expect(nextRow).toHaveTextContent(fakePlayOrder(3).name)
  })

  // The queue on screen can be out of date, for example after shuffle was
  // turned on, and skipping by its positions would play the wrong item.
  it("says so instead of skipping when the item has left the queue since it was shown", async () => {
    renderQueuePane(queueEmptiedAfterFirstRead())

    await userEvent.click(await upNextRow(fakeTrack(2).name))

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "That item is no longer in the queue.",
    )
    expect(await section("Now playing")).toHaveTextContent(fakeTrack(0).name)
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

    await userEvent.click(await upNextRow(fakeEpisode.name))

    expect(await screen.findByRole("alert")).toHaveTextContent(`Couldn't play ${fakeEpisode.name}.`)
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

  it("asks for a device when the queue request finds no active device", async () => {
    renderQueuePane(
      SpotifyApi.layerFakeWith(() => ({ getQueue: Effect.fail(new NoActiveDevice()) })),
    )

    expect(await screen.findByText("No device is playing")).toBeInTheDocument()
  })

  it("says Spotify cannot be reached when the playback state fails to load", async () => {
    renderQueuePane(
      SpotifyApi.layerFakeWith(() => ({
        getPlaybackState: Effect.fail(new SpotifyRequestError({ cause: "offline" })),
      })),
    )

    expect(await screen.findByText("Can't reach Spotify right now.")).toBeInTheDocument()
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
