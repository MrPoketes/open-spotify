import { Schema } from "effect"
import { Episode } from "./spotify-episode"
import { Image } from "./spotify-image"
import { Paging } from "./spotify-paging"

const showFields = {
  id: Schema.String,
  name: Schema.String,
  images: Schema.Array(Image),
  uri: Schema.String,
}

// Since February 2026, development-mode responses leave out the publisher.
export const SavedShow = Schema.Struct({ show: Schema.Struct(showFields) })

export type SavedShow = typeof SavedShow.Type

export const Show = Schema.Struct({
  ...showFields,
  // Plain text: Spotify strips the HTML that `html_description` keeps.
  description: Schema.String,
})

export type Show = typeof Show.Type

// Spotify can send null in place of an episode it no longer serves, and one
// missing episode must not fail the whole page.
export const ShowEpisodePage = Paging(Schema.NullOr(Episode))

export type ShowEpisodePage = typeof ShowEpisodePage.Type
