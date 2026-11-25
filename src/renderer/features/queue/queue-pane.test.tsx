import { act, render, screen, waitFor, within } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { Deferred, Effect, type Layer } from "effect"
import { describe, expect, it } from "vitest"
import { SessionExpired } from "../../../shared/spotify-auth-replies"
import { fakeMainProcess } from "../../lib/fake-main-process"
import { fakeRendererRuntime } from "../../lib/fake-renderer-runtime"
import { renderScreen } from "../../lib/render-screen"
import { RendererRuntimeContext } from "../../lib/renderer-runtime"
import { Player } from "../playback/player"
import { failingFirstTime } from "../spotify/failing-first-time"
import { type SpotifyApi, NoActiveDevice, SpotifyRequestError } from "../spotify/spotify-api"
import { spotifyApiFake, spotifyApiFakeWith } from "../spotify/spotify-api-fake"
import { fakePlayOrder } from "../spotify/spotify-fake-player"
import { rejectedCommand } from "../spotify/spotify-fake-rejected-command"
import { fakeDevices, fakeEpisode, fakeTrack } from "../spotify/spotify-fixtures"
import { QueuePane } from "./queue-pane"

const renderQueuePane = (spotifyApi: Layer.Layer<SpotifyApi> = spotifyApiFake) => {
  const runtime = fakeRendererRuntime({ spotifyApi })
  render(
    <RendererRuntimeContext value={runtime}>
      <QueuePane ref={{ current: null }} isOpen savedWidth={320} onClose={() => undefined} />
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
  return spotifyApiFakeWith((spotify) => ({
    getQueue: Effect.suspend(() => {
      queueReads += 1
      return queueReads === 1
        ? spotify.getQueue
        : spotify.getQueue.pipe(Effect.map((queue) => ({ ...queue, upNext: [] })))
    }),
  }))
}

// Lets the first calls through and holds every later one until the test
// opens the gate. `firstHeld` settles when a call starts waiting.
const gateAfter = (answeredCalls: number) => {
  const gate = Deferred.makeUnsafe<void>()
  const callWaiting = Deferred.makeUnsafe<void>()
  let calls = 0
  return {
    pass: <A, E>(call: Effect.Effect<A, E>) =>
      Effect.suspend(() => {
        calls += 1
        if (calls <= answeredCalls) {
          return call
        }
        return Deferred.succeed(callWaiting, undefined).pipe(
          Effect.andThen(Deferred.await(gate)),
          Effect.andThen(call),
        )
      }),
    firstHeld: () => Effect.runPromise(Deferred.await(callWaiting)),
    open: () => Effect.runSync(Deferred.succeed(gate, undefined)),
  }
}

const skipToNext = (runtime: ReturnType<typeof renderQueuePane>) =>
  runtime.runPromise(
    Effect.gen(function* () {
      const player = yield* Player
      yield* player.skipToNext
    }),
  )

// Makes the Player read the playback state at once, as its next poll would.
const transferToActiveDevice = (runtime: ReturnType<typeof renderQueuePane>) =>
  runtime.runPromise(
    Effect.gen(function* () {
      const player = yield* Player
      yield* player.transferPlayback(fakeDevices[0].id)
    }),
  )

const nowPlaying = async (itemName: string) =>
  within(await section("Now playing")).findByText(itemName)

describe("QueuePane", () => {
  it("shows the playing item and the upcoming tracks and episodes with their artists", async () => {
    renderQueuePane()

    expect(await section("Now playing")).toHaveTextContent(`${fakeTrack(0).name}Northbound Static`)
    const [firstRow, episodeRow, thirdRow] = await upNextRows()
    expect(firstRow).toHaveTextContent(`${fakeTrack(1).name}Lena Varga`)
    expect(episodeRow).toHaveTextContent(`${fakeEpisode.name}Show episode`)
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

  it("plays the second copy of an item queued twice when that copy is pressed", async () => {
    renderQueuePane()
    const episodeRow = await upNextRow(fakeEpisode.name)

    // Both copies have the same name, so the second one is reached by moving
    // down two rows from the episode.
    act(() => episodeRow.focus())
    await userEvent.keyboard("{ArrowDown}{ArrowDown}{Enter}")

    await waitFor(async () => {
      const [firstRow] = await upNextRows()
      expect(firstRow).toHaveTextContent(fakePlayOrder(5).name)
    })
  })

  // Rows of a list shown partway through a press point at positions the
  // press is still skipping past.
  it("ignores presses on a list that arrives while an item is still being played", async () => {
    const skips = gateAfter(1)
    const runtime = renderQueuePane(
      spotifyApiFakeWith((spotify) => ({ skipToNext: skips.pass(spotify.skipToNext) })),
    )

    await userEvent.click(await upNextRow(fakeTrack(2).name))
    await skips.firstHeld()
    await transferToActiveDevice(runtime)
    await nowPlaying(fakePlayOrder(1).name)
    expect(within(await section("Next up")).getByRole("list")).toHaveAttribute("aria-busy", "true")
    await userEvent.click(await upNextRow(fakeEpisode.name))
    skips.open()

    expect(await nowPlaying(fakePlayOrder(3).name)).toBeInTheDocument()
    await waitFor(async () => {
      const [firstRow] = await upNextRows()
      expect(firstRow).toHaveTextContent(fakePlayOrder(4).name)
    })
  })

  // The pressed row leaves "Next up" once its item plays. Without this, a
  // keyboard user would land on the page body and tab back from the start.
  it("keeps focus at the pressed row's position when its item starts playing", async () => {
    renderQueuePane()
    const episodeRow = await upNextRow(fakeEpisode.name)

    act(() => episodeRow.focus())
    await userEvent.keyboard("{Enter}")

    await nowPlaying(fakeEpisode.name)
    expect(await upNextRow(fakePlayOrder(4).name)).toHaveFocus()
  })

  it("leaves focus alone when the user moved it out of the list before the new list arrived", async () => {
    // The pane's first read and the press's lookup.
    const queueReads = gateAfter(2)
    renderQueuePane(
      spotifyApiFakeWith((spotify) => ({ getQueue: queueReads.pass(spotify.getQueue) })),
    )
    const closeButton = screen.getByRole("button", { name: "Close queue" })

    await userEvent.click(await upNextRow(fakeEpisode.name))
    await queueReads.firstHeld()
    act(() => closeButton.focus())
    queueReads.open()

    await nowPlaying(fakeEpisode.name)
    expect(closeButton).toHaveFocus()
  })

  // The queue on screen can be out of date, for example after shuffle was
  // turned on, and skipping by its positions would play the wrong item.
  it("says so instead of skipping when the item has left the queue since it was shown", async () => {
    renderQueuePane(queueEmptiedAfterFirstRead())

    await userEvent.click(await upNextRow(fakeTrack(2).name))

    // The queue is read again after the failed press, and comes back empty.
    expect(await screen.findByText("Nothing plays after this.")).toBeInTheDocument()
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "That item is no longer in the queue.",
    )
    expect(await section("Now playing")).toHaveTextContent(fakeTrack(0).name)
  })

  it("shows what plays next again when the playing track changes", async () => {
    const runtime = renderQueuePane()
    await section("Now playing")

    await skipToNext(runtime)

    expect(await nowPlaying(fakeTrack(1).name)).toBeInTheDocument()
  })

  // Shuffle reorders the queue without changing the playing track.
  it("shows the new order of what plays next after shuffle is turned on", async () => {
    const runtime = renderQueuePane()
    const [firstRowBefore] = await upNextRows()
    expect(firstRowBefore).toHaveTextContent(fakePlayOrder(1).name)

    await runtime.runPromise(
      Effect.gen(function* () {
        const player = yield* Player
        yield* player.setShuffle(true)
      }),
    )
    await transferToActiveDevice(runtime)

    await waitFor(async () => {
      const [firstRow, secondRow] = await upNextRows()
      expect(firstRow).toHaveTextContent(fakePlayOrder(2).name)
      expect(secondRow).toHaveTextContent(fakePlayOrder(1).name)
    })
  })

  // The playing track stays the same, so only the press itself can tell the
  // pane that the queue moved on.
  it("shows what plays next after a later copy of the playing track starts", async () => {
    const runtime = renderQueuePane()
    await section("Now playing")
    await skipToNext(runtime)
    await nowPlaying(fakePlayOrder(1).name)

    await userEvent.click(await upNextRow(fakePlayOrder(4).name))

    await waitFor(async () => {
      const [firstRow] = await upNextRows()
      expect(firstRow).toHaveTextContent(fakePlayOrder(5).name)
    })
  })

  // Double-clicking is how the official client plays an item. A slow second
  // click lands on the list the first click left behind, where the copy it
  // points at no longer exists.
  it("ignores a second press on the old list after the first press played its item", async () => {
    // The pane's first read, its read after the skip, and the press's lookup.
    const queueReads = gateAfter(3)
    const runtime = renderQueuePane(
      spotifyApiFakeWith((spotify) => ({ getQueue: queueReads.pass(spotify.getQueue) })),
    )
    await section("Now playing")
    await skipToNext(runtime)
    await nowPlaying(fakePlayOrder(1).name)
    const laterCopyRow = await upNextRow(fakePlayOrder(4).name)

    await userEvent.click(laterCopyRow)
    await queueReads.firstHeld()
    await userEvent.click(laterCopyRow)
    queueReads.open()

    await waitFor(async () => {
      const [firstRow] = await upNextRows()
      expect(firstRow).toHaveTextContent(fakePlayOrder(5).name)
    })
    expect(screen.queryByRole("alert")).not.toBeInTheDocument()
  })

  it("says so when an item could not be played", async () => {
    renderQueuePane(
      spotifyApiFakeWith(() => ({
        skipToNext: rejectedCommand,
      })),
    )

    await userEvent.click(await upNextRow(fakeEpisode.name))

    expect(await screen.findByRole("alert")).toHaveTextContent(`Couldn't play ${fakeEpisode.name}.`)
  })

  it("explains that the queue is empty when nothing is playing or queued", async () => {
    renderQueuePane(
      spotifyApiFakeWith(() => ({
        getQueue: Effect.succeed({ currentlyPlaying: null, upNext: [] }),
      })),
    )

    expect(await screen.findByText("Your queue is empty")).toBeInTheDocument()
  })

  it("asks for a device when no device is active", async () => {
    renderQueuePane(spotifyApiFakeWith(() => ({ getPlaybackState: Effect.succeedNone })))

    expect(await screen.findByText("No device is playing")).toBeInTheDocument()
    expect(
      screen.getByText("Choose a device in the now-playing bar to see what plays next."),
    ).toBeInTheDocument()
  })

  it("asks for a device when the queue request finds no active device", async () => {
    renderQueuePane(spotifyApiFakeWith(() => ({ getQueue: Effect.fail(new NoActiveDevice()) })))

    expect(await screen.findByText("No device is playing")).toBeInTheDocument()
  })

  it("says Spotify cannot be reached when the playback state fails to load", async () => {
    renderQueuePane(
      spotifyApiFakeWith(() => ({
        getPlaybackState: Effect.fail(new SpotifyRequestError({ cause: "offline" })),
      })),
    )

    expect(await screen.findByText("Can't reach Spotify right now.")).toBeInTheDocument()
  })

  it("loads the queue again when Retry is pressed after it failed to load", async () => {
    const failFirst = failingFirstTime()
    renderQueuePane(spotifyApiFakeWith((spotify) => ({ getQueue: failFirst(spotify.getQueue) })))

    const failure = await screen.findByRole("alert")
    expect(failure).toHaveTextContent("The queue didn't load.")
    await userEvent.click(within(failure).getByRole("button", { name: "Retry" }))

    expect(await section("Now playing")).toHaveTextContent(fakeTrack(0).name)
  })

  it("goes to the login screen when loading the queue finds the session has expired", async () => {
    const router = await renderScreen(
      <QueuePane ref={{ current: null }} isOpen savedWidth={320} onClose={() => undefined} />,
      fakeMainProcess(),
      spotifyApiFakeWith(() => ({ getQueue: Effect.fail(new SessionExpired()) })),
    )

    await waitFor(() => expect(router.state.location.pathname).toBe("/login"))
    expect(router.state.location.search).toEqual({ sessionExpired: true })
  })
})
