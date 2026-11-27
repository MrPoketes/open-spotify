// The headings that divide the sidebar (Folders, Pinned, the library sections,
// Hidden) share one 32 px row, so every label lines up with the rows' artwork,
// and set their label like the small tracked capitals of a sleeve's credits
// (docs/design.md, Sidebar sections and pins).
export const sidebarHeadingClassNames = {
  row: "flex h-8 items-center justify-between gap-2 px-2",
  label: "text-xs font-semibold tracking-wider text-muted uppercase",
}
