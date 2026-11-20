import { Option } from "effect"
import { useId } from "react"
import { type TokenField, tokenValueProblem } from "./theme-token-fields"

const fieldStyle =
  "min-w-0 rounded-small bg-surface-raised px-3 py-2 text-sm aria-invalid:ring-2 aria-invalid:ring-danger"

const lengthUnits = ["px", "rem", "em"]

const lengthPattern = new RegExp(`^(.*?)(${lengthUnits.join("|")})?$`)

interface TokenInputProps {
  readonly field: TokenField
  readonly value: string
  readonly onChange: (value: string) => void
}

// The problem sits under the field and describes it, so a screen reader reads
// it when the field is focused rather than on every keystroke.
export function TokenInput({ field, value, onChange }: TokenInputProps) {
  const inputId = useId()
  const problemId = useId()
  const problem = tokenValueProblem(field.token, value)
  const validity: FieldValidity = {
    id: inputId,
    "aria-invalid": Option.isSome(problem),
    "aria-describedby": Option.isSome(problem) ? problemId : undefined,
  }

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={inputId} className="text-xs">
        {field.token}
      </label>
      <div className="flex gap-2">
        {field.control === "color" && (
          <ColorControl token={field.token} value={value} validity={validity} onChange={onChange} />
        )}
        {field.control === "length" && (
          <LengthControl
            token={field.token}
            value={value}
            validity={validity}
            onChange={onChange}
          />
        )}
        {field.control === "text" && (
          <input
            {...validity}
            value={value}
            onChange={(event) => onChange(event.target.value)}
            spellCheck={false}
            className={`flex-1 ${fieldStyle}`}
          />
        )}
      </div>
      {Option.isSome(problem) && (
        <p id={problemId} className="text-xs text-danger">
          {problem.value}
        </p>
      )}
    </div>
  )
}

interface FieldValidity {
  readonly id: string
  readonly "aria-invalid": boolean
  readonly "aria-describedby": string | undefined
}

interface ControlProps {
  readonly token: string
  readonly value: string
  readonly validity: FieldValidity
  readonly onChange: (value: string) => void
}

// The native picker only takes the six-digit form. Given an empty value, it
// shows black.
const sixDigitHex = (value: string) => {
  const shortHex = /^#([0-9a-f])([0-9a-f])([0-9a-f])$/i.exec(value)
  if (shortHex !== null) {
    return `#${shortHex[1]}${shortHex[1]}${shortHex[2]}${shortHex[2]}${shortHex[3]}${shortHex[3]}`
  }
  return /^#[0-9a-f]{6}$/i.test(value) ? value : ""
}

function ColorControl({ token, value, validity, onChange }: ControlProps) {
  return (
    <>
      <input
        type="color"
        aria-label={`${token} picker`}
        value={sixDigitHex(value).toLowerCase()}
        onChange={(event) => onChange(event.target.value)}
        className="h-9 w-12 shrink-0 cursor-pointer rounded-small bg-surface-raised"
      />
      <input
        {...validity}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        spellCheck={false}
        className={`flex-1 ${fieldStyle}`}
      />
    </>
  )
}

// "0" is a valid length with no unit; the unit list then shows px.
const splitLength = (value: string) => {
  const [, amount = value, unit = "px"] = lengthPattern.exec(value) ?? []
  return { amount, unit }
}

function LengthControl({ token, value, validity, onChange }: ControlProps) {
  const { amount, unit } = splitLength(value)

  return (
    <>
      <input
        {...validity}
        type="number"
        min={0}
        step="any"
        value={amount}
        onChange={(event) => onChange(`${event.target.value}${unit}`)}
        className={`w-24 tabular-nums ${fieldStyle}`}
      />
      <select
        aria-label={`${token} unit`}
        value={unit}
        onChange={(event) => onChange(`${amount}${event.target.value}`)}
        className={fieldStyle}
      >
        {lengthUnits.map((lengthUnit) => (
          <option key={lengthUnit}>{lengthUnit}</option>
        ))}
      </select>
    </>
  )
}
