import { useRef, type RefObject } from "react"

// Runs the action of the item chosen from a menu once the menu has closed,
// with focus back on the menu's opener. An action can open a dialog, which
// gives focus back, when it closes, to the element that had focus when it
// opened. While the menu is open that is the chosen item, gone by the time the
// dialog closes, and a modal menu pulls focus back to itself if the item hands
// it to the opener any earlier.
export function useActionAfterMenuCloses(opener: RefObject<HTMLElement | null>) {
  const chosenAction = useRef<(() => void) | null>(null)

  // The menu popup's finalFocus: Base UI calls it once the menu has closed,
  // for where focus goes. With no item chosen, focus goes back to the opener
  // as usual. With one, the action runs from the opener and keeps focus
  // wherever it moves it, such as onto a section it moved.
  const runChosenAction = () => {
    const action = chosenAction.current
    if (action === null) {
      return true
    }
    chosenAction.current = null
    opener.current?.focus({ preventScroll: true })
    action()
    return false
  }

  return {
    choose: (action: () => void) => {
      chosenAction.current = action
    },
    runChosenAction,
  }
}
