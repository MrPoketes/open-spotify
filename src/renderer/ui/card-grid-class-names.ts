// Cards stand artwork above the name; tiles put small artwork beside it, so a
// row of shortcuts takes little height.
export type CardGridLayout = "cards" | "tiles"

// Loading skeletons use the same grids, so the page does not shift when the
// cards arrive.
export const cardGridClassNames: Record<CardGridLayout, string> = {
  cards: "grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-6",
  tiles: "grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-2",
}
