interface AccentButtonProps {
  readonly label: string
  readonly onClick: () => void
}

export function AccentButton({ label, onClick }: AccentButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-full bg-accent px-4 py-2 text-sm font-semibold text-on-accent transition-opacity duration-120 ease-out hover:opacity-90 active:opacity-75"
    >
      {label}
    </button>
  )
}
