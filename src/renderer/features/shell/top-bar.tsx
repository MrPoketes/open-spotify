import { Link, useRouter } from "@tanstack/react-router"
import { ChevronLeft, ChevronRight, House, Settings } from "lucide-react"
import { buttonVariants } from "../../ui/button-variants"
import { IconButton } from "../../ui/icon-button"
import { topBarHeight } from "../../ui/main-view-insets"
import { SearchField } from "../search/search-field"

const iconLinkClassName = buttonVariants({ variant: "ghost", size: "icon" })

export function TopBar() {
  const router = useRouter()

  return (
    <header
      style={{ height: topBarHeight }}
      className="absolute inset-x-0 top-0 z-10 flex items-center gap-1 px-4 solid-once-scrolled"
    >
      <Link to="/" aria-label="Home" title="Home" className={iconLinkClassName}>
        <House aria-hidden size={20} />
      </Link>
      <IconButton label="Go back" icon={ChevronLeft} onClick={() => router.history.back()} />
      <IconButton label="Go forward" icon={ChevronRight} onClick={() => router.history.forward()} />
      <div className="ml-3 flex min-w-0 flex-1">
        <SearchField />
      </div>
      <Link to="/settings" aria-label="Settings" title="Settings" className={iconLinkClassName}>
        <Settings aria-hidden size={20} />
      </Link>
    </header>
  )
}
