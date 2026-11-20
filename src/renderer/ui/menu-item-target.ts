// The index of the menu item a key moves focus to, or undefined for keys that
// do not move it. The arrow keys wrap around the ends of the menu, as the
// WAI-ARIA menu pattern describes.
export const menuItemTargetForKey = (key: string, focusedIndex: number, itemCount: number) => {
  const targetIndexByKey: Partial<Record<string, number>> = {
    ArrowDown: (focusedIndex + 1) % itemCount,
    ArrowUp: (focusedIndex - 1 + itemCount) % itemCount,
    Home: 0,
    End: itemCount - 1,
  }
  return targetIndexByKey[key]
}
