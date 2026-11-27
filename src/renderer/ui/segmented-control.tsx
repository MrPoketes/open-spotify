import { ToggleGroup, ToggleGroupItem } from "./toggle-group"

interface SegmentedControlOption<Value extends string> {
  readonly value: Value
  readonly label: string
}

interface SegmentedControlProps<Value extends string> {
  // Names the group for screen readers.
  readonly label: string
  readonly options: ReadonlyArray<SegmentedControlOption<Value>>
  readonly value: Value
  readonly onChange: (value: Value) => void
  readonly "aria-describedby"?: string
}

// Exactly one option is always chosen: pressing the chosen one again keeps it.
export function SegmentedControl<Value extends string>({
  label,
  options,
  value,
  onChange,
  "aria-describedby": describedBy,
}: SegmentedControlProps<Value>) {
  return (
    <ToggleGroup<Value>
      aria-label={label}
      aria-describedby={describedBy}
      value={[value]}
      onValueChange={([chosenValue]) => {
        if (chosenValue !== undefined) {
          onChange(chosenValue)
        }
      }}
    >
      {options.map((option) => (
        <ToggleGroupItem key={option.value} value={option.value}>
          {option.label}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  )
}
