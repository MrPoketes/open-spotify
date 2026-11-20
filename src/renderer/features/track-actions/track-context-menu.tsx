import { useNavigate } from "@tanstack/react-router"
import { Effect } from "effect"
import { use } from "react"
import { RendererRuntimeContext } from "../../lib/renderer-runtime"
import { writeClipboardText } from "../../lib/write-clipboard-text"
import { ContextMenu } from "../../ui/context-menu"
import { useShowStatusMessage } from "../../ui/status-message-context"
import type { ContextMenuAnchor } from "../../ui/use-context-menu"
import type { TrackListEntry } from "../track-list/track-row"
import { trackMenuItems } from "./track-menu-items"

const trackLink = (trackId: string) => `https://open.spotify.com/track/${trackId}`

interface TrackContextMenuProps {
  readonly entry: TrackListEntry
  readonly anchor: ContextMenuAnchor
  readonly onClose: () => void
}

export function TrackContextMenu({ entry, anchor, onClose }: TrackContextMenuProps) {
  const runtime = use(RendererRuntimeContext)
  const navigate = useNavigate()
  const showStatusMessage = useShowStatusMessage()

  const copyLink = (trackId: string) =>
    runtime.runFork(
      writeClipboardText(trackLink(trackId)).pipe(
        Effect.andThen(
          Effect.sync(() => showStatusMessage({ text: "Link copied", isFailure: false })),
        ),
        Effect.catchTag("ClipboardWriteError", (error) =>
          Effect.logWarning("Could not copy the track link", error).pipe(
            Effect.andThen(
              Effect.sync(() =>
                showStatusMessage({ text: "Couldn't copy the link.", isFailure: true }),
              ),
            ),
          ),
        ),
      ),
    )

  const items = trackMenuItems(entry, {
    goToArtist: (artistId) =>
      runtime.runFork(
        Effect.promise(() => navigate({ to: "/artist/$artistId", params: { artistId } })),
      ),
    goToAlbum: (albumId) =>
      runtime.runFork(
        Effect.promise(() => navigate({ to: "/album/$albumId", params: { albumId } })),
      ),
    copyLink,
  })

  if (items.length === 0) {
    return null
  }
  return (
    <ContextMenu
      label={`Actions for ${entry.title}`}
      items={items}
      anchor={anchor}
      onClose={onClose}
    />
  )
}
