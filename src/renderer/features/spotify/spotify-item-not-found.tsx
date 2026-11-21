interface SpotifyItemNotFoundProps {
  // Capitalised, such as "Album".
  readonly kind: string
}

// For an address whose Spotify id Spotify does not know.
export function SpotifyItemNotFound({ kind }: SpotifyItemNotFoundProps) {
  return (
    <section className="flex flex-col gap-2">
      <h1 className="font-display text-3xl font-bold">{kind} not found</h1>
      <p className="text-muted">
        Spotify has no {kind.toLowerCase()} at this address. It may have been removed.
      </p>
    </section>
  )
}
