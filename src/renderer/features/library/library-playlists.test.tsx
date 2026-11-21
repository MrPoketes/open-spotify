import { render, screen } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { Stream } from "effect"
import { describe, expect, it } from "vitest"
import { fakeRendererRuntime } from "../../lib/fake-renderer-runtime"
import { RendererRuntimeContext } from "../../lib/renderer-runtime"
import { useLoad } from "../../lib/use-load"
import { SpotifyApi, SpotifyResponseError } from "../spotify/spotify-api"
import { fakePlaylists } from "../spotify/spotify-fixtures"
import { useLibraryPlaylists } from "./library-playlists"
import { LibraryPlaylistsProvider } from "./library-playlists-provider"

// Counts the loads of the user's playlists, and fails the first one when
// asked to, like a request that hit a brief outage.
const countingLoads = ({ failFirst }: { readonly failFirst: boolean }) => {
  let loadCount = 0
  const spotifyApi = SpotifyApi.layerFakeWith((spotify) => ({
    currentUserPlaylists: Stream.suspend(() => {
      loadCount += 1
      if (failFirst && loadCount === 1) {
        return Stream.fail(new SpotifyResponseError({ status: 503, message: "Unavailable" }))
      }
      return spotify.currentUserPlaylists
    }),
  }))
  return { loadCount: () => loadCount, runtime: fakeRendererRuntime({ spotifyApi }) }
}

// Reads the playlists the way the sidebar and the track menu do.
function PlaylistReader() {
  const { state, retry } = useLoad(useLibraryPlaylists(), "The playlists failed to load")
  if (state.status === "failed") {
    return (
      <button type="button" onClick={retry}>
        Retry
      </button>
    )
  }
  return <p>{state.status === "loaded" ? `${state.value.length} playlists` : "Loading"}</p>
}

const loadedText = `${fakePlaylists.length} playlists`

describe("LibraryPlaylistsProvider", () => {
  it("loads the playlists once for every reader", async () => {
    const loads = countingLoads({ failFirst: false })
    render(
      <RendererRuntimeContext value={loads.runtime}>
        <LibraryPlaylistsProvider>
          <PlaylistReader />
          <PlaylistReader />
        </LibraryPlaylistsProvider>
      </RendererRuntimeContext>,
    )

    expect(await screen.findAllByText(loadedText)).toHaveLength(2)
    expect(loads.loadCount()).toBe(1)
  })

  // The app shell mounts again after every login, and the next user must not
  // see the playlists of the user before them.
  it("loads the playlists again when it mounts again", async () => {
    const loads = countingLoads({ failFirst: false })
    const shellAfterLogin = (login: string) => (
      <RendererRuntimeContext value={loads.runtime}>
        <LibraryPlaylistsProvider key={login}>
          <PlaylistReader />
        </LibraryPlaylistsProvider>
      </RendererRuntimeContext>
    )
    const { rerender } = render(shellAfterLogin("first login"))
    await screen.findByText(loadedText)

    rerender(shellAfterLogin("second login"))

    await screen.findByText(loadedText)
    expect(loads.loadCount()).toBe(2)
  })

  it("loads the playlists again when a reader retries after a failed load", async () => {
    const loads = countingLoads({ failFirst: true })
    render(
      <RendererRuntimeContext value={loads.runtime}>
        <LibraryPlaylistsProvider>
          <PlaylistReader />
        </LibraryPlaylistsProvider>
      </RendererRuntimeContext>,
    )

    await userEvent.click(await screen.findByRole("button", { name: "Retry" }))

    expect(await screen.findByText(loadedText)).toBeInTheDocument()
  })
})
