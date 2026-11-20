import { Link } from "@tanstack/react-router"
import type { ReactNode } from "react"
import type { RovingRowProps } from "../../ui/use-roving-focus"
import type { FolderEntryDescription } from "./folder-entry-description"

interface FolderEntryTargetProps {
  readonly page: FolderEntryDescription["page"]
  readonly rovingProps: RovingRowProps
  readonly className: string
  // Only links react to hover: an entry without a page does nothing when clicked.
  readonly hoverClassName: string
  readonly children: ReactNode
}

// The focusable element of a folder entry in the grid or the list: a link to
// the entry's page, or a plain row while that kind has no page.
export function FolderEntryTarget({
  page,
  rovingProps,
  className,
  hoverClassName,
  children,
}: FolderEntryTargetProps) {
  if (page === null) {
    return (
      <div {...rovingProps} className={className}>
        {children}
      </div>
    )
  }
  return (
    <Link
      {...page}
      {...rovingProps}
      className={`${className} transition duration-120 ease-out ${hoverClassName}`}
    >
      {children}
    </Link>
  )
}
