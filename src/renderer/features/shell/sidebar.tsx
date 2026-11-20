import { Library } from "../library/library"

export function Sidebar({ width }: { readonly width: number }) {
  return (
    <nav
      aria-label="Library"
      style={{ width }}
      className="flex shrink-0 flex-col gap-4 rounded-medium bg-surface pt-4"
    >
      <h2 className="px-4 font-display text-xl font-bold">Your library</h2>
      <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-2">
        <Library />
      </div>
    </nav>
  )
}
