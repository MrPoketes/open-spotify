import { useLoad, type LoadState } from "../../lib/use-load"
import { CardGrid } from "../../ui/card-grid"
import { useWithFolderMenu } from "../folders/use-with-folder-menu"
import type { SpotifyApiError } from "../spotify/spotify-api"
import type { PlayHistory } from "../spotify/spotify-play-history"
import { HomeLoading } from "./home-loading"
import { HomeSection } from "./home-section"
import { loadJumpBackInCards, recentPageContexts, type PageContext } from "./jump-back-in"
import { LoadedContent } from "./loaded-content"

const title = "Jump back in"
const loadingMessage = "Loading what you played from…"
const failureMessage = "Jump back in didn't load."

function JumpBackInCards({ contexts }: { readonly contexts: ReadonlyArray<PageContext> }) {
  const { state, retry } = useLoad(loadJumpBackInCards(contexts), "Jump back in failed to load")
  const withFolderMenu = useWithFolderMenu()
  if (state.status === "loaded" && state.value.length === 0) {
    return null
  }
  return (
    <HomeSection title={title}>
      <LoadedContent
        state={state}
        loadingMessage={loadingMessage}
        skeleton="tiles"
        failureMessage={failureMessage}
        onRetry={retry}
      >
        {(cards) => (
          <CardGrid
            label={title}
            layout="tiles"
            cards={cards.map(({ uri, card }) => withFolderMenu(card, uri))}
          />
        )}
      </LoadedContent>
    </HomeSection>
  )
}

interface JumpBackInSectionProps {
  readonly recentlyPlayed: LoadState<ReadonlyArray<PlayHistory>, SpotifyApiError>
}

// Cards for the albums, playlists, and artists the user recently played from.
// Each one is looked up once the play history has loaded.
export function JumpBackInSection({ recentlyPlayed }: JumpBackInSectionProps) {
  if (recentlyPlayed.status === "loading") {
    return (
      <HomeSection title={title}>
        <HomeLoading message={loadingMessage} skeleton="tiles" />
      </HomeSection>
    )
  }
  // Recently played reports a failed play history, with the Retry that
  // reloads it for both sections, so the page says it once.
  if (recentlyPlayed.status === "failed") {
    return null
  }
  const contexts = recentPageContexts(recentlyPlayed.value)
  return contexts.length === 0 ? null : <JumpBackInCards contexts={contexts} />
}
