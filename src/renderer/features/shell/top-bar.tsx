import { Link, useRouter } from "@tanstack/react-router"
import { ChevronLeft, ChevronRight, Search, Settings } from "lucide-react"
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
          className="h-8 w-full rounded-small bg-surface-raised pr-3 pl-8 text-base shadow-raised placeholder:text-muted"
        />
      </div>
      <Link
        to="/settings"
        aria-label="Settings"
        title="Settings"
        className="ml-auto flex size-8 shrink-0 items-center justify-center rounded-full text-muted transition-colors duration-120 ease-out hover:bg-surface-raised hover:text-foreground"
      >
        <Settings aria-hidden size={20} />
      </Link>
    </header>
  )
}
