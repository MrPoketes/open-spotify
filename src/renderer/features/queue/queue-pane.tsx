import { X } from "lucide-react"
import { type ReactNode, type RefObject, useId, useState } from "react"
import { useStreamValue } from "../../lib/use-stream-value"
import { ErrorWithRetry } from "../../ui/error-with-retry"
import { IconButton } from "../../ui/icon-button"
import { PlayableItemSummary } from "../playback/playable-item-summary"
import type { PlayerQueue } from "../spotify/spotify-player-queue"
import { makeQueueContents } from "./queue-contents"
import { UpNextList } from "./up-next-list"

interface QueuePaneProps {
  readonly ref: RefObject<HTMLElement | null>
  readonly width: number
  readonly onClose: () => void
}

export function QueuePane({ ref, width, onClose }: QueuePaneProps) {
  const headingId = useId()
  return (
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
  )
}

function QueueBody() {
  const [contentsStream, setContentsStream] = useState(makeQueueContents)
  const contents = useStreamValue(contentsStream, { status: "loading" } as const)

  if (contents.status === "loading") {
    return <output className="px-2 text-sm text-muted">Loading the queue…</output>
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
}

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
