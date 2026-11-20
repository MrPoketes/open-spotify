import { Disc3, Heart, ListMusic, type LucideIcon, MicVocal, Radio } from "lucide-react"
import { useState } from "react"
import type { Image } from "../spotify/spotify-image"
import type { LibraryEntryKind } from "./library-entries"

const placeholderIcons: Record<LibraryEntryKind, LucideIcon> = {
  "liked-songs": Heart,
  playlist: ListMusic,
  album: Disc3,
  artist: MicVocal,
  show: Radio,
}

// Spotify lists several sizes of most images, widest first. With srcset the
// browser fetches the smallest one that is sharp at 40 px on the current
// screen, instead of a 640 px cover for every row.
const sourceSet = (images: ReadonlyArray<Image>) =>
  images.flatMap(({ url, width }) => (width === null ? [] : [`${url} ${width}w`])).join(", ")

interface LibraryEntryArtworkProps {
  readonly kind: LibraryEntryKind
  readonly images: ReadonlyArray<Image>
}

export function LibraryEntryArtwork({ kind, images }: LibraryEntryArtworkProps) {
  const [failedToLoad, setFailedToLoad] = useState(false)
  const shape = kind === "artist" ? "rounded-full" : "rounded-small"
  const [largestImage] = images

  if (largestImage === undefined || failedToLoad) {
    const PlaceholderIcon = placeholderIcons[kind]
    const colors =
      kind === "liked-songs" ? "bg-accent text-on-accent" : "bg-surface-raised text-muted"
    return (
      <span className={`flex size-10 shrink-0 items-center justify-center ${shape} ${colors}`}>
        <PlaceholderIcon aria-hidden size={16} />
      </span>
    )
  }

  return (
    <img
      src={largestImage.url}
      srcSet={sourceSet(images)}
      sizes="40px"
      alt=""
      loading="lazy"
      onError={() => setFailedToLoad(true)}
      className={`size-10 shrink-0 object-cover ${shape}`}
    />
  )
}
