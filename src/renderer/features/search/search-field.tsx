import { useRouter, type ParsedLocation } from "@tanstack/react-router"
import { Option, Schema } from "effect"
import { Search } from "lucide-react"
import { use, useEffect, useRef, useState, type KeyboardEvent } from "react"
import { attemptNavigation } from "../../lib/attempt-navigation"
import { RendererRuntimeContext } from "../../lib/renderer-runtime"
import { IsMacContext } from "../shortcuts/is-mac-context"
import { ariaKeyShortcut } from "../shortcuts/key-combo"
import { shortcutKeys, windowShortcuts } from "../shortcuts/keyboard-shortcuts"
import { useKeyboardShortcut } from "../shortcuts/use-keyboard-shortcut"
import { SearchParams } from "./search-params"

// Long enough that a word typed at a normal pace sends one search, short
// enough that results seem to follow the typing.
const typingPauseMs = 300

const decodeSearchParams = Schema.decodeUnknownOption(SearchParams)

// The query a page shows if it is the search page, or null for any other page.
const queryShownAt = ({ pathname, search }: ParsedLocation) => {
  if (pathname !== "/search") {
    return null
  }
  return decodeSearchParams(search).pipe(
    Option.map(({ q }) => q ?? ""),
    Option.getOrElse(() => ""),
  )
}

export function SearchField() {
  const runtime = use(RendererRuntimeContext)
  const isMac = use(IsMacContext)
  const router = useRouter()
  const [text, setText] = useState(() => queryShownAt(router.state.location) ?? "")
  const input = useRef<HTMLInputElement>(null)
  const sentQuery = useRef(queryShownAt(router.state.location))
  const pendingSearch = useRef<ReturnType<typeof setTimeout>>(undefined)
  useKeyboardShortcut("focusSearch", () => input.current?.focus())

  // The search the field sent may arrive while the user types on, so it
  // changes nothing. Any other page means the user went elsewhere: a search
  // still waiting to be sent no longer applies, and a search page reached with
  // Back or Forward shows its query in the field. Away from search the field
  // can be cleared without sending anything, so what it sent last is
  // forgotten there.
  useEffect(
    () =>
      router.subscribe("onBeforeNavigate", ({ toLocation, hrefChanged }) => {
        const shownQuery = queryShownAt(toLocation)
        if (!hrefChanged || (shownQuery !== null && shownQuery === sentQuery.current)) {
          return
        }
        clearTimeout(pendingSearch.current)
        sentQuery.current = shownQuery
        if (shownQuery !== null) {
          setText(shownQuery)
        }
      }),
    [router],
  )

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
    runtime.runFork(
      attemptNavigation(() =>
        router.navigate({
          to: "/search",
          search: query === "" ? {} : { q: query },
          replace: isOnSearchPage,
        }),
      ),
    )
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
        aria-keyshortcuts={ariaKeyShortcut(shortcutKeys(windowShortcuts.focusSearch, isMac), isMac)}
        placeholder="Search"
        value={text}
        onChange={(event) => changeText(event.target.value)}
        onKeyDown={clearOnEscape}
        className="h-8 w-full rounded-small bg-surface-raised pr-3 pl-8 text-base shadow-raised placeholder:text-muted"
      />
    </div>
  )
}
