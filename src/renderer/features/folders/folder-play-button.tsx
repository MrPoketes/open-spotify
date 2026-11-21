import { Play } from "lucide-react"
import { useId } from "react"
import type { Folder } from "../../../shared/folders"
import { formatCount } from "../../ui/format-count"
import { PagePlayButton } from "../playback/page-play-button"
import { usePlayerCommandFromPage } from "../playback/use-player-command-from-page"

interface FolderPlayButtonProps {
  readonly folder: Folder
  // At least one, in folder order.
  readonly trackUris: ReadonlyArray<string>
}

export function FolderPlayButton({ folder, trackUris }: FolderPlayButtonProps) {
  const sendCommand = usePlayerCommandFromPage()
  const explanationId = useId()
  const leavesItemsOut = trackUris.length < folder.entries.length
  return (
    <>
      <PagePlayButton
        label={`Play ${folder.name}`}
        icon={Play}
        describedBy={leavesItemsOut ? explanationId : undefined}
        onClick={() =>
          sendCommand(
            (player) => player.startPlayback({ uris: trackUris }),
            `Couldn't play ${folder.name}.`,
          )
        }
      />
      {leavesItemsOut && (
        <p id={explanationId} className="text-sm text-muted">
          {`Plays the folder's ${formatCount(trackUris.length, "track", "tracks")}. Spotify can't queue the other items.`}
        </p>
      )}
    </>
  )
}
