// Keys held with Ctrl, Alt, or Cmd belong to app-wide shortcuts, such as
// Alt+Left to go back, so lists, menus, and controls leave them alone. Shift
// is not one: it types capitals and reverses Tab.
export const hasShortcutModifier = (event: Pick<KeyboardEvent, "ctrlKey" | "metaKey" | "altKey">) =>
  event.ctrlKey || event.metaKey || event.altKey
