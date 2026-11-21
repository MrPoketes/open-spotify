import type { Ref } from "react"

interface PillButtonProps {
  readonly label: string
  readonly onClick?: () => void
  readonly type?: "button" | "submit"
  readonly disabled?: boolean
  // For a control that must stay focusable while it is unavailable.
  readonly "aria-disabled"?: boolean
  readonly "aria-label"?: string
  readonly ref?: Ref<HTMLButtonElement> | undefined
}

const toneStyles = {
  accent: "bg-accent text-on-accent",
  secondary: "bg-surface-raised",
} as const

function PillButton({
  tone,
  label,
  type = "button",
  ...buttonProps
}: PillButtonProps & { readonly tone: keyof typeof toneStyles }) {
  return (
    <button
      type={type}
      {...buttonProps}
      className={`rounded-full px-4 py-2 text-sm font-semibold transition-opacity duration-120 ease-out disabled:opacity-50 aria-disabled:opacity-50 enabled:not-aria-disabled:hover:opacity-90 enabled:not-aria-disabled:active:opacity-75 ${toneStyles[tone]}`}
    >
      {label}
    </button>
  )
}

export function AccentButton(props: PillButtonProps) {
  return <PillButton tone="accent" {...props} />
}

export function SecondaryButton(props: PillButtonProps) {
  return <PillButton tone="secondary" {...props} />
}
