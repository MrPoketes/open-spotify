import { Link, type LinkProps } from "@tanstack/react-router"
import type { LucideIcon } from "lucide-react"
import type { Ref } from "react"
import { Artwork, type ArtworkSource } from "./artwork"
import { useRovingFocus } from "./use-roving-focus"

export interface GridCard {
  readonly key: string
  readonly link: LinkProps
  readonly title: string
  readonly details: string
  // Widest first, the order Spotify lists image sizes in.
  readonly artwork: ReadonlyArray<ArtworkSource>
  readonly placeholderIcon: LucideIcon
}

interface CardGridProps {
  readonly id: string
  readonly label: string
  readonly cards: ReadonlyArray<GridCard>
  readonly ref: Ref<HTMLUListElement>
}

// Its columns must match useCardGridColumnCount.
export function CardGrid({ id, label, cards, ref }: CardGridProps) {
  const { onKeyDown, rowProps } = useRovingFocus(cards.length)
  return (
    // oxlint-disable-next-line jsx-a11y/no-noninteractive-element-interactions -- key presses bubble up from the focused card, and the grid moves focus between its cards: the roving focus docs/design.md requires for lists
    <ul
      id={id}
      ref={ref}
      onKeyDown={onKeyDown}
      aria-label={label}
      className="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-6"
    >
      {cards.map((card, index) => (
        <li key={card.key}>
          <Link
            {...card.link}
            {...rowProps(index)}
            className="flex flex-col gap-2 rounded-medium p-3 transition duration-120 ease-out hover:bg-surface-raised hover:shadow-raised"
          >
            <Artwork
              sources={card.artwork}
              size="fill"
              className="rounded-medium"
              placeholderIcon={card.placeholderIcon}
            />
            <span className="truncate text-sm font-semibold">{card.title}</span>
            <span className="truncate text-xs text-muted">{card.details}</span>
          </Link>
        </li>
      ))}
    </ul>
  )
}
