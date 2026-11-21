import type { ContrastShortfall } from "../../../shared/theme-contrast"

// Rounded down, so a ratio just under its target never reads as meeting it.
const formatRatio = (ratio: number) => `${(Math.floor(ratio * 10) / 10).toFixed(1)}:1`

interface ContrastWarningsProps {
  readonly id: string
  readonly shortfalls: ReadonlyArray<ContrastShortfall>
}

// The live region stays rendered while empty, because screen readers do not
// announce content that arrives together with its region.
export function ContrastWarnings({ id, shortfalls }: ContrastWarningsProps) {
  return (
    <output id={id} className="flex flex-col text-xs text-danger">
      {shortfalls.map((shortfall) => (
        <span key={shortfall.background}>
          {`${shortfall.foreground} on ${shortfall.background}: ${formatRatio(shortfall.ratio)}, needs ${shortfall.target}:1`}
        </span>
      ))}
    </output>
  )
}
