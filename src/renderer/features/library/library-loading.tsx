import { Skeleton } from "../../ui/skeleton"

const skeletonRowKeys = [0, 1, 2, 3, 4, 5]

// Screen readers hear the message; everyone else sees rows shaped like the
// library's, so the sidebar does not jump when the entries arrive.
export function LibraryLoading() {
  return (
    <div className="flex flex-col pt-4">
      <output className="sr-only">Loading your library…</output>
      {skeletonRowKeys.map((key) => (
        <div key={key} className="flex items-center gap-3 px-2 py-1">
          <Skeleton className="size-10 rounded-small" />
          <div className="flex flex-1 flex-col gap-2">
            <Skeleton className="h-3 w-3/5 rounded-small" />
            <Skeleton className="h-2.5 w-2/5 rounded-small" />
          </div>
        </div>
      ))}
    </div>
  )
}
