import { Option } from "effect"
import { useId } from "react"
import type { ContrastShortfall } from "../../../shared/theme-contrast"
import { cn } from "../../ui/class-names"
import { ContrastWarnings } from "./contrast-warnings"
import { TokenFieldControl } from "./theme-token-controls"
import { tokenValueProblem, type TokenField } from "./theme-token-fields"

const tokenLabelClassName = "text-xs font-semibold"

interface TokenInputProps {
  readonly field: TokenField
  readonly value: string
  readonly contrastShortfalls: ReadonlyArray<ContrastShortfall>
  readonly onChange: (value: string) => void
}

// The problem sits under the field and describes it, so a screen reader reads
// it when the field is focused rather than on every keystroke.
export function TokenInput({ field, value, contrastShortfalls, onChange }: TokenInputProps) {
  const inputId = useId()
  const problemId = useId()
  const contrastWarningsId = useId()
  const problem = tokenValueProblem(field.token, value)
  const descriptionIds = [
    ...(Option.isSome(problem) ? [problemId] : []),
    ...(contrastShortfalls.length > 0 ? [contrastWarningsId] : []),
  ]
  // The slider names itself, since its focusable input is Base UI's own.
  const isSlider = field.control === "opacity"

  return (
    // A whole CSS value and the slider need the room, so they span both
    // columns of the editor.
    <div
      className={cn(
        "flex flex-col gap-1.5",
        (isSlider || field.control === "text") && "@md:col-span-2",
      )}
    >
      {isSlider ? (
        <span aria-hidden className={tokenLabelClassName}>
          {field.token}
        </span>
      ) : (
        <label htmlFor={inputId} className={tokenLabelClassName}>
          {field.token}
        </label>
      )}
      <TokenFieldControl
        field={field}
        value={value}
        validity={{
          id: inputId,
          "aria-invalid": Option.isSome(problem),
          "aria-describedby": descriptionIds.length > 0 ? descriptionIds.join(" ") : undefined,
        }}
        onChange={onChange}
      />
      {Option.isSome(problem) && (
        <p id={problemId} className="text-xs text-danger">
          {problem.value}
        </p>
      )}
      {field.control === "color" && (
        <ContrastWarnings id={contrastWarningsId} shortfalls={contrastShortfalls} />
      )}
    </div>
  )
}
