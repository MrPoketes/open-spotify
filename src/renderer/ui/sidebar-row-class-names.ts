// Sidebar rows (library entries and folder tree items) light up on hover, and
// stay lit while the page they link to is open: the router marks that link
// aria-current="page".
export const sidebarRowClassNames = {
  surface:
    "rounded-small transition-colors duration-120 ease-out hover:bg-surface-raised has-aria-[current=page]:bg-surface-raised",
  link: "flex min-w-0 flex-1 rounded-small px-2 py-1",
}
