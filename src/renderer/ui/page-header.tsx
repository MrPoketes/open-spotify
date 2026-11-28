import { Ellipsis, type LucideIcon } from "lucide-react"
import { useId, type ReactNode } from "react"
import { Artwork, type ArtworkSource } from "./artwork"
import { ArtworkWash } from "./artwork-wash"
import { ContextMenu } from "./context-menu"
import { openedContextMenu } from "./context-menu-content"
import { MenuButton } from "./menu-button"
import type { MenuItem } from "./menu-items"
import { pageTitleClassName } from "./page-title-class-name"
import { Skeleton } from "./skeleton"

const coverSize = 224

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
  // What the page shows, such as "Playlist" or "Show". It leads the details
  // line, because a label above a heading is noise (docs/design.md, Page
  // header).
  readonly kind: string
  readonly title: string
  readonly cover: PageCover
  // Who made the item, such as an album's artists as links, after the kind.
  readonly byline?: ReactNode
  // The rest of the details line, such as counts and the total length.
  readonly details: ReadonlyArray<string>
  // Spotify sends an empty description for an item that has none.
  readonly description?: string
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
  byline,
  details,
  description,
  menuItems,
  playButton,
}: PageHeaderProps) {
  const { isRound = false, ...artwork } = cover
  const titleId = useId()
  const headerMenu = openedContextMenu(
    menuItems === undefined ? null : { label: `Actions for ${title}`, items: menuItems },
  )
  const opensMenu = headerMenu !== null

  return (
    <div className="relative flex flex-col gap-6 pt-6">
      <ArtworkWash placement="page" sources={artwork.sources} />
      <ContextMenu menu={headerMenu}>
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
          className="flex items-end gap-6 rounded-medium"
        >
          <Artwork
            {...artwork}
            size={coverSize}
            className={`${isRound ? "rounded-full" : "rounded-medium"} shadow-raised`}
          />
          <div className="flex min-w-0 flex-col gap-3">
            <h1 id={titleId} className={pageTitleClassName}>
              {title}
            </h1>
            <p className="text-sm text-muted">
              <span className="font-semibold text-foreground">{kind}</span>
              {byline === undefined ? null : <> · {byline}</>}
              {details.map((detail) => ` · ${detail}`).join("")}
            </p>
            {description === undefined || description === "" ? null : (
              <p className="max-w-prose text-sm text-muted">{description}</p>
            )}
          </div>
        </header>
      </ContextMenu>
      <PageControls menuItems={menuItems} playButton={playButton} />
    </div>
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

interface PageHeaderLoadingProps {
  readonly message: string
  readonly isRound?: boolean
}

// Shaped like the header that replaces it, so the page keeps its layout when
// the item arrives. Screen readers hear the message; everyone else sees the
// skeleton.
export function PageHeaderLoading({ message, isRound = false }: PageHeaderLoadingProps) {
  return (
    <div className="flex items-end gap-6 pt-6">
      <output className="sr-only">{message}</output>
      <Skeleton
        // oxlint-disable-next-line open-spotify/no-fixed-style-lengths -- The skeleton holds the place of the cover Artwork, which takes its size in pixels because its srcset `sizes` cannot read a CSS variable.
        style={{ width: coverSize, height: coverSize }}
        className={`shrink-0 ${isRound ? "rounded-full" : ""}`}
      />
      <div className="flex grow flex-col gap-3">
        <Skeleton className="h-12 w-1/2" />
        <Skeleton className="h-4 w-1/3 rounded-small" />
      </div>
    </div>
  )
}
