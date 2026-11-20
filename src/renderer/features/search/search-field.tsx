import { useLocation, useRouter } from "@tanstack/react-router"
import { Search } from "lucide-react"
import { type KeyboardEvent, type RefObject, useEffect, useRef, useState } from "react"

// Long enough that a word typed at a normal pace sends one search, short
// enough that results seem to follow the typing.
const typingPauseMs = 300

const isTextEntry = (target: EventTarget | null) =>
  target instanceof HTMLElement &&
  (target.isContentEditable || target.matches("input, textarea, select"))

function useSlashToFocus(input: RefObject<HTMLInputElement | null>) {
  useEffect(() => {
    const focusSearch = (event: globalThis.KeyboardEvent) => {
      if (event.key !== "/" || event.ctrlKey || event.metaKey || event.altKey) {
        return
      }
      if (isTextEntry(event.target)) {
        return
      }
      event.preventDefault()
      input.current?.focus()
    }
    window.addEventListener("keydown", focusSearch)
    return () => window.removeEventListener("keydown", focusSearch)
  }, [input])
}

// The query of the search page on screen, or null on any other page.
function useShownQuery() {
  const location = useLocation()
  return location.pathname === "/search" ? (location.search.q ?? "") : null
}

export function SearchField() {
  const router = useRouter()
  const shownQuery = useShownQuery()
  const [text, setText] = useState(shownQuery ?? "")
  const input = useRef<HTMLInputElement>(null)
  const sentQuery = useRef(shownQuery)
  const pendingSearch = useRef<ReturnType<typeof setTimeout>>(undefined)
  useSlashToFocus(input)

  // Back and forward can show another search than the one typed last, and the
  // field follows it. A query the field sent itself may arrive while the user
  // types on, so it must not overwrite the field.
  useEffect(() => {
    if (shownQuery !== null && shownQuery !== sentQuery.current) {
      sentQuery.current = shownQuery
      setText(shownQuery)
    }
  }, [shownQuery])

  useEffect(() => () => clearTimeout(pendingSearch.current), [])

  // Typing on another page opens a new search page, which Back leaves; on the
  // search page each query replaces the last, so Back does not step through
  // every pause in the typing.
  const search = (query: string) => {
    const isOnSearchPage = router.state.location.pathname === "/search"
    if (query === "" && !isOnSearchPage) {
      return
    }
    sentQuery.current = query
    void router.navigate({
      to: "/search",
      search: query === "" ? {} : { q: query },
      replace: isOnSearchPage,
    })
  }

  const changeText = (nextText: string) => {
    setText(nextText)
    clearTimeout(pendingSearch.current)
    pendingSearch.current = setTimeout(() => search(nextText.trim()), typingPauseMs)
  }

  const clearOnEscape = (event: KeyboardEvent) => {
    if (event.key === "Escape") {
      event.preventDefault()
      changeText("")
    }
  }

  return (
    <div className="relative ml-2 w-full max-w-sm">
      <Search
        aria-hidden
        size={16}
        className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted"
      />
      <input
        ref={input}
        type="search"
        aria-label="Search"
        aria-keyshortcuts="/"
        placeholder="Search"
        value={text}
        onChange={(event) => changeText(event.target.value)}
        onKeyDown={clearOnEscape}
        className="h-8 w-full rounded-small bg-surface-raised pr-3 pl-8 text-base shadow-raised placeholder:text-muted"
      />
    </div>
  )
}
