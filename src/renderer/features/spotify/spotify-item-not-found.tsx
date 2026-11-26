import { spotifyItemKinds, type SpotifyItemKind } from "./spotify-item-kinds"

// For an address whose Spotify id Spotify does not know.
export function SpotifyItemNotFound({ kind }: { readonly kind: SpotifyItemKind }) {
  return (
    <section className="flex flex-col gap-2">
      <h1 className="font-display text-3xl font-bold">{spotifyItemKinds[kind].label} not found</h1>
      <p className="text-muted">Spotify has no {kind} at this address. It may have been removed.</p>
    </section>
  )
}
