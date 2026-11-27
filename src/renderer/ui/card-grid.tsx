import { Link, type LinkProps } from "@tanstack/react-router"
import type { LucideIcon } from "lucide-react"
import type { Ref } from "react"
import { Artwork, type ArtworkSource } from "./artwork"
import { cardGridClassNames, type CardGridLayout } from "./card-grid-class-names"
import { ContextMenu } from "./context-menu"
import type { MenuItem } from "./menu-items"
import { RovingList } from "./roving-list"
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
  readonly layout?: CardGridLayout
  readonly ref?: Ref<HTMLUListElement>
  readonly rowFocusRef?: Ref<RowFocusHandle>
}

// The cards layout's columns must match useCardGridColumnCount.
export function CardGrid({ id, label, cards, layout = "cards", ref, rowFocusRef }: CardGridProps) {
  return (
    <RovingList
      id={id}
      ref={ref}
      rowFocusRef={rowFocusRef}
      label={label}
      rows={cards}
      rowKey={(card) => card.key}
      className={cardGridClassNames[layout]}
      renderRow={(card, rovingProps) => (
        <CardLink card={card} layout={layout} rovingProps={rovingProps} />
      )}
    />
  )
}

const cardClassNames: Record<CardGridLayout, string> = {
  cards:
    "flex flex-col gap-3 rounded-large p-3 transition-colors duration-120 ease-out hover:bg-surface-raised",
  tiles:
    "flex h-16 items-center gap-3 overflow-hidden rounded-medium bg-surface-raised pr-3 transition-colors duration-120 ease-out hover:bg-surface-overlay",
}

// Artwork on a card is lifted off the page like a sleeve; on a tile it is the
// tile's edge. Artists are round in both.
const cardArtwork = (card: GridCard, layout: CardGridLayout) => {
  const isRound = card.roundArtwork === true
  if (layout === "cards") {
    return {
      size: "fill",
      className: isRound ? "rounded-full shadow-raised" : "rounded-medium shadow-raised",
    } as const
  }
  return isRound ? { size: 48, className: "ml-2 rounded-full" } : { size: 64, className: "" }
}

interface CardLinkProps {
  readonly card: GridCard
  readonly layout: CardGridLayout
  readonly rovingProps: RovingRowProps
}

function CardLink({ card, layout, rovingProps }: CardLinkProps) {
  const cardMenu =
    card.menuItems === undefined
      ? null
      : { label: `Actions for ${card.title}`, items: card.menuItems }

  return (
    <ContextMenu menu={cardMenu}>
      <Link {...card.link} {...rovingProps} className={cardClassNames[layout]}>
        <Artwork
          sources={card.artwork}
          placeholderIcon={card.placeholderIcon}
          {...cardArtwork(card, layout)}
        />
        <span className="flex min-w-0 flex-col gap-0.5">
          <span className="truncate text-sm font-semibold">{card.title}</span>
          <span className="truncate text-xs text-muted">{card.details}</span>
        </span>
      </Link>
    </ContextMenu>
  )
}
