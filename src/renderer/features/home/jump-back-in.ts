import { Effect } from "effect"
import type { GridCard } from "../../ui/card-grid"
import { isUnknownSpotifyId } from "../spotify/is-unknown-spotify-id"
import { SpotifyApi } from "../spotify/spotify-api"
import type { PlayHistory } from "../spotify/spotify-play-history"
import { spotifyItemKinds } from "../spotify/spotify-item-kinds"
import { artistCard } from "../artist/artist-card"

const jumpBackInLimit = 8

export interface PageContext {
  readonly uri: string
  readonly kind: "album" | "playlist" | "artist"
  readonly id: string
}

// Only albums, playlists, and artists have a page to jump back into. Other
// contexts, such as Liked Songs (spotify:user:<id>:collection), are skipped.
const pageContext = (uri: string): ReadonlyArray<PageContext> => {
  const [, kind, id] = /^spotify:([^:]+):([^:]+)$/.exec(uri) ?? []
  if (id === undefined) {
    return []
  }
  if (kind === "album" || kind === "playlist" || kind === "artist") {
    return [{ uri, kind, id }]
  }
  return []
}

// The distinct pages the user played from, most recent first.
export const recentPageContexts = (history: ReadonlyArray<PlayHistory>) => {
  const contextUris = history.flatMap(({ context }) => (context === null ? [] : [context.uri]))
  return [...new Set(contextUris)].flatMap(pageContext).slice(0, jumpBackInLimit)
}

const loadCard = Effect.fn("loadJumpBackInCard")(function* ({ uri, kind, id }: PageContext) {
  const spotify = yield* SpotifyApi
  if (kind === "album") {
    const album = yield* spotify.getAlbum(id)
    return {
      key: uri,
      link: { to: "/album/$albumId", params: { albumId: id } },
      title: album.name,
      details: spotifyItemKinds.album.label,
      artwork: album.images,
      placeholderIcon: spotifyItemKinds.album.icon,
    } satisfies GridCard
  }
  if (kind === "playlist") {
    const playlist = yield* spotify.getPlaylist(id)
    return {
      key: uri,
      link: { to: "/playlist/$playlistId", params: { playlistId: id } },
      title: playlist.name,
      details: spotifyItemKinds.playlist.label,
      artwork: playlist.images ?? [],
      placeholderIcon: spotifyItemKinds.playlist.icon,
    } satisfies GridCard
  }
  return artistCard(yield* spotify.getArtist(id))
})

interface JumpBackInCard {
  readonly uri: string
  readonly card: GridCard
}

// Spotify answers 404 to development-mode apps for its own algorithmic and
// editorial playlists, such as Discover Weekly and Daily Mix, which are among
// the most played-from contexts. A playlist may also have been deleted since.
// Either way the page is left out instead of failing the section.
export const loadJumpBackInCards = (contexts: ReadonlyArray<PageContext>) =>
  Effect.forEach(
    contexts,
    (context) =>
      loadCard(context).pipe(
        Effect.map((card): ReadonlyArray<JumpBackInCard> => [{ uri: context.uri, card }]),
        Effect.catchIf(isUnknownSpotifyId, () => Effect.succeed([])),
      ),
    { concurrency: "unbounded" },
  ).pipe(Effect.map((cards) => cards.flat()))
