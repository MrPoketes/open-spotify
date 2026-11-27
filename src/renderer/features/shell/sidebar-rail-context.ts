import { createContext } from "react"

// Set while the sidebar is collapsed to its icon rail, where rows show only
// their artwork. A state the rail has no room to explain, such as a failed
// load, offers to expand the sidebar.
export interface SidebarRail {
  readonly expand: () => void
}

export const SidebarRailContext = createContext<SidebarRail | null>(null)
