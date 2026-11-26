import { Ellipsis, type LucideIcon } from "lucide-react"
import { useId, type ReactNode } from "react"
import { Artwork, type ArtworkSource } from "./artwork"
import { MenuButton } from "./menu-button"
import type { MenuItem } from "./menu-list"
import { useContextMenu } from "./use-context-menu"

const coverSize = 192

interface PageCover {
  // Widest first, the order Spotify lists image sizes in.
  readonly sources: ReadonlyArray<ArtworkSource>
  readonly placeholderIcon: LucideIcon
  readonly placeholderColors?: string
  // Artists have round artwork and everything else square, so the two are
  // told apart at a glance.
  readonly isRound?: boolean
}

interface PageHeaderProps {
  // What the page shows, such as "Playlist" or "Show".
  readonly kind: string
  readonly title: string
  readonly cover: PageCover
  // The lines under the title, such as a description and counts.
  readonly children: ReactNode
  // What the user can do with the page's item, offered both in the header's
  // context menu and in a More options button under it. Pages whose item
  // nothing can act on, such as Liked Songs, have none.
  readonly menuItems?: ReadonlyArray<MenuItem>
  readonly playButton?: ReactNode
}

export function PageHeader({
  kind,
  title,
  cover,
  children,
  menuItems,
  playButton,
}: PageHeaderProps) {
  const { isRound = false, ...artwork } = cover
  const titleId = useId()
  const headerMenu = useContextMenu(
    menuItems === undefined ? null : { label: `Actions for ${title}`, items: menuItems },
  )
  const { opensMenu } = headerMenu

  return (
    <>
      {/* oxlint-disable-next-line jsx-a11y/no-noninteractive-element-interactions -- The header only opens its context menu; the menu handles every interaction, as ContextMenu's wrapper does. */}
      <header
        // A header inside the main view is a generic element, which cannot
        // have a name, so a group named after the title says what the focused
        // header is.
        // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- The tags the rule suggests (fieldset, details, hgroup, ...) mean form fields, a disclosure, or headings only, not a page header with a cover.
        role="group"
        aria-labelledby={titleId}
        aria-keyshortcuts={opensMenu ? "Shift+F10" : undefined}
        // oxlint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- Shift+F10 and the context-menu key open the header's menu only while it has focus, so it must be reachable with Tab.
        tabIndex={opensMenu ? 0 : undefined}
        onContextMenu={headerMenu.openAtPointer}
        onKeyDown={headerMenu.openWithKeyboard}
        className="flex items-end gap-6 rounded-medium"
      >
        <Artwork
          {...artwork}
          size={coverSize}
          className={`${isRound ? "rounded-full" : "rounded-medium"} shadow-raised`}
        />
        <div className="flex min-w-0 flex-col gap-2">
          <p className="text-xs font-semibold text-muted">{kind}</p>
          <h1 id={titleId} className="font-display text-5xl font-bold break-words">
            {title}
          </h1>
          {children}
        </div>
      </header>
      {headerMenu.menu}
      <PageControls menuItems={menuItems} playButton={playButton} />
    </>
  )
}

interface PageControlsProps {
  readonly menuItems: ReadonlyArray<MenuItem> | undefined
  readonly playButton: ReactNode
}

function PageControls({ menuItems, playButton }: PageControlsProps) {
  if (menuItems === undefined && playButton === undefined) {
    return null
  }
  return (
    <div className="flex items-center gap-4">
      {playButton}
      {menuItems === undefined ? null : (
        <MenuButton label="More options" icon={Ellipsis} items={menuItems} menuAlignment="left" />
      )}
    </div>
  )
}
