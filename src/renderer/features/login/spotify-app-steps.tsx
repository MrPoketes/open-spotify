import type { ReactNode } from "react"
import { spotifyRedirectUri } from "../../../shared/spotify-redirect-uri"
import { CopyButton } from "../../ui/copy-button"
import { SpotifyDashboardLink } from "../spotify/spotify-dashboard-link"

// The number is written out rather than left to the list marker, which a flex
// list item drops.
function SetupStep({
  number,
  children,
}: {
  readonly number: number
  readonly children: ReactNode
}) {
  return (
    <li className="flex gap-3 py-2.5">
      <span aria-hidden className="w-4 shrink-0 text-right font-semibold text-muted tabular-nums">
        {number}
      </span>
      <div className="flex min-w-0 flex-col items-start gap-2">{children}</div>
    </li>
  )
}

export function SpotifyAppSteps() {
  return (
    <ol className="flex flex-col divide-y divide-border border-y border-border text-sm">
      <SetupStep number={1}>
        <p>
          Open the <SpotifyDashboardLink /> and choose Create app. Any name and description will do.
        </p>
      </SetupStep>
      <SetupStep number={2}>
        <p>Add this Redirect URI:</p>
        <span className="flex max-w-full items-center gap-2 rounded-medium bg-surface-raised py-1 pr-1 pl-3">
          <code className="min-w-0 font-semibold break-all">{spotifyRedirectUri}</code>
          <CopyButton text={spotifyRedirectUri} subject="Redirect URI" />
        </span>
      </SetupStep>
      <SetupStep number={3}>
        <p>Under the APIs the app uses, select Web API and Web Playback SDK, then save the app.</p>
      </SetupStep>
      <SetupStep number={4}>
        <p>
          In the app&apos;s settings, open User Management and add the name and email address of
          your Spotify account.
        </p>
      </SetupStep>
      <SetupStep number={5}>
        <p>Copy the Client ID from the app&apos;s settings and paste it below.</p>
      </SetupStep>
    </ol>
  )
}
