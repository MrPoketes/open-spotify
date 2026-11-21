import { Effect } from "effect"
import { useLoad } from "../../lib/use-load"
import { LoadingMessage } from "../../ui/loading-message"
import { SpotifyApi } from "../spotify/spotify-api"
import { SpotifyLoadFailure } from "../spotify/spotify-load-failure"
import type { SearchResults, SearchType } from "../spotify/spotify-search"
import { SearchResultSections } from "./search-result-sections"

const everySearchType: ReadonlyArray<SearchType> = ["track", "artist", "album", "playlist"]

const loadFirstPages = Effect.fn("loadFirstPages")(function* (query: string) {
  const spotify = yield* SpotifyApi
  return yield* spotify.search(query, everySearchType, 0)
})

const hasNoResults = ({ tracks, artists, albums, playlists }: SearchResults) =>
  [tracks, artists, albums, playlists].every(({ items }) => items.every((item) => item === null))

function QueryResults({ query }: { readonly query: string }) {
  const { state, retry } = useLoad(loadFirstPages(query), "Search failed")

  if (state.status === "loading") {
    return <LoadingMessage>Searching…</LoadingMessage>
  }
  if (state.status === "failed") {
    return <SpotifyLoadFailure error={state.error} message="Search didn't load." onRetry={retry} />
  }
  if (hasNoResults(state.value)) {
    return <p className="text-muted">No results for “{query}”.</p>
  }
  return <SearchResultSections query={query} firstPages={state.value} />
}

export function SearchPage({ query }: { readonly query: string }) {
  if (query === "") {
    return (
      <section className="flex flex-col gap-2">
        <h1 className="font-display text-3xl font-bold">Search</h1>
        <p className="text-muted">Search for tracks, artists, albums, and playlists.</p>
      </section>
    )
  }
  return (
    <div className="flex flex-col gap-8">
      <h1 className="font-display text-3xl font-bold">Results for “{query}”</h1>
      {/* Keyed so that a new query starts from a fresh search, and an earlier
          query's search, which may answer later, can never show its results. */}
      <QueryResults key={query} query={query} />
    </div>
  )
}
