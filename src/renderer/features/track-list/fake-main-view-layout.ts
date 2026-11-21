import { fireEvent } from "@testing-library/react"
import { trackRowHeight } from "./track-row-height"

// jsdom does no layout, so a test gives the main view the size of a short
// window and scrolls it by setting scrollTop, as a browser would. The
// virtualiser calls scrollTo while React commits, where fireEvent's act()
// would drop updates.
const mainViewHeight = 480

export const giveMainViewALayout = (mainView: HTMLElement | null) => {
  if (mainView === null) {
    return
  }
  Object.defineProperty(mainView, "clientHeight", { value: mainViewHeight, configurable: true })
  Object.defineProperty(mainView, "scrollHeight", { value: 1_000_000, configurable: true })
  Object.defineProperty(mainView, "scrollTo", {
    configurable: true,
    value: ({ top = 0 }: ScrollToOptions) => {
      // A browser fires no scroll event for a scroll that goes nowhere. The
      // virtualiser scrolls to where it already is as it starts, and an event
      // would make it re-render the list 150 ms later, when it stops counting
      // the list as scrolling.
      if (top === mainView.scrollTop) {
        return
      }
      mainView.scrollTop = top
      mainView.dispatchEvent(new Event("scroll"))
    },
  })
}

export const scrollMainView = (mainView: HTMLElement, top: number) => {
  mainView.scrollTop = top
  fireEvent.scroll(mainView)
}

// Rows are comfortable unless a test saves another density.
export const scrollMainViewToRow = (mainView: HTMLElement, rowIndex: number) =>
  scrollMainView(mainView, rowIndex * trackRowHeight.comfortable)
