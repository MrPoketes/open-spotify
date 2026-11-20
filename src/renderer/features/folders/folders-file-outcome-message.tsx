import type { FoldersFileOutcome } from "./use-folders-file-actions"

// The output stays mounted because screen readers only announce changes to a
// live region that was already on the page. An alert is announced on insertion.
export function FoldersFileOutcomeMessage({
  outcome,
}: {
  readonly outcome: FoldersFileOutcome | null
}) {
  return (
    <>
      <output className="text-sm text-muted not-empty:mt-2">
        {outcome?.kind === "success" ? outcome.message : ""}
      </output>
      {outcome?.kind === "failure" && (
        <p role="alert" className="mt-2 text-sm text-danger">
          {outcome.message}
        </p>
      )}
    </>
  )
}
