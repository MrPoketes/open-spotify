import type { Ref } from "react"
import { FilterChip } from "../../ui/filter-chip"
import type { LibraryFilters, LibraryKindFilter } from "./library-filters"
import { librarySectionNames } from "./library-section-names"

const chipKinds: ReadonlyArray<LibraryKindFilter> = ["playlist", "album", "artist", "show"]

interface LibraryFilterBarProps {
  readonly filters: LibraryFilters
  readonly onChange: (filters: LibraryFilters) => void
  readonly nameFilterRef: Ref<HTMLInputElement>
}

export function LibraryFilterBar({ filters, onChange, nameFilterRef }: LibraryFilterBarProps) {
  const toggleKind = (kind: LibraryKindFilter) =>
    onChange({ ...filters, kind: filters.kind === kind ? null : kind })

  return (
    <div className="sticky top-0 flex flex-col gap-2 bg-surface px-2 pt-1 pb-2">
      <fieldset className="flex flex-wrap gap-2">
        <legend className="sr-only">Filter by kind</legend>
        {chipKinds.map((kind) => (
          <FilterChip
            key={kind}
            label={librarySectionNames[kind]}
            pressed={filters.kind === kind}
            onClick={() => toggleKind(kind)}
          />
        ))}
      </fieldset>
      <input
        ref={nameFilterRef}
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
