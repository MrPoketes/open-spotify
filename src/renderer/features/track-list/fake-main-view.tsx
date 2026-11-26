import { useCallback, useState, type ReactNode } from "react"
import { giveMainViewALayout } from "./fake-main-view-layout"

// A track list reads the main view's size as it mounts, before the ref of the
// <main> around it runs. A page mounts its list once its data loads, by which
// time the layout is in place; a list rendered on its own waits here for it.
export function FakeMainView({ children }: { readonly children: ReactNode }) {
  const [hasLayout, setHasLayout] = useState(false)
  const giveLayout = useCallback((mainView: HTMLElement | null) => {
    giveMainViewALayout(mainView)
    setHasLayout(mainView !== null)
  }, [])

  return <main ref={giveLayout}>{hasLayout ? children : null}</main>
}
