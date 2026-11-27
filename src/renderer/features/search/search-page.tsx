import { Effect } from "effect"
import { use } from "react"
import { useLoad } from "../../lib/use-load"
import { ArtworkWash } from "../../ui/artwork-wash"
import { ContentSkeleton, type SkeletonShape } from "../../ui/loading-skeleton"
import { PageSectionSkeleton } from "../../ui/page-section"
import { pageTitleClassName } from "../../ui/page-title-class-name"
import { IsMacContext } from "../shortcuts/is-mac-context"
import { windowShortcuts } from "../shortcuts/keyboard-shortcuts"
import { ShortcutKeyCaps } from "../shortcuts/shortcut-key-caps"
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

// The cover of the top track, or of the top album when no track matches,
// colors the top of the page.
const topResultArtwork = ({ tracks, albums }: SearchResults) =>
  tracks.items.find((track) => track !== null)?.album.images ??
  albums.items.find((album) => album !== null)?.images ??
  []

// Shaped like the first sections a search usually shows: tracks, artists,
// and albums.
const loadingSectionShapes: ReadonlyArray<SkeletonShape> = ["rows", "roundCards", "squareCards"]

function SearchLoading() {
  return (
    <>
      <output className="sr-only">Searching…</output>
      {loadingSectionShapes.map((shape) => (
        <PageSectionSkeleton key={shape}>
          <ContentSkeleton shape={shape} />
        </PageSectionSkeleton>
      ))}
    </>
  )
}

function NoResults({ query }: { readonly query: string }) {
  return (
    <div className="flex flex-col gap-1">
      <p className="font-semibold">No results for “{query}”.</p>
      <p className="text-sm text-muted">Check the spelling, or try fewer or different words.</p>
    </div>
  )
}

function QueryResults({ query }: { readonly query: string }) {
  const { state, retry } = useLoad(loadFirstPages(query), "Search failed")

  if (state.status === "loading") {
    return <SearchLoading />
  }
  if (state.status === "failed") {
    return <SpotifyLoadFailure error={state.error} message="Search didn't load." onRetry={retry} />
  }
  if (hasNoResults(state.value)) {
    return <NoResults query={query} />
  }
  return (
    <>
      <ArtworkWash placement="page" sources={topResultArtwork(state.value)} />
      <SearchResultSections query={query} firstPages={state.value} />
    </>
  )
}

function SearchPrompt() {
  const isMac = use(IsMacContext)
  return (
    <div className="flex flex-col gap-3 pt-6">
      <h1 className={pageTitleClassName}>Search</h1>
      <p className="text-muted">Search for tracks, artists, albums, and playlists.</p>
      <p className="text-sm text-muted">
        Press <ShortcutKeyCaps shortcut={windowShortcuts.focusSearch} isMac={isMac} /> to jump to
        the search field from anywhere.
      </p>
    </div>
  )
}

export function SearchPage({ query }: { readonly query: string }) {
  if (query === "") {
    return <SearchPrompt />
  }
  return (
    <div className="relative flex flex-col gap-12">
      <h1 className={`${pageTitleClassName} pt-6`}>
        <span className="text-muted">Results for</span> “{query}”
      </h1>
      {/* Keyed so that a new query starts from a fresh search, and an earlier
          query's search, which may answer later, can never show its results. */}
      <QueryResults key={query} query={query} />
    </div>
  )
}
