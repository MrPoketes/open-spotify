import { X } from "lucide-react"
import { type ReactNode, type RefObject, memo, use, useId, useState } from "react"
import {
  defaultRightPaneWidth,
  maximumRightPaneWidth,
  minimumRightPaneWidth,
} from "../../../shared/right-pane-width"
import { RendererRuntimeContext } from "../../lib/renderer-runtime"
import { saveSetting } from "../../lib/saved-setting"
import { useStreamValue } from "../../lib/use-stream-value"
import { ErrorWithRetry } from "../../ui/error-with-retry"
import { IconButton } from "../../ui/icon-button"
import { LoadingMessage } from "../../ui/loading-message"
import { PaneDivider } from "../../ui/pane-divider"
import { PlayableItemSummary } from "../playback/playable-item-summary"
import type { PlayerQueue } from "../spotify/spotify-player-queue"
import { makeQueueContents } from "./queue-contents"
import { UpNextList } from "./up-next-list"

interface QueuePaneProps {
  readonly ref: RefObject<HTMLElement | null>
  readonly isOpen: boolean
  readonly savedWidth: number
  readonly onClose: () => void
}

// The width lives here, not in the shell, so that resizing re-renders only
// the pane. The pane stays mounted while closed so that opening it again
// keeps the width the user chose.
export function QueuePane({ ref, isOpen, savedWidth, onClose }: QueuePaneProps) {
  const runtime = use(RendererRuntimeContext)
  const [width, setWidth] = useState(savedWidth)
  const headingId = useId()

  if (!isOpen) {
    return null
  }
  return (
    <>
      <PaneDivider
        label="Resize queue"
        paneSide="right"
        paneWidth={width}
        minimumWidth={minimumRightPaneWidth}
        maximumWidth={maximumRightPaneWidth}
        defaultWidth={defaultRightPaneWidth}
        onResize={setWidth}
        onResizeEnd={(newWidth) => runtime.runFork(saveSetting("rightPaneWidth", newWidth))}
      />
      <aside
        ref={ref}
        aria-labelledby={headingId}
        tabIndex={-1}
        style={{ width }}
        className="flex shrink-0 flex-col overflow-hidden rounded-medium bg-surface"
      >
        <div className="flex h-14 shrink-0 items-center justify-between px-4">
          <h2 id={headingId} className="text-xl font-bold">
            Queue
          </h2>
          <IconButton label="Close queue" icon={X} onClick={onClose} />
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-4">
          <QueueBody />
        </div>
      </aside>
    </>
  )
}

// Dragging the divider changes the width on every pointer move, and
// re-rendering the whole queue each time made dragging slow.
const QueueBody = memo(function QueueBody() {
  const [contentsStream, setContentsStream] = useState(makeQueueContents)
  const contents = useStreamValue(contentsStream, { status: "loading" } as const)

  if (contents.status === "loading") {
    return (
      <div className="px-2">
        <LoadingMessage>Loading the queue…</LoadingMessage>
      </div>
    )
  }
  if (contents.status === "failed") {
    return (
      <div className="px-2">
        <ErrorWithRetry
          message="The queue didn't load."
          onRetry={() => setContentsStream(makeQueueContents())}
        />
      </div>
    )
  }
  if (contents.status === "unreachable") {
    return <QueueMessage title="Can't reach Spotify right now." />
  }
  if (contents.status === "noActiveDevice") {
    return (
      <QueueMessage title="No device is playing">
        Choose a device in the now-playing bar to see what plays next.
      </QueueMessage>
    )
  }
  return <QueueSections queue={contents.queue} />
})

function QueueSections({ queue: { currentlyPlaying, upNext } }: { readonly queue: PlayerQueue }) {
  if (currentlyPlaying === null && upNext.length === 0) {
    return (
      <QueueMessage title="Your queue is empty">
        Play something in Spotify, and what plays next shows up here.
      </QueueMessage>
    )
  }
  return (
    <div className="flex flex-col gap-4">
      {currentlyPlaying !== null && (
        <QueueSection heading="Now playing">
          <div className="px-2 py-1">
            <PlayableItemSummary item={currentlyPlaying} />
          </div>
        </QueueSection>
      )}
      <QueueSection heading="Next up">
        <UpNextList items={upNext} />
      </QueueSection>
    </div>
  )
}

interface QueueSectionProps {
  readonly heading: string
  readonly children: ReactNode
}

function QueueSection({ heading, children }: QueueSectionProps) {
  const headingId = useId()
  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-1">
      <h3 id={headingId} className="px-2 text-sm font-bold">
        {heading}
      </h3>
      {children}
    </section>
  )
}

interface QueueMessageProps {
  readonly title: string
  readonly children?: ReactNode
}

function QueueMessage({ title, children }: QueueMessageProps) {
  return (
    <div className="flex flex-col gap-1 px-2 text-sm">
      <p className="font-semibold">{title}</p>
      {children !== undefined && <p className="text-muted">{children}</p>}
    </div>
  )
}
