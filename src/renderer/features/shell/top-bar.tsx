import { Link, useRouter } from "@tanstack/react-router"
import { ChevronLeft, ChevronRight, Settings } from "lucide-react"
import { IconButton } from "../../ui/icon-button"
import { iconControlClassName } from "../../ui/icon-control-class-name"
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
        className={`ml-auto ${iconControlClassName}`}
      >
        <Settings aria-hidden size={20} />
      </Link>
    </header>
  )
}
