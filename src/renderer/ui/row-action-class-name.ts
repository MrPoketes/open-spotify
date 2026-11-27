// Actions on list rows and sidebar headings stay hidden until their row is
// hovered or focused, so long lists stay quiet. An open menu keeps its button
// shown while focus is in the menu.
export const shownOnRowHoverClassName =
  "opacity-0 transition-opacity duration-120 ease-out group-focus-within:opacity-100 group-hover:opacity-100 has-aria-expanded:opacity-100"

export const rowActionClassName = `flex size-8 shrink-0 items-center justify-center rounded-full text-muted hover:text-foreground ${shownOnRowHoverClassName}`
