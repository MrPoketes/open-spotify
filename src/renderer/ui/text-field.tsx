import { useEffect, useId, useRef } from "react"

interface TextFieldProps {
  readonly label: string
  readonly value: string
  readonly onChange: (value: string) => void
  readonly focusOnMount?: boolean
  readonly errorMessage?: string
}

// The error sits under the field and describes it, so a screen reader reads
// it again whenever the field is focused.
export function TextField({
  label,
  value,
  onChange,
  focusOnMount = false,
  errorMessage,
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
    <div className="flex flex-col gap-1">
      <label htmlFor={inputId} className="text-sm font-semibold">
        {label}
      </label>
      <input
        ref={input}
        id={inputId}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-invalid={errorMessage !== undefined}
        aria-describedby={errorMessage === undefined ? undefined : errorId}
        className="rounded-small bg-surface-raised px-3 py-2 text-base aria-invalid:ring-2 aria-invalid:ring-danger"
      />
      {errorMessage !== undefined && (
        <p id={errorId} role="alert" className="text-xs text-danger">
          {errorMessage}
        </p>
      )}
    </div>
  )
}
