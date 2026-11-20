export function Sidebar({ width }: { readonly width: number }) {
  return (
    <nav
      aria-label="Library"
      style={{ width }}
      className="flex shrink-0 flex-col gap-4 overflow-y-auto rounded-medium bg-surface p-4"
    >
      <h2 className="font-display text-xl font-bold">Your library</h2>
      <p className="text-sm text-muted">
        Playlists, albums, artists, and shows you save will appear here.
      </p>
    </nav>
  )
}
