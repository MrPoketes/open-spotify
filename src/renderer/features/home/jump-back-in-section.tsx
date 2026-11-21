import { type LoadState, useLoad } from "../../lib/use-load"
import { CardGrid } from "../../ui/card-grid"
import { LoadingMessage } from "../../ui/loading-message"
import type { SpotifyApiError } from "../spotify/spotify-api"
import { SpotifyLoadFailure } from "../spotify/spotify-load-failure"
import type { PlayHistory } from "../spotify/spotify-play-history"
import { HomeSection } from "./home-section"
import { type PageContext, loadJumpBackInCards, recentPageContexts } from "./jump-back-in"
import { LoadedContent } from "./loaded-content"

const title = "Jump back in"
const loadingMessage = "Loading what you played from…"
const failureMessage = "Jump back in didn't load."

function JumpBackInCards({ contexts }: { readonly contexts: ReadonlyArray<PageContext> }) {
  const { state, retry } = useLoad(loadJumpBackInCards(contexts), "Jump back in failed to load")
  if (state.status === "loaded" && state.value.length === 0) {
    return null
  }
  return (
    <HomeSection title={title}>
      <LoadedContent
        state={state}
        loadingMessage={loadingMessage}
        failureMessage={failureMessage}
        onRetry={retry}
      >
        {(cards) => <CardGrid label={title} cards={cards} />}
      </LoadedContent>
    </HomeSection>
  )
}

interface JumpBackInSectionProps {
  readonly recentlyPlayed: LoadState<ReadonlyArray<PlayHistory>, SpotifyApiError>
  readonly onRetry: () => void
}

// Cards for the albums, playlists, and artists the user recently played from.
// Each one is looked up once the play history has loaded.
export function JumpBackInSection({ recentlyPlayed, onRetry }: JumpBackInSectionProps) {
  if (recentlyPlayed.status === "loading") {
    return (
      <HomeSection title={title}>
        <LoadingMessage>{loadingMessage}</LoadingMessage>
      </HomeSection>
    )
  }
  if (recentlyPlayed.status === "failed") {
    return (
      <HomeSection title={title}>
        <SpotifyLoadFailure
          error={recentlyPlayed.error}
          message={failureMessage}
          onRetry={onRetry}
        />
      </HomeSection>
    )
  }
  const contexts = recentPageContexts(recentlyPlayed.value)
  return contexts.length === 0 ? null : <JumpBackInCards contexts={contexts} />
}
