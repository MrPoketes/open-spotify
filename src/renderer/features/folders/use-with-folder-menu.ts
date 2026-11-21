import type { GridCard } from "../../ui/card-grid"
import { useAddToFolder } from "./use-add-to-folder"

// Gives a card the Add to folder context menu for the Spotify item it shows.
// A card's title and artwork are the item's name and images.
export function useWithFolderMenu() {
  const addToFolder = useAddToFolder()
  return (card: GridCard, uri: string): GridCard => ({
    ...card,
    menuItems: [addToFolder({ uri, name: card.title, images: card.artwork })],
  })
}
