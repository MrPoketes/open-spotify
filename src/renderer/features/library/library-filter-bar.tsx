import { FilterChip } from "../../ui/filter-chip"
import type { LibraryFilters, LibraryKindFilter } from "./library-filters"

const kindChips: ReadonlyArray<{ readonly kind: LibraryKindFilter; readonly label: string }> = [
  { kind: "playlist", label: "Playlists" },
  { kind: "album", label: "Albums" },
  { kind: "artist", label: "Artists" },
  { kind: "show", label: "Shows" },
]

interface LibraryFilterBarProps {
  readonly filters: LibraryFilters
  readonly onChange: (filters: LibraryFilters) => void
}

export function LibraryFilterBar({ filters, onChange }: LibraryFilterBarProps) {
  const toggleKind = (kind: LibraryKindFilter) =>
    onChange({ ...filters, kind: filters.kind === kind ? null : kind })

  return (
    <div className="sticky top-0 flex flex-col gap-2 bg-surface px-2 pt-1 pb-2">
      <fieldset className="flex flex-wrap gap-2">
        <legend className="sr-only">Filter by kind</legend>
        {kindChips.map(({ kind, label }) => (
          <FilterChip
            key={kind}
            label={label}
            pressed={filters.kind === kind}
            onClick={() => toggleKind(kind)}
          />
        ))}
      </fieldset>
      <input
        type="search"
        aria-label="Filter by name"
        placeholder="Filter by name"
        value={filters.nameQuery}
        onChange={(event) => onChange({ ...filters, nameQuery: event.target.value })}
        className="rounded-small bg-surface-raised px-3 py-2 text-base shadow-raised placeholder:text-muted"
      />
    </div>
  )
}
