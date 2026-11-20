import { Link, useRouter } from "@tanstack/react-router"
import { ChevronLeft, ChevronRight, Settings } from "lucide-react"
import { IconButton } from "../../ui/icon-button"
import { SearchField } from "../search/search-field"

export function TopBar() {
  const router = useRouter()

  return (
    <header className="flex h-14 shrink-0 items-center gap-2 px-4">
      <IconButton label="Go back" icon={ChevronLeft} onClick={() => router.history.back()} />
      <IconButton label="Go forward" icon={ChevronRight} onClick={() => router.history.forward()} />
      <SearchField />
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
