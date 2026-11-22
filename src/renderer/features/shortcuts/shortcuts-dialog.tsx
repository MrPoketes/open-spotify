import { X } from "lucide-react"
import { use, useId, useRef } from "react"
import { IconButton } from "../../ui/icon-button"
import { IsMacContext } from "./is-mac-context"
import { keyComboLabels } from "./key-combo"
import {
  type KeyboardShortcut,
  rowShortcuts,
  type ShortcutGroupName,
  shortcutGroups,
  shortcutKeys,
  windowShortcuts,
} from "./keyboard-shortcuts"
import { useKeyboardShortcut } from "./use-keyboard-shortcut"

const allShortcuts = [...Object.values(windowShortcuts), ...Object.values(rowShortcuts)]

interface ShortcutGroupProps {
  readonly group: ShortcutGroupName
  readonly isMac: boolean
}

interface ShortcutEntryProps {
  readonly shortcut: KeyboardShortcut
  readonly isMac: boolean
}

function ShortcutEntry({ shortcut, isMac }: ShortcutEntryProps) {
  const termId = useId()
  return (
    <div className="flex items-center justify-between gap-4">
      <dt id={termId} className="text-sm">
        {shortcut.description}
      </dt>
      <dd aria-labelledby={termId} className="flex gap-1">
        {keyComboLabels(shortcutKeys(shortcut, isMac), isMac).map((label) => (
          <kbd
            key={label}
            className="min-w-6 rounded-small bg-surface-raised px-2 text-center text-xs font-semibold"
          >
            {label}
          </kbd>
        ))}
      </dd>
    </div>
  )
}

function ShortcutGroup({ group, isMac }: ShortcutGroupProps) {
  const shortcuts = allShortcuts.filter((shortcut) => shortcut.group === group)
  return (
    <section className="flex flex-col gap-2">
      <h3 className="text-sm font-semibold text-muted">{group}</h3>
      <dl className="flex flex-col gap-2">
        {shortcuts.map((shortcut) => (
          <ShortcutEntry key={shortcut.description} shortcut={shortcut} isMac={isMac} />
        ))}
      </dl>
    </section>
  )
}

// A modal dialog: the browser traps focus inside it, closes it on Escape, and
// returns focus to where it was.
export function ShortcutsDialog() {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const headingId = useId()
  const isMac = use(IsMacContext)

  useKeyboardShortcut("showShortcuts", () => {
    if (dialogRef.current?.open === false) {
      dialogRef.current.showModal()
    }
  })

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={headingId}
      className="m-auto w-full max-w-md rounded-large bg-surface-overlay p-6 text-foreground shadow-overlay transition-[opacity,translate] duration-200 ease-out backdrop:bg-canvas/60 starting:open:translate-y-2 starting:open:opacity-0"
    >
      <div className="mb-4 flex items-center justify-between gap-4">
        <h2 id={headingId} className="font-display text-xl font-bold">
          Keyboard shortcuts
        </h2>
        <IconButton label="Close" icon={X} onClick={() => dialogRef.current?.close()} />
      </div>
      <div className="flex flex-col gap-4">
        {shortcutGroups.map((group) => (
          <ShortcutGroup key={group} group={group} isMac={isMac} />
        ))}
      </div>
    </dialog>
  )
}
