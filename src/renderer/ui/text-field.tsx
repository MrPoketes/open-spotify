import { useEffect, useId, useRef } from "react"
import { Input } from "./input"

interface TextFieldProps {
  readonly label: string
  readonly value: string
  readonly onChange: (value: string) => void
  readonly focusOnMount?: boolean
  readonly errorMessage?: string | undefined
  readonly autoComplete?: "off"
  readonly spellCheck?: boolean
}

// The error sits under the field and describes it, so a screen reader reads
// it again whenever the field is focused.
export function TextField({
  label,
  value,
  onChange,
  focusOnMount = false,
  errorMessage,
  autoComplete,
  spellCheck,
}: TextFieldProps) {
  const inputId = useId()
  const errorId = useId()
  const input = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (focusOnMount) {
      input.current?.focus()
    }
  }, [focusOnMount])

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={inputId} className="text-sm font-semibold">
        {label}
      </label>
      <Input
        ref={input}
        id={inputId}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        autoComplete={autoComplete}
        spellCheck={spellCheck}
        aria-invalid={errorMessage !== undefined}
        aria-describedby={errorMessage === undefined ? undefined : errorId}
      />
      {errorMessage !== undefined && (
        <p id={errorId} role="alert" className="text-xs text-danger">
          {errorMessage}
        </p>
      )}
    </div>
  )
}
