import { useRouter } from "@tanstack/react-router"
import { ChevronLeft, ChevronRight, Search } from "lucide-react"
import { IconButton } from "../../ui/icon-button"

export function TopBar() {
  const router = useRouter()

  return (
    <header className="flex h-14 shrink-0 items-center gap-2 px-4">
      <IconButton label="Go back" icon={ChevronLeft} onClick={() => router.history.back()} />
      <IconButton label="Go forward" icon={ChevronRight} onClick={() => router.history.forward()} />
      <div className="relative ml-2 w-full max-w-sm">
        <Search
          aria-hidden
          size={16}
          className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted"
        />
        <input
          type="search"
          aria-label="Search"
          placeholder="Search"
          className="h-8 w-full rounded-full bg-surface-raised pr-3 pl-8 text-sm placeholder:text-muted"
        />
      </div>
    </header>
  )
}
