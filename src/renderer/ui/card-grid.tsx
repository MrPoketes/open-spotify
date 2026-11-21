import { Link, type LinkProps } from "@tanstack/react-router"
import type { LucideIcon } from "lucide-react"
import type { Ref } from "react"
import { Artwork, type ArtworkSource } from "./artwork"
import type { MenuItem } from "./menu-list"
import { RovingList } from "./roving-list"
import { useContextMenu } from "./use-context-menu"
import type { RovingRowProps, RowFocusHandle } from "./use-roving-focus"

export interface GridCard {
  readonly key: string
  readonly link: LinkProps
  readonly title: string
  readonly details: string
  // Widest first, the order Spotify lists image sizes in.
  readonly artwork: ReadonlyArray<ArtworkSource>
  readonly placeholderIcon: LucideIcon
  // Artists have round artwork, which tells them apart from everything else.
  readonly roundArtwork?: boolean
  // What the user can do with the card's item, offered in its context menu.
  readonly menuItems?: ReadonlyArray<MenuItem>
}

interface CardGridProps {
  readonly id?: string
  readonly label: string
  readonly cards: ReadonlyArray<GridCard>
  readonly ref?: Ref<HTMLUListElement>
  readonly rowFocusRef?: Ref<RowFocusHandle>
}

// Its columns must match useCardGridColumnCount.
export function CardGrid({ id, label, cards, ref, rowFocusRef }: CardGridProps) {
  return (
    <RovingList
      id={id}
      ref={ref}
      rowFocusRef={rowFocusRef}
      label={label}
      rows={cards}
      rowKey={(card) => card.key}
      className="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-6"
      renderRow={(card, rovingProps) => <CardLink card={card} rovingProps={rovingProps} />}
    />
  )
}

interface CardLinkProps {
  readonly card: GridCard
  readonly rovingProps: RovingRowProps
}

function CardLink({ card, rovingProps }: CardLinkProps) {
  const cardMenu = useContextMenu(
    card.menuItems === undefined
      ? null
      : { label: `Actions for ${card.title}`, items: card.menuItems },
  )

  return (
    <>
      <Link
        {...card.link}
        {...rovingProps}
        onContextMenu={cardMenu.openAtPointer}
        onKeyDown={cardMenu.openWithKeyboard}
        className="flex flex-col gap-2 rounded-medium p-3 transition duration-120 ease-out hover:bg-surface-raised hover:shadow-raised"
      >
        <Artwork
          sources={card.artwork}
          size="fill"
          className={card.roundArtwork ? "rounded-full" : "rounded-medium"}
          placeholderIcon={card.placeholderIcon}
        />
        <span className="truncate text-sm font-semibold">{card.title}</span>
        <span className="truncate text-xs text-muted">{card.details}</span>
      </Link>
      {cardMenu.menu}
    </>
  )
}
