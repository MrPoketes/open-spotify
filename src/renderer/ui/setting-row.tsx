import { useId, type ReactNode } from "react"

interface SettingRowIds {
  readonly labelId: string
  readonly descriptionId: string
}

interface SettingRowProps {
  readonly label: string
  readonly description: string
  // The id of the switch or input the row holds, so clicking the label works
  // it too. A group of options cannot be pointed at, so it has none.
  readonly controlId?: string
  // The control at the row's right end, given the ids that name and describe it.
  readonly children: (ids: SettingRowIds) => ReactNode
}

// One setting: what it is and what it changes on the left, its control on the
// right (docs/design.md, Settings and the theme picker).
export function SettingRow({ label, description, controlId, children }: SettingRowProps) {
  const ids: SettingRowIds = { labelId: useId(), descriptionId: useId() }

  return (
    <div className="flex items-center justify-between gap-6">
      <div className="flex max-w-prose min-w-0 flex-col gap-1">
        <label id={ids.labelId} htmlFor={controlId} className="text-sm font-semibold">
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
