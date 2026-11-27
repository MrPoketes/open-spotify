import { spotifyRedirectUri } from "../../../shared/spotify-redirect-uri"
import { CopyButton } from "../../ui/copy-button"
import { SpotifyDashboardLink } from "../spotify/spotify-dashboard-link"

export function SpotifyAppSteps() {
  return (
    <ol className="flex list-decimal flex-col gap-3 pl-6">
      <li>
        Open the <SpotifyDashboardLink /> and choose Create app. Any name and description will do.
      </li>
      <li className="flex flex-col gap-2">
        Add this Redirect URI:
        <span className="flex items-center gap-2 self-start rounded-small bg-surface-raised py-1 pr-1 pl-3">
          <code className="text-sm">{spotifyRedirectUri}</code>
          <CopyButton text={spotifyRedirectUri} subject="Redirect URI" />
        </span>
      </li>
      <li>Under the APIs the app uses, select Web API and Web Playback SDK, then save the app.</li>
      <li>
        In the app&apos;s settings, open User Management and add the name and email address of your
        Spotify account.
      </li>
      <li>Copy the Client ID from the app&apos;s settings and paste it below.</li>
    </ol>
  )
}
