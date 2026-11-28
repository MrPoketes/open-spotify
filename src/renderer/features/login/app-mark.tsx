// The app icon's open ring and play triangle (build/icon.svg) without its
// tile, drawn in theme colors so a theme restyles it like everything else.
export function AppMark({ className }: { readonly className: string }) {
  return (
    <svg aria-hidden viewBox="244 244 536 536" className={className}>
      <path
        d="M734.2 452.5A230 230 0 1 1 571.5 289.8"
        fill="none"
        strokeWidth="76"
        strokeLinecap="round"
        className="stroke-accent"
      />
      <path
        d="M456 412L630 512L456 612Z"
        strokeWidth="40"
        strokeLinejoin="round"
        className="fill-foreground stroke-foreground"
      />
    </svg>
  )
}
