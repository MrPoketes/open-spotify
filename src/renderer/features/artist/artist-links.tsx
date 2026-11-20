import { Link } from "@tanstack/react-router"
import { Fragment } from "react"
import type { SimplifiedArtist } from "../spotify/spotify-artist"

interface ArtistLinksProps {
  readonly artists: ReadonlyArray<SimplifiedArtist>
  // In a track list only the row that is the list's tab stop puts its links
  // in the tab order.
  readonly tabIndex?: 0 | -1
}

// Each artist's name links to their page on its own. Local files have no
// artist page, so their artists are plain text.
export function ArtistLinks({ artists, tabIndex }: ArtistLinksProps) {
  return artists.map((artist, index) => (
    <Fragment key={artist.id ?? artist.name}>
      {index > 0 ? ", " : null}
      {artist.id === null ? (
        artist.name
      ) : (
        <Link
          to="/artist/$artistId"
          params={{ artistId: artist.id }}
          tabIndex={tabIndex}
          className="transition-colors duration-120 ease-out hover:text-foreground hover:underline"
        >
          {artist.name}
        </Link>
      )}
    </Fragment>
  ))
}
