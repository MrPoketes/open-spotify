import type { Ref } from "react"
import { Input } from "../../ui/input"
import { ToggleGroup, ToggleGroupItem } from "../../ui/toggle-group"
import type { LibraryFilters, LibraryKindFilter } from "./library-filters"
import { librarySectionNames } from "./library-section-names"

const chipKinds: ReadonlyArray<LibraryKindFilter> = ["playlist", "album", "artist", "show"]

interface LibraryFilterBarProps {
  readonly filters: LibraryFilters
  readonly onChange: (filters: LibraryFilters) => void
  readonly nameFilterRef: Ref<HTMLInputElement>
}

// Pressing the chosen kind again shows every kind.
export function LibraryFilterBar({ filters, onChange, nameFilterRef }: LibraryFilterBarProps) {
  return (
    <div className="sticky top-0 z-10 flex flex-col gap-2 bg-canvas px-2 pt-1 pb-2">
      <ToggleGroup<LibraryKindFilter>
        aria-label="Filter by kind"
        className="w-full"
        value={filters.kind === null ? [] : [filters.kind]}
        onValueChange={([kind]) => onChange({ ...filters, kind: kind ?? null })}
      >
        {chipKinds.map((kind) => (
          <ToggleGroupItem key={kind} value={kind} className="flex-1 px-1">
            {librarySectionNames[kind]}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
      <Input
        ref={nameFilterRef}
        type="search"
        aria-label="Filter by name"
        placeholder="Filter by name"
        value={filters.nameQuery}
        onChange={(event) => onChange({ ...filters, nameQuery: event.target.value })}
      />
    </div>
  )
}
