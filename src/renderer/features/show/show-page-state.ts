import { Match } from "effect"
import type { Episode } from "../spotify/spotify-episode"
import type { Show, ShowEpisodePage } from "../spotify/spotify-show"

export type NextPageStatus = "idle" | "loading" | "failed"

interface LoadedShow {
  readonly _tag: "Loaded"
  readonly show: Show
  readonly episodes: ReadonlyArray<Episode>
  // Null once the last page has loaded.
  readonly nextOffset: number | null
  readonly nextPage: NextPageStatus
}

export type ShowPageState = { readonly _tag: "Loading" } | { readonly _tag: "Failed" } | LoadedShow

export type ShowPageEvent =
  | { readonly _tag: "ShowRequested" }
  | { readonly _tag: "ShowLoaded"; readonly show: Show; readonly firstPage: ShowEpisodePage }
  | { readonly _tag: "ShowFailed" }
  | { readonly _tag: "PageRequested" }
  | { readonly _tag: "PageLoaded"; readonly page: ShowEpisodePage; readonly offset: number }
  | { readonly _tag: "PageFailed" }

const availableEpisodes = (page: ShowEpisodePage) =>
  page.items.filter((episode) => episode !== null)

// The offset counts the null items too, because Spotify does.
const offsetAfter = (page: ShowEpisodePage, offset: number) =>
  page.next === null ? null : offset + page.items.length

const updateLoaded = (
  state: ShowPageState,
  update: (loaded: LoadedShow) => LoadedShow,
): ShowPageState => (state._tag === "Loaded" ? update(state) : state)

export const nextShowPageState = (state: ShowPageState, event: ShowPageEvent): ShowPageState =>
  Match.valueTags(event, {
    ShowRequested: (): ShowPageState => ({ _tag: "Loading" }),
    ShowLoaded: ({ show, firstPage }): ShowPageState => ({
      _tag: "Loaded",
      show,
      episodes: availableEpisodes(firstPage),
      nextOffset: offsetAfter(firstPage, 0),
      nextPage: "idle",
    }),
    ShowFailed: (): ShowPageState => ({ _tag: "Failed" }),
    PageRequested: () => updateLoaded(state, (loaded) => ({ ...loaded, nextPage: "loading" })),
    PageLoaded: ({ page, offset }) =>
      updateLoaded(state, (loaded) => ({
        ...loaded,
        episodes: [...loaded.episodes, ...availableEpisodes(page)],
        nextOffset: offsetAfter(page, offset),
        nextPage: "idle",
      })),
    PageFailed: () => updateLoaded(state, (loaded) => ({ ...loaded, nextPage: "failed" })),
  })
