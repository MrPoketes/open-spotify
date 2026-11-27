import { useId, type ReactNode } from "react"

interface SettingRowIds {
  // The label points at the element with this id, so clicking the label
  // works a switch or focuses an input. A group of options cannot be pointed
  // at, so it names itself with labelId instead.
  readonly controlId: string
  readonly labelId: string
  readonly descriptionId: string
}

interface SettingRowProps {
  readonly label: string
  readonly description: string
  // The control at the row's right end, given the ids that name and describe it.
  readonly children: (ids: SettingRowIds) => ReactNode
}

// One setting: what it is and what it changes on the left, its control on the
// right (docs/design.md, Settings and the theme picker).
export function SettingRow({ label, description, children }: SettingRowProps) {
  const ids: SettingRowIds = { controlId: useId(), labelId: useId(), descriptionId: useId() }

  return (
    <div className="flex items-center justify-between gap-6">
      <div className="flex max-w-prose min-w-0 flex-col gap-1">
        <label id={ids.labelId} htmlFor={ids.controlId} className="text-sm font-semibold">
          {label}
        </label>
        <p id={ids.descriptionId} className="text-xs text-muted">
          {description}
        </p>
      </div>
      {children(ids)}
    </div>
  )
}
