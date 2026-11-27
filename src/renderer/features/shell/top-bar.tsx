import { Link, useRouter } from "@tanstack/react-router"
import { ChevronLeft, ChevronRight, House, Settings } from "lucide-react"
import { Button } from "../../ui/button"
import { buttonVariants } from "../../ui/button-variants"
import { SearchField } from "../search/search-field"

const iconLinkClassName = buttonVariants({ variant: "ghost", size: "icon" })

export function TopBar() {
  const router = useRouter()

  return (
    <header className="absolute inset-x-0 top-0 z-10 flex h-14 items-center gap-1 px-4 solid-once-scrolled">
      <Link to="/" aria-label="Home" title="Home" className={iconLinkClassName}>
        <House aria-hidden size={20} />
      </Link>
      <Button
        variant="ghost"
        size="icon"
        aria-label="Go back"
        title="Go back"
        onClick={() => router.history.back()}
      >
        <ChevronLeft aria-hidden size={20} />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        aria-label="Go forward"
        title="Go forward"
        onClick={() => router.history.forward()}
      >
        <ChevronRight aria-hidden size={20} />
      </Button>
      <div className="ml-3 flex min-w-0 flex-1">
        <SearchField />
      </div>
      <Link to="/settings" aria-label="Settings" title="Settings" className={iconLinkClassName}>
        <Settings aria-hidden size={20} />
      </Link>
    </header>
  )
}
