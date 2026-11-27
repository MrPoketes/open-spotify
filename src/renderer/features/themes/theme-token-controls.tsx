import { Schema } from "effect"
import { HexColor, sixDigitHexColor } from "../../../shared/theme"
import { Input } from "../../ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../ui/select"
import { Slider } from "../../ui/slider"
import type { TokenField } from "./theme-token-fields"

const lengthUnits = ["px", "rem", "em"]

const lengthPattern = new RegExp(`^(.*?)(${lengthUnits.join("|")})?$`)

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
const pickerValue = (value: string) =>
  Schema.is(HexColor)(value) ? sixDigitHexColor(value).toLowerCase() : ""

// The native picker is drawn as a swatch of the color, with the browser's
// frame around it removed so only theme tokens show.
function ColorControl({ token, value, validity, onChange }: ControlProps) {
  return (
    <div className="flex gap-2">
      <input
        type="color"
        aria-label={`${token} picker`}
        value={pickerValue(value)}
        onChange={(event) => onChange(event.target.value)}
        className="size-9 shrink-0 cursor-pointer appearance-none rounded-medium bg-secondary p-1 transition-colors duration-120 ease-out hover:bg-surface-overlay [&::-webkit-color-swatch]:rounded-small [&::-webkit-color-swatch]:border [&::-webkit-color-swatch]:border-border [&::-webkit-color-swatch-wrapper]:p-0"
      />
      <Input
        {...validity}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        spellCheck={false}
        className="flex-1"
      />
    </div>
  )
}

// "0" is a valid length with no unit; the unit list then shows px.
const splitLength = (value: string) => {
  const [, amount = value, unit = "px"] = lengthPattern.exec(value) ?? []
  return { amount, unit }
}

// Chromium's spin buttons are hidden, since it draws them in its own colors;
// the arrow keys still step the number.
function LengthControl({ token, value, validity, onChange }: ControlProps) {
  const { amount, unit } = splitLength(value)

  return (
    <div className="flex gap-2">
      <Input
        {...validity}
        type="number"
        min={0}
        step="any"
        value={amount}
        onChange={(event) => onChange(`${event.target.value}${unit}`)}
        className="w-24 [&::-webkit-inner-spin-button]:appearance-none"
      />
      <Select
        value={unit}
        onValueChange={(chosenUnit) => {
          if (chosenUnit !== null) {
            onChange(`${amount}${chosenUnit}`)
          }
        }}
      >
        <SelectTrigger aria-label={`${token} unit`} className="w-20">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {lengthUnits.map((lengthUnit) => (
            <SelectItem key={lengthUnit} value={lengthUnit}>
              {lengthUnit}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

const opacityStep = 0.05

// Rounded to whole percents, so a stepped value is stored as "0.45" rather
// than "0.45000000000000007".
const opacityPercent = (opacity: number) => Math.round(opacity * 100)

// An opacity from 0 to 1, shown as a percentage. 0 turns the effect off, so the
// value says "Off" rather than "0%".
function OpacityControl({ token, value, onChange }: Omit<ControlProps, "validity">) {
  const percent = opacityPercent(Number(value))
  const shownValue = percent === 0 ? "Off" : `${percent}%`

  return (
    <div className="flex items-center gap-4">
      <Slider
        label={token}
        valueText={shownValue}
        unavailableReason={null}
        max={1}
        step={opacityStep}
        value={Number(value)}
        onValueChange={(opacity) => onChange(String(opacityPercent(opacity) / 100))}
      />
      <span aria-hidden className="w-10 shrink-0 text-right text-sm tabular-nums">
        {shownValue}
      </span>
    </div>
  )
}

interface TokenControlProps {
  readonly field: TokenField
  readonly value: string
  readonly validity: FieldValidity
  readonly onChange: (value: string) => void
}

// The control that fits the token's value (docs/design.md, Theme editor).
export function TokenControl({ field, value, validity, onChange }: TokenControlProps) {
  const { token } = field
  if (field.control === "color") {
    return <ColorControl token={token} value={value} validity={validity} onChange={onChange} />
  }
  if (field.control === "length") {
    return <LengthControl token={token} value={value} validity={validity} onChange={onChange} />
  }
  if (field.control === "opacity") {
    return <OpacityControl token={token} value={value} onChange={onChange} />
  }
  return (
    <Input
      {...validity}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      spellCheck={false}
    />
  )
}
