import { useLoad, type LoadState } from "../../lib/use-load"
import { CardGrid } from "../../ui/card-grid"
import { LoadingSkeleton } from "../../ui/loading-skeleton"
import { PageSection } from "../../ui/page-section"
import { useWithFolderMenu } from "../folders/use-with-folder-menu"
import type { SpotifyApiError } from "../spotify/spotify-api"
import type { PlayHistory } from "../spotify/spotify-play-history"
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
    <PageSection title={title}>
      <LoadedContent
        state={state}
        loadingMessage={loadingMessage}
        shape="tiles"
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
    </PageSection>
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
      <PageSection title={title}>
        <LoadingSkeleton message={loadingMessage} shape="tiles" />
      </PageSection>
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
